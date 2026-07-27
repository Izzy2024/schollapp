import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { createCheckoutSessionForCharge, recordOnlinePaymentFromWebhook } from '@/actions/finance/onlinePayments';

function setTestSession(user: { id: string; tenantSlug: string; role?: string; roles?: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeChargeSetup() {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `t-onlinepay-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Online Payments', timezone: 'America/Mexico_City' },
  });

  const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', status: 'active' } });

  const guardianEmail = `guardian-${now}@ex.com`;
  const guardian = await prisma.guardian.create({ data: { tenantId: tenant.id, fullName: 'Tutor', email: guardianEmail } });
  await prisma.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id } });
  const guardianUser = await prisma.user.create({ data: { email: guardianEmail, fullName: 'Tutor', passwordHash: 'x', isActive: true } });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: guardianUser.id, status: 'active' } });

  const concept = await prisma.financeConcept.create({
    data: { tenantId: tenant.id, name: `Colegiatura-${now}`, kind: 'monthly', amountCents: 10000 },
  });
  const charge = await prisma.financeCharge.create({
    data: { tenantId: tenant.id, studentId: student.id, conceptId: concept.id, amountCents: 10000, status: 'pending' },
  });

  return { tenant, student, guardian, guardianUser, charge };
}

describe('Online payments contract (checkout + webhook) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('returns PAYMENT_GATEWAY_NOT_CONFIGURED when no gateway is set up', async () => {
    const { tenant, guardianUser, charge } = await makeChargeSetup();

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, role: 'parent', roles: ['parent'], email: guardianUser.email });
    const result = await createCheckoutSessionForCharge(charge.id);
    assert.deepEqual(result, { error: 'PAYMENT_GATEWAY_NOT_CONFIGURED' });
    clearTestSession();
  });

  it('rejects a guardian who is not linked to the charge\'s student', async () => {
    const { tenant, charge } = await makeChargeSetup();
    const now = Date.now();

    const otherGuardianEmail = `other-guardian-${now}@ex.com`;
    await prisma.guardian.create({ data: { tenantId: tenant.id, fullName: 'Otro Tutor', email: otherGuardianEmail } });
    const otherUser = await prisma.user.create({ data: { email: otherGuardianEmail, fullName: 'Otro Tutor', passwordHash: 'x', isActive: true } });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherUser.id, status: 'active' } });

    setTestSession({ id: otherUser.id, tenantSlug: tenant.slug, role: 'parent', roles: ['parent'], email: otherGuardianEmail });
    await assert.rejects(() => createCheckoutSessionForCharge(charge.id), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });

  it('rejects a charge that is already paid or void', async () => {
    const { tenant, guardianUser, charge } = await makeChargeSetup();
    await prisma.financeCharge.update({ where: { id: charge.id }, data: { status: 'paid' } });

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, role: 'parent', roles: ['parent'], email: guardianUser.email });
    const result = await createCheckoutSessionForCharge(charge.id);
    assert.deepEqual(result, { error: 'CHARGE_NOT_PAYABLE' });
    clearTestSession();
  });

  it('webhook: records a FinancePayment, settles the charge to paid, and is idempotent on retry', async () => {
    const { tenant, student, charge } = await makeChargeSetup();

    const event = {
      metadata: { tenantId: tenant.id, chargeId: charge.id, studentId: student.id },
      amountCents: 10000,
      currency: 'USD',
      externalReference: `stripe-session-${Date.now()}`,
    };

    const result = await recordOnlinePaymentFromWebhook(event);
    assert.deepEqual(result, { success: true });

    const payment = await prisma.financePayment.findFirst({ where: { tenantId: tenant.id, chargeId: charge.id } });
    assert.ok(payment);
    assert.equal(payment!.method, 'online');
    assert.equal(payment!.reference, event.externalReference);

    const updatedCharge = await prisma.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(updatedCharge!.status, 'paid');

    // Retrying the same webhook event (Stripe does this) must not double-record the payment.
    const retryResult = await recordOnlinePaymentFromWebhook(event);
    assert.deepEqual(retryResult, { success: true });
    const paymentsCount = await prisma.financePayment.count({ where: { tenantId: tenant.id, chargeId: charge.id } });
    assert.equal(paymentsCount, 1);
  });
});
