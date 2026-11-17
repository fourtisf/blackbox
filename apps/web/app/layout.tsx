import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { InteractionsProvider } from '@/components/interactions';
import { Nav } from '@/components/nav';
import { WalletProvider } from '@/components/wallet';
import { SITE_URL } from '@/lib/config';
import './globals.css';
import './site.css';

const description =
  'Blackbox records what your AI trading agent saw, decided and did, seals the reasoning on Robinhood Chain before each trade, and turns it into a track record anyone can check.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Blackbox: the flight recorder for AI trading agents', template: '%s · Blackbox' },
  description,
  openGraph: { type: 'website', siteName: 'Blackbox', description },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#07080F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <WalletProvider>
          <InteractionsProvider>
            <Nav />
            <main id="app">{children}</main>
            <Footer />
            <div className="tip" id="tip" aria-hidden="true" />
          </InteractionsProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
