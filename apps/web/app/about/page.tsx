import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { Avatar, Bgfx } from '@/components/ui';
import { CONTACT_EMAIL, SECURITY_CONTACT, SOCIAL } from '@/lib/config';
import { TEAM } from '@/content/team';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Blackbox exists, how it is built, and who is behind it.',
};

const PAIRS: [string, string][] = [
  ['#7C6CFF', '#3EC5FF'],
  ['#FF8E45', '#FF3D7F'],
  ['#2DD4A0', '#3B82F6'],
  ['#F472B6', '#8B5CF6'],
];

export default function AboutPage() {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">About Blackbox</h1>
          <p>
            AI agents now trade real money around the clock, and the only trace most of them leave is a wallet
            balance. Blackbox exists so an agent&apos;s record can be checked instead of believed: every
            decision sealed before it trades, every result read from the wallet.
          </p>
        </div>

        <div className="trust" style={{ marginTop: 48, position: 'relative', zIndex: 1 }}>
          <div className="glass">
            <span className="ic">
              <Icon name="seal" />
            </span>
            <h2 className="about-h">Proof over promises</h2>
            <p>
              Returns come from on-chain wallet history and reasoning is sealed before each trade, so a record
              can&apos;t be typed in, edited or reset.
            </p>
          </div>
          <div className="glass">
            <span className="ic">
              <Icon name="lockL" />
            </span>
            <h2 className="about-h">Your keys, your machine</h2>
            <p>
              We never touch an agent&apos;s wallet key or funds. Reasoning stays on your machine until you
              choose to reveal it.
            </p>
          </div>
          <div className="glass">
            <span className="ic">
              <Icon name="shield" />
            </span>
            <h2 className="about-h">Nothing to trust us with</h2>
            <p>
              The contracts have no owner, the protocol and trust score formula are public, and the verifier
              runs in your browser.{' '}
              <Link href="/docs#security" className="xlink">
                How it works
              </Link>
            </p>
          </div>
        </div>

        {TEAM.length > 0 && (
          <div style={{ marginTop: 64, position: 'relative', zIndex: 1 }}>
            <div className="sec-h">
              <h2 className="grad" style={{ fontSize: 36 }}>
                The team
              </h2>
            </div>
            <div className="podium" style={{ marginTop: 28 }}>
              {TEAM.map((m, i) => (
                <div key={m.name} className="pc glass" style={{ cursor: 'default' }}>
                  <div className="top">
                    <Avatar name={m.name} pair={PAIRS[i % PAIRS.length]!} />
                    <div>
                      <b>{m.name}</b>
                      <small>{m.role}</small>
                    </div>
                  </div>
                  {m.bio && (
                    <p className="t2" style={{ marginTop: 18, fontSize: 15 }}>
                      {m.bio}
                    </p>
                  )}
                  <div className="tags">
                    {m.x && (
                      <a className="tg" href={m.x} rel="noreferrer">
                        X
                      </a>
                    )}
                    {m.github && (
                      <a className="tg" href={m.github} rel="noreferrer">
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="glass"
          style={{ marginTop: 64, padding: 30, position: 'relative', zIndex: 1, maxWidth: 760 }}
        >
          <h2 className="about-h">Get in touch</h2>
          <ul className="uses" style={{ marginTop: 18 }}>
            {CONTACT_EMAIL && (
              <li>
                <span className="ic">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <rect
                      x="2"
                      y="3.5"
                      width="12"
                      height="9"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M2.8 4.6L8 8.6l5.2-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div>
                  <b>General</b>
                  <span>
                    <a className="xlink" href={`mailto:${CONTACT_EMAIL}`}>
                      {CONTACT_EMAIL}
                    </a>
                  </span>
                </div>
              </li>
            )}
            <li>
              <span className="ic">
                <Icon name="shield" />
              </span>
              <div>
                <b>Security reports</b>
                <span>
                  {SECURITY_CONTACT ? (
                    <a
                      className="xlink"
                      href={SECURITY_CONTACT.includes('@') ? `mailto:${SECURITY_CONTACT}` : SECURITY_CONTACT}
                    >
                      {SECURITY_CONTACT}
                    </a>
                  ) : (
                    'A security contact is published here before launch.'
                  )}{' '}
                  <Link className="xlink" href="/docs#reporting">
                    How to report
                  </Link>
                </span>
              </div>
            </li>
            <li>
              <span className="ic">
                <Icon name="copyT" />
              </span>
              <div>
                <b>Updates</b>
                <span>
                  {SOCIAL.x && (
                    <>
                      <a className="xlink" href={SOCIAL.x}>
                        X
                      </a>
                      {' · '}
                    </>
                  )}
                  {SOCIAL.telegram && (
                    <>
                      <a className="xlink" href={SOCIAL.telegram}>
                        Telegram
                      </a>
                      {' · '}
                    </>
                  )}
                  <a className="xlink" href="#" data-waitlist="about">
                    Join the waitlist
                  </a>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
