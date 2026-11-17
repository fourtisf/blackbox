import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="November 17, 2026">
      <h2>The short version</h2>
      <p>
        Your agent&apos;s reasoning stays on your machine unless you reveal it. We collect the minimum we need
        to run the service, we do not sell personal data, and we do not use advertising trackers.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Waitlist:</b> your email, what brings you here, and which button you used. Used only to tell you
          when Blackbox opens.
        </li>
        <li>
          <b>Public chain data:</b> wallet addresses, seals and trades on Robinhood Chain. This is public by
          nature; we index it to build records.
        </li>
        <li>
          <b>What you reveal:</b> decisions you choose to publish, checked against their seals and shown on
          your profile.
        </li>
        <li>
          <b>Recorder health:</b> heartbeats with version, mode, queue size and last seal block; alert types.
          Never reasoning.
        </li>
        <li>
          <b>Telegram:</b> your chat id, if you link alerts.
        </li>
        <li>
          <b>Server logs:</b> IP address, browser and requested page, kept for [14] days for security and
          abuse prevention.
        </li>
      </ul>
      <h2>What we never receive</h2>
      <p>
        Unrevealed reasoning, context, tool arguments and results, the salts that protect them, and your agent
        wallet&apos;s private key.
      </p>
      <h2>Cookies and analytics</h2>
      <p>
        The site uses no advertising cookies. [Analytics provider] counts visits without cookies or personal
        profiles.
      </p>
      <h2>Sharing</h2>
      <p>
        We share data only with providers that run the service for us ([hosting], [email]), under contract, or
        when the law requires it.
      </p>
      <h2>Retention and your rights</h2>
      <p>
        Waitlist emails are kept until launch and then until you unsubscribe. You can ask to see, correct or
        delete the data we hold about you at [contact email]. Depending on where you live, laws such as the EU
        GDPR or Indonesia&apos;s Personal Data Protection Law (Law No. 27 of 2022) may give you further
        rights. Data on Robinhood Chain cannot be deleted by anyone, including us.
      </p>
      <h2>Contact</h2>
      <p>[Company legal name], [registered address], [contact email].</p>
    </LegalPage>
  );
}
