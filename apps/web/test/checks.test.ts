import { describe, expect, it } from 'vitest';
import { buildVerifyView, runProtocolChecks } from '@/lib/checks';
import { verifyExamples, verifyLookup } from '@/lib/mock/store';
import type { VerifyResponse } from '@/lib/api/types';

const view = (res: VerifyResponse) => buildVerifyView(res, runProtocolChecks(res), () => 'Jul 3, 2026');
const byLabel = () => Object.fromEntries(verifyExamples().map((e) => [e.label, verifyLookup(e.hash)]));

describe('verifier copy', () => {
  it('a sealed trade reads like the prototype', () => {
    const v = view(byLabel()['Sealed trade']!);
    expect(v.tone).toBe('ok');
    expect(v.title).toBe('Record checks out');
    expect(v.items.map((i) => i.title)).toEqual([
      'Fingerprint found on Robinhood Chain',
      'In sequence',
      'Sealed before the trade',
      'Reasoning matches the seal',
      'Wallet bound to the agent',
      'Outcome read from the wallet',
    ]);
    expect(v.items.find((i) => i.title === 'Reasoning matches the seal')!.quote).toBeTruthy();
  });

  it('an unsealed trade keeps the prototype order', () => {
    const v = view(byLabel()['Unsealed trade']!);
    expect(v).toMatchObject({ tone: 'warn', title: 'Trade found, reasoning not sealed' });
    expect(v.items.map((i) => i.title)).toEqual([
      'No fingerprint for this trade',
      'Trade found on Robinhood Chain',
      'Wallet bound to the agent',
      'Still counted in the record',
    ]);
  });

  it('late seals, missing reasoning and private records get their own copy', () => {
    const late = view(byLabel()['Late seal']!);
    expect(late.title).toBe('Trade found, sealed after it landed');
    expect(late.items.map((i) => i.title)).toContain('Sealed after the trade');
    const auto = view(byLabel()['No reasoning']!);
    expect(auto.title).toBe('Trade sealed, no reasoning recorded');
    expect(auto.items.map((i) => i.title)).toContain('No reasoning recorded');
    const priv = late.items.find((i) => i.title === 'Reasoning private');
    expect(priv?.status).toBe('skip');
  });

  it('unknown hashes are not found', () => {
    expect(view({ found: false }).tone).toBe('notfound');
  });
});
