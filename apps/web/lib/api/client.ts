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

export async function joinWaitlist(
  email: string,
  role: WaitlistRole,
  source: string,
  website = '',
): Promise<{ confirm: boolean }> {
  const res = await fetch(`${PUBLIC_API_URL}/v1/waitlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, role, source, ...(website ? { website } : {}) }),
  });
  const body = (await res.json().catch(() => null)) as {
    confirm?: boolean;
    error?: { message?: string };
  } | null;
  if (!res.ok)
    throw new Error(body?.error?.message ?? 'We could not save your email. Try again in a minute.');
  return { confirm: !!body?.confirm };
}

/** Confirm or unsubscribe with the e and t from an emailed link. */
export async function waitlistLink(action: 'confirm' | 'unsubscribe', e: string, t: string): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/v1/waitlist/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ e, t }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'Something went wrong. Try again in a minute.');
  }
}

export interface AdminWaitlist {
  total: number;
  confirmed: number;
  emailConfirmation: boolean;
  byRole: Record<string, number>;
  bySource: Record<string, number>;
  items: { email: string; role: string; source: string; createdAt: string; confirmedAt: string | null }[];
}

export async function fetchAdminWaitlist(
  token: string,
  format: 'json' | 'csv' = 'json',
): Promise<AdminWaitlist | Blob> {
  const res = await fetch(`${PUBLIC_API_URL}/v1/admin/waitlist${format === 'csv' ? '?format=csv' : ''}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) throw new Error('Wrong admin token.');
  if (res.status === 404) throw new Error('The admin export is off. Set ADMIN_TOKEN on the API server.');
  if (!res.ok) throw new Error(`The API answered ${res.status}.`);
  return format === 'csv' ? res.blob() : ((await res.json()) as AdminWaitlist);
}

export const fetchAgentByWallet = async (wallet: string) => {
  const res = await fetch(`${DATA_API_BASE}/v1/agents/${encodeURIComponent(wallet)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as AgentDetail;
};
export const fetchRecorderHealth = () => getJson<RecorderHealth>(`${DATA_API_BASE}/v1/owner/health`);
