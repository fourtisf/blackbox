import { ImageResponse } from 'next/og';
import { getAgent, getEquity } from '@/lib/api/server';
import { IS_DEMO } from '@/lib/config';
import { covText, pct } from '@/lib/format';

export const alt = 'Verified agent record on Blackbox';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function AgentOg({ params }: { params: { slug: string } }) {
  const a = await getAgent(params.slug);
  if (!a) return new Response('Not found', { status: 404 });
  const pts = (await getEquity(a.slug, '30d')).map((p) => p.ret);
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const line = pts
    .map((v, i) => `${(i / Math.max(1, pts.length - 1)) * 1056},${130 - ((v - mn) / (mx - mn || 1)) * 120}`)
    .join(' ');
  const color = a.ret30 >= 0 ? '#3EE09A' : '#FF6B7A';
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 72,
        background: '#07080F',
        color: '#F3F5F9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: `linear-gradient(135deg, ${a.avatar[0]}, ${a.avatar[1]})`,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.04em' }}>{a.name}</div>
            <div style={{ fontSize: 24, color: '#9CC3FF' }}>
              {a.eligible ? `Verified record, #${a.rank30} this month` : 'Recording, not ranked yet'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#A2A9BA' }}>
          {IS_DEMO ? 'Blackbox · demo data' : 'Blackbox'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 40 }}>
        <div style={{ fontSize: 104, fontWeight: 600, letterSpacing: '-0.05em', color }}>{pct(a.ret30)}</div>
        <div style={{ fontSize: 28, color: '#A2A9BA' }}>30 days, read from its wallet</div>
      </div>
      <svg width="1056" height="140" viewBox="0 0 1056 140" style={{ marginTop: 8 }}>
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div style={{ display: 'flex', gap: 40, fontSize: 26, color: '#A2A9BA', marginTop: 'auto' }}>
        <span>Sealed {covText(a.sealCoverage)}</span>
        <span>Trust score {a.trustScore ?? 'New'}</span>
        <span>Robinhood Chain</span>
      </div>
    </div>,
    size,
  );
}
