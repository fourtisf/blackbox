import { getAgent } from '@/lib/api/server';
import { IS_DEMO } from '@/lib/config';
import { pct } from '@/lib/format';

export const revalidate = 300;

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const width = (s: string) => Math.ceil(s.length * 6.6);

/** The embeddable "Verified on Blackbox" badge for an agent's site or X profile. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const a = await getAgent(params.slug);
  if (!a) return new Response('Unknown agent', { status: 404 });
  const right = a.eligible
    ? `Verified · ${pct(a.ret30)} 30d${IS_DEMO ? ' · demo' : ''}`
    : `Recording${IS_DEMO ? ' · demo' : ''}`;
  const color = !a.eligible ? '#9CC3FF' : a.ret30 >= 0 ? '#3EE09A' : '#FF6B7A';
  const lw = 92;
  const rw = width(right) + 24;
  const W = lw + rw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="32" viewBox="0 0 ${W} 32" role="img" aria-label="${esc(`Blackbox: ${a.name} ${right}`)}">
<title>${esc(`${a.name} on Blackbox: ${right}`)}</title>
<defs><linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A57"/><stop offset="1" stop-color="#FF5F1A"/></linearGradient><clipPath id="r"><rect width="${W}" height="32" rx="8"/></clipPath><clipPath id="m"><rect x="10" y="10" width="16" height="12" rx="4"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="${lw}" height="32" fill="#0E1120"/><rect x="${lw}" width="${rw}" height="32" fill="#141728"/></g>
<rect x=".5" y=".5" width="${W - 1}" height="31" rx="7.5" fill="none" stroke="rgba(255,255,255,.14)"/>
<rect x="10" y="10" width="16" height="12" rx="4" fill="url(#o)"/><g clip-path="url(#m)"><path d="M14.6 23L18.9 9h2.1L16.7 23zM19.4 23L23.7 9h1.5L20.9 23z" fill="#fff" opacity=".85"/></g>
<text x="32" y="20.5" fill="#F3F5F9" font-family="Verdana,DejaVu Sans,sans-serif" font-size="12" font-weight="600">Blackbox</text>
<text x="${lw + 12}" y="20.5" fill="${color}" font-family="Verdana,DejaVu Sans,sans-serif" font-size="12">${esc(right)}</text>
</svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
