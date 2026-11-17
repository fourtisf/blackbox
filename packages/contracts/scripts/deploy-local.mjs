// One command to get the contracts running locally:
//   pnpm --filter contracts deploy:local            start anvil (unless one is already up), deploy, keep anvil running
//   pnpm --filter contracts deploy:local -- --exit  deploy, then stop the anvil this script started
// Options: --port <n> (default 8545). Uses anvil's first unlocked dev account, so no key is stored anywhere.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const exitAfter = args.includes('--exit');
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? Number(args[portArg + 1]) : 8545;
const rpc = `http://127.0.0.1:${port}`;
const ANVIL_ACCOUNT_0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function chainId() {
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
    return parseInt((await res.json()).result, 16);
  } catch {
    return null;
  }
}

let anvil = null;
let id = await chainId();
if (id === null) {
  anvil = spawn('anvil', ['--port', String(port), '--silent'], { cwd: root, stdio: 'inherit' });
  anvil.on('error', (e) => {
    console.error(`Could not start anvil: ${e.message}. Run pnpm install, or install Foundry.`);
    process.exit(1);
  });
  for (let i = 0; i < 100 && id === null; i++) {
    await new Promise((r) => setTimeout(r, 100));
    id = await chainId();
  }
  if (id === null) {
    anvil.kill();
    throw new Error(`anvil did not start on ${rpc}`);
  }
  console.log(`Started anvil on ${rpc}`);
} else {
  console.log(`Using the chain already running on ${rpc} (chain id ${id})`);
}
if (id !== 31337) {
  anvil?.kill();
  throw new Error(`Refusing to deploy: ${rpc} is chain ${id}, not a local anvil (31337).`);
}

const forge = spawnSync(
  'forge',
  ['script', 'script/Deploy.s.sol:Deploy', '--rpc-url', rpc, '--broadcast', '--unlocked', '--sender', ANVIL_ACCOUNT_0],
  { cwd: root, stdio: 'inherit' },
);
if (forge.status !== 0) {
  anvil?.kill();
  process.exit(forge.status ?? 1);
}

const deployment = JSON.parse(readFileSync(`${root}/deployments/31337.json`, 'utf8'));
console.log('\nDeployed:', deployment);

if (!anvil) process.exit(0);
if (exitAfter) {
  anvil.kill();
  process.exit(0);
}
console.log(`\nanvil keeps running on ${rpc}. Press Ctrl-C to stop it.`);
const stop = () => {
  anvil.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
