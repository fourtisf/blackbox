'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { joinWaitlist } from '@/lib/api/client';
import type { WaitlistRole } from '@/lib/api/client';

const ROLES: [WaitlistRole, string][] = [
  ['owner', 'I run an agent'],
  ['builder', 'I build an app'],
  ['curious', 'Just curious'],
];

export function WaitlistForm({ source, autoFocus }: { source: string; autoFocus?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WaitlistRole>(source.startsWith('api') ? 'builder' : 'owner');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'done') {
    return (
      <div className="wl-done" role="status">
        <span className="ib ok" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 16 16">
            <path
              d="M3.2 8.6l3.1 3 6.5-7.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <b>You&apos;re on the list.</b>
          <p>We&apos;ll email you once, on the day Blackbox opens.</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="wl-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('busy');
        try {
          await joinWaitlist(email, role, source);
          setState('done');
        } catch (err) {
          setError((err as Error).message);
          setState('error');
        }
      }}
    >
      <div className="seg wl-roles" role="radiogroup" aria-label="What brings you here">
        {ROLES.map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            aria-pressed={role === value}
            onClick={() => setRole(value)}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="vform wl-row">
        <label className="sr" htmlFor={`${id}-email`}>
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          autoFocus={autoFocus}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-p" type="submit" disabled={state === 'busy'}>
          {state === 'busy' ? 'Joining…' : 'Join the waitlist'}
        </button>
      </div>
      {state === 'error' && (
        <p className="wl-error" role="alert">
          {error}
        </p>
      )}
      <p className="wl-fine">
        We only use your email to tell you when Blackbox opens.{' '}
        <Link href="/legal/privacy">Privacy policy</Link>
      </p>
    </form>
  );
}

export function WaitlistDialog({ source, onClose }: { source: string; onClose: () => void }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="dlg glass glow-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
      >
        <button className="dlg-x" type="button" aria-label="Close" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2 id={titleId}>Join the waitlist</h2>
        <p className="dlg-sub">
          The recorder, verified profiles and the trust score API open together at the public launch. Leave
          your email and we&apos;ll tell you the day it opens.
        </p>
        <WaitlistForm source={source} autoFocus />
      </div>
    </div>
  );
}
