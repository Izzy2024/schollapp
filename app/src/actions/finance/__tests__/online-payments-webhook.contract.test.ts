import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { recordOnlinePaymentFromWebhook } from '@/actions/finance/onlinePayments-webhook';
import { settleChargeStatus } from '@/actions/finance/payments';

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function makeChargeSetup() {
  const tenant = await prisma.tenant.create({
    data: { slug: uniq('t-webhook'), name: 'Tenant Webhook', timezone: 'America/Mexico_City' },
  });

  const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', status: 'active' } });

  const concept = await prisma.financeConcept.create({
    data: { tenantId: tenant.id, name: uniq('Colegiatura'), kind: 'monthly', amountCents: 10000 },
  });
  const charge = await prisma.financeCharge.create({
    data: { tenantId: tenant.id, studentId: student.id, conceptId: concept.id, amountCents: 10000, status: 'pending' },
  });

  // Pre-create the per-tenant webhook "system" actor so concurrent calls only
  // contend on the payment unique index, not on the user upsert.
  const systemUser = await prisma.user.create({
    data: { email: `system-payments+${tenant.slug}@internal.local`, fullName: 'Sistema de Pagos', passwordHash: 'system', isActive: false },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: systemUser.id, status: 'active' } });

  return { tenant, student, charge };
}

function makeEvent(tenantId: string, chargeId: string, studentId: string, paymentStatus: string, reference = uniq('stripe-session')) {
  return {
    metadata: { tenantId, chargeId, studentId },
    amountCents: 10000,
    currency: 'USD',
    externalReference: reference,
    paymentStatus,
  };
}

describe('Online payments webhook contract (payment_status + idempotency) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('paymentStatus paid sobre cargo pending crea el pago y liquida el cargo', async () => {
    const { tenant, student, charge } = await makeChargeSetup();

    const result = await recordOnlinePaymentFromWebhook(makeEvent(tenant.id, charge.id, student.id, 'paid'));
    assert.deepEqual(result, { success: true });

    const payment = await prisma.financePayment.findFirst({ where: { tenantId: tenant.id, chargeId: charge.id } });
    assert.ok(payment);
    assert.equal(payment!.method, 'online');

    const updated = await prisma.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(updated!.status, 'paid');
  });

  it('paymentStatus unpaid no crea el pago (no es error) y deja el cargo pending', async () => {
    const { tenant, student, charge } = await makeChargeSetup();

    const result = await recordOnlinePaymentFromWebhook(makeEvent(tenant.id, charge.id, student.id, 'unpaid'));
    assert.deepEqual(result, { success: true });

    assert.equal(await prisma.financePayment.count({ where: { tenantId: tenant.id, chargeId: charge.id } }), 0);
    const updated = await prisma.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(updated!.status, 'pending');
  });

  it('el mismo externalReference en paralelo deja un solo FinancePayment (idempotencia real)', async () => {
    const { tenant, student, charge } = await makeChargeSetup();
    const event = makeEvent(tenant.id, charge.id, student.id, 'paid');

    const [a, b] = await Promise.all([
      recordOnlinePaymentFromWebhook(event),
      recordOnlinePaymentFromWebhook(event),
    ]);

    assert.deepEqual(a, { success: true });
    assert.deepEqual(b, { success: true });

    const count = await prisma.financePayment.count({ where: { tenantId: tenant.id, chargeId: charge.id } });
    assert.equal(count, 1);
  });

  it('un cargo ya void no se paga (CHARGE_NOT_PAYABLE) y sigue void', async () => {
    const { tenant, student, charge } = await makeChargeSetup();
    await prisma.financeCharge.update({ where: { id: charge.id }, data: { status: 'void' } });

    const result = await recordOnlinePaymentFromWebhook(makeEvent(tenant.id, charge.id, student.id, 'paid'));
    assert.deepEqual(result, { error: 'CHARGE_NOT_PAYABLE' });

    assert.equal(await prisma.financePayment.count({ where: { tenantId: tenant.id, chargeId: charge.id } }), 0);
    const updated = await prisma.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(updated!.status, 'void');
  });

  it('settleChargeStatus no revive un cargo void', async () => {
    const { tenant, charge } = await makeChargeSetup();
    await prisma.financeCharge.update({ where: { id: charge.id }, data: { status: 'void' } });

    const settled = await settleChargeStatus(prisma as any, tenant.id, charge.id, charge.amountCents);
    assert.equal(settled, 'void');

    const updated = await prisma.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(updated!.status, 'void');
  });
});
