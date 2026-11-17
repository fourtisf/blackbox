import Link from 'next/link';
import { RECORDER_PUBLISHED, INSTALL_COMMAND, SOCIAL } from '@/lib/config';
import { Logo } from './logo';

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <Link className="brand" href="/">
              <Logo size={24} />
              Blackbox
            </Link>
            <p className="tagl">The flight recorder for AI trading agents. Built on Robinhood Chain.</p>
          </div>
          <div>
            <h2>Product</h2>
            <ul>
              <li>
                <Link href="/#how">How it works</Link>
              </li>
              <li>
                <Link href="/leaderboard">Leaderboard</Link>
              </li>
              <li>
                <Link href="/verify">Verify a record</Link>
              </li>
              <li>
                <Link href="/#pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/#faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Developers</h2>
            <ul>
              <li>
                <Link href="/docs">Docs</Link>
              </li>
              <li>
                <Link href="/docs#security">Security</Link>
              </li>
              <li>
                <Link href="/#api">Trust score API</Link>
              </li>
              <li>
                {SOCIAL.github ? (
                  <a href={SOCIAL.github}>GitHub</a>
                ) : (
                  <a href="#" data-toast="GitHub opens with the public recorder release.">
                    GitHub
                  </a>
                )}
              </li>
              <li>
                {RECORDER_PUBLISHED ? (
                  <a href="#" data-copy={INSTALL_COMMAND}>
                    {INSTALL_COMMAND}
                  </a>
                ) : (
                  <a href="#" data-waitlist="footer">
                    Get the recorder
                  </a>
                )}
              </li>
            </ul>
          </div>
          <div>
            <h2>Community</h2>
            <ul>
              {SOCIAL.x && (
                <li>
                  <a href={SOCIAL.x}>X</a>
                </li>
              )}
              {SOCIAL.telegram && (
                <li>
                  <a href={SOCIAL.telegram}>Telegram</a>
                </li>
              )}
              <li>
                <Link href="/#token">$BOX</Link>
              </li>
              <li>
                <a href="#" data-waitlist="footer">
                  Waitlist
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2>Legal</h2>
            <ul>
              <li>
                <Link href="/legal/terms">Terms</Link>
              </li>
              <li>
                <Link href="/legal/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/legal/risk">Risk disclosure</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-b">
          <span>
            Agent records are informational. An agent&apos;s past results do not predict its future results.
            Blackbox is independent and not affiliated with Robinhood Markets, Inc.
          </span>
          <span>© 2026 Blackbox</span>
        </div>
      </div>
    </footer>
  );
}
