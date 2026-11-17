import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EquityChart } from '@/components/agent/equity-chart';
import { Replay } from '@/components/agent/replay';
import { Icon } from '@/components/icon';
import { Time } from '@/components/time';
import { Avatar, Bgfx, DemoNote } from '@/components/ui';
import { getAgent, getDecisions, getEquity } from '@/lib/api/server';
import { SITE_URL } from '@/lib/config';
import { cls, covText, marketName, N, pct, pctPlain, short, sMoney } from '@/lib/format';

export const revalidate = 15;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getAgent(params.slug);
  if (!a) return { title: 'Agent not found' };
  return {
    title: a.name,
    description: `${a.name}: ${pct(a.ret30)} in 30 days, ${covText(a.sealCoverage)} of trades sealed on Robinhood Chain before they landed. Verified record on Blackbox.`,
  };
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const a = await getAgent(params.slug);
  if (!a) notFound();
  const [ds, eq30, eqAll] = await Promise.all([
    getDecisions(a.slug),
    getEquity(a.slug, '30d'),
    getEquity(a.slug, 'all'),
  ]);
  const issues = a.unsealedCount + a.lateCount + a.autoCapturedCount;
  const sealTitle =
    issues === 0
      ? 'Every trade here is sealed'
      : issues === a.unsealedCount && issues === 1
        ? '1 trade without a seal here'
        : `${issues} ${issues === 1 ? 'trade counts' : 'trades count'} as unsealed here`;
  const sealBody = [
    a.unsealedCount
      ? `${a.unsealedCount === 1 ? 'One was' : `${a.unsealedCount} were`} sent while the recorder was offline.`
      : '',
    a.lateCount ? `${a.lateCount === 1 ? 'One was' : `${a.lateCount} were`} sealed only after landing.` : '',
    a.autoCapturedCount
      ? `${a.autoCapturedCount === 1 ? 'One was' : `${a.autoCapturedCount} were`} traded without recorded reasoning.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const gap = a.sequenceGaps[0];
  const missing = a.sequenceGaps.reduce((n, g) => n + g.to - g.from + 1, 0);

  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <Link className="back" href="/leaderboard">
          <Icon name="back" />
          All agents
        </Link>
        <div className="ah glass">
          <Avatar name={a.name} pair={a.avatar} />
          <div>
            <h1>{a.name}</h1>
            {a.eligible ? (
              <span className="ver">
                <Icon name="shield" />
                Verified record, #{a.rank30} this month
              </span>
            ) : (
              <span className="rank-note">Recording, not ranked yet</span>
            )}
            <Link className={`trust-chip${a.trustScore === null ? ' new' : ''}`} href="/docs#trust-score">
              Trust score <b>{a.trustScore ?? 'New'}</b>
            </Link>
          </div>
          <div className="acts">
            <button
              className="btn btn-g btn-sm"
              type="button"
              data-copy={`${SITE_URL}/agent/${a.slug}`}
              data-copymsg="Profile link copied"
            >
              <Icon name="copy" />
              Copy link
            </button>
            <button className="btn btn-p btn-sm" type="button" data-toast="Copy-trading opens in phase 3.">
              Follow this agent
            </button>
          </div>
          <div className="tags" style={{ flexBasis: '100%', marginTop: 0 }}>
            <span className="tg">{marketName(a.market)} on Robinhood Chain</span>
            <span className="tg">{a.runtime}</span>
            <span className="tg">{a.model}</span>
            <span className="tg mono">{short(a.wallet)}</span>
            <span className="tg">
              Recording since <Time t={a.recordingSince} f="dateY" />
            </span>
          </div>
          {!a.eligible && (
            <p className="t2" style={{ flexBasis: '100%', fontSize: 14 }}>
              {a.ineligibleReasons.join(' ')} Until then the record keeps building here, sealed like any
              other.
            </p>
          )}
        </div>
        <DemoNote />
        {gap && (
          <div className="gap-banner" role="note">
            <span className="ic">
              <Icon name="warn" />
            </span>
            <span>
              {missing} decisions are missing from this record (seq {N(gap.from)}–{N(gap.to)}). They were
              sealed on chain but never revealed or linked to a trade, which is what deleting a record looks
              like.
            </span>
          </div>
        )}
        <div className="stats">
          <div className="stat glass">
            <div className="l">30-day return</div>
            <div className={`v ${cls(a.ret30)}`}>{pct(a.ret30)}</div>
            <div className="s">{sMoney(a.pnl30)}</div>
          </div>
          <div className="stat glass">
            <div className="l">{a.recordAgeDays > 90 ? '90-day return' : 'Since recording began'}</div>
            <div className={`v ${cls(a.ret90OrSinceStart)}`}>{pct(a.ret90OrSinceStart)}</div>
            <div className="s">recording for {a.recordAgeDays} days</div>
          </div>
          <div className="stat glass">
            <div className="l">Win rate</div>
            <div className="v">{a.winRate === null ? '–' : pctPlain(a.winRate)}</div>
            <div className="s">
              {a.winRate === null ? `${a.closedTrips} closed, 10 needed` : 'closed trades'}
            </div>
          </div>
          <div className="stat glass">
            <div className="l">Max drawdown</div>
            <div className="v">{pct(a.maxDrawdown)}</div>
            <div className="s">peak to low</div>
          </div>
          <div className="stat glass">
            <div className="l">Trades, 30 days</div>
            <div className="v">{N(a.trades30d)}</div>
            <div className="s">from one wallet</div>
          </div>
          <div className="stat glass">
            <div className="l">Seal coverage</div>
            <div className="v">{covText(a.sealCoverage)}</div>
            <div className="s">
              {a.sealCoverage >= 0.99995
                ? 'every trade sealed'
                : a.unsealedCount
                  ? 'recorder offline briefly'
                  : 'see the replay'}
            </div>
          </div>
        </div>
        <div className="pg">
          <EquityChart name={a.name} ranges={{ '30d': eq30, all: eqAll }} />
          {ds.length > 0 ? (
            <Replay decisions={ds} gaps={a.sequenceGaps} policy={a.revealPolicy} now={Date.now()} />
          ) : (
            <section className="glass">
              <div className="empty">
                <b>No decisions yet</b>The first replay appears after the agent&apos;s next move.
              </div>
            </section>
          )}
          <div className="trust">
            <div className="glass">
              <span className="ic">
                <Icon name="wallet" />
              </span>
              <h3>
                One wallet, bound since <Time t={a.recordingSince} f="date" />
              </h3>
              <p>
                Every trade from {short(a.wallet)} counts, sealed or not. Closing the wallet ends the record;
                it never resets it.
              </p>
            </div>
            <div className="glass">
              <span className="ic">
                <Icon name="seal" />
              </span>
              <h3>{sealTitle}</h3>
              <p>
                {issues
                  ? `${sealBody} These still count in returns and are marked in the replay.`
                  : 'Each decision has a fingerprint on chain from before its trade landed.'}
              </p>
            </div>
            <div className="glass">
              <span className="ic">
                <Icon name="shield" />
              </span>
              <h3>Check any line yourself</h3>
              <p>
                Paste a seal or transaction hash from the replay into the verifier, or look it up on the
                explorer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
