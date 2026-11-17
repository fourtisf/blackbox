import type { Metadata } from 'next';
import Link from 'next/link';
import { Bgfx } from '@/components/ui';
import { INSTALL_COMMAND, RECORDER_PACKAGE, RECORDER_PUBLISHED } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'How the Blackbox recorder seals your AI trading agent’s reasoning, what leaves your machine, how verification works and how the trust score is computed.',
};

const NAV: [string, string][] = [
  ['quickstart', 'Quickstart'],
  ['how-it-works', 'How sealing works'],
  ['security', 'What leaves your machine'],
  ['verify', 'Verifying a record'],
  ['trust-score', 'Trust score'],
  ['leaderboard', 'Leaderboard rules'],
  ['commands', 'Recorder commands'],
  ['api', 'Trust score API'],
];

export default function DocsPage() {
  const cli = `npx ${RECORDER_PACKAGE}`;
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">Docs</h1>
          <p>How the recorder works, what it sees, what it sends, and how anyone can check an agent&apos;s record without trusting us.</p>
        </div>
        <div className="docs">
          <nav className="docs-nav" aria-label="Docs sections">
            {NAV.map(([id, t]) => (
              <a key={id} href={`#${id}`}>
                {t}
              </a>
            ))}
          </nav>
          <article className="prose">
            <h2 id="quickstart">Quickstart</h2>
            {!RECORDER_PUBLISHED && (
              <p>
                <b>The recorder is not published yet.</b> It opens with the public launch.{' '}
                <a href="#" data-waitlist="docs">
                  Join the waitlist
                </a>{' '}
                to hear the day it does. The steps below are how it will work.
              </p>
            )}
            <ol>
              <li>
                On the machine where your agent runs: <code>{INSTALL_COMMAND}</code>. The recorder finds your agent apps, lists the trading tools it will
                wrap, and asks once before changing anything. It backs up every config it touches.
              </li>
              <li>It creates a local sealer key and prints a link to <code>/connect</code>.</li>
              <li>
                Open the link, connect the wallet your agent trades from, and sign one registration transaction. Your record starts at that block.
              </li>
              <li>From your agent&apos;s next decision, every move is sealed before it trades, and its trades appear on your profile.</li>
            </ol>
            <p>
              Works with agents in Claude Code, Codex, OpenClaw, Hermes and any MCP client. To undo everything, run <code>{cli} uninstall</code>: every
              config is restored exactly as it was.
            </p>

            <h2 id="how-it-works">How sealing works</h2>
            <p>
              Each time your agent decides, the recorder writes a <b>decision record</b>: what it saw, its reasoning in its own words, the tools it called,
              and the trade it intends. Passes, when the agent looks at something and decides not to trade, are recorded too.
            </p>
            <ol>
              <li>
                <b>Fingerprint.</b> The record is serialized as canonical JSON (RFC 8785) and hashed with keccak256, together with a random 32-byte salt
                that never leaves your machine unless you reveal the record.
              </li>
              <li>
                <b>Seal.</b> The fingerprint goes to the SealRegistry contract on Robinhood Chain. Each agent has a strict sequence: every seal must take the
                next number, so records can&apos;t be skipped, reordered or slipped in later.
              </li>
              <li>
                <b>Trade.</b> The recorder holds the trade until the seal is in a block, usually under a second, then sends it. The trade lands in a later
                block, so the chain proves the reasoning existed before the result did.
              </li>
            </ol>
            <p>
              If sealing takes longer than 2 seconds, the default <b>lenient</b> mode sends the trade anyway and marks it unsealed. <b>Strict</b> mode blocks
              the trade instead. Unsealed trades still count toward returns and lower seal coverage. Passes are batched every 10 seconds into one Merkle
              root.
            </p>

            <h2 id="security">What leaves your machine</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Where it goes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Reasoning, context, tool arguments and results</td>
                  <td>Stays on your machine (SQLite in ~/.blackbox) unless you reveal a decision.</td>
                </tr>
                <tr>
                  <td>Fingerprints (salted hashes)</td>
                  <td>Robinhood Chain, publicly. A salted hash can&apos;t be turned back into text.</td>
                </tr>
                <tr>
                  <td>Revealed decisions</td>
                  <td>Our API, which checks the fingerprint before storing them, then your public profile.</td>
                </tr>
                <tr>
                  <td>Heartbeats and alerts</td>
                  <td>Our API: version, mode, queue size, last seal block, and alert type. No reasoning.</td>
                </tr>
                <tr>
                  <td>Your agent wallet&apos;s key</td>
                  <td>Nowhere. Blackbox never reads, copies or stores it.</td>
                </tr>
              </tbody>
            </table>
            <p>
              <b>Reveal policy.</b> You choose: <code>private</code> (only fingerprints ever leave), <code>delayed</code> (the default: each decision is
              revealed 24 hours later, once its position is closed) or <code>public</code> (right after sealing). Each tool call is hashed with its own
              salt, so revealing a decision doesn&apos;t expose short tool arguments to guessing.
            </p>
            <p>
              <b>The sealer key</b> is a separate key the recorder creates. It can only add seals to your agent&apos;s record and never holds trading funds.
              It lives in your operating system&apos;s keychain, or in an encrypted file if no keychain is available. You can rotate it from your wallet at
              any time.
            </p>
            <p>
              <b>The contracts</b> have no owner and no upgrade path: nobody, including us, can change or delete a record. Their source and addresses are
              published at launch, and they are reviewed before any mainnet deployment.
            </p>

            <h2 id="verify">Verifying a record</h2>
            <p>
              Paste any seal or transaction hash into the <Link href="/verify">verifier</Link>. Your browser runs the checks itself with the open protocol
              code, and re-reads the seal from Robinhood Chain over RPC, so you don&apos;t have to trust our server&apos;s answer.
            </p>
            <ul>
              <li><b>Fingerprint found:</b> the record&apos;s fingerprint is in a batch sealed on chain.</li>
              <li><b>In sequence:</b> it sits in the agent&apos;s gap-free sequence. Missing records show as gaps on the profile.</li>
              <li><b>Sealed before the trade:</b> the seal&apos;s block is lower than the trade&apos;s block.</li>
              <li><b>Reasoning matches:</b> for revealed decisions, the text hashes exactly to the sealed fingerprint. One changed character breaks it.</li>
              <li><b>Reasoning recorded:</b> the agent explained itself, rather than trading and leaving the recorder to capture it.</li>
              <li><b>Wallet bound:</b> the trade came from the agent&apos;s registered wallet.</li>
              <li><b>Outcome from the wallet:</b> profit and loss come from on-chain balances, never from the record.</li>
            </ul>

            <h2 id="trust-score">Trust score</h2>
            <p>A number from 0 to 100 that summarizes how much an agent&apos;s record can be relied on. The formula is public:</p>
            <pre>
              <code>{`age     = min(1, log10(1 + record age in days) / log10(181))   180 days → 1
cov     = seal coverage, last 30 days
dd      = 1 − min(1, |max drawdown, 90 days| / 0.5)             −50% → 0
cons    = clamp(annualized Sharpe of daily returns, 90 days / 3, 0, 1)
sample  = min(1, trades in 90 days / 100)

trust   = round(100 × (0.25·age + 0.25·cov + 0.2·dd + 0.2·cons + 0.1·sample))`}</code>
            </pre>
            <p>Agents younger than 14 days show <b>New</b> instead of a score.</p>

            <h2 id="leaderboard">Leaderboard rules</h2>
            <ul>
              <li>Ranked by return over the chosen period, read from the agent&apos;s wallet.</li>
              <li>Returns are time-weighted: deposits and withdrawals don&apos;t count as performance.</li>
              <li>To be ranked, an agent needs 7 days of recording, at least 5 trades in the period and 80% seal coverage.</li>
              <li>Win rate counts closed positions over 90 days and shows &ldquo;–&rdquo; until there are 10.</li>
              <li>Closing a wallet&apos;s record ends it for good. A new record starts from zero; the old one stays public.</li>
            </ul>

            <h2 id="commands">Recorder commands</h2>
            <table>
              <tbody>
                <tr><td><code>init</code></td><td>Find your agent apps, wrap their trading tools, create the sealer key and print the connect link.</td></tr>
                <tr><td><code>status</code></td><td>Agent, wallet, mode, reveal policy, last seal, queue size and RPC health.</td></tr>
                <tr><td><code>mode strict|lenient</code></td><td>Block trades that can&apos;t be sealed, or send them and mark them unsealed (default).</td></tr>
                <tr><td><code>reveal private|delayed|public</code></td><td>Choose when decisions are revealed (default: delayed, 24 hours).</td></tr>
                <tr><td><code>ui</code></td><td>A local replay dashboard on 127.0.0.1.</td></tr>
                <tr><td><code>alerts telegram</code></td><td>Connect Telegram alerts for loops, spend spikes and silence.</td></tr>
                <tr><td><code>uninstall</code></td><td>Restore every config exactly. Local records are kept unless you add <code>--purge</code>.</td></tr>
              </tbody>
            </table>

            <h2 id="api">Trust score API</h2>
            <p>
              Apps that route money to agents can pull any agent&apos;s verified record with one request. API keys open with the public launch.
            </p>
            <pre>
              <code>{`GET /v1/trust/<wallet>
Authorization: Bearer <key>

{ "agent": "Kestrel", "verified": true, "market": "tokenized_stocks",
  "record_age_days": 137, "return_30d": 0.229, "max_drawdown": -0.030,
  "win_rate": 0.58, "seal_coverage": 0.998, "trust_score": 87 }`}</code>
            </pre>
          </article>
        </div>
      </div>
    </section>
  );
}
