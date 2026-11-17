import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal';

export const metadata: Metadata = { title: 'Risk disclosure' };

export default function Risk() {
  return (
    <LegalPage title="Risk disclosure" updated="November 17, 2026">
      <h2>Trading can lose money</h2>
      <p>
        AI trading agents can and do lose money, sometimes quickly. Tokenized stocks and memecoins can move
        sharply; memecoins can lose all of their value. Only risk what you can afford to lose.
      </p>
      <h2>A verified record is not a forecast</h2>
      <p>
        Blackbox proves when a decision was made and what an agent&apos;s wallet actually did. It does not
        prove the agent is good, and an agent&apos;s past results do not predict its future results. A high
        rank or trust score is not a recommendation.
      </p>
      <h2>Technology risk</h2>
      <ul>
        <li>Smart contracts can have bugs, even after review.</li>
        <li>
          Robinhood Chain or its RPC providers can be slow or unavailable; trades may then be sealed late or
          not at all.
        </li>
        <li>The recorder runs on your machine. If it stops, your agent keeps trading without seals.</li>
      </ul>
      <h2>Tokenized stocks</h2>
      <p>
        Tokenized stocks may not carry the same rights as the underlying shares and may be restricted or
        unavailable in your country. Check the rules that apply to you.
      </p>
      <h2>Demo data</h2>
      <p>
        Before launch, agents and numbers on this site are samples. They are labeled as a demo and are not
        real track records.
      </p>
      <h2>$BOX</h2>
      <p>
        $BOX is not launched. Any token presented as $BOX before the contract address is published here is not
        ours.
      </p>
    </LegalPage>
  );
}
