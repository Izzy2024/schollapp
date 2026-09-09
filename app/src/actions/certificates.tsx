'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';

async function getAdminTenant(session: { tenantSlug?: string | null; roles?: string[] | null }) {
  const roles = session.roles ?? [];
  if (!roles.includes('admin') && !roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

export async function generateEnrollmentCertificatePdf(studentId: string, academicYearId: string): Promise<Buffer> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getAdminTenant(session.user);

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId, academicYearId },
    include: {
      student: true,
      academicYear: true,
      section: { include: { gradeLevel: true } },
    },
  });
  if (!enrollment) throw stableError(STABLE_ERROR.ENROLLMENT_NOT_FOUND);

  const { renderToStream } = await import('@react-pdf/renderer');
  const { default: EnrollmentCertificatePDF } = await import('@/lib/pdf/enrollment-certificate-template');

  const stream = await renderToStream(
    <EnrollmentCertificatePDF
      data={{
        schoolName: tenant.name,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        studentCode: enrollment.student.studentCode,
        gradeLevelName: enrollment.section.gradeLevel.name,
        sectionName: enrollment.section.name,
        academicYearName: enrollment.academicYear.name,
        status: enrollment.status,
        issuedAt: new Date(),
      }}
    />
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
