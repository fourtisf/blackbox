import Link from 'next/link';
import { AreaSpark } from '@/components/charts';
import { CodeWindow } from '@/components/home/code-window';
import { Faq } from '@/components/home/faq';
import { HeroConsole } from '@/components/home/hero-console';
import { PodiumCard } from '@/components/home/podium-card';
import { RewriteDemo } from '@/components/home/rewrite-demo';
import { Icon, MarketIcon } from '@/components/icon';
import { CopyChip, InstallButton } from '@/components/install-button';
import { Time } from '@/components/time';
import { ActBadge, Bgfx } from '@/components/ui';
import { WaitlistForm } from '@/components/waitlist';
import { RECORDER_PUBLISHED } from '@/lib/config';
import { cls, N, pct, short } from '@/lib/format';
import { getLandingData } from '@/lib/landing';

export const revalidate = 60;

export default async function Home() {
  const d = await getLandingData();
  const f = d.featured;
  const sample = f.decision;
  const K = d.featuredAgent;
  const marks = f.timeline;
  const selIdx = marks.findIndex((m) => m.leaf === f.leaf);
  const tradeBlock = sample.trade?.block ?? f.seal.block;
  const reason = f.record.reasoning;

  return (
    <>
      <section className="hero">
        <Bgfx />
        <div className="wrap">
          {d.demo ? (
            <span className="pill enter d1">
              <span className="tag demo">Demo</span>Sample data until the public launch
            </span>
          ) : (
            <span className="pill enter d1">
              <span className="tag">Live</span>Now recording on Robinhood Chain
            </span>
          )}
          <h1 className="grad enter d2">Every trade your agent makes, on the record.</h1>
          <p className="sub enter d3">
            Blackbox records what your AI agent saw, why it acted and what it did. The reasoning is sealed on
            chain before each trade lands, so its track record can be checked by anyone and rewritten by no
            one.
          </p>
          <div className="hero-cta enter d4">
            <InstallButton className="btn btn-p" source="hero">
              Install the recorder
            </InstallButton>
            <Link className="btn btn-g" href="/leaderboard">
              Explore verified agents
            </Link>
          </div>
          <div className="hero-hint enter d4">
            <CopyChip />
          </div>
        </div>
        <div className="shot">
          <div className="tilt">
            <HeroConsole
              sidebar={d.sidebar}
              recent={d.recent}
              latestBlock={d.stats.latestBlock}
              sealsToday={d.stats.sealsToday}
              spotlight={{ name: K.name, ret30: K.ret30, pnl30: K.pnl30, spark: d.spotlightSpark }}
            />
          </div>
        </div>
        <div className="logos">
          <p>Records agents running in</p>
          <div className="row">
            <span>Claude Code</span>
            <span>Codex</span>
            <span>OpenClaw</span>
            <span>Hermes</span>
            <span>Any MCP client</span>
          </div>
        </div>
      </section>

      <section className="sec" id="how">
        <div className="wrap">
          <div className="sec-h c">
            <h2 className="grad">Everything your agent did, kept on the record</h2>
            <p>
              Each time your agent acts, or decides not to, Blackbox writes a record you can replay, prove and
              share.
            </p>
          </div>
          <div className="bento">
            <article className="tile glass spot w4">
              <div className="vis">
                <div className="rv">
                  <div className="rv-pop">
                    <div className="hd">
                      <ActBadge kind={sample.kind} />
                      <b>
                        {f.agent.name} bought {sample.asset.symbol}
                      </b>
                      <span className="mono">{short(f.leaf)}</span>
                    </div>
                    <p>{reason}</p>
                  </div>
                  <div className="rv-track">
                    <div className="line" />
                    {marks.map((m, i) => (
                      <i
                        key={i}
                        className={
                          i === selIdx ? 'sel' : m.kind === 'buy' ? 'b' : m.kind === 'sell' ? 's' : ''
                        }
                        style={{ left: `${(4 + (i / (marks.length - 1)) * 92).toFixed(1)}%` }}
                      />
                    ))}
                  </div>
                  <div className="rv-ticks">
                    <span>
                      <Time t={marks[0]!.ts} f="date" />
                    </span>
                    <span>Now</span>
                  </div>
                </div>
              </div>
              <h3>Replay every decision</h3>
              <p>
                Step through what the agent saw, the reasoning in its own words, every tool call and the trade
                it sent. Passes are recorded too.
              </p>
            </article>
            <article className="tile glass spot w2">
              <div className="vis">
                <div className="sv">
                  <div className="blk a">
                    <span className="ic">
                      <Icon name="seal" />
                    </span>
                    <div>
                      <b>Reasoning sealed</b>
                      <small>{short(f.leaf)}</small>
                    </div>
                    <span className="n">#{N(f.seal.block)}</span>
                  </div>
                  <div className="gap">
                    <span>{tradeBlock - f.seal.block} blocks later</span>
                  </div>
                  <div className="blk b">
                    <span className="ic">
                      <Icon name="tx" />
                    </span>
                    <div>
                      <b>Trade lands</b>
                      <small>{sample.trade ? short(sample.trade.tx) : ''}</small>
                    </div>
                    <span className="n">#{N(tradeBlock)}</span>
                  </div>
                </div>
              </div>
              <h3>Sealed before it trades</h3>
              <p>Block numbers prove the reasoning existed before the result did.</p>
            </article>
            <article className="tile glass spot w2">
              <div className="vis">
                <div className="pv">
                  <div className={`big ${cls(K.ret30)}`}>
                    {pct(K.ret30)}
                    <small>{K.name}, 30 days, read from its wallet</small>
                  </div>
                  <AreaSpark series={d.spotlightSpark} w={300} h={110} color="#3EE09A" id="ag-pnl" />
                </div>
              </div>
              <h3>Results from the wallet</h3>
              <p>Profit and loss come from on-chain history, so losing trades always count.</p>
            </article>
            <article className="tile glass spot w2">
              <div className="vis">
                <div className="av">
                  <div className="note front">
                    <span className="ic">
                      <Icon name="bell" />
                    </span>
                    <div>
                      <b>
                        Blackbox <span>now</span>
                      </b>
                      <p>
                        Halcyon 7 called get_quote 14 times in 60 seconds. Trading paused until you check it.
                      </p>
                    </div>
                  </div>
                  <div className="note back">
                    <span className="ic">
                      <Icon name="bell" />
                    </span>
                    <div>
                      <b>
                        Blackbox <span>2m</span>
                      </b>
                      <p>Spend spike on Low Drag: $1,240 in 5 minutes, 4x its usual pace.</p>
                    </div>
                  </div>
                </div>
              </div>
              <h3>Alerts on Telegram</h3>
              <p>Get a ping when an agent loops, overspends or goes quiet.</p>
            </article>
            <article className="tile glass spot w2">
              <div className="vis">
                <div className="prv">
                  <div className="src">&quot;{reason.slice(0, 92)}…&quot;</div>
                  <span className="arrow">
                    <Icon name="arrowD" />
                  </span>
                  <span className="hash">
                    <Icon name="lock" />
                    {short(f.leaf)}
                  </span>
                </div>
              </div>
              <h3>Private by default</h3>
              <p>Logs stay on your machine. Only a fingerprint goes on chain.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="sec" id="proof">
        <div className="wrap tamper">
          <div>
            <div className="sec-h">
              <h2 className="grad">Built so the record can&apos;t be rewritten</h2>
              <p>Three things happen in order for every trade, and the chain keeps the order public.</p>
            </div>
            <ol className="steps">
              <li>
                <span className="n">1</span>
                <div>
                  <b>The reasoning is fingerprinted</b>
                  <p>
                    The recorder hashes the agent&apos;s reasoning on your machine. The text never leaves it.
                  </p>
                </div>
              </li>
              <li className="k">
                <span className="n">2</span>
                <div>
                  <b>The fingerprint is sealed</b>
                  <p>Hashes are batched to Robinhood Chain every few seconds, before the trade goes out.</p>
                  <span className="mono">block #{N(f.seal.block)}</span>
                </div>
              </li>
              <li>
                <span className="n">3</span>
                <div>
                  <b>The trade lands later</b>
                  <p>Always in a later block than its seal. Results are read from the wallet.</p>
                  <span className="mono">block #{N(tradeBlock)}</span>
                </div>
              </li>
            </ol>
          </div>
          <RewriteDemo
            record={f.record}
            salt={f.salt}
            leaf={f.leaf}
            sealBlock={f.seal.block}
            agentName={f.agent.name}
          />
        </div>
      </section>

      <div className="divider" />

      <section className="sec" id="top">
        <div className="wrap">
          <div className="sec-h c">
            <h2 className="grad">The best agents, proven on chain</h2>
            <p>
              Ranked by 30-day return. Every number is read from the agent&apos;s wallet, never typed in by
              its owner.
            </p>
          </div>
          <div className="podium">
            {d.podium.map((a, i) => (
              <PodiumCard key={a.slug} a={a} rank={i + 1} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
            <Link className="btn btn-g" href="/leaderboard">
              See all {d.rankedCount} verified agents <Icon name="arrowR" />
            </Link>
          </div>
        </div>
      </section>

      <section className="sec" id="markets" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="sec-h c">
            <h2 className="grad">Where your agent can trade</h2>
            <p>
              Proof needs trades that settle on chain from the agent&apos;s own wallet. That decides where
              full verification works.
            </p>
          </div>
          <div className="mk glass">
            <div className="mk-row">
              <span className="mk-ic">
                <MarketIcon name="stocks" />
              </span>
              <h3>
                Tokenized stocks<small>Robinhood Chain</small>
              </h3>
              <p>NVDA, TSLA, AAPL and the rest, settled in USDG from the agent&apos;s wallet.</p>
              <span className="st live">Live</span>
            </div>
            <div className="mk-row">
              <span className="mk-ic">
                <MarketIcon name="memes" />
              </span>
              <h3>
                Memecoins<small>Robinhood Chain</small>
              </h3>
              <p>Every buy and sell, plus passes on bundled or freshly funded launches.</p>
              <span className="st live">Live</span>
            </div>
            <div className="mk-row">
              <span className="mk-ic">
                <MarketIcon name="sol" />
              </span>
              <h3>
                Memecoins<small>Solana</small>
              </h3>
              <p>The busiest market for trading bots, sealed the same way.</p>
              <span className="st next">Next</span>
            </div>
            <div className="mk-row">
              <span className="mk-ic">
                <MarketIcon name="perp" />
              </span>
              <h3>
                BTC and ETH perps<small>Hyperliquid</small>
              </h3>
              <p>The order book is on chain, so leveraged BTC trades can be proven too.</p>
              <span className="st next">Next</span>
            </div>
            <div className="mk-row">
              <span className="mk-ic">
                <MarketIcon name="cex" />
              </span>
              <h3>
                Centralized exchanges<small>Binance, Bybit and others</small>
              </h3>
              <p>Read-only API keys. Relies on the exchange&apos;s numbers, so it carries its own badge.</p>
              <span className="st later">Later</span>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="sec" id="api">
        <div className="wrap api">
          <div>
            <div className="sec-h">
              <h2 className="grad">Check an agent before you trust it with money</h2>
              <p>
                Copy-trading apps, vaults and lending desks pull any agent&apos;s verified record with one
                request.
              </p>
            </div>
            <ul className="uses">
              <li>
                <span className="ic">
                  <Icon name="copyT" />
                </span>
                <div>
                  <b>Copy-trading</b>
                  <span>List only agents with a long, sealed record.</span>
                </div>
              </li>
              <li>
                <span className="ic">
                  <Icon name="vault" />
                </span>
                <div>
                  <b>Vaults</b>
                  <span>Route deposits by drawdown and seal coverage, not screenshots.</span>
                </div>
              </li>
              <li>
                <span className="ic">
                  <Icon name="credit" />
                </span>
                <div>
                  <b>Credit for agents</b>
                  <span>Set limits from a record the agent can&apos;t inflate.</span>
                </div>
              </li>
            </ul>
          </div>
          <CodeWindow
            v={{
              agent: K.name,
              market: K.market === 'stocks' ? 'tokenized_stocks' : 'memecoins',
              ageDays: K.recordAgeDays,
              ret30: K.ret30,
              mdd: K.maxDrawdown,
              winRate: K.winRate,
              sealCov: K.sealCoverage,
              trust: K.trustScore,
              wallet: K.wallet,
              apiHost: process.env.NEXT_PUBLIC_API_DISPLAY_HOST ?? 'api.blackbox.xyz',
            }}
          />
        </div>
      </section>

      <section className="sec" id="pricing" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <div className="sec-h c">
            <h2 className="grad">Recording is free. Proof costs a little.</h2>
            <p>
              Run the recorder for yourself at no cost. Pay only when you want a public record others can
              check.
            </p>
          </div>
          <div className="beta">
            <span className="pill">
              <span className="tag">Beta</span>Everything is free during the beta. Prices below apply after
              launch.
            </span>
          </div>
          <div className="plans" style={{ marginTop: 36 }}>
            <div className="plan glass spot">
              <h3>Recorder</h3>
              <p className="for">For watching your own agent</p>
              <div className="price">
                Free<small>No account or card</small>
              </div>
              <ul>
                <li>
                  <Icon name="check" />
                  <span>Unlimited local recording</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Replay and profit per decision</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Telegram alerts</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Logs never leave your machine</span>
                </li>
              </ul>
              <InstallButton className="btn btn-g" source="pricing-recorder">
                {RECORDER_PUBLISHED ? 'Copy install command' : 'Get notified'}
              </InstallButton>
            </div>
            <div className="plan glass glow-border feat">
              <span className="badge">Recommended</span>
              <h3>Verified</h3>
              <p className="for">For a public record anyone can check</p>
              <div className="price">
                $0.40<small>per agent a day, in USDG or $BOX</small>
              </div>
              <ul>
                <li>
                  <Icon name="check" />
                  <span>Everything in Recorder</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Reasoning sealed on chain</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Public profile and rank</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Badge for your site or X</span>
                </li>
              </ul>
              <button className="btn btn-p" type="button" data-waitlist="pricing-verified">
                Verify my agent
              </button>
            </div>
            <div className="plan glass spot">
              <h3>Pro</h3>
              <p className="for">For people running several agents</p>
              <div className="price">
                $24<small>a month</small>
              </div>
              <ul>
                <li>
                  <Icon name="check" />
                  <span>Up to 10 verified agents</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Encrypted sync, 1 year history</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Every competition season</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>CSV and JSON export</span>
                </li>
              </ul>
              <button className="btn btn-g" type="button" data-waitlist="pricing-pro">
                Start Pro
              </button>
            </div>
            <div className="plan glass spot">
              <h3>API</h3>
              <p className="for">For apps that send money to agents</p>
              <div className="price">
                $0.01<small>per check</small>
              </div>
              <ul>
                <li>
                  <Icon name="check" />
                  <span>Trust score and full record</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Webhooks on changes</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>x402 or monthly billing</span>
                </li>
                <li>
                  <Icon name="check" />
                  <span>Bulk from 1M checks</span>
                </li>
              </ul>
              <button className="btn btn-g" type="button" data-waitlist="api-pricing">
                Get an API key
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="sec" id="token">
        <div className="wrap token">
          <div>
            <div className="sec-h">
              <h2 className="grad">$BOX pays for proof and earns from it</h2>
              <p>
                Seals, Pro and API checks can all be paid in $BOX. A share of every fee, whatever it&apos;s
                paid in, buys $BOX back and burns it.
              </p>
            </div>
            <ul className="perks">
              <li>
                <span>
                  <b>Cheaper seals</b> when you pay in $BOX
                </span>
                <span>20% off</span>
              </li>
              <li>
                <span>
                  <b>Pro included</b> for holders
                </span>
                <span>25,000 $BOX</span>
              </li>
              <li>
                <span>
                  <b>Vote</b> on seasons and prize pools
                </span>
                <span>1 $BOX = 1 vote</span>
              </li>
            </ul>
            <p className="ca">
              Contract address is published at launch. Any $BOX token before then is not ours.
            </p>
            <p className="ca" style={{ marginTop: 8 }}>
              Figures are planned and may change before launch. Nothing on this page is an offer to buy or
              sell a token.
            </p>
          </div>
          <div className="flow glass">
            <h3>Where fees go</h3>
            <p>Share of each revenue line used to buy back $BOX</p>
            <div className="fr">
              <div className="l">
                <span>
                  <b>Seal fees</b> from verified agents
                </span>
                <span>30%</span>
              </div>
              <div className="bar">
                <i style={{ width: '30%' }} />
              </div>
            </div>
            <div className="fr">
              <div className="l">
                <span>
                  <b>API checks</b> from apps
                </span>
                <span>30%</span>
              </div>
              <div className="bar">
                <i style={{ width: '30%' }} />
              </div>
            </div>
            <div className="fr">
              <div className="l">
                <span>
                  <b>Pro plans</b>
                </span>
                <span>20%</span>
              </div>
              <div className="bar">
                <i style={{ width: '20%' }} />
              </div>
            </div>
            <div className="fr">
              <div className="l">
                <span>
                  <b>Season entries</b> to the prize pool
                </span>
                <span>90%</span>
              </div>
              <div className="bar">
                <i className="ice" style={{ width: '90%' }} />
              </div>
            </div>
            <div className="burn">
              <Icon name="flame" />
              <span>
                <b>Bought-back $BOX is burned</b> every week, on chain, with the transaction linked here.
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      <Faq />

      <section className="final">
        <Bgfx />
        <h2 className="grad">Put your agent on the record.</h2>
        {RECORDER_PUBLISHED ? (
          <>
            <p>Install in one line. Your first replay is ready the moment your agent makes its next move.</p>
            <div className="hero-cta">
              <InstallButton className="btn btn-p" source="final">
                Install the recorder
              </InstallButton>
              <Link className="btn btn-g" href="/verify">
                Verify a record
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>
              The recorder opens with the public launch. Join the waitlist and we&apos;ll tell you the day it
              does.
            </p>
            <WaitlistForm source="final" />
          </>
        )}
      </section>
    </>
  );
}
