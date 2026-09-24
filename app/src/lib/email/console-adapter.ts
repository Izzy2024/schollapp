import type { EmailAdapter } from './types';

// ponytail: dev default — no RESEND_API_KEY means no real inbox to send to.
// Logs instead of sending so flows that call sendEmail() work end-to-end in
// dev/tests without an email provider. Upgrade: set RESEND_API_KEY.
export const consoleEmailAdapter: EmailAdapter = {
  async send(message) {
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"`);
  },
};
