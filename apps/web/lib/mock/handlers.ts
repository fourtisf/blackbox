/** Routes the demo API at /mock-api/v1/* to the demo store. Same paths and shapes as docs/05-API.md. */
import { parseAgentQuery } from '../api/query';
import type { ConnectCode, RecorderHealth } from '../api/types';
import {
  activeAgents,
  decisions,
  equity,
  featured,
  getAgent,
  getStore,
  latestBlock,
  listAgents,
  stats,
  verifyExamples,
  verifyLookup,
} from './store';

export interface MockResult {
  status: number;
  body: unknown;
}

const notFound = (what: string): MockResult => ({
  status: 404,
  body: { error: { code: 'not_found', message: `${what} not found` } },
});
const ok = (body: unknown): MockResult => ({ status: 200, body });

export const DEMO_CONNECT_CODE = 'DEMO-7Q4K';

export function demoConnectCode(code: string): ConnectCode | null {
  if (code.toUpperCase() !== DEMO_CONNECT_CODE) return null;
  return {
    code: DEMO_CONNECT_CODE,
    agentId: '0x7a1c9e4d2b8f6a3c5e0d1b9a8c7f6e5d4c3b2a1908f7e6d5c4b3a29180716253',
    sealer: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
    name: 'My first agent',
    runtime: 'Claude Code',
    model: 'Claude Sonnet 5.5',
    market: 'stocks',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  };
}

export function demoRecorderHealth(): RecorderHealth {
  return {
    lastHeartbeat: new Date(Date.now() - 34_000).toISOString(),
    version: '0.1.0',
    mode: 'lenient',
    queue: 0,
    lastSealBlock: latestBlock() - 37,
  };
}

export function handleMock(path: string[], sp: URLSearchParams): MockResult {
  const [a, b, c] = path;
  if (a === 'stats') return ok(stats());
  if (a === 'blocks' && b === 'latest') return ok({ block: latestBlock() });
  if (a === 'featured') return ok(featured());
  if (a === 'agents' && !b) return ok(listAgents(parseAgentQuery(sp)));
  if (a === 'agents' && b === 'active') return ok({ items: activeAgents(Number(sp.get('limit') ?? 5)) });
  if (a === 'agents' && b && !c) return getAgent(b) ? ok(getAgent(b)) : notFound('Agent');
  if (a === 'agents' && b && c === 'equity') {
    const pts = equity(b, sp.get('range') === '30d' ? '30d' : 'all');
    return pts ? ok({ points: pts }) : notFound('Agent');
  }
  if (a === 'agents' && b && c === 'decisions') {
    const ds = decisions(b);
    return ds ? ok({ items: ds, nextCursor: null }) : notFound('Agent');
  }
  if (a === 'verify' && b === 'examples') return ok({ items: verifyExamples() });
  if (a === 'verify' && b) return ok(verifyLookup(decodeURIComponent(b)));
  if (a === 'connect' && b) return demoConnectCode(b) ? ok(demoConnectCode(b)) : notFound('Connect code');
  if (a === 'owner' && b === 'health') return ok(demoRecorderHealth());
  void getStore;
  return notFound(`/v1/${path.join('/')}`);
}
