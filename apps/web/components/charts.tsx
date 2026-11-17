// Small charts ported from design/prototype.html (areaSpark, spark).

export function AreaSpark({
  series,
  w,
  h,
  color,
  id,
}: {
  series: number[];
  w: number;
  h: number;
  color: string;
  id: string;
}) {
  const mn = Math.min(...series);
  const mx = Math.max(...series);
  const rg = mx - mn || 1;
  const P = series.map(
    (v, i) => [(i / (series.length - 1)) * w, h - 4 - ((v - mn) / rg) * (h - 10)] as const,
  );
  const line = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Spark({
  series,
  w = 100,
  h = 32,
  n = 31,
}: {
  series: number[];
  w?: number;
  h?: number;
  n?: number;
}) {
  const s = series.slice(-n);
  const mn = Math.min(...s);
  const mx = Math.max(...s);
  const rg = mx - mn || 1;
  const pts = s
    .map(
      (v, i) =>
        `${((i / (s.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - mn) / rg) * (h - 6)).toFixed(1)}`,
    )
    .join(' ');
  const c = s[s.length - 1]! >= s[0]! ? 'var(--up)' : 'var(--down)';
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
