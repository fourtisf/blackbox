// Sends a real confirmation email over SMTP to a server on localhost.
import { SMTPServer } from 'smtp-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMailer } from '../src/mailer.js';
import { confirmationEmail } from '../src/waitlist.js';

let server: SMTPServer;
const received: { from: string; to: string[]; raw: string }[] = [];
const PORT = 25250 + Math.floor(Math.random() * 500);

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, session, done) {
      let raw = '';
      stream.on('data', (c: Buffer) => (raw += c.toString('utf8')));
      stream.on('end', () => {
        received.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
          to: session.envelope.rcptTo.map((r) => r.address),
          raw,
        });
        done();
      });
    },
  });
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('createMailer', () => {
  it('is off without SMTP_URL', () => expect(createMailer(undefined, 'x@y.z')).toBeNull());

  it('delivers the confirmation email with unsubscribe headers', async () => {
    const send = createMailer(
      `smtp://127.0.0.1:${PORT}?ignoreTLS=true`,
      'Blackbox <hello@blackbox.example>',
    )!;
    const msg = confirmationEmail(
      { appUrl: 'https://blackbox.example', apiUrl: 'https://api.blackbox.example', secret: 's'.repeat(32) },
      'ada@example.com',
    );
    await send(msg);
    expect(received).toHaveLength(1);
    const m = received[0]!;
    m.raw = m.raw.replace(/\r\n[ \t]+/g, ' '); // unfold long headers (RFC 5322)
    expect(m.from).toBe('hello@blackbox.example');
    expect(m.to).toEqual(['ada@example.com']);
    expect(m.raw).toMatch(/Subject: Confirm your spot on the Blackbox waitlist/);
    expect(m.raw).toMatch(
      /List-Unsubscribe: <https:\/\/api\.blackbox\.example\/v1\/waitlist\/unsubscribe\?e=/,
    );
    expect(m.raw).toMatch(/List-Unsubscribe-Post: List-Unsubscribe=One-Click/);
    expect(m.raw.replace(/=\r?\n/g, '')).toContain('https://blackbox.example/waitlist/confirm?e=');
  });
});
