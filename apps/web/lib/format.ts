// Formatting helpers ported from design/prototype.html.

export const short = (h: string) => h.slice(0, 6) + '…' + h.slice(-4);
export const pct = (v: number, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d) + '%';
export const pctPlain = (v: number, d = 0) => (v * 100).toFixed(d) + '%';
export const money = (v: number, d = 0) =>
  '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const sMoney = (v: number) => (v >= 0 ? '+' : '−') + money(v);
export const cls = (v: number) => (v >= 0 ? 'up' : 'down');
export const N = (v: number) => v.toLocaleString('en-US');
export const smallPrice = (p: number) => (p >= 1 ? p.toFixed(2) : p.toPrecision(3));

export type TimeFormat = 'date' | 'dateY' | 'time' | 'timeS' | 'dateTime';

/** Formats a timestamp; pass timeZone 'UTC' for deterministic server output. */
export function fmtTime(t: number, f: TimeFormat, timeZone?: string): string {
  const d = new Date(t);
  const tz = timeZone ? { timeZone } : {};
  switch (f) {
    case 'date':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...tz });
    case 'dateY':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...tz });
    case 'time':
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...tz });
    case 'timeS':
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', ...tz });
    case 'dateTime':
      return `${fmtTime(t, 'date', timeZone)}, ${fmtTime(t, 'time', timeZone)}`;
  }
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const initials = (s: string) =>
  s
    .split(' ')
    .filter((w) => w.length > 1 || /\d/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
export const marketName = (m: 'stocks' | 'memes') => (m === 'stocks' ? 'Stocks' : 'Memecoins');
export const covText = (c: number) => (c >= 0.99995 ? '100%' : (c * 100).toFixed(1) + '%');
export const verbOf = (k: 'buy' | 'sell' | 'pass') =>
  k === 'buy' ? 'bought' : k === 'sell' ? 'sold' : 'passed on';
