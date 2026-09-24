import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { activateTenant } from '@/actions/tenantActivation';
import { hasPermission } from '@/lib/rbac';
import { STABLE_ERROR } from '@/lib/errors';

describe('Tenant activation contract — NO mock.module', () => {
  it('activated admin passes hasPermission and the key cannot be reused', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = `test-key-${suffix}`;
    const adminEmail = `activation-${suffix}@ex.com`;
    await prisma.tenantActivationKey.create({ data: { key, expiresAt: new Date(Date.now() + 60_000) } });

    const result = await activateTenant({ key, schoolName: `Escuela ${suffix}`, adminFullName: 'Admin', adminEmail, password: 'password123' });
    if (!('success' in result)) assert.fail(`activation failed: ${result.error}`);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: result.tenantSlug } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    assert.equal(await hasPermission(tenant.id, admin.id, 'students:manage'), true);
    assert.equal(await hasPermission(tenant.id, admin.id, 'finance:write'), true);

    const reuse = await activateTenant({ key, schoolName: 'Otra', adminFullName: 'X', adminEmail: `other-${suffix}@ex.com`, password: 'password123' });
    assert.deepEqual(reuse, { error: STABLE_ERROR.ACTIVATION_KEY_USED });
  });
});
