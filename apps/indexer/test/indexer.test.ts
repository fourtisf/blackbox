import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { loadDeployment } from '../src/deployments.js';

describe('loadConfig', () => {
  it('defaults to the local anvil chain and the contracts deployments folder', () => {
    const c = loadConfig({});
    expect(c).toMatchObject({
      network: 'local',
      chainId: 31337,
      rpcUrl: 'http://127.0.0.1:8545',
      pollMs: 5000,
    });
    expect(c.deploymentsDir).toMatch(/packages\/contracts\/deployments$/);
  });
  it('rejects a local network pointed at another chain', () => {
    expect(() => loadConfig({ NETWORK: 'local', CHAIN_ID: '4663' })).toThrow(/31337/);
  });
  it('rejects a bad RPC URL', () => {
    expect(() => loadConfig({ RPC_URL: 'not a url' })).toThrow(/RPC_URL/);
  });
});

describe('loadDeployment', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bb-deploy-'));
  const good = {
    chainId: 31337,
    startBlock: 0,
    AgentRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    SealRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  };
  writeFileSync(join(dir, '31337.json'), JSON.stringify(good));
  writeFileSync(join(dir, '1.json'), JSON.stringify({ ...good, chainId: 31337 }));
  writeFileSync(join(dir, '2.json'), JSON.stringify({ ...good, chainId: 2, SealRegistry: 'nope' }));

  it('reads and lowercases addresses', () => {
    expect(loadDeployment(31337, dir)).toEqual({
      ...good,
      AgentRegistry: good.AgentRegistry.toLowerCase(),
      SealRegistry: good.SealRegistry.toLowerCase(),
    });
  });
  it('returns null when nothing is deployed on that chain', () =>
    expect(loadDeployment(999, dir)).toBeNull());
  it('rejects a file for the wrong chain or with bad addresses', () => {
    expect(() => loadDeployment(1, dir)).toThrow(/describes chain 31337/);
    expect(() => loadDeployment(2, dir)).toThrow();
  });
});
