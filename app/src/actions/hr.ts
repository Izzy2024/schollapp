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

async function assertHrAdmin(session: Session) {
  // ponytail: no dedicated "HR" role exists yet; admin/director manage payroll
  // for now (same interim pattern as health.ts). Migrate to a granular
  // hr:manage permission (src/lib/rbac.ts) when this module needs its own role.
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.HR_FORBIDDEN);
}

export type ContractRow = {
  id: string;
  staffId: string;
  staffName: string;
  position: string;
  salaryCents: number;
  contractType: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

export async function getContracts(): Promise<ContractRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const contracts = await prisma.staffContract.findMany({
    where: { tenantId: tenant.id },
    include: { staff: true },
    orderBy: { createdAt: 'desc' },
  });

  return contracts.map((c) => ({
    id: c.id,
    staffId: c.staffId,
    staffName: c.staff.fullName,
    position: c.position,
    salaryCents: c.salaryCents,
    contractType: c.contractType,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    isActive: c.isActive,
  }));
}

export async function createContract(data: {
  staffId: string;
  position: string;
  salaryCents: number;
  contractType: 'full_time' | 'part_time' | 'contract';
  startDateIso: string;
}): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.position.trim() || data.salaryCents < 0) return { error: STABLE_ERROR.INVALID_TARGET };

  const staff = await prisma.staff.findFirst({ where: { id: data.staffId, tenantId: tenant.id } });
  if (!staff) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.staffContract.create({
    data: {
      tenantId: tenant.id,
      staffId: data.staffId,
      position: data.position.trim(),
      salaryCents: data.salaryCents,
      contractType: data.contractType,
      startDate: new Date(data.startDateIso),
    },
  });

  safeRevalidate('/admin/hr');
  return { success: true };
}

export async function endContract(contractId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const contract = await prisma.staffContract.findFirst({ where: { id: contractId, tenantId: tenant.id } });
  if (!contract) return { error: STABLE_ERROR.CONTRACT_NOT_FOUND };

  await prisma.staffContract.update({ where: { id: contractId }, data: { isActive: false, endDate: new Date() } });
  safeRevalidate('/admin/hr');
  return { success: true };
}

export type PayrollPeriodRow = { id: string; name: string; startDate: string; endDate: string; status: string; entryCount: number };

export async function getPayrollPeriods(): Promise<PayrollPeriodRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const periods = await prisma.payrollPeriod.findMany({
    where: { tenantId: tenant.id },
    include: { entries: true },
    orderBy: { startDate: 'desc' },
  });

  return periods.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    status: p.status,
    entryCount: p.entries.length,
  }));
}

export async function createPayrollPeriod(data: { name: string; startDateIso: string; endDateIso: string }): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.name.trim()) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.payrollPeriod.create({
    data: { tenantId: tenant.id, name: data.name.trim(), startDate: new Date(data.startDateIso), endDate: new Date(data.endDateIso) },
  });

  safeRevalidate('/admin/hr');
  return { success: true };
}

export type PayrollEntryRow = {
  id: string;
  staffId: string;
  staffName: string;
  grossCents: number;
  deductionsCents: number;
  netCents: number;
  notes: string | null;
  paidAt: string | null;
};

export async function getPayrollEntries(periodId: string): Promise<PayrollEntryRow[] | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId: tenant.id } });
  if (!period) return { error: STABLE_ERROR.PAYROLL_PERIOD_NOT_FOUND };

  const entries = await prisma.payrollEntry.findMany({
    where: { tenantId: tenant.id, payrollPeriodId: periodId },
    include: { staff: true },
    orderBy: { createdAt: 'asc' },
  });

  return entries.map((e) => ({
    id: e.id,
    staffId: e.staffId,
    staffName: e.staff.fullName,
    grossCents: e.grossCents,
    deductionsCents: e.deductionsCents,
    netCents: e.netCents,
    notes: e.notes,
    paidAt: e.paidAt?.toISOString() ?? null,
  }));
}

export async function addPayrollEntry(
  periodId: string,
  data: { staffId: string; grossCents: number; deductionsCents: number; notes?: string }
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId: tenant.id } });
  if (!period) return { error: STABLE_ERROR.PAYROLL_PERIOD_NOT_FOUND };

  const existing = await prisma.payrollEntry.findUnique({
    where: { payrollPeriodId_staffId: { payrollPeriodId: periodId, staffId: data.staffId } },
  });
  if (existing) return { error: STABLE_ERROR.PAYROLL_ENTRY_EXISTS };

  await prisma.payrollEntry.create({
    data: {
      tenantId: tenant.id,
      payrollPeriodId: periodId,
      staffId: data.staffId,
      grossCents: data.grossCents,
      deductionsCents: data.deductionsCents,
      netCents: data.grossCents - data.deductionsCents,
      notes: data.notes,
    },
  });

  safeRevalidate('/admin/hr');
  return { success: true };
}

export async function markEntryPaid(entryId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHrAdmin(session.user);
  const tenant = await getTenant(session.user);

  const entry = await prisma.payrollEntry.findFirst({ where: { id: entryId, tenantId: tenant.id } });
  if (!entry) return { error: STABLE_ERROR.PAYROLL_ENTRY_NOT_FOUND };

  await prisma.payrollEntry.update({ where: { id: entryId }, data: { paidAt: new Date() } });
  safeRevalidate('/admin/hr');
  return { success: true };
}

export type MyPayrollEntryRow = { periodName: string; grossCents: number; deductionsCents: number; netCents: number; paidAt: string | null };

export async function getMyPayrollEntries(): Promise<MyPayrollEntryRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);

  const staff = await prisma.staff.findFirst({ where: { tenantId: tenant.id, userId: session.user.id } });
  if (!staff) return [];

  const entries = await prisma.payrollEntry.findMany({
    where: { tenantId: tenant.id, staffId: staff.id },
    include: { payrollPeriod: true },
    orderBy: { createdAt: 'desc' },
  });

  return entries.map((e) => ({
    periodName: e.payrollPeriod.name,
    grossCents: e.grossCents,
    deductionsCents: e.deductionsCents,
    netCents: e.netCents,
    paidAt: e.paidAt?.toISOString() ?? null,
  }));
}
