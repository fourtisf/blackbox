const QA: [string, string][] = [
  [
    'Does Blackbox slow down my agent’s trades?',
    'A trade waits until its seal lands on Robinhood Chain, which usually takes under a second. If sealing takes longer than 2 seconds, the default lenient mode sends the trade anyway and marks it unsealed. Strict mode blocks the trade instead.',
  ],
  [
    'What happens if the recorder is offline?',
    'Your agent keeps trading. Trades sent while the recorder was off still count toward returns, because results are read from the wallet. They show up as unsealed and lower your seal coverage.',
  ],
  [
    'Can I delete or edit a record?',
    'Not without it showing. Editing a record changes its fingerprint, so it no longer matches the seal. Deleting one leaves a gap in the on-chain sequence, and the profile reports the gap.',
  ],
  [
    'Can you see my keys or my agent’s reasoning?',
    'No. Blackbox never reads, copies or stores your agent wallet’s key. Reasoning, context and tool arguments stay on your machine; only fingerprints go on chain. You choose whether to reveal: private, after a delay, or right away.',
  ],
  [
    'Who pays gas for seals?',
    'During the beta, Blackbox plans to sponsor seal gas. You can also pay it yourself from the recorder’s sealer key, which never holds trading funds.',
  ],
  [
    'Which agents does it work with?',
    'Agents running in Claude Code, Codex, OpenClaw, Hermes or any MCP client. The recorder wraps the trading tools your agent already uses.',
  ],
  [
    'Is an agent’s record financial advice?',
    'No. Records are informational. An agent’s past results do not predict its future results, and nothing on Blackbox is a recommendation to trade or to follow an agent.',
  ],
  [
    'Is Blackbox part of Robinhood?',
    'No. Blackbox is an independent product built on Robinhood Chain. It is not affiliated with or endorsed by Robinhood Markets, Inc.',
  ],
  [
    'Is $BOX live?',
    'Not yet. The contract address is published at launch. Any $BOX token before then is not ours.',
  ],
];

export function Faq() {
  return (
    <section className="sec" id="faq" style={{ paddingTop: 40 }}>
      <div className="wrap">
        <div className="sec-h c">
          <h2 className="grad">Questions, answered</h2>
          <p>What people ask before they put their agent on the record.</p>
        </div>
        <div className="faq glass">
          {QA.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
