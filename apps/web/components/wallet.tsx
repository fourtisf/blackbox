'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** Minimal EIP-1193 wallet connection (injected wallets). WalletConnect arrives with wagmi in Milestone 4. */
interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...a: unknown[]) => void): void;
  removeListener?(event: string, cb: (...a: unknown[]) => void): void;
}
declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

interface WalletState {
  address: string | null;
  available: boolean;
  connecting: boolean;
  connect(): Promise<string | null>;
  disconnect(): void;
}

const Ctx = createContext<WalletState | null>(null);
const FORGET_KEY = 'bb-wallet-forgotten';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = window.ethereum;
    setAvailable(!!eth);
    if (!eth) return;
    let forgotten = false;
    try {
      forgotten = localStorage.getItem(FORGET_KEY) === '1';
    } catch {
      /* storage blocked */
    }
    if (!forgotten) {
      eth
        .request({ method: 'eth_accounts' })
        .then((a) => setAddress(((a as string[])[0] ?? null)?.toLowerCase() ?? null))
        .catch(() => {});
    }
    const onAccounts = (...args: unknown[]) =>
      setAddress(((args[0] as string[])[0] ?? null)?.toLowerCase() ?? null);
    eth.on?.('accountsChanged', onAccounts);
    return () => eth.removeListener?.('accountsChanged', onAccounts);
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return null;
    setConnecting(true);
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      const a = accounts[0]?.toLowerCase() ?? null;
      setAddress(a);
      try {
        localStorage.removeItem(FORGET_KEY);
      } catch {
        /* storage blocked */
      }
      return a;
    } catch {
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    try {
      localStorage.setItem(FORGET_KEY, '1');
    } catch {
      /* storage blocked */
    }
    window.ethereum
      ?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ address, available, connecting, connect, disconnect }),
    [address, available, connecting, connect, disconnect],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWallet must be used inside WalletProvider');
  return v;
}
