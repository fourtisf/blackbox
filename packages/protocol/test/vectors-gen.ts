/**
 * Builds the golden vectors. Inputs are fixed (salts are derived from labels, not random),
 * so the output only changes when the protocol changes.
 * Run `pnpm --filter protocol vectors` to rewrite vectors.json after a deliberate protocol change.
 */
import {
  agentIdFor,
  canonicalize,
  hashPair,
  keccak256,
  leafHash,
  merkleProof,
  merkleRoot,
  PROTOCOL_VERSION,
  recordHash,
  sealDomainSeparator,
  sealRequestDigest,
  toolHash,
  utf8,
  ZERO_HASH,
} from '../src/index.js';
import type { Address, DecisionRecord, Hex, JsonValue } from '../src/index.js';

const label = (s: string): Hex => keccak256(utf8(`blackbox-vector:${s}`));

const WALLET = '0x5f2c8e4b9a1d7e3c6b0a9f8e7d6c5b4a39281706' as Address;
const AGENT_SALT = label('agent-salt');
const CHAIN_ID = 4663;
const AGENT_ID = agentIdFor(WALLET, CHAIN_ID, AGENT_SALT);
const USDG = '0x1111111111111111111111111111111111111111' as Address;
const NVDA = '0x2222222222222222222222222222222222222222' as Address;
const MOTH = '0x3333333333333333333333333333333333333333' as Address;
const ETH = '0x0000000000000000000000000000000000000000' as Address;

interface ToolVector {
  salt: Hex;
  value: JsonValue;
  hash: Hex;
}
const toolVectors: ToolVector[] = [];
function tool(name: string, args: JsonValue, result: JsonValue, tag: string) {
  const a = { salt: label(`${tag}:args`), value: args };
  const r = { salt: label(`${tag}:result`), value: result };
  const av = { ...a, hash: toolHash(a.salt, a.value) };
  const rv = { ...r, hash: toolHash(r.salt, r.value) };
  toolVectors.push(av, rv);
  return { name, args: av.hash, result: rv.hash };
}

type Draft = Omit<DecisionRecord, 'v' | 'agentId' | 'seq' | 'prev'> & { name: string };

const makeDrafts = (): Draft[] => [
  {
    name: 'stock buy with tool calls',
    ts: 1763372520123,
    kind: 'buy',
    intent: { chainId: CHAIN_ID, tokenIn: USDG, tokenOut: NVDA, amountIn: '412500000', maxSlippageBps: 50 },
    asset: { symbol: 'NVDA', address: NVDA },
    context: { price: '186.20', volumeVs10d: '1.9', rsi14: 56, spreadPct: 0.06 },
    reasoning:
      'NVDA reclaimed its 20-day average on volume 1.9x the 10-day mean. RSI is 56, not stretched. Opening 2.5% of the vault with a stop at $180.71.',
    toolCalls: [
      tool('get_quote', { symbol: 'NVDA' }, { bid: '186.18', ask: '186.22' }, 'r0t0'),
      tool('get_candles', { symbol: 'NVDA', interval: '1h', limit: 48 }, { count: 48 }, 'r0t1'),
      tool('check_risk', { sizePct: 2.5 }, { ok: true }, 'r0t2'),
    ],
    autoCaptured: false,
  },
  {
    name: 'memecoin pass with non-ASCII reasoning',
    ts: 1763372581004,
    kind: 'pass',
    intent: null,
    asset: { symbol: '$MOTH', address: MOTH },
    context: { liquidityUsd: 214000, top10HoldPct: 23, bundledWallets: 4 },
    reasoning:
      'Skipped $MOTH: 4 of the top 10 holders were funded from the same wallet 17 minutes before launch.\nNot worth it — “bundled” supply, même si le volume monte. 見送り 🚫 Tab:\there, quote: "x", backslash: \\.',
    toolCalls: [tool('check_bundles', { token: MOTH }, { bundled: 4 }, 'r1t0')],
    autoCaptured: false,
  },
  {
    name: 'stock sell, no tool calls',
    ts: 1763380001777,
    kind: 'sell',
    intent: {
      chainId: CHAIN_ID,
      tokenIn: NVDA,
      tokenOut: USDG,
      amountIn: '2214000000000000000',
      maxSlippageBps: 30,
    },
    asset: { symbol: 'NVDA', address: NVDA },
    context: { gainPct: 6.1, rsi14: 74 },
    reasoning: 'NVDA hit the 6.1% target while RSI pushed past 74. Taking profit on the full position.',
    toolCalls: [],
    autoCaptured: false,
  },
  {
    name: 'auto-captured memecoin buy (lenient mode)',
    ts: 1763380090000,
    kind: 'buy',
    intent: {
      chainId: CHAIN_ID,
      tokenIn: ETH,
      tokenOut: MOTH,
      amountIn: '50000000000000000',
      maxSlippageBps: 300,
    },
    asset: { symbol: '$MOTH', address: MOTH },
    context: {},
    reasoning: '',
    toolCalls: [],
    autoCaptured: true,
  },
  {
    name: 'pass with awkward numbers and nesting',
    ts: 1763380155555,
    kind: 'pass',
    intent: null,
    asset: { symbol: 'TSLA', address: '0x4444444444444444444444444444444444444444' as Address },
    context: {
      big: 1e21,
      tiny: 0.000001,
      tinier: 9.999999999999997e-7,
      negZero: -0,
      third: 333333333.3333333,
      nested: { z: [1, 2.5, -3], a: null, m: { yes: true, no: false } },
      '€': 'key sorting by UTF-16 code units',
      '\r': 'control character key',
    },
    reasoning: 'Skipped TSLA: spread widened to 0.11% into the close.',
    toolCalls: [],
    autoCaptured: false,
  },
];

export function buildVectors() {
  toolVectors.length = 0;
  const drafts = makeDrafts();
  let prev = ZERO_HASH;
  const records = drafts.map(({ name, ...rest }, seq) => {
    const record: DecisionRecord = { v: 1, agentId: AGENT_ID, seq, prev, ...rest };
    const salt = label(`record-salt:${seq}`);
    const canonical = canonicalize(record);
    const rh = recordHash(record);
    const leaf = leafHash(salt, rh);
    prev = leaf;
    return { name, record, canonical, recordHash: rh, salt, leaf };
  });

  const recordLeaves = records.map((r) => r.leaf);
  const synthetic = Array.from({ length: 64 }, (_, i) => label(`synthetic-leaf:${i}`));
  const batchDefs: { name: string; firstSeq: number; leaves: Hex[] }[] = [
    { name: 'trade sealed alone (root = leaf)', firstSeq: 0, leaves: recordLeaves.slice(0, 1) },
    { name: 'two leaves', firstSeq: 1, leaves: recordLeaves.slice(1, 3) },
    { name: 'three leaves (odd node promoted)', firstSeq: 1, leaves: recordLeaves.slice(1, 4) },
    { name: 'four record leaves', firstSeq: 1, leaves: recordLeaves.slice(1, 5) },
    { name: 'five leaves', firstSeq: 0, leaves: recordLeaves },
    { name: 'full batch of 64', firstSeq: 0, leaves: synthetic },
    { name: 'batch of 63 (promotion at several levels)', firstSeq: 0, leaves: synthetic.slice(0, 63) },
  ];
  const batches = batchDefs.map((b) => ({
    ...b,
    count: b.leaves.length,
    root: merkleRoot(b.leaves),
    proofs: b.leaves.map((_, i) => merkleProof(b.leaves, i)),
  }));

  const pairs = [
    [label('pair-a'), label('pair-b')],
    [label('pair-b'), label('pair-a')],
    [ZERO_HASH, label('pair-a')],
  ].map(([a, b]) => ({ a: a!, b: b!, hash: hashPair(a!, b!) }));

  const agentIds = [
    { wallet: WALLET, chainId: CHAIN_ID, salt: AGENT_SALT, agentId: AGENT_ID },
    {
      wallet: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' as Address,
      chainId: 31337,
      salt: label('anvil-agent-salt'),
      agentId: agentIdFor('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', 31337, label('anvil-agent-salt')),
    },
  ];

  const sealContract = '0x5fbdb2315678afecb367f032d93f642f64180aa3' as Address;
  const sealReq = { agentId: AGENT_ID, root: batches[3]!.root, firstSeq: 1, count: 4, deadline: 1763380200 };
  const eip712 = [
    {
      chainId: 31337,
      verifyingContract: sealContract,
      domainSeparator: sealDomainSeparator(31337, sealContract),
      request: sealReq,
      digest: sealRequestDigest(31337, sealContract, sealReq),
    },
  ];

  return {
    protocolVersion: PROTOCOL_VERSION,
    note: 'Generated by packages/protocol/scripts/gen-vectors.ts. Do not edit by hand.',
    counts: {
      records: records.length,
      batches: batches.length,
      pairs: pairs.length,
      agentIds: agentIds.length,
      toolHashes: toolVectors.length,
      eip712: eip712.length,
    },
    records,
    toolHashes: [...toolVectors],
    pairs,
    batches,
    agentIds,
    eip712,
  };
}

export type Vectors = ReturnType<typeof buildVectors>;
