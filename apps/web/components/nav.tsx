'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { short } from '@/lib/format';
import { InstallButton } from './install-button';
import { useInteractions } from './interactions';
import { Logo } from './logo';
import { useWallet } from './wallet';

const LINKS: [string, string, string | null][] = [
  ['/leaderboard', 'Leaderboard', 'leaderboard'],
  ['/verify', 'Verify', 'verify'],
  ['/docs', 'Docs', 'docs'],
  ['/#how', 'Product', null],
  ['/#pricing', 'Pricing', null],
  ['/#token', '$BOX', null],
];

function WalletButton({ onNavigate }: { onNavigate?: () => void }) {
  const { address, available, connecting, connect, disconnect } = useWallet();
  const { toast } = useInteractions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!address) {
    return (
      <button
        className="btn btn-g btn-sm wallet"
        type="button"
        disabled={connecting}
        onClick={async () => {
          if (!available)
            return toast('No wallet found in this browser. Install a browser wallet, then try again.');
          if (await connect()) toast('Wallet connected');
        }}
      >
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }
  return (
    <div className="wmenu" ref={ref}>
      <button
        className="btn btn-g btn-sm wallet on"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {short(address)}
      </button>
      {open && (
        <div className="wmenu-list" role="menu">
          <Link role="menuitem" href="/dashboard" onClick={() => (setOpen(false), onNavigate?.())}>
            Dashboard
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              disconnect();
              setOpen(false);
              toast('Wallet disconnected');
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);
  const current = (key: string | null) => (key && pathname.startsWith('/' + key) ? 'page' : undefined);
  return (
    <>
      <header className="nav" role="banner">
        <Link className="brand" href="/" aria-label="Blackbox home">
          <Logo defs />
          Blackbox
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map(([href, text, key]) => (
            <Link key={href} href={href} aria-current={current(key)}>
              {text}
            </Link>
          ))}
        </nav>
        <div className="nav-r">
          <WalletButton />
          <InstallButton className="btn btn-p btn-sm" source="nav">
            Install recorder
          </InstallButton>
          <button
            className="nav-burger"
            type="button"
            aria-label="Menu"
            aria-expanded={menu}
            aria-controls="mnav"
            onClick={() => setMenu(!menu)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              {menu ? (
                <path
                  d="M4 4l10 10M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5.5h12M3 9h12M3 12.5h12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </header>
      {menu && (
        <div className="mnav glass" id="mnav">
          <nav aria-label="Main">
            {LINKS.map(([href, text, key]) => (
              <Link key={href} href={href} aria-current={current(key)} onClick={() => setMenu(false)}>
                {text}
              </Link>
            ))}
          </nav>
          <div className="mnav-acts">
            <WalletButton onNavigate={() => setMenu(false)} />
          </div>
        </div>
      )}
    </>
  );
}
