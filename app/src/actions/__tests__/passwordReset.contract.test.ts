import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { requestPasswordReset, resetPassword } from '@/actions/passwordReset';

describe('Password reset contract — NO mock.module', () => {
  it('happy path: token resets the password and cannot be reused', async () => {
    const now = Date.now();
    const email = `reset-${now}@ex.com`;
    const bcrypt = await import('bcryptjs');
    const user = await prisma.user.create({
      data: { email, fullName: 'Usuario', passwordHash: await bcrypt.hash('old-password', 10), isActive: true },
    });

    await requestPasswordReset(email);

    const token = await prisma.passwordResetToken.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    assert.ok(token);

    const result = await resetPassword({ token: token!.token, newPassword: 'new-password-123' });
    assert.deepEqual(result, { success: true });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.ok(await bcrypt.compare('new-password-123', updated!.passwordHash));
    assert.equal(updated!.mustChangePassword, false);

    const reuse = await resetPassword({ token: token!.token, newPassword: 'another-password-123' });
    assert.deepEqual(reuse, { error: 'RESET_TOKEN_USED' });
  });

  it('rejects an unknown token and does not reveal whether an email exists', async () => {
    const result = await resetPassword({ token: 'does-not-exist', newPassword: 'whatever-password' });
    assert.deepEqual(result, { error: 'RESET_TOKEN_NOT_FOUND' });

    const success = await requestPasswordReset(`unknown-${Date.now()}@ex.com`);
    assert.deepEqual(success, { success: true });
  });

  it('rejects an expired token', async () => {
    const now = Date.now();
    const email = `expired-${now}@ex.com`;
    const user = await prisma.user.create({
      data: { email, fullName: 'Usuario', passwordHash: 'x', isActive: true },
    });
    const token = await prisma.passwordResetToken.create({
      data: { userId: user.id, token: `expired-token-${now}`, expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await resetPassword({ token: token.token, newPassword: 'new-password-123' });
    assert.deepEqual(result, { error: 'RESET_TOKEN_EXPIRED' });
  });

  it('rejects a weak new password', async () => {
    const result = await resetPassword({ token: 'irrelevant', newPassword: 'short' });
    assert.deepEqual(result, { error: 'WEAK_PASSWORD' });
  });
});
