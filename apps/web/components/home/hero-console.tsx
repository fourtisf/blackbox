'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchLatestBlock, subscribeFeed } from '@/lib/api/client';
import type { AgentListItem, FeedSeal } from '@/lib/api/types';
import { IS_DEMO } from '@/lib/config';
import { cls, marketName, money, N, pct, sMoney, verbOf } from '@/lib/format';
import { AreaSpark } from '../charts';
import { Icon } from '../icon';
import { Time } from '../time';
import { ActBadge, Avatar } from '../ui';

interface Row {
  key: number;
  seal: FeedSeal;
  sealing: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The canvas waveform, ported from startWave() in the prototype. */
function Waveform() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let seed = 9;
    const r = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let w = 0;
    let h = 0;
    const size = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const gap = 5;
    const mk = () => {
      const ev = r() < 0.045;
      return { h: ev ? 0.5 + r() * 0.42 : 0.06 + Math.pow(r(), 2.2) * 0.5, ev };
    };
    const bars = Array.from({ length: 600 }, mk);
    let off = 0;
    let last = performance.now();
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.fillRect(0, h / 2, w, 1);
      const count = Math.ceil(w / gap) + 2;
      for (let i = 0; i < count; i++) {
        const b = bars[i]!;
        const x = i * gap - off;
        const bh = Math.max(2, b.h * h * 0.86);
        if (b.ev) {
          ctx.shadowColor = 'rgba(255,106,31,.95)';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#FF7F38';
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(156,195,255,.34)';
        }
        const y = h / 2 - bh / 2;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, 2.2, bh, 1.1);
          ctx.fill();
        } else ctx.fillRect(x, y, 2.2, bh);
      }
      ctx.shadowBlur = 0;
    };
    const frame = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      off += dt * 0.035;
      while (off >= gap) {
        off -= gap;
        bars.shift();
        bars.push(mk());
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    if (prefersReducedMotion()) draw();
    else raf = requestAnimationFrame(frame);
    let rz: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => (size(), draw()), 120);
    };
    addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
    };
  }, []);
  return <canvas ref={ref} id="wave" aria-hidden="true" />;
}

function FeedRow({ row }: { row: Row }) {
  const s = row.seal;
  return (
    <li className={row.sealing ? 'new' : undefined}>
      <span className="t">
        <Time t={s.ts} f="timeS" />
      </span>
      <ActBadge kind={s.kind} />
      <span className="w">
        <b>{s.agent.name}</b> {verbOf(s.kind)} {s.asset}
        {s.amountUsd ? (
          <>
            {' '}
            <span className="t3">{money(s.amountUsd)}</span>
          </>
        ) : null}
      </span>
      {row.sealing ? (
        <span className="seal">
          <i className="sp" />
          Sealing
        </span>
      ) : (
        <span className="seal ok">
          <Icon name="lock" /> #{N(s.sealBlock)}
        </span>
      )}
    </li>
  );
}

function SealCard({ s }: { s: FeedSeal }) {
  return (
    <>
      <div className="hd">
        <Avatar name={s.agent.name} pair={s.agent.avatar} size={26} />
        <b>{s.agent.name}</b>
        <span className="t3" style={{ marginLeft: 'auto' }}>
          <ActBadge kind={s.kind} />
        </span>
      </div>
      <p className="rs">
        {s.reasoning ?? 'Reasoning private. Only the fingerprint is on chain until the owner reveals it.'}
      </p>
      <div className="tl">
        <div>
          <span>Seal</span>
          <span>#{N(s.sealBlock)}</span>
        </div>
        {s.tradeBlock ? (
          <div>
            <span>Trade</span>
            <span>#{N(s.tradeBlock)}</span>
          </div>
        ) : (
          <div>
            <span>No trade sent</span>
            <span>pass</span>
          </div>
        )}
      </div>
      <div className="okline">
        <Icon name="check" />
        {s.tradeBlock
          ? `Sealed ${s.tradeBlock - s.sealBlock} blocks before the trade`
          : 'The pass itself is sealed'}
      </div>
    </>
  );
}

export function HeroConsole(props: {
  sidebar: AgentListItem[];
  recent: FeedSeal[];
  latestBlock: number;
  sealsToday: number;
  spotlight: { name: string; ret30: number; pnl30: number; spark: number[] };
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    props.recent.map((seal, i) => ({ key: -i - 1, seal, sealing: false })),
  );
  const [card, setCard] = useState<FeedSeal | undefined>(props.recent[0]);
  const [sealed, setSealed] = useState(props.sealsToday);
  const [block, setBlock] = useState(props.latestBlock);
  const keyRef = useRef(0);

  useEffect(() => {
    const t0 = performance.now();
    let base = props.latestBlock;
    const tick = setInterval(() => setBlock(base + Math.floor((performance.now() - t0) / 250)), 1000);
    // The real API is the source of truth for the block number; re-sync every 30 s.
    const sync = IS_DEMO
      ? undefined
      : setInterval(
          () =>
            fetchLatestBlock()
              .then((b) => (base = b.block - Math.floor((performance.now() - t0) / 250)))
              .catch(() => {}),
          30_000,
        );
    return () => {
      clearInterval(tick);
      if (sync) clearInterval(sync);
    };
  }, [props.latestBlock]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = subscribeFeed((seal) => {
      const key = ++keyRef.current;
      setRows((r) => [{ key, seal, sealing: true }, ...r].slice(0, 7));
      timers.push(
        setTimeout(() => {
          setRows((r) => r.map((x) => (x.key === key ? { ...x, sealing: false } : x)));
          setSealed((n) => n + 1);
          setCard(seal);
        }, 1100),
      );
    });
    return () => {
      stop();
      timers.forEach(clearTimeout);
    };
  }, []);

  const sp = props.spotlight;
  return (
    <div className="console" aria-label="Blackbox recorder, live feed">
      <aside className="c-side">
        <div className="dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="c-ag on">
          <span
            className="ava"
            style={{ ['--a' as string]: '#FF8E45', ['--b' as string]: '#FF5F1A', width: 28, height: 28 }}
          >
            <Icon name="lock" />
          </span>
          <div className="nm">
            <b>All agents</b>
            <small>Live feed</small>
          </div>
        </div>
        <h4>Recording</h4>
        {props.sidebar.map((a) => (
          <div className="c-ag" key={a.slug}>
            <Avatar name={a.name} pair={a.avatar} size={28} />
            <div className="nm">
              <b>{a.name}</b>
              <small>{marketName(a.market)}</small>
            </div>
            <span className={`rt ${cls(a.ret)}`}>{pct(a.ret, 0)}</span>
          </div>
        ))}
        <div className="foot">
          Seals today
          <b id="sealCount" className="num">
            {N(sealed)}
          </b>
        </div>
      </aside>
      <div className="c-main">
        <div className="c-top">
          <span className="rec">
            <i />
            REC
          </span>
          <b>Live decisions</b>
          <span className="cblk">
            block <b id="blk">{N(block)}</b>
          </span>
        </div>
        <div className="wave">
          <Waveform />
          <span className="ph" />
        </div>
        <ol className="feed" id="feed" aria-live="off">
          {rows.map((row) => (
            <FeedRow key={row.key} row={row} />
          ))}
        </ol>
      </div>
      <aside className="c-right">
        <h4>Latest seal</h4>
        <div className="c-card" id="sealCard">
          {card && <SealCard s={card} />}
        </div>
        <h4>{sp.name}, last 30 days</h4>
        <div className="c-card">
          <div className="c-mini">
            <div>
              <b className={cls(sp.ret30)}>{pct(sp.ret30)}</b>
              <div className="t3" style={{ fontSize: 12 }}>
                {sMoney(sp.pnl30)} from the wallet
              </div>
            </div>
          </div>
          <div style={{ height: 58, marginTop: 10 }}>
            <AreaSpark series={sp.spark} w={260} h={58} color="#3EE09A" id="ag-console" />
          </div>
        </div>
      </aside>
    </div>
  );
}
