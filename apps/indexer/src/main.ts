// Indexer entry point. Milestone 1 only connects to the chain and finds the contracts;
// the registry, seal, wallet, price and metric streams arrive in Milestone 4.
import { PROTOCOL_VERSION } from '@blackbox/protocol';
import { createPublicClient, http } from 'viem';
import { loadConfig } from './config.js';
import { loadDeployment } from './deployments.js';

const config = loadConfig();
const deployment = loadDeployment(config.chainId, config.deploymentsDir);
const client = createPublicClient({ transport: http(config.rpcUrl) });

const log = (msg: string) => console.log(`[indexer] ${msg}`);
log(
  `protocol v${PROTOCOL_VERSION}, network ${config.network}, chain ${config.chainId}, rpc ${config.rpcUrl}`,
);
if (deployment)
  log(
    `AgentRegistry ${deployment.AgentRegistry}, SealRegistry ${deployment.SealRegistry}, from block ${deployment.startBlock}`,
  );
else
  log(
    `no deployment for chain ${config.chainId} in ${config.deploymentsDir}; run pnpm --filter contracts deploy:local`,
  );

async function tick(): Promise<void> {
  const [chainId, block] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
  if (chainId !== config.chainId) throw new Error(`RPC is chain ${chainId}, expected ${config.chainId}`);
  log(`chain head ${block}`);
}

if (process.argv.includes('--once')) {
  await tick();
} else {
  const loop = async () => {
    try {
      await tick();
    } catch (e) {
      log(`RPC error: ${(e as Error).message.split('\n')[0]}`);
    }
    setTimeout(loop, config.pollMs);
  };
  void loop();
}
