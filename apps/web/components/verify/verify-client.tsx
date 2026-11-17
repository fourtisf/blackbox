'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchVerify } from '@/lib/api/client';
import type { VerifyExample, VerifyResponse } from '@/lib/api/types';
import { buildVerifyView, runProtocolChecks } from '@/lib/checks';
import { IS_DEMO, RPC_URL } from '@/lib/config';
import { fmtTime, verbOf } from '@/lib/format';
import { recheckSeal } from '@/lib/rpc';
import { Icon } from '../icon';
import { Time } from '../time';

function Result({ res }: { res: VerifyResponse }) {
  const [rpc, setRpc] = useState<'idle' | 'checking' | 'ok' | 'mismatch' | 'error'>('idle');
  const result = useMemo(() => runProtocolChecks(res), [res]);
  const view = useMemo(
    () => buildVerifyView(res, result, (iso) => fmtTime(Date.parse(iso), 'dateY')),
    [res, result],
  );

  useEffect(() => {
    if (IS_DEMO || !RPC_URL || !res.found || !res.seal || !res.chain) return;
    setRpc('checking');
    recheckSeal(RPC_URL, res.chain.sealRegistry, res.seal)
      .then((ok) => setRpc(ok ? 'ok' : 'mismatch'))
      .catch(() => setRpc('error'));
  }, [res]);

  if (view.tone === 'notfound') {
    return (
      <div className="vcard glass">
        <div className="vcard-h">
          <span className="ib no">
            <Icon name="x" />
          </span>
          <div>
            <h2>No sealed record matches this hash</h2>
            <p>
              Paste a full seal or transaction hash from an agent&apos;s replay. Hashes start with 0x and are
              66 characters long.
            </p>
          </div>
        </div>
      </div>
    );
  }
  const a = res.agent!;
  const kind = res.decision?.kind ?? res.trade?.kind ?? 'pass';
  const asset = res.decision?.asset ?? res.trade?.asset ?? '';
  const ts = res.decision?.ts ?? res.trade?.ts ?? a.recordingSince;
  return (
    <div className={`vcard glass${view.tone === 'ok' ? ' glow-border' : ''}`}>
      <div className="vcard-h">
        <span className={`ib ${view.tone === 'ok' ? 'ok' : view.tone === 'warn' ? 'warn' : 'no'}`}>
          <Icon name={view.tone === 'ok' ? 'check' : view.tone === 'warn' ? 'warn' : 'x'} />
        </span>
        <div>
          <h2>{view.title}</h2>
          <p>
            {a.name} {verbOf(kind)} {asset} on <Time t={ts} f="dateY" /> at <Time t={ts} f="time" />
          </p>
        </div>
        <Link className="btn btn-g btn-sm" href={`/agent/${a.slug}`}>
          Open {a.name}
        </Link>
      </div>
      <ul className="checks">
        {view.items.map((c) => (
          <li key={c.title}>
            <span className={`ic ${c.status}`}>
              <Icon name={c.status === 'ok' ? 'check' : c.status === 'no' ? 'x' : 'lock'} />
            </span>
            <div>
              <b>{c.title}</b>
              <p>
                {c.detail}
                {c.quote && <span className="quote">{c.quote}</span>}
              </p>
            </div>
          </li>
        ))}
        {rpc !== 'idle' && (
          <li>
            <span className={`ic ${rpc === 'ok' ? 'ok' : rpc === 'checking' ? 'skip' : 'no'}`}>
              <Icon name={rpc === 'ok' ? 'check' : rpc === 'checking' ? 'lock' : 'x'} />
            </span>
            <div>
              <b>
                {rpc === 'ok'
                  ? 'Re-checked directly on chain'
                  : rpc === 'checking'
                    ? 'Re-checking on chain…'
                    : rpc === 'mismatch'
                      ? 'The chain disagrees with our server'
                      : 'Could not reach the chain to re-check'}
              </b>
              <p>
                {rpc === 'ok'
                  ? 'Your browser read the Sealed event from Robinhood Chain itself. You do not have to trust Blackbox for this result.'
                  : rpc === 'mismatch'
                    ? 'The Sealed event on chain does not match what our API returned. Trust the chain.'
                    : 'The result above uses data from our API. Try again to compare it with the chain.'}
              </p>
            </div>
          </li>
        )}
      </ul>
      {IS_DEMO && (
        <p className="rpc-note">
          <Icon name="shield" />
          Demo data. These checks run the real protocol in your browser; the on-chain re-check runs once
          records live on Robinhood Chain.
        </p>
      )}
    </div>
  );
}

export function VerifyClient({
  initialHash,
  initial,
  examples,
}: {
  initialHash: string;
  initial: VerifyResponse | null;
  examples: VerifyExample[];
}) {
  const [hash, setHash] = useState(initialHash);
  const [res, setRes] = useState<VerifyResponse | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (h: string) => {
    const v = h.trim();
    history.replaceState(null, '', v ? `/verify/${v}` : '/verify');
    if (!v) return setRes(null);
    setBusy(true);
    setError('');
    try {
      setRes(await fetchVerify(v));
    } catch {
      setError('The verifier could not reach the Blackbox API. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="vbox">
        <span className="pill">
          <span className="tag">Free</span>No wallet or account needed
        </span>
        <h1 className="grad" style={{ marginTop: 22 }}>
          Verify any agent record
        </h1>
        <p>
          Paste a seal hash or transaction hash from any agent&apos;s replay. Blackbox checks it against
          Robinhood Chain and shows every step.
        </p>
        <form
          className="vform"
          id="vForm"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void run(hash);
          }}
        >
          <label className="sr" htmlFor="vIn">
            Seal or transaction hash
          </label>
          <input
            id="vIn"
            placeholder="Paste a 0x… hash"
            value={hash}
            spellCheck={false}
            onChange={(e) => setHash(e.target.value)}
          />
          <button className="btn btn-p" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </form>
        <div className="ex">
          <span>Try:</span>
          {examples.map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={() => {
                setHash(x.hash);
                void run(x.hash);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="vres" id="vOut" aria-live="polite">
        {error && (
          <div className="vcard glass">
            <div className="vcard-h">
              <span className="ib warn">
                <Icon name="warn" />
              </span>
              <div>
                <h2>Verifier unavailable</h2>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}
        {!error && res && <Result res={res} />}
      </div>
    </>
  );
}
