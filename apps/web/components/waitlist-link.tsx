'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { waitlistLink } from '@/lib/api/client';
import { Icon } from './icon';

/**
 * Handles the links in waitlist emails. Confirming runs on load; removing an email waits for a
 * click, so link scanners in mail apps can't unsubscribe anyone by opening the page.
 */
export function WaitlistLink({
  action,
  e,
  t,
}: {
  action: 'confirm' | 'unsubscribe';
  e?: string;
  t?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(
    e && t ? (action === 'confirm' ? 'busy' : 'idle') : 'error',
  );
  const [message, setMessage] = useState(
    e && t ? '' : 'This link is incomplete. Copy the full link from the email.',
  );
  const started = useRef(false);

  const run = async () => {
    setState('busy');
    try {
      await waitlistLink(action, e!, t!);
      setState('done');
    } catch (err) {
      setMessage((err as Error).message);
      setState('error');
    }
  };
  useEffect(() => {
    if (action === 'confirm' && e && t && !started.current) {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title =
    state === 'done'
      ? action === 'confirm'
        ? 'You’re on the list'
        : 'You’re off the list'
      : state === 'error'
        ? 'That didn’t work'
        : action === 'confirm'
          ? 'Confirming your email…'
          : 'Remove your email from the waitlist?';
  const text =
    state === 'done'
      ? action === 'confirm'
        ? 'Your email is confirmed. We’ll email you once, on the day Blackbox opens.'
        : 'We deleted your email. You won’t hear from us again.'
      : state === 'error'
        ? message
        : action === 'confirm'
          ? 'One moment.'
          : 'We’ll delete it right away. You can always sign up again later.';

  return (
    <div
      className="vcard glass"
      style={{ maxWidth: 640, position: 'relative', zIndex: 1 }}
      aria-live="polite"
    >
      <div className="vcard-h">
        <span className={`ib ${state === 'error' ? 'no' : state === 'done' ? 'ok' : 'warn'}`}>
          <Icon name={state === 'error' ? 'x' : state === 'done' ? 'check' : 'lock'} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </div>
      <div className="d-acts" style={{ padding: '0 26px 24px' }}>
        {action === 'unsubscribe' && state === 'idle' && (
          <button className="btn btn-p" type="button" onClick={() => void run()}>
            Remove my email
          </button>
        )}
        <Link className="btn btn-g" href="/">
          Back to Blackbox
        </Link>
      </div>
    </div>
  );
}
