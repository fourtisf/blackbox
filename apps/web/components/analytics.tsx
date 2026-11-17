import Script from 'next/script';

/**
 * Cookie-free analytics, off unless configured (decision #15):
 *   NEXT_PUBLIC_ANALYTICS=plausible  + NEXT_PUBLIC_PLAUSIBLE_DOMAIN (+ optional NEXT_PUBLIC_PLAUSIBLE_SRC for self-hosting)
 *   NEXT_PUBLIC_ANALYTICS=umami      + NEXT_PUBLIC_UMAMI_SRC + NEXT_PUBLIC_UMAMI_WEBSITE_ID
 */
const PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS ?? '';

export function Analytics() {
  if (PROVIDER === 'plausible' && process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    return (
      <Script
        defer
        data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
        src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.js'}
        strategy="afterInteractive"
      />
    );
  }
  if (PROVIDER === 'umami' && process.env.NEXT_PUBLIC_UMAMI_SRC && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID) {
    return (
      <Script
        defer
        data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        src={process.env.NEXT_PUBLIC_UMAMI_SRC}
        strategy="afterInteractive"
      />
    );
  }
  return null;
}

type Props = Record<string, string>;
declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Props }) => void;
    umami?: { track: (event: string, data?: Props) => void };
  }
}

/** Records a named event (e.g. a waitlist signup) with whichever provider is loaded. Never throws. */
export function trackEvent(name: string, props: Props = {}): void {
  try {
    window.plausible?.(name, { props });
    window.umami?.track(name, props);
  } catch {
    /* analytics must never break the page */
  }
}
