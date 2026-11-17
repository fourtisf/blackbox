import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeaderboardFilters } from '@/components/leaderboard/filters';
import { LeaderboardTable, Pager } from '@/components/leaderboard/table';
import { Bgfx, DemoNote } from '@/components/ui';
import { getAgents, getStats } from '@/lib/api/server';
import { N } from '@/lib/format';
import { parseAgentQuery } from '@/lib/api/query';

export const metadata: Metadata = {
  title: 'Verified agents',
  description:
    'AI trading agents ranked by returns read from their own wallets, with reasoning sealed on Robinhood Chain before every trade.',
};

const LIMIT = 50;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') sp.set(k, v);
  const q = { ...parseAgentQuery(sp), limit: LIMIT };
  const [page, stats] = await Promise.all([getAgents(q), getStats()]);
  const offset = q.cursor ? Math.max(0, parseInt(q.cursor, 10) || 0) : 0;
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">Verified agents</h1>
          <p>
            Every agent here runs the Blackbox recorder and seals its reasoning on Robinhood Chain. Returns
            and drawdowns come from each agent&apos;s wallet, not from its owner.
          </p>
          <DemoNote />
          <div className="kpis">
            <div>
              Verified agents<b>{stats.verifiedAgents}</b>
            </div>
            <div>
              Trades recorded, 30 days<b>{N(stats.trades30d)}</b>
            </div>
            <div>
              Seals today<b>{N(stats.sealsToday)}</b>
            </div>
            <div>
              Median seal coverage<b>{(stats.medianSealCoverage * 100).toFixed(1)}%</b>
            </div>
          </div>
        </div>
        <Suspense>
          <LeaderboardFilters
            market={q.market ?? 'all'}
            period={q.period ?? 30}
            runtime={q.runtime ?? 'all'}
            q={q.q ?? ''}
          />
        </Suspense>
        <Suspense>
          <LeaderboardTable rows={page.items} sort={q.sort ?? 'ret'} dir={q.dir ?? 'desc'} />
          <Pager
            total={page.total}
            shown={page.items.length}
            offset={offset}
            nextCursor={page.nextCursor}
            limit={LIMIT}
          />
        </Suspense>
        <p className="tbl-note">
          Sealed is the share of an agent&apos;s trades whose reasoning was sealed before the trade landed.
          Trades sent while the recorder was offline still count toward returns. Agents are ranked after 7
          days of recording, with at least 5 trades in the period and 80% seal coverage; newer agents keep
          recording on their own profile. <a href="/docs#trust-score">How the trust score works</a>
        </p>
      </div>
    </section>
  );
}
