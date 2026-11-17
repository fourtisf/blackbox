'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ICONS } from './icon-data';
import { WaitlistDialog } from './waitlist';

/**
 * Site-wide behaviors from the prototype, via event delegation so server components can use them
 * with plain attributes: data-copy (copy + toast), data-toast, data-waitlist (open the waitlist),
 * and the spotlight that follows the pointer on .spot cards.
 */
interface Interactions {
  toast(html: string): void;
  openWaitlist(source: string): void;
}
const Ctx = createContext<Interactions | null>(null);
export const useInteractions = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInteractions must be used inside InteractionsProvider');
  return v;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function InteractionsProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const [waitlist, setWaitlist] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((html: string) => {
    setMsg(html);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2400);
  }, []);
  const openWaitlist = useCallback((source: string) => setWaitlist(source), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const wl = t?.closest?.('[data-waitlist]') as HTMLElement | null;
      if (wl) {
        e.preventDefault();
        setWaitlist(wl.dataset.waitlist || 'site');
        return;
      }
      const cp = t?.closest?.('[data-copy]') as HTMLElement | null;
      if (cp) {
        e.preventDefault();
        const v = cp.dataset.copy!;
        const done = () =>
          toast(
            cp.dataset.copymsg
              ? esc(cp.dataset.copymsg)
              : `${ICONS.check} Copied <span class="mono">${esc(v)}</span>`,
          );
        (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
          .catch(() => {})
          .finally(done);
        return;
      }
      const tt = t?.closest?.('[data-toast]') as HTMLElement | null;
      if (tt) {
        e.preventDefault();
        toast(esc(tt.dataset.toast!));
      }
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.spot') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointermove', onMove);
    };
  }, [toast]);

  return (
    <Ctx.Provider value={{ toast, openWaitlist }}>
      {children}
      <div
        className={`toast${show ? ' show' : ''}`}
        role="status"
        aria-live="polite"
        dangerouslySetInnerHTML={{ __html: msg }}
      />
      {waitlist !== null && <WaitlistDialog source={waitlist} onClose={() => setWaitlist(null)} />}
    </Ctx.Provider>
  );
}
