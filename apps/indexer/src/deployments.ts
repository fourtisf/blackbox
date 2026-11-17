import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Address } from '@blackbox/protocol';
import { z } from 'zod';

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((a) => a.toLowerCase() as Address);

const Deployment = z.object({
  chainId: z.number().int().positive(),
  startBlock: z.number().int().nonnegative(),
  AgentRegistry: address,
  SealRegistry: address,
});

export type Deployment = z.infer<typeof Deployment>;

/** Reads packages/contracts/deployments/<chainId>.json; null when the contracts are not deployed on that chain. */
export function loadDeployment(chainId: number, dir: string): Deployment | null {
  let raw: string;
  try {
    raw = readFileSync(join(dir, `${chainId}.json`), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  const d = Deployment.parse(JSON.parse(raw));
  if (d.chainId !== chainId) throw new Error(`${chainId}.json describes chain ${d.chainId}`);
  return d;
}
