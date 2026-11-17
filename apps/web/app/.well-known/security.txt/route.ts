import { SECURITY_CONTACT, SITE_URL } from '@/lib/config';

// RFC 9116 security.txt. Served only once a security contact is configured.
// Re-rendered daily so the required Expires date never goes stale.
export const revalidate = 86400;

export function GET() {
  if (!SECURITY_CONTACT) return new Response('Not found', { status: 404 });
  const contact =
    SECURITY_CONTACT.includes('@') && !SECURITY_CONTACT.startsWith('mailto:')
      ? `mailto:${SECURITY_CONTACT}`
      : SECURITY_CONTACT;
  const expires = new Date(Date.now() + 180 * 864e5).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const body = [
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    'Preferred-Languages: en, id',
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    `Policy: ${SITE_URL}/docs#reporting`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}
