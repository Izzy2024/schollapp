import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { getEmailAdapter } from '@/lib/email';

describe('email adapter selection — NO mock.module', () => {
  const originalKey = process.env.RESEND_API_KEY;

  after(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it('picks the console adapter when no Resend key is configured', async () => {
    delete process.env.RESEND_API_KEY;
    const adapter = await getEmailAdapter();

    const { consoleEmailAdapter } = await import('@/lib/email/console-adapter');
    assert.equal(adapter, consoleEmailAdapter);
  });

  it('picks the Resend adapter when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const adapter = await getEmailAdapter();

    const { resendEmailAdapter } = await import('@/lib/email/resend-adapter');
    assert.equal(adapter, resendEmailAdapter);
  });
});
