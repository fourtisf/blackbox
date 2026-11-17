/**
 * Response shapes of the Blackbox API (docs/05-API.md). The demo data layer and the real API
 * (Milestone 4) both serve exactly these shapes. Hashes are lowercase 0x hex, times ISO 8601 UTC,
 * returns decimals (0.229 = +22.9%), USD amounts numbers.
 */
import type { Address, DecisionRecord, Hex, JsonValue } from '@blackbox/protocol';

export type Market = 'stocks' | 'memes';
export type Kind = 'buy' | 'sell' | 'pass';
export type Period = 7 | 30 | 90;
export type SortKey = 'ret' | 'pnl' | 'win' | 'mdd' | 'trades' | 'cov' | 'trust';

export interface Stats {
  verifiedAgents: number;
  trades30d: number;
  sealsToday: number;
  medianSealCoverage: number;
  latestBlock: number;
}

export interface AgentListItem {
  /** Rank by return within the chosen market and period, independent of the current sort. */
  rank: number;
  slug: string;
  name: string;
  wallet: Address;
  market: Market;
  runtime: string;
  model: string;
  avatar: [string, string];
  ret: number;
  pnl: number;
  /** null below 10 closed round trips (shown as "–"). */
  winRate: number | null;
  maxDrawdown: number;
  trades30d: number;
  sealCoverage: number;
  /** null for agents under 14 days old (shown as "New"). */
  trustScore: number | null;
  spark30d: number[];
}

export interface AgentListQuery {
  market?: 'all' | Market;
  period?: Period;
  runtime?: string;
  q?: string;
  sort?: SortKey;
  dir?: 'desc' | 'asc';
  limit?: number;
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  /** Rows matching the filters across all pages. */
  total: number;
}

export interface SequenceGap {
  from: number;
  to: number;
}

export interface AgentDetail {
  agentId: Hex;
  slug: string;
  name: string;
  wallet: Address;
  market: Market;
  runtime: string;
  model: string;
  avatar: [string, string];
  recordingSince: string;
  recordAgeDays: number;
  boundBlock: number;
  /** null when the agent is not ranked (see eligibility). */
  rank30: number | null;
  eligible: boolean;
  /** Why the agent is not ranked yet; empty when eligible. */
  ineligibleReasons: string[];
  trustScore: number | null;
  revealPolicy: 'private' | 'delayed' | 'public';
  ret30: number;
  pnl30: number;
  ret90OrSinceStart: number;
  winRate: number | null;
  closedTrips: number;
  maxDrawdown: number;
  trades30d: number;
  sealCoverage: number;
  unsealedCount: number;
  lateCount: number;
  autoCapturedCount: number;
  sequenceGaps: SequenceGap[];
}

export interface EquityPoint {
  day: string;
  ret: number;
  pnl: number;
}

export type Outcome =
  | { status: 'open' }
  | { status: 'closed'; pnl: number; pct: number }
  | { status: 'realized'; pnl: number }
  | { status: 'none' };

export interface Decision {
  /** null for a trade the recorder never captured (offline). */
  seq: number | null;
  ts: string;
  kind: Kind;
  asset: { symbol: string; address: Address };
  /** Price when the agent decided. */
  price: string;
  leaf: Hex | null;
  sealBlock: number | null;
  sealTx: Hex | null;
  trade: { tx: Hex; block: number; amountUsd: number; price: string } | null;
  /** Sealed strictly before its trade (or a sealed pass). Auto-captured trades can be sealed too. */
  sealed: boolean;
  /** Sealed, but only after the trade landed. Counts as unsealed. */
  late: boolean;
  /** The agent traded without recording reasoning. Counts as unsealed in seal coverage. */
  autoCaptured: boolean;
  outcome: Outcome;
  revealed: boolean;
  /** Present only when revealed. */
  reasoning?: string;
  context?: Record<string, JsonValue>;
  toolCalls?: { name: string; args: string }[];
}

export interface FeaturedDecision {
  agent: { slug: string; name: string; avatar: [string, string] };
  decision: Decision;
  record: DecisionRecord;
  salt: Hex;
  leaf: Hex;
  seal: { block: number; root: Hex; firstSeq: number; count: number };
  /** The agent's recent decisions, oldest first, for the replay timeline. */
  timeline: Decision[];
}

export interface FeedSeal {
  agent: { slug: string; name: string; avatar: [string, string] };
  kind: Kind;
  asset: string;
  amountUsd: number | null;
  sealBlock: number;
  tradeBlock: number | null;
  ts: string;
  reasoning?: string;
}

export interface VerifyResponse {
  found: boolean;
  agent?: {
    slug: string;
    name: string;
    agentId: Hex;
    wallet: Address;
    boundBlock: number;
    recordingSince: string;
    sealCoverage: number;
  };
  decision?: { seq: number; leaf: Hex; kind: Kind; asset: string; ts: string } | null;
  seal?: {
    agentId: Hex;
    root: Hex;
    firstSeq: number;
    count: number;
    block: number;
    tx: Hex;
    logIndex: number;
  } | null;
  proof?: Hex[];
  trade?: { tx: Hex; block: number; from: Address; kind: Kind; asset: string; ts: string } | null;
  reveal?: { record: DecisionRecord; salt: Hex } | null;
  outcome?: Outcome | null;
  late?: boolean;
  autoCaptured?: boolean;
  /** Where the browser re-reads the Sealed log over RPC. */
  chain?: { chainId: number; sealRegistry: Address };
}

export interface VerifyExample {
  label: string;
  hash: Hex;
}

export interface ConnectCode {
  code: string;
  agentId: Hex;
  sealer: Address;
  name: string;
  runtime: string;
  model: string;
  market: Market;
  expiresAt: string;
}

export interface RecorderHealth {
  lastHeartbeat: string;
  version: string;
  mode: 'strict' | 'lenient';
  queue: number;
  lastSealBlock: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
