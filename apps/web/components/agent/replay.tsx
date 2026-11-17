'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Decision, SequenceGap } from '@/lib/api/types';
import { money, N, short } from '@/lib/format';
import { outcomeView } from '@/lib/outcome';
import { BlockLink, TxLink } from '../explorer';
import { Icon } from '../icon';
import { Time } from '../time';
import { ActBadge } from '../ui';

type Policy = 'private' | 'delayed' | 'public';

const privateText = (policy: Policy) =>
  policy === 'private'
    ? 'The owner keeps this agent’s reasoning private. Its fingerprint is sealed on chain, so the record still proves when the decision was made.'
    : 'Revealed 24 hours after the decision, once the position is closed. The fingerprint is already sealed, so the text can’t change before then.';

function tagOf(d: Decision): { text: string; cls: string } | null {
  if (!d.leaf && d.trade) return { text: 'no seal', cls: 'warn' };
  if (d.late) return { text: 'late seal', cls: 'tagx late-t' };
  if (d.autoCaptured) return { text: 'no reasoning', cls: 'tagx late-t' };
  if (!d.revealed) return { text: 'private', cls: 'tagx priv-t' };
  return null;
}

function Detail({ d, policy }: { d: Decision; policy: Policy }) {
  const verb = d.kind === 'buy' ? 'Bought' : d.kind === 'sell' ? 'Sold' : 'Passed on';
  const o = outcomeView(d.outcome);
  const proofHash = d.leaf ?? d.trade?.tx ?? '';
  const offline = !d.leaf;
  return (
    <>
      <div className="d-top">
        <ActBadge kind={d.kind} />
        <h3>{d.asset.symbol}</h3>
        <span className="when">
          <Time t={d.ts} f="dateTime" />
        </span>
      </div>
      {d.trade ? (
        <p className="d-size">
          {verb} {money(d.trade.amountUsd)} at ${d.trade.price}
        </p>
      ) : (
        <p className="d-size">
          {verb} {d.asset.symbol} at ${d.price}. No order was sent.
        </p>
      )}

      {offline ? null : d.revealed ? (
        <>
          <div className="d-sec">
            <h4>What it saw</h4>
            <dl className="kv">
              {Object.entries(d.context ?? {}).map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
          <div className="d-sec">
            <h4>Why it acted</h4>
            {d.autoCaptured ? (
              <div className="offline">
                <span style={{ color: '#FF9A5C', display: 'grid' }}>
                  <Icon name="warn" />
                </span>
                <span>
                  No reasoning recorded. The agent traded without calling record_decision, so the recorder
                  captured the trade on its own. It counts as unsealed.
                </span>
              </div>
            ) : (
              <p className="quote">{d.reasoning}</p>
            )}
          </div>
          {!d.autoCaptured && (
            <div className="d-sec">
              <h4>What it called</h4>
              <div className="calls">{(d.toolCalls ?? []).map((c) => `${c.name}(${c.args})`).join('\n')}</div>
            </div>
          )}
        </>
      ) : (
        <div className="d-sec">
          <h4>Why it acted</h4>
          <div className="priv">
            <span className="ic">
              <Icon name="lockL" />
            </span>
            <span>
              <b>Reasoning private</b>
              {privateText(policy)}
            </span>
          </div>
        </div>
      )}

      <div className="d-sec">
        <h4>On chain</h4>
        {offline ? (
          <>
            <div className="offline">
              <span style={{ color: '#FF9A5C', display: 'grid' }}>
                <Icon name="warn" />
              </span>
              <span>
                No seal for this trade. The recorder was offline when it was sent. It still counts toward
                returns.
              </span>
            </div>
            {d.trade && (
              <div className="chain" style={{ marginTop: 12 }}>
                <div className="chain-row">
                  <span className="t3">Trade</span>
                  <TxLink hash={d.trade.tx} className="mono">
                    {short(d.trade.tx)}
                  </TxLink>
                  <BlockLink block={d.trade.block} className="bn">
                    #{N(d.trade.block)}
                  </BlockLink>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="chain">
              <div className="chain-row">
                <span className="t3">Seal</span>
                <TxLink hash={d.sealTx ?? ''} className="mono">
                  {short(d.leaf!)}
                </TxLink>
                <BlockLink block={d.sealBlock!} className="bn">
                  #{N(d.sealBlock!)}
                </BlockLink>
              </div>
              {d.trade && (
                <div className="chain-row">
                  <span className="t3">Trade</span>
                  <TxLink hash={d.trade.tx} className="mono">
                    {short(d.trade.tx)}
                  </TxLink>
                  <BlockLink block={d.trade.block} className="bn">
                    #{N(d.trade.block)}
                  </BlockLink>
                </div>
              )}
            </div>
            {d.late && d.trade ? (
              <div className="offline" style={{ marginTop: 10 }}>
                <span style={{ color: '#FF9A5C', display: 'grid' }}>
                  <Icon name="warn" />
                </span>
                <span>
                  Sealed {d.sealBlock! - d.trade.block} blocks after the trade landed, so it does not prove
                  the reasoning came first. It counts as unsealed.
                </span>
              </div>
            ) : d.trade ? (
              <div className="ok-note">
                <Icon name="check" />
                Sealed {d.trade.block - d.sealBlock!} blocks before the trade
              </div>
            ) : (
              <div className="ok-note">
                <Icon name="check" />
                The decision not to trade is sealed too
              </div>
            )}
          </>
        )}
      </div>

      <div className="d-sec">
        <h4>How it turned out</h4>
        <div className={`d-out ${o.c}`}>
          {o.text}
          <small>{o.sub}</small>
        </div>
      </div>
      <div className="d-acts">
        <Link className="btn btn-g btn-sm" href={`/verify/${proofHash}`}>
          <Icon name="shield" />
          Verify this record
        </Link>
        <button className="btn btn-g btn-sm" type="button" data-copy={proofHash} data-copymsg="Hash copied">
          <Icon name="copy" />
          Copy {d.leaf ? 'seal' : 'transaction'} hash
        </button>
      </div>
    </>
  );
}

export function Replay({
  decisions: ds,
  gaps,
  policy,
  now,
}: {
  decisions: Decision[];
  gaps: SequenceGap[];
  policy: Policy;
  now: number;
}) {
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => clearInterval(timer.current);
  }, []);

  const tMin = Date.parse(ds[ds.length - 1]!.ts);
  const span = Math.max(1, now - tMin);
  const posOf = (d: Decision) => 1 + ((Date.parse(d.ts) - tMin) / span) * 98;

  const select = useCallback((i: number, scroll = true) => {
    setSel(i);
    if (!scroll) return;
    const l = list.current;
    const el = l?.querySelector(`[data-i="${i}"]`);
    if (l && el) {
      const lr = l.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (er.top < lr.top || er.bottom > lr.bottom)
        l.scrollTo({
          top: l.scrollTop + (er.top - lr.top) - 60,
          behavior: reduced.current ? 'auto' : 'smooth',
        });
    }
  }, []);

  const stop = () => {
    clearInterval(timer.current);
    setPlaying(false);
  };
  const play = () => {
    if (playing) return stop();
    let i = sel === 0 ? ds.length - 1 : sel;
    select(i);
    setPlaying(true);
    timer.current = setInterval(() => {
      i--;
      if (i < 0) return stop();
      select(i);
    }, 1700);
  };

  const gapBefore = (i: number) => {
    const newer = ds[i - 1]?.seq;
    const cur = ds[i]!.seq;
    if (newer == null || cur == null) return null;
    return gaps.find((g) => g.from > cur && g.to < newer) ?? null;
  };

  return (
    <section className="glass" aria-labelledby="rpH" style={{ overflow: 'hidden' }}>
      <div className="card-h">
        <div>
          <h2 id="rpH">Replay</h2>
          <p>The last {ds.length} decisions, passes included</p>
        </div>
        <button className="btn btn-g btn-sm" type="button" id="play" onClick={play}>
          <Icon name={playing ? 'pause' : 'play'} />
          {playing ? 'Pause' : 'Play from oldest'}
        </button>
      </div>
      <div className="mini" id="mini">
        <div className="base" />
        <div className="ends">
          <span>
            <Time t={ds[ds.length - 1]!.ts} f="dateTime" />
          </span>
          <span>Now</span>
        </div>
        {ds.map((d, i) => (
          <button
            key={i}
            type="button"
            className={d.kind}
            data-i={i}
            style={{ left: `${posOf(d).toFixed(2)}%` }}
            aria-label={`${d.kind} ${d.asset.symbol}`}
            aria-current={i === sel}
            onClick={() => (stop(), select(i))}
          >
            <i />
          </button>
        ))}
      </div>
      <div className="replay">
        <div
          className="r-list"
          id="rList"
          role="listbox"
          aria-label="Decisions"
          ref={list}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const n = Math.max(0, Math.min(ds.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
            select(n);
            (list.current?.querySelector(`[data-i="${n}"]`) as HTMLElement | null)?.focus();
          }}
        >
          {ds.map((d, i) => {
            const tag = tagOf(d);
            const o = outcomeView(d.outcome);
            const gap = gapBefore(i);
            return (
              <Fragment key={i}>
                {gap && (
                  <div className="gap-row" role="note">
                    <Icon name="warn" />
                    {gap.to - gap.from + 1} decisions missing from the record · seq {N(gap.from)}–{N(gap.to)}
                  </div>
                )}
                <button
                  type="button"
                  className="r-item"
                  role="option"
                  data-i={i}
                  aria-selected={i === sel}
                  onClick={() => (stop(), select(i, false))}
                >
                  <span className="t">
                    <Time t={d.ts} f="date" />
                    <br />
                    <Time t={d.ts} f="time" />
                  </span>
                  <ActBadge kind={d.kind} />
                  <span className="a">
                    {d.asset.symbol}
                    {tag && <span className={tag.cls}>{tag.text}</span>}
                  </span>
                  <span className={`o ${o.c}`}>{o.text}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
        <div className="r-detail" id="rDetail" aria-live="polite">
          <Detail d={ds[sel]!} policy={policy} />
        </div>
      </div>
    </section>
  );
}
