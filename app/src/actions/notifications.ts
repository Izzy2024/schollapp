'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { getPrimaryRole } from '@/lib/nav/menu';

export type NotificationItem = {
  key: string;
  icon: string; // Material Symbols
  label: string;
  count: number;
  href: string;
};

/**
 * Alimenta la campanita del header. No hay tabla de notificaciones: se derivan
 * de datos que ya existen (mensajes sin leer, solicitudes pendientes, morosidad),
 * y cada ítem lleva a la pantalla donde se resuelve.
 */
export async function getNotifications(): Promise<{ items: NotificationItem[]; total: number }> {
  const session = await auth();
  if (!session?.user?.id) return { items: [], total: 0 };

  const user = session.user as { id: string; tenantSlug?: string; tenantId?: string; roles?: string[] };
  const tenantKey = user.tenantSlug ?? user.tenantId;
  if (!tenantKey) return { items: [], total: 0 };

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: tenantKey }, { id: tenantKey }] },
    select: { id: true },
  });
  if (!tenant) return { items: [], total: 0 };

  const tenantId = tenant.id;
  const userId = user.id;
  const role = getPrimaryRole(user.roles ?? []);

  const items: NotificationItem[] = [];

  // 1) Mensajes sin leer — aplica a todos los roles.
  const participations = await prisma.messageParticipant.findMany({
    where: { tenantId, userId },
    select: { conversationId: true, lastReadAt: true },
  });

  let unreadMessages = 0;
  for (const p of participations) {
    unreadMessages += await prisma.message.count({
      where: {
        tenantId,
        conversationId: p.conversationId,
        senderId: { not: userId },
        ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
      },
    });
  }
  // director no tiene bandeja propia; se manda a su inicio.
  if (unreadMessages > 0) {
    items.push({
      key: 'messages',
      icon: 'forum',
      label: unreadMessages === 1 ? '1 mensaje sin leer' : `${unreadMessages} mensajes sin leer`,
      count: unreadMessages,
      href: role === 'director' ? '/director' : `/${role}/messages`,
    });
  }

  // 2) Cosas que solo admin/director resuelven.
  if (role === 'admin' || role === 'director') {
    const [scheduleRequests, classRequests, overdueCharges] = await Promise.all([
      prisma.scheduleRequest.count({ where: { tenantId, status: 'pending' } }),
      prisma.classRequest.count({ where: { tenantId, status: 'pending' } }),
      prisma.financeCharge.count({ where: { tenantId, status: 'overdue' } }),
    ]);

    if (scheduleRequests > 0) {
      items.push({
        key: 'schedule-requests',
        icon: 'event_available',
        label: `${scheduleRequests} solicitud(es) de horario por revisar`,
        count: scheduleRequests,
        href: `/${role}/schedule-requests`,
      });
    }
    if (classRequests > 0) {
      items.push({
        key: 'class-requests',
        icon: 'assignment',
        label: `${classRequests} solicitud(es) de clase por revisar`,
        count: classRequests,
        href: `/${role}/class-requests`,
      });
    }
    if (overdueCharges > 0) {
      items.push({
        key: 'overdue',
        icon: 'paid',
        label: `${overdueCharges} cargo(s) vencido(s)`,
        count: overdueCharges,
        href: role === 'director' ? '/director/financials' : '/admin/finances',
      });
    }
  }

  // 3) Docente: clases de hoy a las que todavía no les tomó asistencia.
  //    Se limpia solo al pasar lista, que es justo la acción que queremos empujar.
  if (role === 'teacher') {
    const staff = await prisma.staff.findFirst({ where: { tenantId, userId }, select: { id: true } });
    if (staff) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const todaySchedules = await prisma.classSchedule.findMany({
        where: { tenantId, dayOfWeek: today.getDay(), sectionSubject: { staffId: staff.id } },
        select: { sectionSubject: { select: { sectionId: true } } },
      });

      const sectionIds = [...new Set(todaySchedules.map((s) => s.sectionSubject.sectionId))];
      if (sectionIds.length > 0) {
        const taken = await prisma.attendanceSession.findMany({
          where: { tenantId, sectionId: { in: sectionIds }, date: { gte: startOfDay, lt: endOfDay } },
          select: { sectionId: true },
        });
        const pendingAttendance = sectionIds.length - new Set(taken.map((t) => t.sectionId)).size;

        if (pendingAttendance > 0) {
          items.push({
            key: 'attendance-today',
            icon: 'fact_check',
            label: `${pendingAttendance} clase(s) de hoy sin pasar lista`,
            count: pendingAttendance,
            href: '/teacher/classes',
          });
        }
      }
    }
  }

  // 4) Padre: saldo vencido de sus hijos. Se limpia al pagar.
  if (role === 'parent') {
    const guardianId =
      ((user as { guardianId?: string }).guardianId ??
        (session.user.email
          ? (await prisma.guardian.findFirst({ where: { tenantId, email: session.user.email }, select: { id: true } }))?.id
          : undefined)) || null;

    if (guardianId) {
      const links = await prisma.studentGuardian.findMany({ where: { tenantId, guardianId }, select: { studentId: true } });
      const studentIds = links.map((l) => l.studentId);

      if (studentIds.length > 0) {
        const overdue = await prisma.financeCharge.count({
          where: { tenantId, studentId: { in: studentIds }, status: 'overdue' },
        });
        if (overdue > 0) {
          items.push({
            key: 'parent-overdue',
            icon: 'paid',
            label: `${overdue} cuota(s) vencida(s)`,
            count: overdue,
            href: '/parent/finances',
          });
        }
      }
    }
  }

  // 5) Alumno: evaluaciones de los próximos 7 días. Se limpia solo al pasar la fecha.
  if (role === 'student' && session.user.email) {
    const student = await prisma.student.findFirst({
      where: { tenantId, email: session.user.email, status: 'active' },
      select: { id: true },
    });

    const enrollment = student
      ? await prisma.enrollment.findFirst({
          where: { tenantId, studentId: student.id, status: { in: ['enrolled', 'reenrolled'] } },
          select: { sectionId: true },
        })
      : null;

    if (enrollment) {
      const now = new Date();
      const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcoming = await prisma.evaluation.count({
        where: {
          tenantId,
          sectionSubject: { sectionId: enrollment.sectionId },
          date: { gte: now, lte: inAWeek },
        },
      });

      if (upcoming > 0) {
        items.push({
          key: 'upcoming-exams',
          icon: 'quiz',
          label: `${upcoming} evaluación(es) esta semana`,
          count: upcoming,
          href: '/student/exams',
        });
      }
    }
  }

  return { items, total: items.reduce((sum, i) => sum + i.count, 0) };
}
