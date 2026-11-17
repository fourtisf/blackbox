// PM2 process file. From the repo root: pm2 start infra/ecosystem.config.cjs
// Pre-launch (website + waitlist API only): pm2 start infra/ecosystem.config.cjs --only bb-web,bb-api
// .cjs because the repo is an ES module package; PM2 loads this file with require().
const fs = require('node:fs');
const path = require('node:path');

/** Reads the repo-root .env so the API and indexer get the same settings as `pnpm dev`. */
function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const root = path.resolve(__dirname, '..');
const dotenv = readEnv(path.join(root, '.env'));

module.exports = {
  apps: [
    {
      name: 'bb-web',
      cwd: path.join(root, 'apps/web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 2,
      exec_mode: 'cluster',
      env: { ...dotenv, NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
    {
      name: 'bb-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { ...dotenv, NODE_ENV: 'production', API_HOST: '127.0.0.1', API_PORT: '4000' },
      max_memory_restart: '500M',
    },
    {
      name: 'bb-indexer',
      cwd: path.join(root, 'apps/indexer'),
      script: 'dist/main.js',
      instances: 1, // must stay single: it owns the chain cursors
      exec_mode: 'fork',
      env: { ...dotenv, NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
  ],
};
