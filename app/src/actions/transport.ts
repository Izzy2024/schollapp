'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

type Session = {
  id: string;
  email?: string | null;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

async function getTenant(session: Session) {
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

async function assertTransportAdmin(session: Session) {
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

async function assertStudentAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } }) : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export type RouteRow = {
  id: string;
  name: string;
  driverName: string | null;
  vehiclePlate: string | null;
  capacity: number | null;
  stopCount: number;
  assignedCount: number;
};

export async function getRoutes(): Promise<RouteRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const routes = await prisma.transportRoute.findMany({
    where: { tenantId: tenant.id },
    include: { stops: true, assignments: true },
    orderBy: { name: 'asc' },
  });

  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    driverName: r.driverName,
    vehiclePlate: r.vehiclePlate,
    capacity: r.capacity,
    stopCount: r.stops.length,
    assignedCount: r.assignments.length,
  }));
}

export async function createRoute(data: { name: string; driverName?: string; vehiclePlate?: string; capacity?: number }): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.name.trim()) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.transportRoute.create({
    data: { tenantId: tenant.id, name: data.name.trim(), driverName: data.driverName, vehiclePlate: data.vehiclePlate, capacity: data.capacity },
  });

  safeRevalidate('/admin/transport');
  return { success: true };
}

export async function deleteRoute(routeId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, tenantId: tenant.id } });
  if (!route) return { error: STABLE_ERROR.ROUTE_NOT_FOUND };

  const assignedCount = await prisma.transportAssignment.count({ where: { tenantId: tenant.id, routeId } });
  if (assignedCount > 0) return { error: STABLE_ERROR.ROUTE_HAS_ASSIGNMENTS };

  await prisma.transportRoute.delete({ where: { id: routeId } });
  safeRevalidate('/admin/transport');
  return { success: true };
}

export type StopRow = { id: string; name: string; order: number; pickupTime: string | null; dropoffTime: string | null };
export type AssignmentRow = { id: string; studentId: string; studentName: string; stopId: string | null; stopName: string | null };

export type RouteDetail = {
  id: string;
  name: string;
  driverName: string | null;
  vehiclePlate: string | null;
  capacity: number | null;
  stops: StopRow[];
  assignments: AssignmentRow[];
};

export async function getRouteDetail(routeId: string): Promise<RouteDetail | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const route = await prisma.transportRoute.findFirst({
    where: { id: routeId, tenantId: tenant.id },
    include: {
      stops: { orderBy: { order: 'asc' } },
      assignments: { include: { student: true, stop: true } },
    },
  });
  if (!route) return { error: STABLE_ERROR.ROUTE_NOT_FOUND };

  return {
    id: route.id,
    name: route.name,
    driverName: route.driverName,
    vehiclePlate: route.vehiclePlate,
    capacity: route.capacity,
    stops: route.stops.map((s) => ({ id: s.id, name: s.name, order: s.order, pickupTime: s.pickupTime, dropoffTime: s.dropoffTime })),
    assignments: route.assignments.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      stopId: a.stopId,
      stopName: a.stop?.name ?? null,
    })),
  };
}

export async function addStop(routeId: string, data: { name: string; order: number; pickupTime?: string; dropoffTime?: string }): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, tenantId: tenant.id } });
  if (!route) return { error: STABLE_ERROR.ROUTE_NOT_FOUND };
  if (!data.name.trim()) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.transportStop.create({
    data: { tenantId: tenant.id, routeId, name: data.name.trim(), order: data.order, pickupTime: data.pickupTime, dropoffTime: data.dropoffTime },
  });

  safeRevalidate('/admin/transport');
  return { success: true };
}

export async function deleteStop(stopId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const stop = await prisma.transportStop.findFirst({ where: { id: stopId, tenantId: tenant.id } });
  if (!stop) throw stableError(STABLE_ERROR.STOP_NOT_FOUND);

  await prisma.transportStop.delete({ where: { id: stopId } });
  safeRevalidate('/admin/transport');
  return { success: true };
}

export async function assignStudentToRoute(studentId: string, routeId: string, stopId?: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, tenantId: tenant.id }, include: { assignments: true } });
  if (!route) return { error: STABLE_ERROR.ROUTE_NOT_FOUND };

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: tenant.id } });
  if (!student) return { error: STABLE_ERROR.INVALID_TARGET };

  const alreadyOnThisRoute = route.assignments.some((a) => a.studentId === studentId);
  if (route.capacity !== null && route.capacity !== undefined && !alreadyOnThisRoute && route.assignments.length >= route.capacity) {
    return { error: STABLE_ERROR.ROUTE_FULL };
  }

  await prisma.transportAssignment.upsert({
    where: { tenantId_studentId: { tenantId: tenant.id, studentId } },
    update: { routeId, stopId: stopId ?? null },
    create: { tenantId: tenant.id, studentId, routeId, stopId: stopId ?? null },
  });

  safeRevalidate('/admin/transport');
  return { success: true };
}

export async function unassignStudent(studentId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertTransportAdmin(session.user);
  const tenant = await getTenant(session.user);

  await prisma.transportAssignment.deleteMany({ where: { tenantId: tenant.id, studentId } });
  safeRevalidate('/admin/transport');
  return { success: true };
}

export type StudentTransportInfo = {
  routeName: string;
  driverName: string | null;
  vehiclePlate: string | null;
  stopName: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
} | null;

export async function getStudentTransportInfo(studentId: string): Promise<StudentTransportInfo> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);
  await assertStudentAccess(tenant.id, studentId, session.user);

  const assignment = await prisma.transportAssignment.findUnique({
    where: { tenantId_studentId: { tenantId: tenant.id, studentId } },
    include: { route: true, stop: true },
  });
  if (!assignment) return null;

  return {
    routeName: assignment.route.name,
    driverName: assignment.route.driverName,
    vehiclePlate: assignment.route.vehiclePlate,
    stopName: assignment.stop?.name ?? null,
    pickupTime: assignment.stop?.pickupTime ?? null,
    dropoffTime: assignment.stop?.dropoffTime ?? null,
  };
}
