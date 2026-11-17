import type { MetadataRoute } from 'next';
import { IS_DEMO, SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    // Demo agent pages are samples: keep them out of search results until real records exist.
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: IS_DEMO
        ? ['/agent/', '/verify/', '/dashboard', '/connect', '/mock-api/']
        : ['/dashboard', '/connect'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
