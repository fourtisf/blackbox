'use client';
import { useEffect, useRef, useState } from 'react';
import type { EquityPoint } from '@/lib/api/types';
import { cls, fmtTime, pct, sMoney } from '@/lib/format';

function niceTicks(mn: number, mx: number, n = 4): number[] {
  const span = mx - mn || 1;
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const t0 = Math.floor(mn / step) * step;
  const t1 = Math.ceil(mx / step) * step;
  const out: number[] = [];
  for (let v = t0; v <= t1 + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}

/** Return over time, ported from drawEquity() in the prototype: glow line, gradient area, crosshair, tooltip. */
export function EquityChart({
  name,
  ranges,
}: {
  name: string;
  ranges: { '30d': EquityPoint[]; all: EquityPoint[] };
}) {
  const [range, setRange] = useState<'30d' | 'all'>('all');
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth - 30));
    ro.observe(el);
    setW(el.clientWidth - 30);
    return () => ro.disconnect();
  }, []);

  const pts = ranges[range];
  const vals = pts.map((p) => p.ret);
  const up = (vals[vals.length - 1] ?? 0) >= 0;
  const col = up ? '#3EE09A' : '#FF6B7A';
  const H = 320,
    pl = 52,
    pr = 14,
    pt = 16,
    pb = 30;
  let mn = Math.min(0, ...vals),
    mx = Math.max(0, ...vals);
  const ticks = niceTicks(mn, mx);
  mn = Math.min(mn, ticks[0]!);
  mx = Math.max(mx, ticks[ticks.length - 1]!);
  const x = (i: number) => pl + (i / Math.max(1, vals.length - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const day = (i: number) => Date.parse(pts[i]!.day + 'T12:00:00Z');
  const path = vals.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
  const area =
    path + `L${x(vals.length - 1).toFixed(1)},${y(mn).toFixed(1)}L${x(0).toFixed(1)},${y(mn).toFixed(1)}Z`;
  const nx = Math.min(W < 520 ? 3 : 6, vals.length);
  const xt = Array.from({ length: nx }, (_, k) => Math.round((k * (vals.length - 1)) / Math.max(1, nx - 1)));
  const last = vals.length - 1;

  const move = (clientX: number, svg: SVGSVGElement) => {
    const rc = svg.getBoundingClientRect();
    const i = Math.max(0, Math.min(last, Math.round(((clientX - rc.left - pl) / (W - pl - pr)) * last)));
    setHover({
      i,
      left: Math.min(rc.left + x(i) + 16, innerWidth - 190),
      top: Math.max(84, rc.top + y(vals[i]!) - 34),
    });
  };

  return (
    <section className="glass" aria-labelledby="eqH">
      <div className="card-h">
        <div>
          <h2 id="eqH">Return over time</h2>
          <p>From the agent wallet&apos;s balance at each day&apos;s close</p>
        </div>
        <div className="seg" role="group" aria-label="Chart range">
          <button type="button" aria-pressed={range === '30d'} onClick={() => setRange('30d')}>
            30D
          </button>
          <button type="button" aria-pressed={range === 'all'} onClick={() => setRange('all')}>
            All
          </button>
        </div>
      </div>
      <div className="chart" ref={box}>
        {W > 0 && vals.length > 1 && (
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${name} return over ${last} days, ending at ${pct(vals[last]!)}`}
          >
            <defs>
              <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={col} stopOpacity=".22" />
                <stop offset="1" stopColor={col} stopOpacity="0" />
              </linearGradient>
              <filter id="eqf" x="-5%" y="-20%" width="110%" height="140%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <g className="grid">
              {ticks.map((t) => (
                <line key={t} x1={pl} x2={W - pr} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
              ))}
            </g>
            <line className="zero" x1={pl} x2={W - pr} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />
            <g className="axis">
              {ticks.map((t) => (
                <text key={t} x={pl - 12} y={(y(t) + 4).toFixed(1)} textAnchor="end">
                  {t > 0 ? '+' : t < 0 ? '−' : ''}
                  {Math.abs(t * 100).toFixed(Math.abs(t) < 0.1 && t !== 0 ? 1 : 0)}%
                </text>
              ))}
              {xt.map((i) => (
                <text
                  key={i}
                  x={x(i).toFixed(1)}
                  y={H - 6}
                  textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
                >
                  {fmtTime(day(i), 'date', 'UTC')}
                </text>
              ))}
            </g>
            <path d={area} fill="url(#eqg)" />
            <path d={path} fill="none" stroke={col} strokeWidth="5" opacity=".35" filter="url(#eqf)" />
            <path
              d={path}
              fill="none"
              stroke={col}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={x(last).toFixed(1)} cy={y(vals[last]!).toFixed(1)} r="9" fill={col} opacity=".18" />
            <circle
              cx={x(last).toFixed(1)}
              cy={y(vals[last]!).toFixed(1)}
              r="4.5"
              fill={col}
              stroke="#0B0D19"
              strokeWidth="2"
            />
            {hover && (
              <g>
                <line className="xh" x1={x(hover.i)} x2={x(hover.i)} y1={pt} y2={H - pb} />
                <circle
                  r="5"
                  cx={x(hover.i)}
                  cy={y(vals[hover.i]!)}
                  fill={col}
                  stroke="#0B0D19"
                  strokeWidth="2"
                />
              </g>
            )}
            <rect
              x={pl}
              y="0"
              width={Math.max(0, W - pl - pr)}
              height={H}
              fill="transparent"
              onMouseMove={(e) => move(e.clientX, e.currentTarget.ownerSVGElement!)}
              onTouchMove={(e) => move(e.touches[0]!.clientX, e.currentTarget.ownerSVGElement!)}
              onMouseLeave={() => setHover(null)}
              onTouchEnd={() => setHover(null)}
            />
          </svg>
        )}
        {!W && <div style={{ height: H }} />}
      </div>
      <div
        className="tip"
        style={{ opacity: hover ? 1 : 0, left: hover?.left ?? 0, top: hover?.top ?? 0 }}
        aria-hidden="true"
      >
        {hover && (
          <>
            <div className="tt">{fmtTime(day(hover.i), 'dateY', 'UTC')}</div>
            <div className="tv">
              <span>Return</span>
              <b className={cls(vals[hover.i]!)}>{pct(vals[hover.i]!)}</b>
            </div>
            <div className="tv">
              <span>Profit</span>
              <span>{sMoney(pts[hover.i]!.pnl)}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
