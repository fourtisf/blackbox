# 08: Deploy (Hostinger VPS, PM2, Nginx)

## Server

- Ubuntu 22.04 or 24.04, 4 vCPU / 8 GB RAM minimum.
- Install: Node 20 LTS (via `nvm` or NodeSource), pnpm, PM2, Nginx, Certbot, PostgreSQL 16, Redis 7, Foundry (only on the deploy machine for contracts).
- Firewall: allow 22, 80, 443 only. Postgres and Redis listen on localhost.

## Domains (placeholders until decided)

- `blackbox.example` → web (Next.js on :3000)
- `api.blackbox.example` → API (Fastify on :4000)

## Build and run

```bash
git clone <repo> /var/www/blackbox && cd /var/www/blackbox
cp .env.example .env   # fill values
pnpm install --frozen-lockfile
pnpm --filter api prisma migrate deploy
pnpm build
pm2 start infra/ecosystem.config.js
pm2 save && pm2 startup
sudo cp infra/nginx.conf /etc/nginx/sites-available/blackbox
sudo ln -s /etc/nginx/sites-available/blackbox /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d blackbox.example -d api.blackbox.example
```

## Processes (`infra/ecosystem.config.js`)

| Name | Command | Instances |
|---|---|---|
| `bb-web` | `next start -p 3000` in `apps/web` | 2 (cluster) |
| `bb-api` | `node dist/server.js` in `apps/api` | 2 (cluster) |
| `bb-indexer` | `node dist/main.js` in `apps/indexer` | 1 (must be single) |

## SSE through Nginx

The live feed needs `proxy_buffering off` and a long read timeout on `/v1/feed/live` (already in `infra/nginx.conf`).

## Secrets

- `RELAYER_PRIVATE_KEY` funds sponsored seals. Keep a small ETH balance on Robinhood Chain; alert when below the threshold. Never commit it.
- `DEPLOYER_PRIVATE_KEY` only on the machine that deploys contracts, removed afterwards.
- `.env` is `chmod 600`, owned by the deploy user.

## Backups and monitoring

- Nightly `pg_dump` to off-server storage, keep 14 days.
- PM2 logs rotated (`pm2 install pm2-logrotate`).
- Health endpoints: `GET /v1/health` (API: db, redis, rpc) and indexer lag (latest chain block − cursor) exposed at `/v1/health/indexer`. Alert to Telegram when lag > 300 blocks or relayer balance is low.

## Recorder release (npm)

- Publish `packages/recorder` with npm Trusted Publishing from GitHub Actions on version tags.
- The CLI must run with `npx` on macOS, Linux and Windows (test all three in CI).
