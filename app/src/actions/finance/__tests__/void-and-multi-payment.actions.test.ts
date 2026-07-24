import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import * as charges from '../charges';
import * as payments from '../payments';
import * as statements from '../statements';

// Cobertura de las dos reglas de dinero nuevas:
// - anular un cargo lo saca del saldo del alumno (sin borrar la fila)
// - un solo monto se reparte en cascada sobre varias cuotas, de la más vieja a la más nueva

const db = prisma as any;

function setTestSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
}

async function resetDb() {
  for (const model of ['financePayment', 'financeCharge', 'financeConcept', 'student', 'user', 'tenant']) {
    try {
      await db[model].deleteMany({});
    } catch {
      // ignore
    }
  }
}

async function seed() {
  await resetDb();

  const tenant = await db.tenant.create({ data: { name: 'T', slug: 'tenant-void' } });
  // ActivityEvent.actorUserId es FK: el usuario debe existir, como en la app real.
  await db.user.create({
    data: { id: 'user-admin', email: 'admin@tenant-void.test', passwordHash: 'x', fullName: 'Admin', isActive: true },
  });
  const student = await db.student.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez' } });
  const concept = await db.financeConcept.create({
    data: { tenantId: tenant.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'USD' },
  });

  const mk = (periodKey: string, dueDate: string) =>
    db.financeCharge.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        conceptId: concept.id,
        amountCents: 100_00,
        currency: 'USD',
        periodKey,
        dueDate: new Date(dueDate),
      },
    });

  const marzo = await mk('2026-03', '2026-03-05T00:00:00.000Z');
  const abril = await mk('2026-04', '2026-04-05T00:00:00.000Z');
  const mayo = await mk('2026-05', '2026-05-05T00:00:00.000Z');

  setTestSession({
    user: { id: 'user-admin', tenantId: tenant.id, tenantSlug: tenant.slug, role: 'admin', roles: ['admin'] },
  });

  return { tenant, student, marzo, abril, mayo };
}

describe('finance: anulación de cargos y cobro multi-cuota', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('anular un cargo lo excluye del estado de cuenta pero conserva la fila', async () => {
    const { student, marzo } = await seed();

    const before = await statements.getForStudent(student.id);
    assert.equal(before?.totals.balanceDueCents, 300_00);

    await charges.voidCharge({ chargeId: marzo.id, reason: 'duplicado' });

    const after = await statements.getForStudent(student.id);
    assert.equal(after?.totals.balanceDueCents, 200_00, 'el cargo anulado no debe contar en el saldo');

    const row = await db.financeCharge.findUnique({ where: { id: marzo.id } });
    assert.equal(row.status, 'void', 'la fila se conserva marcada como anulada');
  });

  it('no se puede anular un cargo que ya tiene pagos', async () => {
    const { marzo } = await seed();

    await payments.recordManual({ chargeId: marzo.id, amountCents: 50_00, paidAt: new Date() });

    await assert.rejects(() => charges.voidCharge({ chargeId: marzo.id, reason: 'ups' }), /pagos registrados/);
  });

  it('un cargo anulado no admite pagos', async () => {
    const { marzo } = await seed();

    await charges.voidCharge({ chargeId: marzo.id, reason: 'duplicado' });

    await assert.rejects(
      () => payments.recordManual({ chargeId: marzo.id, amountCents: 10_00, paidAt: new Date() }),
      /anulado/
    );
  });

  it('reparte el monto en cascada: paga marzo y abril completos, mayo parcial', async () => {
    const { student, marzo, abril, mayo } = await seed();

    await payments.recordManualMulti({
      chargeIds: [mayo.id, marzo.id, abril.id], // orden de entrada indistinto
      amountCents: 250_00,
      paidAt: new Date('2026-03-01T00:00:00.000Z'),
      method: 'cash',
    });

    const rows = await db.financeCharge.findMany({ where: { studentId: student.id }, include: { payments: true } });
    const byId = new Map(rows.map((r: any) => [r.id, r]));

    assert.equal(byId.get(marzo.id).status, 'paid');
    assert.equal(byId.get(abril.id).status, 'paid');
    assert.equal(byId.get(mayo.id).status, 'pending', 'la última cuota queda parcial');
    assert.equal(byId.get(mayo.id).payments[0].amountCents, 50_00, 'el sobrante cae en la cuota más nueva');

    const statement = await statements.getForStudent(student.id);
    assert.equal(statement?.totals.balanceDueCents, 50_00);
  });

  it('rechaza un monto mayor al saldo de los cargos seleccionados', async () => {
    const { marzo } = await seed();

    await assert.rejects(
      () =>
        payments.recordManualMulti({
          chargeIds: [marzo.id],
          amountCents: 150_00,
          paidAt: new Date(),
        }),
      /excede el saldo/
    );
  });
});
