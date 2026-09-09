import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import {
  UNKNOWN_IP,
  PASSWORD_RESET_EMAIL_LIMIT,
  clearRateLimit,
  getClientIp,
  isRateLimited,
  loginEmailKey,
  loginIpKey,
  passwordResetEmailKey,
  passwordResetIpKey,
  registerAttempt,
} from '@/lib/rate-limit';
import { requestPasswordReset } from '@/actions/passwordReset';

const RUN = Date.now();
const prefix = `test-rl-${RUN}`;

async function cleanupKeys(keys: string[]) {
  await prisma.rateLimitEntry.deleteMany({ where: { key: { in: keys } } });
}

describe('Rate limit contract — NO mock.module', () => {
  it('helper: allows under the limit, blocks at the limit', async () => {
    const key = `${prefix}-helper-block`;
    const limit = 3;
    const windowMs = 60_000;
    try {
      assert.equal(await isRateLimited(key, limit, windowMs), false);
      await registerAttempt(key, windowMs);
      await registerAttempt(key, windowMs);
      assert.equal(await isRateLimited(key, limit, windowMs), false);
      await registerAttempt(key, windowMs);
      assert.equal(await isRateLimited(key, limit, windowMs), true);
    } finally {
      await cleanupKeys([key]);
    }
  });

  it('helper: clearRateLimit releases a blocked key', async () => {
    const key = `${prefix}-helper-clear`;
    const limit = 2;
    const windowMs = 60_000;
    try {
      await registerAttempt(key, windowMs);
      await registerAttempt(key, windowMs);
      assert.equal(await isRateLimited(key, limit, windowMs), true);
      await clearRateLimit(key);
      assert.equal(await isRateLimited(key, limit, windowMs), false);
    } finally {
      await cleanupKeys([key]);
    }
  });

  it('helper: an expired window releases the key (via now param)', async () => {
    const key = `${prefix}-helper-expiry`;
    const limit = 2;
    const windowMs = 60_000;
    const start = Date.now();
    try {
      await registerAttempt(key, windowMs, start);
      await registerAttempt(key, windowMs, start);
      assert.equal(await isRateLimited(key, limit, windowMs, start), true);
      // Future now past the window: not limited, and next attempt resets the counter.
      const future = start + windowMs + 1000;
      assert.equal(await isRateLimited(key, limit, windowMs, future), false);
      await registerAttempt(key, windowMs, future);
      assert.equal(await isRateLimited(key, limit, windowMs, future), false);
    } finally {
      await cleanupKeys([key]);
    }
  });

  it('requestPasswordReset: 5 requests succeed, the 6th is TOO_MANY_ATTEMPTS', async () => {
    const email = `rl-reset-${RUN}@ex.com`;
    const emailKey = passwordResetEmailKey(email);
    const bcrypt = await import('bcryptjs');
    const user = await prisma.user.create({
      data: { email, fullName: 'Usuario', passwordHash: await bcrypt.hash('x', 10), isActive: true },
    });
    try {
      for (let i = 0; i < PASSWORD_RESET_EMAIL_LIMIT; i++) {
        assert.deepEqual(await requestPasswordReset(email), { success: true });
      }
      assert.deepEqual(await requestPasswordReset(email), { error: 'TOO_MANY_ATTEMPTS' });
    } finally {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await cleanupKeys([emailKey]);
    }
  });

  it('requestPasswordReset: limited response is identical for unknown emails (no enumeration)', async () => {
    const unknownEmail = `rl-unknown-${RUN}@ex.com`;
    const unknownKey = passwordResetEmailKey(unknownEmail);
    try {
      // Unknown email: every request (including the first 5) returns success.
      for (let i = 0; i < PASSWORD_RESET_EMAIL_LIMIT; i++) {
        assert.deepEqual(await requestPasswordReset(unknownEmail), { success: true });
      }
      const limitedUnknown = await requestPasswordReset(unknownEmail);
      assert.deepEqual(limitedUnknown, { error: 'TOO_MANY_ATTEMPTS' });

      // A second unknown email driven to the limit yields the identical shape.
      const otherUnknown = `rl-unknown-2-${RUN}@ex.com`;
      const otherKey = passwordResetEmailKey(otherUnknown);
      try {
        for (let i = 0; i < PASSWORD_RESET_EMAIL_LIMIT; i++) {
          await requestPasswordReset(otherUnknown);
        }
        assert.deepEqual(await requestPasswordReset(otherUnknown), limitedUnknown);
      } finally {
        await cleanupKeys([otherKey]);
      }
    } finally {
      await cleanupKeys([unknownKey]);
    }
  });

  it('getClientIp outside a request context returns unknown', async () => {
    assert.equal(await getClientIp(), UNKNOWN_IP);
    assert.equal(UNKNOWN_IP, 'unknown');
  });

  it('key builders normalize email (trim + lowercase)', async () => {
    assert.equal(loginEmailKey('  User@Ex.COM '), loginEmailKey('user@ex.com'));
    assert.equal(passwordResetEmailKey('  User@Ex.COM '), passwordResetEmailKey('user@ex.com'));
    assert.equal(loginIpKey('1.2.3.4'), 'login:ip:1.2.3.4');
    assert.equal(passwordResetIpKey('1.2.3.4'), 'password-reset:ip:1.2.3.4');
  });
});
