import { isAddress, isHex32, ZERO_HASH } from './bytes.js';
import type { Address, Hex } from './bytes.js';
import { canonicalize } from './canonical.js';
import type { JsonValue } from './canonical.js';

export const RECORD_VERSION = 1;

export type DecisionKind = 'buy' | 'sell' | 'pass';

/** What the agent intends to trade. Amounts are integer strings in token base units. */
export interface TradeIntent {
  chainId: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  maxSlippageBps: number;
}

export interface AssetRef {
  symbol: string;
  address: Address;
}

/**
 * A tool call the agent made while deciding. Only salted hashes are kept in the
 * record, so revealing a record never reveals tool arguments or results.
 * `args` = toolHash(argsSalt, args), `result` = toolHash(resultSalt, result).
 */
export interface ToolCallRef {
  name: string;
  args: Hex;
  result: Hex;
}

/** One decision, including passes. Its canonical JSON is what gets hashed and sealed. */
export interface DecisionRecord {
  v: 1;
  agentId: Hex;
  seq: number;
  /** Milliseconds since epoch, as reported by the recorder. The seal block is the trusted time. */
  ts: number;
  kind: DecisionKind;
  /** null for passes. */
  intent: TradeIntent | null;
  asset: AssetRef;
  context: { [key: string]: JsonValue };
  /** The agent's reasoning in its own words. Empty only when autoCaptured is true. */
  reasoning: string;
  toolCalls: ToolCallRef[];
  /** Leaf of record seq - 1; ZERO_HASH for seq 0. */
  prev: Hex;
  /**
   * True when the agent traded without calling record_decision and the recorder
   * captured the trade itself (lenient mode). Such trades do not count as sealed
   * reasoning in seal coverage.
   */
  autoCaptured: boolean;
}

export class RecordError extends Error {
  override name = 'RecordError';
  constructor(readonly problems: string[]) {
    super(`Invalid decision record: ${problems.join('; ')}`);
  }
}

const RECORD_KEYS = [
  'agentId',
  'asset',
  'autoCaptured',
  'context',
  'intent',
  'kind',
  'prev',
  'reasoning',
  'seq',
  'toolCalls',
  'ts',
  'v',
];
const INTENT_KEYS = ['amountIn', 'chainId', 'maxSlippageBps', 'tokenIn', 'tokenOut'];
const ASSET_KEYS = ['address', 'symbol'];
const TOOL_KEYS = ['args', 'name', 'result'];
const UINT_STRING = /^(?:0|[1-9][0-9]*)$/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isSafeUint = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function exactKeys(obj: Record<string, unknown>, keys: string[], where: string, out: string[]): void {
  const have = Object.keys(obj).sort();
  const missing = keys.filter((k) => !have.includes(k));
  const extra = have.filter((k) => !keys.includes(k));
  if (missing.length) out.push(`${where} is missing ${missing.join(', ')}`);
  if (extra.length) out.push(`${where} has unknown field ${extra.join(', ')}`);
}

/** Every reason a value is not a valid v1 decision record. Empty means valid. */
export function recordProblems(value: unknown): string[] {
  const p: string[] = [];
  if (!isPlainObject(value)) return ['record must be an object'];
  const r = value;
  exactKeys(r, RECORD_KEYS, 'record', p);

  if (r.v !== RECORD_VERSION) p.push(`v must be ${RECORD_VERSION}`);
  if (!isHex32(r.agentId)) p.push('agentId must be 32 bytes of lowercase hex');
  if (!isSafeUint(r.seq)) p.push('seq must be a non-negative safe integer');
  if (!isSafeUint(r.ts)) p.push('ts must be a non-negative safe integer (ms)');
  if (r.kind !== 'buy' && r.kind !== 'sell' && r.kind !== 'pass') p.push('kind must be buy, sell or pass');

  if (r.kind === 'pass') {
    if (r.intent !== null) p.push('a pass must have intent: null');
  } else if (r.kind === 'buy' || r.kind === 'sell') {
    if (!isPlainObject(r.intent)) p.push('a buy or sell must have an intent');
  }
  if (isPlainObject(r.intent)) {
    const i = r.intent;
    exactKeys(i, INTENT_KEYS, 'intent', p);
    if (!Number.isSafeInteger(i.chainId) || (i.chainId as number) <= 0)
      p.push('intent.chainId must be a positive integer');
    if (!isAddress(i.tokenIn)) p.push('intent.tokenIn must be a lowercase address');
    if (!isAddress(i.tokenOut)) p.push('intent.tokenOut must be a lowercase address');
    if (i.tokenIn === i.tokenOut) p.push('intent.tokenIn and tokenOut must differ');
    if (typeof i.amountIn !== 'string' || !UINT_STRING.test(i.amountIn) || i.amountIn === '0') {
      p.push('intent.amountIn must be a positive integer string in base units, without leading zeros');
    }
    if (
      !Number.isInteger(i.maxSlippageBps) ||
      (i.maxSlippageBps as number) < 0 ||
      (i.maxSlippageBps as number) > 10_000
    ) {
      p.push('intent.maxSlippageBps must be an integer from 0 to 10000');
    }
  }

  if (!isPlainObject(r.asset)) p.push('asset must be an object');
  else {
    exactKeys(r.asset, ASSET_KEYS, 'asset', p);
    if (typeof r.asset.symbol !== 'string' || r.asset.symbol.length === 0 || r.asset.symbol.length > 64) {
      p.push('asset.symbol must be 1 to 64 characters');
    }
    if (!isAddress(r.asset.address)) p.push('asset.address must be a lowercase address');
  }

  if (!isPlainObject(r.context)) p.push('context must be an object');
  else {
    try {
      canonicalize(r.context);
    } catch (e) {
      p.push(`context is not canonical JSON: ${(e as Error).message}`);
    }
  }

  if (typeof r.reasoning !== 'string') p.push('reasoning must be a string');
  if (typeof r.autoCaptured !== 'boolean') p.push('autoCaptured must be a boolean');
  else if (r.autoCaptured) {
    if (r.kind === 'pass') p.push('only trades can be auto-captured');
    if (r.reasoning !== '') p.push('an auto-captured record has empty reasoning');
  } else if (typeof r.reasoning === 'string' && r.reasoning.trim() === '') {
    p.push('reasoning must not be empty unless autoCaptured is true');
  }
  if (typeof r.reasoning === 'string') {
    try {
      canonicalize(r.reasoning);
    } catch (e) {
      p.push(`reasoning is not valid JSON text: ${(e as Error).message}`);
    }
  }

  if (!Array.isArray(r.toolCalls)) p.push('toolCalls must be an array');
  else {
    r.toolCalls.forEach((t: unknown, n: number) => {
      if (!isPlainObject(t)) return p.push(`toolCalls[${n}] must be an object`);
      exactKeys(t, TOOL_KEYS, `toolCalls[${n}]`, p);
      if (typeof t.name !== 'string' || t.name.length === 0)
        p.push(`toolCalls[${n}].name must be a non-empty string`);
      if (!isHex32(t.args)) p.push(`toolCalls[${n}].args must be a 32-byte hash`);
      if (!isHex32(t.result)) p.push(`toolCalls[${n}].result must be a 32-byte hash`);
    });
  }

  if (!isHex32(r.prev)) p.push('prev must be 32 bytes of lowercase hex');
  else if (r.seq === 0 && r.prev !== ZERO_HASH) p.push('prev must be the zero hash for seq 0');
  else if (isSafeUint(r.seq) && r.seq > 0 && r.prev === ZERO_HASH)
    p.push('prev must be the previous leaf for seq > 0');

  return p;
}

export function isDecisionRecord(value: unknown): value is DecisionRecord {
  return recordProblems(value).length === 0;
}

export function assertDecisionRecord(value: unknown): asserts value is DecisionRecord {
  const problems = recordProblems(value);
  if (problems.length) throw new RecordError(problems);
}
