import prisma from '@/lib/prisma';

// Owner/permission rules for Attachment records (SEG-H7). Shared by the
// server actions (attachments.ts) and the download route (/api/files/[id]).
// Plain module (no 'use server') so both can import it. Deny by default:
// unknown ownerType or unresolvable owner => no access.

export type AttachmentSessionUser = {
  id: string;
  email?: string | null;
  roles?: string[];
};

export type AttachmentAccess = 'view' | 'delete';

export type AttachmentRef = {
  id: string;
  ownerType: string;
  ownerId: string;
};

function normalizedRoles(user: AttachmentSessionUser): string[] {
  return (user.roles ?? []).map((r) => String(r).toLowerCase());
}

function isManager(user: AttachmentSessionUser): boolean {
  const roles = normalizedRoles(user);
  return roles.includes('admin') || roles.includes('director');
}

async function findOwnStudent(tenantId: string, user: AttachmentSessionUser) {
  if (!user.email) return null;
  return prisma.student.findFirst({
    where: { tenantId, email: user.email, status: 'active' },
    select: { id: true },
  });
}

async function findOwnStaff(tenantId: string, user: AttachmentSessionUser) {
  return prisma.staff.findFirst({
    where: { tenantId, userId: user.id },
    select: { id: true },
  });
}

export async function canAccessAttachment(opts: {
  tenantId: string;
  user: AttachmentSessionUser;
  attachment: AttachmentRef;
  access: AttachmentAccess;
}): Promise<boolean> {
  const { tenantId, user, attachment, access } = opts;

  if (attachment.ownerType === 'submission') {
    // ownerId format: "${evaluationId}:${studentId}" (see submissions.ts).
    const [evaluationId, studentId] = attachment.ownerId.split(':');
    if (!evaluationId || !studentId) return false;

    const ownStudent = await findOwnStudent(tenantId, user);
    if (ownStudent && ownStudent.id === studentId) return true;

    const staff = await findOwnStaff(tenantId, user);
    if (!staff) return false;
    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evaluationId, tenantId },
      select: { sectionSubject: { select: { staffId: true } } },
    });
    return !!evaluation && evaluation.sectionSubject.staffId === staff.id;
  }

  if (attachment.ownerType === 'topic') {
    const topic = await prisma.curricularTopic.findFirst({
      where: { id: attachment.ownerId, tenantId },
      include: { unit: { include: { sectionSubject: true } } },
    });
    if (!topic?.unit?.sectionSubject) return false;
    const sectionSubject = topic.unit.sectionSubject;

    const staff = await findOwnStaff(tenantId, user);
    const isOwnerTeacher = !!staff && sectionSubject.staffId === staff.id;
    if (isOwnerTeacher) return true;
    if (access === 'delete') return false;

    // View: any student enrolled in the class section.
    const ownStudent = await findOwnStudent(tenantId, user);
    if (!ownStudent) return false;
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        tenantId,
        studentId: ownStudent.id,
        sectionId: sectionSubject.sectionId,
        status: { in: ['enrolled', 'reenrolled'] },
      },
      select: { id: true },
    });
    return !!enrollment;
  }

  if (attachment.ownerType === 'tenant') {
    // General documents: anyone in the tenant can view; deleting requires
    // a management role (admin/director from the session roles).
    if (access === 'view') return true;
    return isManager(user);
  }

  return false;
}

export async function assertAttachmentAccess(opts: {
  tenantId: string;
  user: AttachmentSessionUser;
  attachment: AttachmentRef;
  access: AttachmentAccess;
}): Promise<void> {
  const allowed = await canAccessAttachment(opts);
  if (!allowed) throw new Error('No autorizado');
}
