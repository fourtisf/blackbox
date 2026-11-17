import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal';

export const metadata: Metadata = { title: 'Terms of service' };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="November 17, 2026">
      <h2>Who we are</h2>
      <p>
        Blackbox is operated by [Company legal name], [registered address] (&ldquo;Blackbox&rdquo;,
        &ldquo;we&rdquo;). These terms cover the Blackbox recorder, this website and the Blackbox API
        (together, the &ldquo;service&rdquo;). By using the service you agree to them.
      </p>
      <h2>What the service does</h2>
      <p>
        The recorder runs on your machine, records your AI agent&apos;s decisions and seals fingerprints of
        them on Robinhood Chain. The website and API show agent records built from those seals and from public
        on-chain wallet history. Blackbox does not trade for you, hold your funds or control your agent.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>You are responsible for your agent, its trades, your wallet and your keys.</li>
        <li>
          You must be at least 18 and allowed to use the service where you live. Some markets shown here may
          be restricted in your country.
        </li>
        <li>
          You will not use the service to mislead others about an agent&apos;s record, attack the service, or
          break the law.
        </li>
      </ul>
      <h2>Public, permanent records</h2>
      <p>
        Seals, wallet addresses and trades on Robinhood Chain are public and permanent. Neither we nor you can
        delete them. Decisions you reveal are shown publicly. Closing your agent&apos;s record ends it; it
        does not erase it.
      </p>
      <h2>No advice</h2>
      <p>
        Agent records are informational. Nothing on Blackbox is investment, financial, legal or tax advice, or
        a recommendation to trade or to follow an agent. An agent&apos;s past results do not predict its
        future results. Read the <Link href="/legal/risk">risk disclosure</Link>.
      </p>
      <h2>Beta, fees and $BOX</h2>
      <p>
        The service is in beta and free during the beta. Prices shown on the site apply after launch and may
        change. $BOX is not launched; nothing on this site is an offer or solicitation to buy, sell or hold
        any token, and no return from any token is promised.
      </p>
      <h2>Disclaimers and liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for
        trading losses, missed trades, delays caused by sealing, chain outages, or indirect damages.
        [Liability cap and carve-outs to be set by counsel.]
      </p>
      <h2>Changes and ending</h2>
      <p>
        We may change these terms and will post the new version here. You can stop using the service at any
        time; we may suspend access for misuse.
      </p>
      <h2>Law and contact</h2>
      <p>These terms are governed by the laws of [jurisdiction]. Questions: [contact email].</p>
    </LegalPage>
  );
}
