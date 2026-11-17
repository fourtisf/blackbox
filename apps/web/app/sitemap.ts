import type { MetadataRoute } from 'next';
import { getAgents } from '@/lib/api/server';
import { IS_DEMO, SITE_URL } from '@/lib/config';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    '',
    '/leaderboard',
    '/verify',
    '/docs',
    '/about',
    '/legal/terms',
    '/legal/privacy',
    '/legal/risk',
  ].map((p) => ({ url: `${SITE_URL}${p}` }));
  if (IS_DEMO) return pages;
  const agents = await getAgents({ limit: 100 });
  return [...pages, ...agents.items.map((a) => ({ url: `${SITE_URL}/agent/${a.slug}` }))];
}
