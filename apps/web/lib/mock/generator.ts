/**
 * Demo data generator, ported line for line from design/prototype.html so the demo shows
 * the same agents, returns and decisions as the approved prototype. The order of random
 * draws matters: changing it changes every number on the site.
 */

export const mulberry = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export type Rng = () => number;
const gauss = (r: Rng) => {
  let u = 0;
  let v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const pick = <T>(a: readonly T[], r: Rng): T => a[Math.floor(r() * a.length)]!;
export const hex = (n: number, r: Rng) => {
  let s = '';
  for (let i = 0; i < n; i++) s += '0123456789abcdef'[Math.floor(r() * 16)];
  return s;
};

export const DAY = 864e5;
export const BASE_BLOCK = 115042000;
export const BPM = 240;

export const STOCKS: Record<string, number> = {
  NVDA: 186.4,
  TSLA: 412.9,
  AAPL: 241.2,
  AMZN: 228.6,
  PLTR: 171.3,
  AMD: 242.8,
  COIN: 331.5,
  HOOD: 128.7,
  MSFT: 512.4,
  META: 701.2,
};
export const MEMES: Record<string, number> = {
  $MOTH: 0.00412,
  $PEBL: 0.0187,
  $ZORP: 0.000931,
  $GLINT: 0.0624,
  $TUBA: 0.00277,
  $KOI: 0.0113,
  $SNIB: 0.000418,
  $WARBLE: 0.0349,
};
export const RUNTIMES: Record<string, string[]> = {
  'Claude Code': ['Claude Opus 5.5', 'Claude Sonnet 5.5'],
  Codex: ['GPT-5'],
  OpenClaw: ['DeepSeek V3.1', 'Claude Sonnet 5.5', 'Qwen3'],
  Hermes: ['Hermes 4', 'Claude Sonnet 5.5', 'DeepSeek V3.1'],
};
export const RT_KEYS = Object.keys(RUNTIMES);
type MarketKey = 'stocks' | 'memes';
const NAMES: [string, MarketKey][] = [
  ['Kestrel', 'stocks'],
  ['Low Drag', 'memes'],
  ['Quiet Tern', 'stocks'],
  ['Halcyon 7', 'memes'],
  ['Basalt Desk', 'stocks'],
  ['Gannet', 'memes'],
  ['Saffron', 'stocks'],
  ['Mako', 'memes'],
  ['Nimbus', 'stocks'],
  ['Pike and Reed', 'memes'],
  ['Orbit Theta', 'stocks'],
  ['Ledgerwolf', 'memes'],
  ['Night Heron', 'stocks'],
  ['Tailwind', 'memes'],
  ['Ferro', 'stocks'],
  ['Moth Hunter', 'memes'],
];
/** Agents that only exist in the demo to show the "New" and "not ranked yet" states. */
const EXTRA: [string, MarketKey, number][] = [
  ['Wren', 'stocks', 10],
  ['Sable Flux', 'memes', 5],
];
export const PAIRS: [string, string][] = [
  ['#7C6CFF', '#3EC5FF'],
  ['#FF8E45', '#FF3D7F'],
  ['#2DD4A0', '#3B82F6'],
  ['#F472B6', '#8B5CF6'],
  ['#22D3EE', '#6366F1'],
  ['#FB7185', '#F97316'],
  ['#A78BFA', '#EC4899'],
  ['#34D399', '#06B6D4'],
];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export interface GenAgent {
  idx: number;
  id: string;
  name: string;
  market: MarketKey;
  runtime: string;
  model: string;
  age: number;
  since: number;
  series: number[];
  mdd: number;
  vault: number;
  winRate: number;
  trades30: number;
  sealCov: number;
  owner: string;
  pair: [string, string];
}

function genAgent(name: string, market: MarketKey, idx: number, now: number, fixedAge?: number): GenAgent {
  const r = mulberry(1000 + idx * 97);
  const runtime = RT_KEYS[(idx + Math.floor(r() * 4)) % 4]!;
  const model = pick(RUNTIMES[runtime]!, r);
  const drawnAge = Math.floor(34 + r() * 150);
  const age = fixedAge ?? drawnAge;
  const len = Math.min(age, 90) + 1;
  const vol = market === 'stocks' ? 0.0105 : 0.032;
  const drift = (idx < 7 ? 0.0034 : -0.0004) + (r() - 0.45) * (market === 'memes' ? 0.008 : 0.004);
  let e = 1;
  const s = [1];
  for (let k = 1; k < len; k++) {
    e *= 1 + drift + vol * gauss(r);
    e = Math.max(e, 0.25);
    s.push(e);
  }
  let peak = s[0]!;
  let mdd = 0;
  for (const v of s) {
    peak = Math.max(peak, v);
    mdd = Math.min(mdd, v / peak - 1);
  }
  const vault = market === 'stocks' ? 14000 + r() * 46000 : 3500 + r() * 21000;
  const winRate = Math.min(0.74, Math.max(0.39, 0.5 + drift * 18 + (r() - 0.5) * 0.12));
  const trades30 = Math.round(market === 'stocks' ? 46 + r() * 170 : 160 + r() * 640);
  const sealCov = r() < 0.4 ? 100 : 97.7 + r() * 2.2;
  const owner = '0x' + hex(40, r);
  return {
    idx,
    id: slug(name),
    name,
    market,
    runtime,
    model,
    age,
    since: now - age * DAY,
    series: s,
    mdd,
    vault,
    winRate,
    trades30,
    sealCov,
    owner,
    pair: PAIRS[idx % PAIRS.length]!,
  };
}

export function genAgents(now: number): GenAgent[] {
  const agents = NAMES.map(([name, market], idx) => genAgent(name, market, idx, now));
  EXTRA.forEach(([name, market, age], i) => {
    const a = genAgent(name, market, 40 + i, now, age);
    // New agents: modest results, a small sample.
    a.trades30 = market === 'stocks' ? 9 : 4;
    a.sealCov = 100;
    agents.push(a);
  });
  return agents;
}

export const ret = (a: GenAgent, n: number) => {
  const L = a.series.length - 1;
  const j = Math.max(0, L - n);
  return a.series[L]! / a.series[j]! - 1;
};

export type GenOutcome = { text: 'open' | 'closed' | 'realized' | 'none'; pct?: number };

export interface GenDecision {
  id: string;
  t: number;
  kind: 'buy' | 'sell' | 'pass';
  asset: string;
  sealed: boolean;
  price: string;
  priceNum: number;
  size?: number;
  pnl?: number;
  reason: string;
  calls: string[];
  ctx: [string, string | number][];
  outcome: GenOutcome;
  cBlock: number | null;
  commit: string | null;
  tBlock?: number;
  tx?: string;
}

const smallPrice = (p: number) => (p >= 1 ? p.toFixed(2) : p.toPrecision(3));

export function genDecision(
  a: GenAgent,
  r: Rng,
  t: number,
  opts: { kind?: 'buy' | 'sell' | 'pass'; open?: boolean; minsAgo?: number; block?: number } = {},
): GenDecision {
  const stock = a.market === 'stocks';
  const pool = stock ? STOCKS : MEMES;
  const asset = pick(Object.keys(pool), r);
  const base = pool[asset]!;
  const kind = opts.kind || (r() < 0.42 ? 'buy' : r() < 0.55 ? 'sell' : 'pass');
  const d = { id: hex(8, r), t, kind, asset, sealed: true } as GenDecision;
  if (stock) {
    const price = base * (1 + (r() - 0.5) * 0.04);
    const v = (1.4 + r() * 1.3).toFixed(1),
      rsi = Math.round(50 + r() * 14),
      sp = (0.04 + r() * 0.08).toFixed(2),
      earn = 3 + Math.floor(r() * 20);
    d.price = '$' + price.toFixed(2);
    d.priceNum = price;
    if (kind === 'buy') {
      const sz = (1.2 + r() * 3.8).toFixed(1),
        stop = (price * (0.97 - r() * 0.02)).toFixed(2);
      d.size = (a.vault * Number(sz)) / 100;
      d.reason = `${asset} reclaimed its 20-day average on volume ${v}x the 10-day mean. RSI is ${rsi}, not stretched. Opening ${sz}% of the vault with a stop at $${stop}.`;
      d.calls = [
        `get_quote("${asset}")`,
        `get_candles("${asset}", "1h", 48)`,
        `check_risk(size: ${sz}%)`,
        `swap("USDG", "${asset}", ${d.size.toFixed(2)})`,
      ];
      d.ctx = [
        ['Price', d.price],
        ['Volume vs 10-day', v + 'x'],
        ['RSI (14)', rsi],
        ['Spread', sp + '%'],
        ['Next earnings', earn + ' days'],
      ];
    } else if (kind === 'sell') {
      const win = r() < a.winRate;
      d.size = a.vault * (0.015 + r() * 0.035);
      if (win) {
        const tp = (3 + r() * 6).toFixed(1),
          rs = Math.round(70 + r() * 8);
        d.pnl = (d.size * Number(tp)) / 100;
        d.reason = `${asset} hit the ${tp}% target while RSI pushed past ${rs}. Taking profit on the full position instead of trailing, with earnings ${earn} days out.`;
        d.ctx = [
          ['Price', d.price],
          ['Gain on position', '+' + tp + '%'],
          ['RSI (14)', rs],
          ['Spread', sp + '%'],
          ['Next earnings', earn + ' days'],
        ];
      } else {
        const stop = (price * 1.002).toFixed(2),
          loss = (1.5 + r() * 2.5).toFixed(1);
        d.pnl = (-d.size * Number(loss)) / 100;
        d.reason = `${asset} closed an hour below the stop at $${stop}. Exiting as planned; the setup is no longer valid.`;
        d.ctx = [
          ['Price', d.price],
          ['Loss on position', '−' + loss + '%'],
          ['Stop', '$' + stop],
          ['Spread', sp + '%'],
          ['Next earnings', earn + ' days'],
        ];
      }
      d.calls = [`get_quote("${asset}")`, `get_position("${asset}")`, `swap("${asset}", "USDG", all)`];
    } else {
      const vv = (0.4 + r() * 0.4).toFixed(1);
      d.reason = `Skipped ${asset}: the breakout came on volume ${vv}x the 10-day mean and the spread widened to ${sp}%. Waiting for a retest instead.`;
      d.calls = [
        `get_quote("${asset}")`,
        `get_candles("${asset}", "15m", 96)`,
        `log_pass("${asset}", "low volume")`,
      ];
      d.ctx = [
        ['Price', d.price],
        ['Volume vs 10-day', vv + 'x'],
        ['RSI (14)', rsi],
        ['Spread', sp + '%'],
        ['Next earnings', earn + ' days'],
      ];
    }
  } else {
    const price = base * (1 + (r() - 0.5) * 0.3);
    const hg = Math.round(12 + r() * 40),
      hrs = 2 + Math.floor(r() * 5),
      t10 = Math.round(11 + r() * 14),
      liq = Math.round(80 + r() * 400);
    d.price = '$' + smallPrice(price);
    d.priceNum = price;
    if (kind === 'buy') {
      d.size = a.vault * (0.02 + r() * 0.05);
      const eth = (d.size / 3480).toFixed(3);
      d.reason = `${asset} holders grew ${hg}% in ${hrs} hours, the top 10 wallets hold ${t10}% and none were funded in the last day. Liquidity is $${liq}K, enough for this size under 1% impact.`;
      d.calls = [
        `get_token("${asset}")`,
        `get_holders("${asset}", 50)`,
        `check_bundles("${asset}")`,
        `swap("ETH", "${asset}", ${eth})`,
      ];
      d.ctx = [
        ['Price', d.price],
        ['Liquidity', '$' + liq + 'K'],
        ['Holders, last ' + hrs + 'h', '+' + hg + '%'],
        ['Top 10 hold', t10 + '%'],
        ['Bundled wallets', 'None found'],
      ];
    } else if (kind === 'sell') {
      const win = r() < a.winRate;
      d.size = a.vault * (0.02 + r() * 0.05);
      if (win) {
        const g = Math.round(30 + r() * 160),
          m = 10 + Math.floor(r() * 90),
          sl = (1 + r() * 4).toFixed(1);
        d.pnl = (d.size * 0.75 * g) / 100;
        d.reason = `${asset} ran +${g}% in ${m} minutes while new-holder growth slowed to ${sl}% an hour. Selling 75% and leaving a runner.`;
        d.ctx = [
          ['Price', d.price],
          ['Gain on position', '+' + g + '%'],
          ['Holder growth', sl + '% / hour'],
          ['Top 10 hold', t10 + '%'],
          ['Liquidity', '$' + liq + 'K'],
        ];
      } else {
        const l = Math.round(8 + r() * 22);
        d.pnl = (-d.size * l) / 100;
        d.reason = `Two of the top 5 ${asset} holders started selling into thin bids. Exiting before liquidity drops and taking the ${l}% loss.`;
        d.ctx = [
          ['Price', d.price],
          ['Loss on position', '−' + l + '%'],
          ['Top 5 selling', '2 wallets'],
          ['Top 10 hold', t10 + '%'],
          ['Liquidity', '$' + liq + 'K'],
        ];
      }
      d.calls = [
        `get_holders("${asset}", 10)`,
        `get_position("${asset}")`,
        `swap("${asset}", "ETH", ${win ? '0.75' : 'all'})`,
      ];
    } else {
      const k2 = 3 + Math.floor(r() * 4),
        mm = 5 + Math.floor(r() * 55);
      d.reason = `Skipped ${asset}: ${k2} of the top 10 holders were funded from the same wallet ${mm} minutes before launch.`;
      d.calls = [
        `get_token("${asset}")`,
        `get_holders("${asset}", 10)`,
        `check_bundles("${asset}")`,
        `log_pass("${asset}", "bundled supply")`,
      ];
      d.ctx = [
        ['Price', d.price],
        ['Liquidity', '$' + liq + 'K'],
        ['Holders, last ' + hrs + 'h', '+' + hg + '%'],
        ['Top 10 hold', t10 + '%'],
        ['Bundled wallets', k2 + ' of top 10'],
      ];
    }
  }
  if (kind === 'buy') {
    if (opts.open) d.outcome = { text: 'open' };
    else {
      const w = r() < a.winRate;
      const g = w ? (stock ? 1 + r() * 7 : 10 + r() * 120) : -(stock ? 0.8 + r() * 3 : 6 + r() * 30);
      d.pnl = (d.size! * g) / 100;
      d.outcome = { text: 'closed', pct: g / 100 };
    }
  } else if (kind === 'sell') d.outcome = { text: 'realized' };
  else d.outcome = { text: 'none' };
  const minsAgo = opts.minsAgo || 0;
  d.cBlock = (opts.block || BASE_BLOCK - minsAgo * BPM) - Math.floor(r() * 180);
  d.commit = '0x' + hex(64, r);
  if (kind !== 'pass') {
    d.tBlock = d.cBlock + 2 + Math.floor(r() * 9);
    d.tx = '0x' + hex(64, r);
  }
  return d;
}

/** The last 32 decisions of an agent, newest first. Exactly the prototype's sequence. */
export function genDecisions(a: GenAgent, now: number): GenDecision[] {
  const r = mulberry(5000 + a.idx * 131);
  const out: GenDecision[] = [];
  let mins = 6 + Math.floor(r() * 30);
  const off = a.sealCov < 100 ? 7 + Math.floor(r() * 16) : -1;
  const total = a.age < 14 ? Math.min(32, a.trades30 + 6) : 32;
  for (let k = 0; k < total; k++) {
    const opts: { minsAgo: number; open: boolean; kind?: 'buy' } = {
      minsAgo: mins,
      open: k < 3 && r() < 0.7,
    };
    if (k === off) opts.kind = 'buy';
    const d = genDecision(a, r, now - mins * 60000, opts);
    if (k === off) {
      d.sealed = false;
      d.commit = null;
      d.cBlock = null;
    }
    out.push(d);
    mins += a.market === 'stocks' ? 38 + Math.floor(r() * 250) : 11 + Math.floor(r() * 95);
  }
  return out;
}

/** Seed decisions for the hero console's live feed. */
export const LIVE_AGENT_IDS = ['kestrel', 'low-drag', 'halcyon-7', 'quiet-tern'];
export const SIDEBAR_AGENT_IDS = ['kestrel', 'low-drag', 'halcyon-7', 'quiet-tern', 'basalt-desk'];
