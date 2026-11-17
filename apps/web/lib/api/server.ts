/**
 * Data access for server components. Demo mode reads the demo store directly (no HTTP to itself,
 * so static builds work); API mode fetches the real API with short revalidation.
 */
import 'server-only';
import { IS_DEMO, PUBLIC_API_URL } from '../config';
import { demoConnectCode } from '../mock/handlers';
import * as demo from '../mock/store';
import type {
  AgentDetail,
  AgentListItem,
  AgentListQuery,
  ConnectCode,
  Decision,
  EquityPoint,
  FeaturedDecision,
  FeedSeal,
  Page,
  Stats,
  VerifyExample,
  VerifyResponse,
} from './types';

export class ApiUnavailableError extends Error {
  override name = 'ApiUnavailableError';
}

async function get<T>(path: string, revalidate = 15): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${PUBLIC_API_URL}/v1${path}`, { next: { revalidate } });
  } catch (e) {
    throw new ApiUnavailableError(`The Blackbox API did not answer (${(e as Error).message}).`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(`The Blackbox API answered ${res.status} for ${path}.`);
  return (await res.json()) as T;
}

const qs = (q: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const getStats = async (): Promise<Stats> => (IS_DEMO ? demo.stats() : (await get<Stats>('/stats'))!);

export async function getAgents(q: AgentListQuery): Promise<Page<AgentListItem>> {
  if (IS_DEMO) return demo.listAgents(q);
  return (await get<Page<AgentListItem>>(`/agents${qs({ ...q })}`, 30))!;
}

export async function getActiveAgents(limit = 5): Promise<AgentListItem[]> {
  if (IS_DEMO) return demo.activeAgents(limit);
  return (await get<{ items: AgentListItem[] }>(`/agents/active?limit=${limit}`))?.items ?? [];
}

export const getAgent = async (slug: string): Promise<AgentDetail | null> =>
  IS_DEMO ? demo.getAgent(slug) : get<AgentDetail>(`/agents/${encodeURIComponent(slug)}`);

export async function getEquity(slug: string, range: '30d' | 'all'): Promise<EquityPoint[]> {
  if (IS_DEMO) return demo.equity(slug, range) ?? [];
  return (
    (await get<{ points: EquityPoint[] }>(`/agents/${encodeURIComponent(slug)}/equity?range=${range}`))
      ?.points ?? []
  );
}

export async function getDecisions(slug: string): Promise<Decision[]> {
  if (IS_DEMO) return demo.decisions(slug) ?? [];
  return (
    (await get<{ items: Decision[] }>(`/agents/${encodeURIComponent(slug)}/decisions?limit=32`))?.items ?? []
  );
}

export const getFeatured = async (): Promise<FeaturedDecision | null> =>
  IS_DEMO ? demo.featured() : get<FeaturedDecision>('/featured', 60);

export async function getFeedRecent(): Promise<FeedSeal[]> {
  if (IS_DEMO) return demo.createFeed().recent;
  return (await get<{ items: FeedSeal[] }>('/feed/recent?limit=7', 5))?.items ?? [];
}

export async function getVerifyExamples(): Promise<VerifyExample[]> {
  if (IS_DEMO) return demo.verifyExamples();
  return (await get<{ items: VerifyExample[] }>('/verify/examples', 300))?.items ?? [];
}

export const getVerify = async (hash: string): Promise<VerifyResponse> =>
  IS_DEMO
    ? demo.verifyLookup(hash)
    : ((await get<VerifyResponse>(`/verify/${encodeURIComponent(hash)}`, 0)) ?? { found: false });

export const getConnectCode = async (code: string): Promise<ConnectCode | null> =>
  IS_DEMO ? demoConnectCode(code) : get<ConnectCode>(`/connect/${encodeURIComponent(code)}`, 0);
