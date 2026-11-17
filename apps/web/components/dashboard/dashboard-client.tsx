'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchAgentByWallet, fetchRecorderHealth } from '@/lib/api/client';
import type { AgentDetail, RecorderHealth } from '@/lib/api/types';
import { IS_DEMO, RECORDER_PACKAGE } from '@/lib/config';
import { cls, covText, N, pct, short } from '@/lib/format';
import { BadgeEmbed } from '../badge-embed';
import { Icon } from '../icon';
import { useInteractions } from '../interactions';
import { Time } from '../time';
import { Avatar } from '../ui';
import { useWallet } from '../wallet';

const POLICY: Record<AgentDetail['revealPolicy'], string> = {
  private: 'Private: only fingerprints ever leave your machine.',
  delayed: 'Delayed: each decision is revealed 24 hours later, once its position is closed.',
  public: 'Public: decisions are revealed right after they are sealed.',
};

function Dashboard({ agent }: { agent: AgentDetail }) {
  const { toast } = useInteractions();
  const [health, setHealth] = useState<RecorderHealth | null>(null);
  const [name, setName] = useState(agent.name);
  const [hideWallet, setHideWallet] = useState(false);
  useEffect(() => {
    fetchRecorderHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  const fresh = health && Date.now() - Date.parse(health.lastHeartbeat) < 5 * 60_000;
  return (
    <>
      <div className="ah glass">
        <Avatar name={agent.name} pair={agent.avatar} />
        <div>
          <h1>{agent.name}</h1>
          <span className="ver">
            <Icon name="shield" />
            {agent.eligible ? `Verified record, #${agent.rank30} this month` : 'Recording, not ranked yet'}
          </span>
        </div>
        <div className="acts">
          <Link className="btn btn-g btn-sm" href={`/agent/${agent.slug}`}>
            Open public profile
          </Link>
        </div>
        <div className="tags" style={{ flexBasis: '100%', marginTop: 0 }}>
          <span className={`tg ${cls(agent.ret30)}`}>{pct(agent.ret30)} in 30 days</span>
          <span className="tg">{covText(agent.sealCoverage)} sealed</span>
          <span className="tg">{N(agent.trades30d)} trades, 30 days</span>
          <span className="tg">Trust score {agent.trustScore ?? 'New'}</span>
          <span className="tg mono">{short(agent.wallet)}</span>
        </div>
      </div>
      <div className="dash">
        <section className="glass">
          <h2>Recorder</h2>
          <p className="sub">
            {health
              ? fresh
                ? 'Healthy. Last heard from moments ago.'
                : 'Quiet. No heartbeat in the last 5 minutes.'
              : 'Waiting for the first heartbeat.'}
          </p>
          {health && (
            <div className="health">
              <div>
                Last heartbeat
                <b>
                  <Time t={health.lastHeartbeat} f="timeS" />
                </b>
              </div>
              <div>
                Version<b>{health.version}</b>
              </div>
              <div>
                Mode<b>{health.mode === 'lenient' ? 'Lenient' : 'Strict'}</b>
              </div>
              <div>
                Queue<b>{health.queue === 0 ? 'Empty' : `${health.queue} waiting`}</b>
              </div>
              <div>
                Last seal<b>#{N(health.lastSealBlock)}</b>
              </div>
            </div>
          )}
        </section>
        <section className="glass">
          <h2>Profile</h2>
          <p className="sub">What visitors see. Numbers always come from the chain.</p>
          <div className="field">
            <label htmlFor="dName">Name shown</label>
            <input
              id="dName"
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <label className="toggle">
            <span>Hide my wallet address on the profile</span>
            <input type="checkbox" checked={hideWallet} onChange={(e) => setHideWallet(e.target.checked)} />
          </label>
          <div className="d-acts" style={{ marginTop: 10 }}>
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() =>
                toast(IS_DEMO ? 'Demo: settings are not saved.' : 'Saving opens with sign-in on testnet.')
              }
            >
              Save
            </button>
          </div>
        </section>
        <section className="glass">
          <h2>Alerts</h2>
          <p className="sub">A Telegram message when something looks wrong.</p>
          <ul className="uses" style={{ marginTop: 0, gap: 14 }}>
            <li>
              <span className="ic">
                <Icon name="warn" />
              </span>
              <div>
                <b>Loops</b>
                <span>The same tool with the same arguments 10 times in a minute.</span>
              </div>
            </li>
            <li>
              <span className="ic">
                <Icon name="tx" />
              </span>
              <div>
                <b>Spend spikes</b>
                <span>Five-minute spend above 4x its usual pace.</span>
              </div>
            </li>
            <li>
              <span className="ic">
                <Icon name="lock" />
              </span>
              <div>
                <b>Silence</b>
                <span>No heartbeat for 15 minutes while the agent was active.</span>
              </div>
            </li>
          </ul>
          <div className="d-acts">
            <button
              className="btn btn-g btn-sm"
              type="button"
              data-toast="Telegram alerts open with the public release."
            >
              Connect Telegram
            </button>
          </div>
        </section>
        <section className="glass">
          <h2>Reveal policy</h2>
          <p className="sub">Set on your machine, where the reasoning lives.</p>
          <p className="t2">{POLICY[agent.revealPolicy]}</p>
          <pre className="embed">npx {RECORDER_PACKAGE} reveal private | delayed | public</pre>
        </section>
        <section className="glass" style={{ gridColumn: '1 / -1' }}>
          <h2>Badge</h2>
          <p className="sub">
            Show your verified record on your site or in your X bio. It updates on its own.
          </p>
          <BadgeEmbed slug={agent.slug} />
        </section>
      </div>
    </>
  );
}

export function DashboardClient({ demo }: { demo: AgentDetail | null }) {
  const { address, available, connect } = useWallet();
  const { toast } = useInteractions();
  const [agent, setAgent] = useState<AgentDetail | null | undefined>(undefined);

  useEffect(() => {
    if (demo || !address) return;
    setAgent(undefined);
    fetchAgentByWallet(address)
      .then(setAgent)
      .catch(() => setAgent(null));
  }, [address, demo]);

  if (demo) return <Dashboard agent={demo} />;
  if (!address) {
    return (
      <div className="cpanel glass" style={{ maxWidth: 640, position: 'relative', zIndex: 1 }}>
        <h2>Connect the wallet your agent trades from</h2>
        <p>
          Your dashboard shows the agent bound to that wallet: recorder health, alerts, reveal policy and your
          badge.
        </p>
        <div className="d-acts">
          <button
            className="btn btn-p"
            type="button"
            onClick={async () => {
              if (!available)
                return toast('No wallet found in this browser. Install a browser wallet, then try again.');
              await connect();
            }}
          >
            <Icon name="wallet" />
            Connect wallet
          </button>
          {IS_DEMO && (
            <Link className="btn btn-g" href="/dashboard?demo=1">
              Open the demo dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }
  if (agent === undefined)
    return <div className="skel" style={{ height: 160, position: 'relative', zIndex: 1 }} />;
  if (!agent) {
    return (
      <div className="cpanel glass" style={{ maxWidth: 640, position: 'relative', zIndex: 1 }}>
        <h2>No agent is bound to {short(address)} yet</h2>
        <p>
          Install the recorder where your agent runs, then follow the link it prints to register this wallet.
        </p>
        <div className="d-acts">
          <Link className="btn btn-p" href="/connect">
            How to connect
          </Link>
          {IS_DEMO && (
            <Link className="btn btn-g" href="/dashboard?demo=1">
              Open the demo dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }
  return <Dashboard agent={agent} />;
}
