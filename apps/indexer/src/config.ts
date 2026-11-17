import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const Env = z.object({
  NETWORK: z.enum(['local', 'testnet', 'mainnet']).default('local'),
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
  DEPLOYMENTS_DIR: z.string().optional(),
  INDEXER_POLL_MS: z.coerce.number().int().min(250).default(5000),
});

export interface IndexerConfig {
  network: 'local' | 'testnet' | 'mainnet';
  chainId: number;
  rpcUrl: string;
  deploymentsDir: string;
  pollMs: number;
}

/** src/ and dist/ both sit one level below apps/indexer. */
const DEFAULT_DEPLOYMENTS = fileURLToPath(
  new URL('../../../packages/contracts/deployments', import.meta.url),
);

export function loadConfig(source: NodeJS.ProcessEnv = process.env): IndexerConfig {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid indexer environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  const e = parsed.data;
  if (e.NETWORK === 'local' && e.CHAIN_ID !== 31337)
    throw new Error('NETWORK=local expects CHAIN_ID=31337 (anvil).');
  return {
    network: e.NETWORK,
    chainId: e.CHAIN_ID,
    rpcUrl: e.RPC_URL,
    deploymentsDir: e.DEPLOYMENTS_DIR ?? DEFAULT_DEPLOYMENTS,
    pollMs: e.INDEXER_POLL_MS,
  };
}
