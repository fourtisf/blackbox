/** Browser-side API calls. Read data goes to the demo API or the real one; the waitlist always uses the real API. */
import { DATA_API_BASE, PUBLIC_API_URL } from '../config';
import type { AgentDetail, FeedSeal, RecorderHealth, VerifyResponse } from './types';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok && res.status !== 404) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const fetchVerify = (hash: string) =>
  getJson<VerifyResponse>(`${DATA_API_BASE}/v1/verify/${encodeURIComponent(hash.trim())}`);
export const fetchLatestBlock = () => getJson<{ block: number }>(`${DATA_API_BASE}/v1/blocks/latest`);

/** Subscribes to the live seal feed. Returns an unsubscribe function. */
export function subscribeFeed(onSeal: (s: FeedSeal) => void, onError?: () => void): () => void {
  if (typeof EventSource === 'undefined') return () => {};
  const es = new EventSource(`${DATA_API_BASE}/v1/feed/live`);
  es.addEventListener('seal', (e) => onSeal(JSON.parse((e as MessageEvent<string>).data) as FeedSeal));
  es.onerror = () => onError?.();
  return () => es.close();
}

export type WaitlistRole = 'owner' | 'builder' | 'curious';

export async function joinWaitlist(email: string, role: WaitlistRole, source: string): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/v1/waitlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, role, source }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'We could not save your email. Try again in a minute.');
  }
}

export const fetchAgentByWallet = async (wallet: string) => {
  const res = await fetch(`${DATA_API_BASE}/v1/agents/${encodeURIComponent(wallet)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as AgentDetail;
};
export const fetchRecorderHealth = () => getJson<RecorderHealth>(`${DATA_API_BASE}/v1/owner/health`);
