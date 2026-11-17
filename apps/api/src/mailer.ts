import { createTransport } from 'nodemailer';
import type { SendMail } from './waitlist.js';

/** SMTP mailer from SMTP_URL (e.g. smtps://user:pass@smtp.example.com:465), or null when unset. */
export function createMailer(smtpUrl: string | undefined, from: string): SendMail | null {
  if (!smtpUrl) return null;
  const transport = createTransport(smtpUrl);
  return async (m) => {
    await transport.sendMail({
      from,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
      headers: m.headers,
    });
  };
}
