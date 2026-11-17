// PM2 process file. Run from the repo root: pm2 start infra/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'bb-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
    {
      name: 'bb-api',
      cwd: './apps/api',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 4000 },
      max_memory_restart: '500M',
    },
    {
      name: 'bb-indexer',
      cwd: './apps/indexer',
      script: 'dist/main.js',
      instances: 1, // must stay single: it owns the chain cursors
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
  ],
};
