import { Resend } from 'resend';
import type { EmailAdapter } from './types';

// Activates when RESEND_API_KEY is set (see index.ts). RESEND_FROM_EMAIL must
// be a verified sender/domain in the Resend account.
export const resendEmailAdapter: EmailAdapter = {
  async send(message) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || 'no-reply@example.com';

    await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  },
};
