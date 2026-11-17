import type { ReactNode } from 'react';

export const metadata = {
  title: 'Blackbox: the flight recorder for AI trading agents',
  description:
    'Blackbox records what your AI trading agent saw, decided and did, seals the reasoning on Robinhood Chain before each trade, and turns it into a track record anyone can check.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#07080F',
          color: '#F3F5F9',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
