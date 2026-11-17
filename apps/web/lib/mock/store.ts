/**
 * The demo dataset in API shapes. Built once per process from the ported prototype generator,
 * with real decision records, leaves, Merkle batches and proofs from packages/protocol, so the
 * verifier and the rewrite demo run the real checks on it.
 */
import {
  agentIdFor,
  keccak256,
  merkleProof,
  merkleRoot,
  recordLeaf,
  toolHash,
  utf8,
} from '@blackbox/protocol';
import type { Address, DecisionRecord, Hex, TradeIntent } from '@blackbox/protocol';
import type {
  AgentDetail,
  AgentListItem,
  AgentListQuery,
  Decision,
  EquityPoint,
  FeaturedDecision,
  FeedSeal,
  Outcome,
  Page,
  Stats,
  VerifyExample,
  VerifyResponse,
} from '../api/types';
import {
  BASE_BLOCK,
  DAY,
  genAgents,
  genDecision,
  genDecisions,
  LIVE_AGENT_IDS,
  mulberry,
  ret,
  SIDEBAR_AGENT_IDS,
} from './generator';
import type { GenAgent, GenDecision, Rng } from './generator';
import { ineligibleReasons, MIN_CLOSED_TRIPS, trustScore } from './metrics';

export const DEMO_CHAIN_ID = 4663;
export const DEMO_SEAL_REGISTRY = '0x5ea1000000000000000000000000000000000001' as Address;
const BLOCKS_PER_DAY = 345_600; // 250 ms blocks
const label = (s: string): Hex => keccak256(utf8(`blackbox-demo:${s}`));
const addressOf = (s: string) => `0x${label(s).slice(-40)}` as Address;
export const tokenAddress = (symbol: string): Address =>
  symbol === 'ETH' ? '0x0000000000000000000000000000000000000000' : addressOf(`token:${symbol}`);

/** Demo-only behaviors so every state the UI must handle has a real example. */
const REVEAL_POLICY: Record<string, 'private' | 'delayed' | 'public'> = {
  kestrel: 'public',
  'low-drag': 'public',
  'halcyon-7': 'public',
  'quiet-tern': 'public',
  tailwind: 'public',
  'night-heron': 'private',
};
const LATE_SEAL = { agent: 'ferro', index: 5 };
const AUTO_CAPTURED = { agent: 'tailwind', index: 4 };
const HIDDEN_GAP = { agent: 'pike-and-reed', indexes: [9, 10] };

interface Batch {
  root: Hex;
  firstSeq: number;
  count: number;
  block: number;
  tx: Hex;
  leaves: Hex[];
}
interface StoredDecision {
  api: Decision;
  gen: GenDecision;
  record?: DecisionRecord;
  salt?: Hex;
  batch?: Batch;
  hidden?: boolean;
}
interface StoredAgent {
  gen: GenAgent;
  agentId: Hex;
  boundBlock: number;
  detail: AgentDetail;
  /** Newest first, including hidden (gap) records. */
  decisions: StoredDecision[];
}
export interface Store {
  now: number;
  agents: StoredAgent[];
  bySlug: Map<string, StoredAgent>;
  byHash: Map<string, { agent: StoredAgent; d: StoredDecision }>;
}

const stripDollar = (p: string) => p.replace(/^\$/, '');

function toolCallsOf(calls: string[], salt: (i: number, part: string) => Hex) {
  return calls.map((c, i) => {
    const name = c.slice(0, c.indexOf('('));
    const args = c.slice(c.indexOf('(') + 1, -1);
    return {
      name,
      args,
      ref: { name, args: toolHash(salt(i, 'args'), args), result: toolHash(salt(i, 'result'), 'ok') },
    };
  });
}

function intentOf(a: GenAgent, d: GenDecision): TradeIntent | null {
  if (d.kind === 'pass') return null;
  const size = d.size ?? 0;
  const stock = a.market === 'stocks';
  const quote = stock ? 'USDG' : 'ETH';
  const big = (n: number) => BigInt(Math.max(1, Math.round(n)));
  let amountIn: bigint;
  if (d.kind === 'buy') amountIn = stock ? big(size * 1e6) : big((size / 3480) * 1e9) * 10n ** 9n;
  else amountIn = stock ? big((size / d.priceNum) * 1e6) * 10n ** 12n : big(size / d.priceNum) * 10n ** 18n;
  const [tokenIn, tokenOut] = d.kind === 'buy' ? [quote, d.asset] : [d.asset, quote];
  return {
    chainId: DEMO_CHAIN_ID,
    tokenIn: tokenAddress(tokenIn),
    tokenOut: tokenAddress(tokenOut),
    amountIn: amountIn.toString(),
    maxSlippageBps: stock ? 50 : 300,
  };
}

function outcomeOf(d: GenDecision): Outcome {
  switch (d.outcome.text) {
    case 'open':
      return { status: 'open' };
    case 'closed':
      return { status: 'closed', pnl: d.pnl!, pct: d.outcome.pct! };
    case 'realized':
      return { status: 'realized', pnl: d.pnl! };
    default:
      return { status: 'none' };
  }
}

function buildAgent(a: GenAgent, now: number): StoredAgent {
  const agentId = agentIdFor(a.owner as Address, DEMO_CHAIN_ID, label(`agent-salt:${a.id}`));
  const policy = REVEAL_POLICY[a.id] ?? 'delayed';
  const gens = genDecisions(a, now);
  const stored: StoredDecision[] = gens.map((gen) => ({ gen }) as StoredDecision);
  const baseSeq = 1200 + a.idx * 53;
  // The demo-state examples land on the first sealed trade at or after the configured index.
  const tradeAt = (from: number) =>
    stored.findIndex((s, k) => k >= from && s.gen.sealed && s.gen.kind !== 'pass');
  const lateIndex = a.id === LATE_SEAL.agent ? tradeAt(LATE_SEAL.index) : -1;
  const autoIndex = a.id === AUTO_CAPTURED.agent ? tradeAt(AUTO_CAPTURED.index) : -1;

  // Chronological pass: records, leaves and the prev chain. An offline trade has no record.
  let seq = baseSeq;
  let prev = label(`prev:${a.id}`);
  for (let k = stored.length - 1; k >= 0; k--) {
    const s = stored[k]!;
    const d = s.gen;
    if (!d.sealed) continue;
    const auto = k === autoIndex;
    const calls = toolCallsOf(auto ? [] : d.calls, (i, part) => label(`tool:${a.id}:${seq}:${i}:${part}`));
    const record: DecisionRecord = {
      v: 1,
      agentId,
      seq,
      ts: d.t,
      kind: d.kind,
      intent: intentOf(a, d),
      asset: { symbol: d.asset, address: tokenAddress(d.asset) },
      context: Object.fromEntries(d.ctx),
      reasoning: auto ? '' : d.reason,
      toolCalls: calls.map((c) => c.ref),
      prev,
      autoCaptured: auto,
    };
    const salt = label(`salt:${a.id}:${seq}`);
    s.record = record;
    s.salt = salt;
    prev = recordLeaf(record, salt);
    s.hidden = a.id === HIDDEN_GAP.agent && HIDDEN_GAP.indexes.includes(k);
    seq++;
  }

  // Seal batches: trades alone, consecutive passes up to three per batch.
  const chrono = [...stored].reverse().filter((s) => s.record);
  for (let i = 0; i < chrono.length;) {
    const s = chrono[i]!;
    const members = [s];
    if (s.gen.kind === 'pass') {
      while (members.length < 3 && chrono[i + members.length]?.gen.kind === 'pass')
        members.push(chrono[i + members.length]!);
    }
    const leaves = members.map((m) => recordLeaf(m.record!, m.salt!));
    const late = stored.indexOf(s) === lateIndex;
    const block = late ? s.gen.tBlock! + 3 : Math.max(...members.map((m) => m.gen.cBlock!));
    const batch: Batch = {
      root: merkleRoot(leaves),
      firstSeq: s.record!.seq,
      count: members.length,
      block,
      tx: label(`seal-tx:${a.id}:${s.record!.seq}`),
      leaves,
    };
    members.forEach((m) => (m.batch = batch));
    i += members.length;
  }

  // API decisions.
  for (const s of stored) {
    const d = s.gen;
    const revealed =
      !!s.record &&
      (policy === 'public' ||
        (policy === 'delayed' && now - d.t >= DAY && !(d.kind === 'buy' && d.outcome.text === 'open')));
    const late = !!s.batch && d.tBlock !== undefined && s.batch.block >= d.tBlock;
    const auto = !!s.record?.autoCaptured;
    const leaf = s.record ? recordLeaf(s.record, s.salt!) : null;
    s.api = {
      seq: s.record?.seq ?? null,
      ts: new Date(d.t).toISOString(),
      kind: d.kind,
      asset: { symbol: d.asset, address: tokenAddress(d.asset) },
      price: stripDollar(d.price),
      leaf,
      sealBlock: s.batch?.block ?? null,
      sealTx: s.batch?.tx ?? null,
      trade: d.tx
        ? { tx: d.tx as Hex, block: d.tBlock!, amountUsd: d.size!, price: stripDollar(d.price) }
        : null,
      sealed: !!s.batch && !late,
      late,
      autoCaptured: auto,
      outcome: outcomeOf(d),
      revealed,
      ...(revealed
        ? {
            reasoning: s.record!.reasoning,
            context: s.record!.context,
            toolCalls: auto
              ? []
              : d.calls.map((c) => ({
                  name: c.slice(0, c.indexOf('(')),
                  args: c.slice(c.indexOf('(') + 1, -1),
                })),
          }
        : {}),
    };
  }

  const visible = stored.filter((s) => !s.hidden);
  const hiddenSeqs = stored
    .filter((s) => s.hidden && s.record)
    .map((s) => s.record!.seq)
    .sort((x, y) => x - y);
  const gaps = hiddenSeqs.length ? [{ from: hiddenSeqs[0]!, to: hiddenSeqs[hiddenSeqs.length - 1]! }] : [];
  const closedTrips = a.age < 14 ? (a.market === 'stocks' ? 6 : 2) : Math.round(a.trades30 * 0.4);
  const series90 = a.series.slice(-91);
  const daily = series90.slice(1).map((v, i) => v / series90[i]! - 1);
  const reasons = ineligibleReasons({
    active: true,
    recordAgeDays: a.age,
    tradesInPeriod: a.trades30,
    sealCoverage30d: a.sealCov / 100,
  });

  const detail: AgentDetail = {
    agentId,
    slug: a.id,
    name: a.name,
    wallet: a.owner as Address,
    market: a.market,
    runtime: a.runtime,
    model: a.model,
    avatar: a.pair,
    recordingSince: new Date(a.since).toISOString(),
    recordAgeDays: a.age,
    boundBlock: BASE_BLOCK - a.age * BLOCKS_PER_DAY,
    rank30: null,
    eligible: reasons.length === 0,
    ineligibleReasons: reasons,
    trustScore: trustScore({
      recordAgeDays: a.age,
      sealCoverage30d: a.sealCov / 100,
      maxDrawdown90d: a.mdd,
      dailyReturns90d: daily,
      trades90d: a.age < 14 ? a.trades30 : a.trades30 * 3,
    }),
    revealPolicy: policy,
    ret30: ret(a, 30),
    pnl30: a.vault * ret(a, 30),
    ret90OrSinceStart: ret(a, 999),
    winRate: closedTrips >= MIN_CLOSED_TRIPS ? a.winRate : null,
    closedTrips,
    maxDrawdown: a.mdd,
    trades30d: a.trades30,
    sealCoverage: a.sealCov / 100,
    unsealedCount: visible.filter((s) => s.gen.kind !== 'pass' && !s.record).length,
    lateCount: visible.filter((s) => s.api.late).length,
    autoCapturedCount: visible.filter((s) => s.api.autoCaptured).length,
    sequenceGaps: gaps,
  };
  return { gen: a, agentId, boundBlock: detail.boundBlock, detail, decisions: stored };
}

/**
 * The demo clock is the start of the current hour, and the store is cached on globalThis: every
 * module copy (Next bundles route handlers and pages separately) and every process (PM2 cluster)
 * then builds identical data, so a leaf shown on a page is the leaf the demo API verifies.
 */
const HOUR = 3_600_000;
const g = globalThis as { __bbDemoStore?: Store };

export function getStore(): Store {
  const epoch = Math.floor(Date.now() / HOUR) * HOUR;
  if (g.__bbDemoStore?.now === epoch) return g.__bbDemoStore;
  const now = epoch;
  const agents = genAgents(now).map((a) => buildAgent(a, now));
  const ranked = agents.filter((s) => s.detail.eligible).sort((x, y) => y.detail.ret30 - x.detail.ret30);
  ranked.forEach((s, i) => (s.detail.rank30 = i + 1));
  const byHash = new Map<string, { agent: StoredAgent; d: StoredDecision }>();
  for (const agent of agents) {
    for (const d of agent.decisions) {
      if (d.hidden) continue;
      if (d.api.leaf) byHash.set(d.api.leaf, { agent, d });
      if (d.api.trade) byHash.set(d.api.trade.tx, { agent, d });
    }
  }
  g.__bbDemoStore = { now, agents, bySlug: new Map(agents.map((a) => [a.gen.id, a])), byHash };
  return g.__bbDemoStore;
}

/** Test hook: rebuild the dataset at a fixed time. */
export function resetStore(): void {
  delete g.__bbDemoStore;
}

// ---------- endpoints ----------

export function latestBlock(store = getStore()): number {
  return BASE_BLOCK + Math.floor((Date.now() - store.now) / 250);
}

export function stats(): Stats {
  const s = getStore();
  const covs = s.agents.map((a) => a.detail.sealCoverage).sort((x, y) => x - y);
  const mid = Math.floor(covs.length / 2);
  return {
    verifiedAgents: s.agents.length,
    trades30d: s.agents.reduce((n, a) => n + a.gen.trades30, 0),
    sealsToday: 18496,
    medianSealCoverage: covs.length % 2 ? covs[mid]! : (covs[mid - 1]! + covs[mid]!) / 2,
    latestBlock: latestBlock(s),
  };
}

function listItem(a: StoredAgent, period: number, rank: number): AgentListItem {
  return {
    rank,
    slug: a.gen.id,
    name: a.gen.name,
    wallet: a.gen.owner as Address,
    market: a.gen.market,
    runtime: a.gen.runtime,
    model: a.gen.model,
    avatar: a.gen.pair,
    ret: ret(a.gen, period),
    pnl: a.gen.vault * ret(a.gen, period),
    winRate: a.detail.winRate,
    maxDrawdown: a.gen.mdd,
    trades30d: a.gen.trades30,
    sealCoverage: a.detail.sealCoverage,
    trustScore: a.detail.trustScore,
    spark30d: a.gen.series.slice(-31),
  };
}

const SORTS: Record<string, (x: AgentListItem) => number> = {
  ret: (x) => x.ret,
  pnl: (x) => x.pnl,
  win: (x) => x.winRate ?? -1,
  mdd: (x) => x.maxDrawdown,
  trades: (x) => x.trades30d,
  cov: (x) => x.sealCoverage,
  trust: (x) => x.trustScore ?? -1,
};

/** GET /v1/agents: ranked (eligible) agents only. */
export function listAgents(q: AgentListQuery = {}): Page<AgentListItem> {
  const s = getStore();
  const period = q.period ?? 30;
  const market = q.market ?? 'all';
  const inMarket = s.agents.filter((a) => a.detail.eligible && (market === 'all' || a.gen.market === market));
  const ranked = [...inMarket].sort((x, y) => ret(y.gen, period) - ret(x.gen, period));
  const rankOf = new Map(ranked.map((a, i) => [a, i + 1]));
  const query = (q.q ?? '').trim().toLowerCase();
  const sortFn = SORTS[q.sort ?? 'ret'] ?? SORTS.ret!;
  const dir = q.dir === 'asc' ? 1 : -1;
  const rows = inMarket
    .filter((a) => !q.runtime || q.runtime === 'all' || a.gen.runtime === q.runtime)
    .filter((a) => !query || a.gen.name.toLowerCase().includes(query) || a.gen.owner.includes(query))
    .map((a) => listItem(a, period, rankOf.get(a)!))
    .sort((x, y) => (sortFn(x) - sortFn(y)) * dir || x.rank - y.rank);
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 100);
  const offset = q.cursor ? Math.max(0, parseInt(q.cursor, 10) || 0) : 0;
  const items = rows.slice(offset, offset + limit);
  return {
    items,
    nextCursor: offset + limit < rows.length ? String(offset + limit) : null,
    total: rows.length,
  };
}

/** GET /v1/agents/active: agents with the most recent seals, for the hero console sidebar. */
export function activeAgents(limit = 5): AgentListItem[] {
  const s = getStore();
  return SIDEBAR_AGENT_IDS.slice(0, limit).map((id) => {
    const a = s.bySlug.get(id)!;
    return listItem(a, 30, a.detail.rank30 ?? 0);
  });
}

/** GET /v1/agents/:slugOrWallet */
export function getAgent(slugOrWallet: string): AgentDetail | null {
  const s = getStore();
  const key = slugOrWallet.toLowerCase();
  const a = s.bySlug.get(key) ?? s.agents.find((x) => x.gen.owner === key);
  return a ? a.detail : null;
}

/** GET /v1/agents/:slug/equity?range=30d|all */
export function equity(slugName: string, range: '30d' | 'all'): EquityPoint[] | null {
  const a = getStore().bySlug.get(slugName);
  if (!a) return null;
  const L = a.gen.series.length - 1;
  const j = range === '30d' ? Math.max(0, L - 30) : 0;
  const s = a.gen.series.slice(j);
  const base = s[0]!;
  const now = getStore().now;
  return s.map((v, i) => ({
    day: new Date(now - (s.length - 1 - i) * DAY).toISOString().slice(0, 10),
    ret: v / base - 1,
    pnl: a.gen.vault * (v / base - 1),
  }));
}

/** GET /v1/agents/:slug/decisions, newest first. Hidden (unlinked) records leave a sequence gap. */
export function decisions(slugName: string): Decision[] | null {
  const a = getStore().bySlug.get(slugName);
  return a ? a.decisions.filter((d) => !d.hidden).map((d) => d.api) : null;
}

/** GET /v1/featured: Kestrel's best revealed buy, for the bento and the rewrite demo. */
export function featured(): FeaturedDecision {
  const a = getStore().bySlug.get('kestrel')!;
  const visible = a.decisions.filter((d) => !d.hidden);
  const sample =
    visible
      .filter((d) => d.gen.kind === 'buy' && d.api.sealed && d.api.revealed && (d.gen.pnl ?? 0) > 0)
      .sort((x, y) => (y.gen.pnl ?? 0) - (x.gen.pnl ?? 0))[0] ?? visible[0]!;
  const marks = visible
    .filter((d) => d !== sample)
    .slice(0, 22)
    .reverse();
  marks.splice(11, 0, sample);
  return {
    agent: { slug: a.gen.id, name: a.gen.name, avatar: a.gen.pair },
    decision: sample.api,
    record: sample.record!,
    salt: sample.salt!,
    leaf: sample.api.leaf!,
    seal: {
      block: sample.batch!.block,
      root: sample.batch!.root,
      firstSeq: sample.batch!.firstSeq,
      count: sample.batch!.count,
    },
    timeline: marks.map((m) => m.api),
  };
}

// ---------- live feed ----------

function feedEvent(
  a: GenAgent,
  d: GenDecision,
  sealBlock: number,
  tradeBlock: number | null,
  revealed: boolean,
): FeedSeal {
  return {
    agent: { slug: a.id, name: a.name, avatar: a.pair },
    kind: d.kind,
    asset: d.asset,
    amountUsd: d.size ?? null,
    sealBlock,
    tradeBlock,
    ts: new Date(d.t).toISOString(),
    ...(revealed ? { reasoning: d.reason } : {}),
  };
}

const liveAgents = () => LIVE_AGENT_IDS.map((id) => getStore().bySlug.get(id)!);
const isPublic = (a: StoredAgent) => a.detail.revealPolicy === 'public';

/** A feed stream exactly like the prototype's console: 7 seed seals, then a new one every 3 s. */
export function createFeed(): { recent: FeedSeal[]; next: () => FeedSeal } {
  const s = getStore();
  const fr: Rng = mulberry(424242);
  const live = liveAgents();
  const head = latestBlock(s);
  const recent: FeedSeal[] = [];
  for (let i = 0; i < 7; i++) {
    const a = live[i % 4]!;
    const d = genDecision(a.gen, fr, Date.now() - (i * 41 + 9) * 1000, { block: head - i * 170 - 20 });
    recent.push(feedEvent(a.gen, d, d.cBlock!, d.tBlock ?? null, isPublic(a)));
  }
  let n = 0;
  return {
    recent,
    next: () => {
      const a = live[n++ % 4]!;
      const block = latestBlock(s);
      const d = genDecision(a.gen, fr, Date.now(), { block });
      const tradeBlock = d.tBlock ? block + 2 + Math.floor(fr() * 8) : null;
      return feedEvent(a.gen, d, block, tradeBlock, isPublic(a));
    },
  };
}

// ---------- verify ----------

export function verifyLookup(hash: string): VerifyResponse {
  let q = hash.trim().toLowerCase();
  if (!q.startsWith('0x')) q = '0x' + q;
  if (q.length < 10) return { found: false };
  const s = getStore();
  let hit = s.byHash.get(q);
  if (!hit) {
    for (const [k, v] of s.byHash) {
      if (k.startsWith(q)) {
        hit = v;
        break;
      }
    }
  }
  if (!hit) return { found: false };
  const { agent, d } = hit;
  const a = agent.gen;
  const index = d.batch ? d.batch.leaves.indexOf(d.api.leaf!) : -1;
  return {
    found: true,
    agent: {
      slug: a.id,
      name: a.name,
      agentId: agent.agentId,
      wallet: a.owner as Address,
      boundBlock: agent.boundBlock,
      recordingSince: agent.detail.recordingSince,
      sealCoverage: agent.detail.sealCoverage,
    },
    decision: d.record
      ? { seq: d.record.seq, leaf: d.api.leaf!, kind: d.gen.kind, asset: d.gen.asset, ts: d.api.ts }
      : null,
    seal: d.batch
      ? {
          agentId: agent.agentId,
          root: d.batch.root,
          firstSeq: d.batch.firstSeq,
          count: d.batch.count,
          block: d.batch.block,
          tx: d.batch.tx,
          logIndex: 0,
        }
      : null,
    proof: d.batch ? merkleProof(d.batch.leaves, index) : [],
    trade: d.api.trade
      ? {
          tx: d.api.trade.tx,
          block: d.api.trade.block,
          from: a.owner as Address,
          kind: d.gen.kind,
          asset: d.gen.asset,
          ts: d.api.ts,
        }
      : null,
    reveal: d.api.revealed ? { record: d.record!, salt: d.salt! } : null,
    outcome: d.api.outcome,
    late: d.api.late,
    autoCaptured: d.api.autoCaptured,
    chain: { chainId: DEMO_CHAIN_ID, sealRegistry: DEMO_SEAL_REGISTRY },
  };
}

/** Example hashes for the verifier's "Try" chips. */
export function verifyExamples(): VerifyExample[] {
  const s = getStore();
  const first = (pred: (a: StoredAgent, d: StoredDecision) => boolean): Hex | null => {
    for (const a of s.agents)
      for (const d of a.decisions) if (!d.hidden && pred(a, d)) return (d.api.leaf ?? d.api.trade!.tx) as Hex;
    return null;
  };
  const kestrel = s.bySlug.get('kestrel')!;
  const lowDrag = s.bySlug.get('low-drag')!;
  const ex: [string, Hex | null][] = [
    ['Sealed trade', kestrel.decisions.find((d) => d.api.sealed && d.api.trade)?.api.leaf ?? null],
    ['Sealed pass', lowDrag.decisions.find((d) => d.api.sealed && d.gen.kind === 'pass')?.api.leaf ?? null],
    ['Unsealed trade', first((_, d) => !d.record && !!d.api.trade)],
    ['Late seal', first((_, d) => d.api.late)],
    ['No reasoning', first((_, d) => d.api.autoCaptured)],
  ];
  return ex
    .filter((e): e is [string, Hex] => !!e[1])
    .map(([labelText, hash]) => ({ label: labelText, hash }));
}
