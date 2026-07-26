import type { EmailAdapter } from './types';

export type { EmailAdapter, EmailMessage } from './types';

/** Picks the email backend: Resend if configured, console logging otherwise (dev default). */
export async function getEmailAdapter(): Promise<EmailAdapter> {
  if (process.env.RESEND_API_KEY) {
    const { resendEmailAdapter } = await import('./resend-adapter');
    return resendEmailAdapter;
  }
  const { consoleEmailAdapter } = await import('./console-adapter');
  return consoleEmailAdapter;
}

/** Sends an email via the active adapter. Best-effort by convention: callers should not let a failure here abort the calling flow. */
export async function sendEmail(message: { to: string; subject: string; html: string }): Promise<void> {
  const adapter = await getEmailAdapter();
  await adapter.send(message);
}
