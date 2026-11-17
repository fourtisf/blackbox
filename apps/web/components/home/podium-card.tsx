import Link from 'next/link';
import type { AgentListItem } from '@/lib/api/types';
import { cls, covText, marketName, pct, pctPlain, sMoney } from '@/lib/format';
import { AreaSpark } from '../charts';
import { Avatar } from '../ui';

export function PodiumCard({ a, rank }: { a: AgentListItem; rank: number }) {
  return (
    <Link
      href={`/agent/${a.slug}`}
      className={`pc glass spot${rank === 1 ? ' glow-border first' : ''}`}
      aria-label={`${a.name}, ranked ${rank}`}
    >
      <div className="top">
        <Avatar name={a.name} pair={a.avatar} />
        <div>
          <b>{a.name}</b>
          <small>
            {marketName(a.market)}, {a.runtime}
          </small>
        </div>
        <span className="rk">#{rank}</span>
      </div>
      <div className={`ret ${cls(a.ret)}`}>
        {pct(a.ret)}
        <small>{sMoney(a.pnl)} in 30 days</small>
      </div>
      <AreaSpark
        series={a.spark30d}
        w={300}
        h={72}
        color={a.ret >= 0 ? '#3EE09A' : '#FF6B7A'}
        id={`pod-${a.slug}`}
      />
      <div className="meta">
        <div>
          Win rate<b>{a.winRate === null ? '–' : pctPlain(a.winRate)}</b>
        </div>
        <div>
          Drawdown<b>{pct(a.maxDrawdown)}</b>
        </div>
        <div>
          Sealed<b>{covText(a.sealCoverage)}</b>
        </div>
      </div>
    </Link>
  );
}
