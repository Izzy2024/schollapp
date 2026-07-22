import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantSlug) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: session.user.tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const payments = await prisma.financePayment.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        paidAt: true,
        amountCents: true,
        currency: true,
        method: true,
        note: true,
        reference: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentCode: true,
          },
        },
        charge: {
          select: {
            concept: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 200,
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      studentName: `${p.student.lastName} ${p.student.firstName}`,
      studentCode: p.student.studentCode,
      conceptName: p.charge.concept.name,
      methodName: p.method,
      amountCents: p.amountCents,
      currency: p.currency,
      note: p.note,
      reference: p.reference,
    }));

    const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

    return NextResponse.json({ payments: formatted, totalCents });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
