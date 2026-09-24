import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { seedPermission } from '@/test/factories/rbac';

import * as invoices from '@/actions/finance/invoices';
import * as pdfInvoice from '@/actions/finance/pdf-invoice';
import * as delinquency from '@/actions/finance/delinquency';
import * as paymentPlans from '@/actions/finance/payment-plans';
import * as discounts from '@/actions/finance/discounts';
import * as concepts from '@/actions/finance/concepts';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function makeTenant(prefix: string) {
  return prisma.tenant.create({
    data: { slug: uniq(prefix), name: 'Tenant Finance Reads C', timezone: 'America/Mexico_City' },
  });
}

async function makeUser(tenantId: string, prefix: string, withPermission: boolean) {
  const user = await prisma.user.create({
    data: { email: `${uniq(prefix)}@ex.com`, fullName: 'User', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: user.id } });
  if (withPermission) await seedPermission(tenantId, user.id, 'finance:write');
  return user;
}

async function seedFinanceData(tenantId: string) {
  const student = await prisma.student.create({ data: { tenantId, firstName: 'Beto', lastName: 'Ajeno' } });
  const concept = await prisma.financeConcept.create({
    data: { tenantId, name: uniq('Concept'), kind: 'one_time', amountCents: 5000, currency: 'USD' },
  });
  const charge = await prisma.financeCharge.create({
    data: { tenantId, studentId: student.id, conceptId: concept.id, amountCents: 5000, status: 'overdue', dueDate: new Date('2020-01-01') },
  });
  const folio = uniq('INV');
  const invoice = await prisma.financeInvoice.create({
    data: { tenantId, chargeId: charge.id, folio, studentName: 'Ajeno Beto', conceptName: concept.name, amountCents: 5000, currency: 'USD', dueDate: new Date('2020-01-01') },
  });
  const plan = await prisma.financePaymentPlan.create({
    data: { tenantId, chargeId: charge.id, totalAmountCents: 5000, installmentCount: 2, installmentsPaid: 0, startDate: new Date('2020-01-01'), status: 'active' },
  });
  const discount = await prisma.financeDiscount.create({
    data: { tenantId, name: uniq('Disc'), kind: 'custom', fixedCents: 100, appliesTo: 'all_charges', isActive: true },
  });
  await prisma.financeDunningEvent.create({
    data: { tenantId, chargeId: charge.id, action: 'call_made', performedBy: 'seed', notes: null },
  });
  await prisma.financeReminder.create({
    data: { tenantId, chargeId: charge.id, type: 'on_due_date', channel: 'in_app', scheduledFor: new Date('2020-01-01'), status: 'pending' },
  });
  return { student, concept, charge, invoice, folio, plan, discount };
}

describe('Finance reads B authz contract (invoices/delinquency/plans/discounts/concepts) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('sin finance:write, cada lectura rechaza con UNAUTHORIZED_ROLE', async () => {
    const tenant = await makeTenant('t-frb-noperm');
    const user = await makeUser(tenant.id, 'noperm', false);
    setTestSession({ id: user.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const cases: Array<[string, () => Promise<unknown>]> = [
      ['listInvoices', () => invoices.listInvoices()],
      ['getInvoice', () => invoices.getInvoice('any')],
      ['getInvoiceByFolio', () => invoices.getInvoiceByFolio('any')],
      ['syncInvoiceStatus', () => invoices.syncInvoiceStatus('any')],
      ['generateInvoicePdf', () => pdfInvoice.generateInvoicePdf('any')],
      ['generateInvoicePdfByFolio', () => pdfInvoice.generateInvoicePdfByFolio('any')],
      ['getDelinquentStudents', () => delinquency.getDelinquentStudents()],
      ['getDelinquencySummary', () => delinquency.getDelinquencySummary()],
      ['getDunningHistory', () => delinquency.getDunningHistory('any')],
      ['getPendingReminders', () => delinquency.getPendingReminders()],
      ['updateOverdueStatuses', () => delinquency.updateOverdueStatuses()],
      ['getPaymentPlan', () => paymentPlans.getPaymentPlan('any')],
      ['listActivePlans', () => paymentPlans.listActivePlans()],
      ['discounts.list', () => discounts.list()],
      ['concepts.list', () => concepts.list()],
    ];

    for (const [name, call] of cases) {
      await assert.rejects(call, /UNAUTHORIZED_ROLE/, `expected ${name} to reject`);
    }

    clearTestSession();
  });

  it('con finance:write en el tenant A no se ven datos del tenant B', async () => {
    const tenantA = await makeTenant('t-frb-a');
    const tenantB = await makeTenant('t-frb-b');
    const dataB = await seedFinanceData(tenantB.id);

    const userA = await makeUser(tenantA.id, 'writer-a', true);
    setTestSession({ id: userA.id, tenantSlug: tenantA.slug, roles: ['admin'] });

    assert.deepEqual(await invoices.listInvoices(), []);
    assert.equal(await invoices.getInvoice(dataB.invoice.id), null);
    assert.equal(await invoices.getInvoiceByFolio(dataB.folio), null);

    assert.deepEqual(await delinquency.getDelinquentStudents(), []);
    assert.equal((await delinquency.getDelinquencySummary()).totalOverdueCents, 0);
    assert.deepEqual(await delinquency.getDunningHistory(dataB.charge.id), []);
    assert.deepEqual(await delinquency.getPendingReminders(), []);

    assert.equal(await paymentPlans.getPaymentPlan(dataB.charge.id), null);
    assert.deepEqual(await paymentPlans.listActivePlans(), []);

    assert.deepEqual(await discounts.list(), []);
    assert.deepEqual(await concepts.list(), []);

    // PDF por folio ajeno: la búsqueda está acotada al tenant, así que no existe.
    await assert.rejects(() => pdfInvoice.generateInvoicePdfByFolio(dataB.folio), /Invoice not found/);

    // scheduleReminder no acepta un cargo de otro tenant.
    await assert.rejects(
      () => delinquency.scheduleReminder(dataB.charge.id, 'on_due_date', 'in_app', new Date()),
      /FINANCE_CHARGE_NOT_FOUND/
    );

    clearTestSession();
  });
});
