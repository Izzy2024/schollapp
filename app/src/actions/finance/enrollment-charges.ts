'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { resolveSiblingDiscount, markDiscountUsed } from './discounts';

// ============================================================================
// Types
// ============================================================================

export type PaymentOption = 'enrollment_only' | 'monthly' | 'annual_with_discount';

export type EnrollmentChargeResult = {
  enrollmentId: string;
  charges: Array<{
    id: string;
    conceptName: string;
    amountCents: number;
    periodKey: string;
    dueDate: Date;
    discountCents?: number;
  }>;
  totalCents: number;
};

// ============================================================================
// Auto-generate charges on enrollment
// ============================================================================

/**
 * Generate automatic charges when a student is enrolled
 */
export async function generateEnrollmentCharges(
  studentId: string,
  enrollmentId: string,
  paymentOption: PaymentOption = 'monthly',
  academicYearId: string
): Promise<EnrollmentChargeResult> {
  const ctx = await requirePermission('students:manage');

  // Get academic year info and section grade level
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, tenantId: ctx.tenantId },
    select: { studentId: true, academicYearId: true, section: { select: { gradeLevelId: true } } }
  });
  if (!enrollment || enrollment.studentId !== studentId || enrollment.academicYearId !== academicYearId) {
    throw stableError(STABLE_ERROR.TARGET_SCOPE_VIOLATION);
  }
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!student) throw stableError(STABLE_ERROR.TARGET_SCOPE_VIOLATION);
  const gradeLevelId = enrollment.section.gradeLevelId;

  // Get auto-generate concepts
  const concepts = await prisma.financeConcept.findMany({
    where: {
      tenantId: ctx.tenantId,
      autoGenerateOnEnrollment: true,
      isActive: true,
      OR: [
        { gradeLevelId: null },
        { gradeLevelId }
      ]
    },
  });

  if (concepts.length === 0) {
    return { enrollmentId, charges: [], totalCents: 0 };
  }

  // Get academic year info
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, tenantId: ctx.tenantId },
    select: { name: true, startDate: true, terms: { orderBy: { startDate: 'asc' } } },
  });
  if (!academicYear) throw stableError(STABLE_ERROR.TARGET_SCOPE_VIOLATION);

  const yearName = academicYear.name;
  const charges: Array<{
    id: string;
    conceptName: string;
    amountCents: number;
    periodKey: string;
    dueDate: Date;
    discountCents?: number;
  }> = [];

  let totalCents = 0;

  await prisma.$transaction(async (tx) => {
    for (const concept of concepts) {
      const chargeType = concept.chargeType || 'enrollment';

      if (chargeType === 'enrollment') {
        // One-time enrollment fee
        const periodKey = `${yearName}-MAT`;
        const dueDate = new Date();

        let amountCents = concept.amountCents;
        let discountCents = 0;
        if (concept.applySiblingDiscount) {
          const discount = await resolveSiblingDiscount(tx, ctx.tenantId, studentId, concept.id, 'enrollment', amountCents);
          if (discount) {
            discountCents = discount.reductionCents;
            amountCents -= discountCents;
            await markDiscountUsed(tx, discount.discountId);
          }
        }

        const charge = await tx.financeCharge.create({
          data: {
            tenantId: ctx.tenantId,
            studentId,
            conceptId: concept.id,
            amountCents,
            currency: concept.currency,
            periodKey,
            status: 'pending',
            dueDate,
          },
        });

        charges.push({
          id: charge.id,
          conceptName: concept.name,
          amountCents,
          periodKey,
          dueDate,
          discountCents: discountCents || undefined,
        });
        totalCents += amountCents;
      } else if (chargeType === 'monthly' && paymentOption !== 'enrollment_only') {
        // Monthly fees
        const months = concept.installmentCount || 10;

        if (paymentOption === 'annual_with_discount') {
          // Single annual charge with 5% discount
          const annualAmount = Math.round(concept.amountCents * months * 0.95);
          const periodKey = `${yearName}-ANUAL`;

          const charge = await tx.financeCharge.create({
            data: {
              tenantId: ctx.tenantId,
              studentId,
              conceptId: concept.id,
              amountCents: annualAmount,
              currency: concept.currency,
              periodKey,
              status: 'pending',
              dueDate: new Date(),
            },
          });

          charges.push({
            id: charge.id,
            conceptName: `${concept.name} (Anual con descuento)`,
            amountCents: annualAmount,
            periodKey,
            dueDate: new Date(),
          });
          totalCents += annualAmount;
        } else {
          // Monthly installments
          const startDate = academicYear?.startDate || new Date();
          const startMonth = startDate.getMonth();

          // Resolve the sibling discount once for the whole tuition plan (not per month)
          // so a single family only consumes one "use" regardless of installment count.
          let monthlyDiscountCents = 0;
          let monthlyDiscountId: string | null = null;
          if (concept.applySiblingDiscount) {
            const discount = await resolveSiblingDiscount(tx, ctx.tenantId, studentId, concept.id, 'monthly', concept.amountCents);
            if (discount) {
              monthlyDiscountCents = discount.reductionCents;
              monthlyDiscountId = discount.discountId;
            }
          }

          for (let i = 0; i < months; i++) {
            const month = startMonth + i;
            const year = startDate.getFullYear() + Math.floor(month / 12);
            const actualMonth = month % 12;
            const periodKey = `${year}-${String(actualMonth + 1).padStart(2, '0')}`;

            const dueDate = new Date(year, actualMonth, 5); // Due on 5th of each month
            const amountCents = concept.amountCents - monthlyDiscountCents;

            const charge = await tx.financeCharge.create({
              data: {
                tenantId: ctx.tenantId,
                studentId,
                conceptId: concept.id,
                amountCents,
                currency: concept.currency,
                periodKey,
                status: 'pending',
                dueDate,
              },
            });

            charges.push({
              id: charge.id,
              conceptName: `${concept.name} (${getMonthName(actualMonth)})`,
              amountCents,
              periodKey,
              dueDate,
              discountCents: monthlyDiscountCents || undefined,
            });
            totalCents += amountCents;
          }

          if (monthlyDiscountId) await markDiscountUsed(tx, monthlyDiscountId);
        }
      }
    }

    // Create activity event
    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        entityType: 'finance',
        entityId: enrollmentId,
        action: 'finance.charges.auto_generated',
        metadata: JSON.stringify({
          enrollmentId,
          studentId,
          chargeCount: charges.length,
          totalCents,
          paymentOption,
        }),
      },
    });
  });

  return { enrollmentId, charges, totalCents };
}

/**
 * Get available payment options for enrollment based on the selected section
 */
export async function getEnrollmentPaymentOptions(sectionId?: string): Promise<{
  options: Array<{
    type: PaymentOption;
    label: string;
    description: string;
    totalCents: number;
    discount: number;
    months: number;
  }>;
  concepts: Array<{
    id: string;
    name: string;
    amountCents: number;
    chargeType: string | null;
    installmentCount: number | null;
  }>;
}> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    throw new Error('Unauthorized');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: session.user.tenantSlug },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  let gradeLevelId = undefined;
  if (sectionId) {
    const section = await prisma.section.findFirst({
      where: { id: sectionId, tenantId: tenant.id },
      select: { gradeLevelId: true }
    });
    if (section) gradeLevelId = section.gradeLevelId;
  }

  const concepts = await prisma.financeConcept.findMany({
    where: {
      tenantId: tenant.id,
      autoGenerateOnEnrollment: true,
      isActive: true,
      ...(gradeLevelId ? {
        OR: [
          { gradeLevelId: null },
          { gradeLevelId }
        ]
      } : { gradeLevelId: null }) // Default to global if no section provided
    },
  });

  // Calculate totals for each option
  let enrollmentFee = 0;
  let monthlyFee = 0;
  let months = 10;

  for (const c of concepts) {
    if (c.chargeType === 'enrollment') {
      enrollmentFee = c.amountCents;
    } else if (c.chargeType === 'monthly') {
      monthlyFee = c.amountCents;
      months = c.installmentCount || 10;
    }
  }

  const options: Array<{
    type: PaymentOption;
    label: string;
    description: string;
    totalCents: number;
    discount: number;
    months: number;
  }> = [];

  // Option 1: Enrollment only (pay later)
  options.push({
    type: 'enrollment_only',
    label: 'Solo matrícula',
    description: 'Paga solo la matrícula ahora, las mensualidades después.',
    totalCents: enrollmentFee,
    discount: 0,
    months: 0,
  });

  // Option 2: Monthly payments
  const monthlyTotal = enrollmentFee + (monthlyFee * months);
  options.push({
    type: 'monthly',
    label: 'Matrícula + Mensualidades',
    description: `${months} cuotas de $${(monthlyFee / 100).toFixed(2)}`,
    totalCents: monthlyTotal,
    discount: 0,
    months,
  });

  // Option 3: Annual with discount (5%)
  const annualTotal = enrollmentFee + Math.round(monthlyFee * months * 0.95);
  options.push({
    type: 'annual_with_discount',
    label: 'Pago anual (5% descuento)',
    description: `Ahorra $${((monthlyFee * months * 0.05) / 100).toFixed(2)}`,
    totalCents: annualTotal,
    discount: Math.round(monthlyFee * months * 0.05),
    months: 0,
  });

  return {
    options,
    concepts: concepts.map((c) => ({
      id: c.id,
      name: c.name,
      amountCents: c.amountCents,
      chargeType: c.chargeType,
      installmentCount: c.installmentCount,
    })),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month];
}
