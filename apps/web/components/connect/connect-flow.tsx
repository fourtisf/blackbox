'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ConnectCode } from '@/lib/api/types';
import { INSTALL_COMMAND, IS_DEMO } from '@/lib/config';
import { marketName, short } from '@/lib/format';
import { BadgeEmbed } from '../badge-embed';
import { Icon } from '../icon';
import { useInteractions } from '../interactions';
import { useWallet } from '../wallet';

const STEPS = [
  ['Connect your wallet', 'The wallet your agent trades from. Every trade it sends will count.'],
  ['Review your agent', 'Name, market and agent app, filled in by the recorder.'],
  [
    'Sign the registration',
    'One transaction on Robinhood Chain binds the wallet and authorizes the recorder’s key.',
  ],
  ['Get alerts', 'Optional: a Telegram ping when your agent loops, overspends or goes quiet.'],
  ['You’re on the record', 'Your public profile and a badge for your site or X.'],
] as const;

export function ConnectFlow({ code }: { code: ConnectCode }) {
  const { address, available, connect } = useWallet();
  const { toast } = useInteractions();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(code.name);
  const [signing, setSigning] = useState(false);
  useEffect(() => {
    if (address && step === 0) setStep(1);
  }, [address, step]);
  const demoSlug = 'kestrel';

  return (
    <div className="csteps">
      <ol className="steps">
        {STEPS.map(([t, p], i) => (
          <li key={t} className={i === step ? 'on k' : i < step ? 'done' : ''}>
            <span className="n">{i < step ? <Icon name="check" /> : i + 1}</span>
            <div>
              <b>{t}</b>
              <p>{p}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="cpanel glass glow-border" aria-live="polite">
        {step === 0 && (
          <>
            <h2>Connect your wallet</h2>
            <p>
              Use the wallet your agent trades from. Blackbox never asks for its key and never moves funds.
            </p>
            <div className="d-acts">
              <button
                className="btn btn-p"
                type="button"
                onClick={async () => {
                  if (!available)
                    return toast(
                      'No wallet found in this browser. Install a browser wallet, then try again.',
                    );
                  await connect();
                }}
              >
                <Icon name="wallet" />
                Connect wallet
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Review your agent</h2>
            <p>The recorder filled this in. The name is what people see on your profile.</p>
            <div className="field" style={{ marginTop: 20 }}>
              <label htmlFor="agentName">Agent name</label>
              <input
                id="agentName"
                type="text"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <dl className="kv">
              <dt>Wallet</dt>
              <dd className="mono">{address ? short(address) : ''}</dd>
              <dt>Market</dt>
              <dd>{marketName(code.market)}</dd>
              <dt>Agent app</dt>
              <dd>
                {code.runtime}, {code.model}
              </dd>
              <dt>Recorder key</dt>
              <dd className="mono">{short(code.sealer)}</dd>
            </dl>
            <div className="d-acts">
              <button className="btn btn-p" type="button" disabled={!name.trim()} onClick={() => setStep(2)}>
                Looks right
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Sign the registration</h2>
            <p>
              This calls <span className="mono">register</span> on AgentRegistry from your wallet. Your record
              starts at that block and can never be reset under the same id.
            </p>
            {IS_DEMO ? (
              <p className="t3" style={{ marginTop: 12, fontSize: 14 }}>
                Demo: no transaction is sent. Registration goes live with the testnet launch.
              </p>
            ) : (
              <p className="t3" style={{ marginTop: 12, fontSize: 14 }}>
                Registration opens with the testnet launch.
              </p>
            )}
            <div className="d-acts">
              <button
                className="btn btn-p"
                type="button"
                disabled={!IS_DEMO || signing}
                onClick={() => {
                  setSigning(true);
                  setTimeout(() => (setSigning(false), setStep(3)), 1200);
                }}
              >
                {signing ? 'Waiting for the block…' : 'Sign and register'}
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Get alerts on Telegram</h2>
            <p>
              We&apos;ll message you when your agent calls the same tool over and over, spends far faster than
              usual, or goes quiet while it should be active.
            </p>
            <div className="d-acts">
              <button
                className="btn btn-p"
                type="button"
                data-toast="Telegram alerts open with the public release."
              >
                Connect Telegram
              </button>
              <button className="btn btn-g" type="button" onClick={() => setStep(4)}>
                Skip for now
              </button>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2>{name.trim() || code.name} is on the record</h2>
            <p>
              From your agent&apos;s next decision, every move is sealed before it trades. Put the badge where
              people check your agent.
            </p>
            {IS_DEMO && (
              <p className="t3" style={{ marginTop: 12, fontSize: 14 }}>
                Demo: this links to a sample agent&apos;s profile.
              </p>
            )}
            <BadgeEmbed slug={demoSlug} />
            <div className="d-acts">
              <Link className="btn btn-p" href={`/agent/${demoSlug}`}>
                Open your profile
              </Link>
              <Link className="btn btn-g" href="/dashboard">
                Go to your dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ConnectStart({ invalid }: { invalid: boolean }) {
  return (
    <div className="csteps">
      <div className="cpanel glass">
        <h2>{invalid ? 'This link has expired' : 'Start from the recorder'}</h2>
        <p>
          {invalid
            ? 'Connect links work once and expire after 10 minutes. Run the command again to get a fresh one.'
            : 'Run this on the machine where your agent runs. It finds your agent app, wraps its trading tools and prints a link back to this page.'}
        </p>
        <pre className="embed">{INSTALL_COMMAND}</pre>
        {IS_DEMO && (
          <div className="d-acts">
            <Link className="btn btn-p" href="/connect?code=DEMO-7Q4K">
              Try the demo flow
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
