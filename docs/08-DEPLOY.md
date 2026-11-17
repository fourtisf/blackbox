# 08: Deploy (Hostinger VPS, PM2, Nginx)

## Server

- Ubuntu 22.04 or 24.04, 4 vCPU / 8 GB RAM minimum.
- Install: Node 20 LTS (via `nvm` or NodeSource), pnpm, PM2, Nginx, Certbot, PostgreSQL 16, Redis 7, Foundry (only on the deploy machine for contracts).
- Firewall: allow 22, 80, 443 only. Postgres and Redis listen on localhost.

## Domains (placeholders until decided)

- `blackbox.example` → web (Next.js on :3000)
- `api.blackbox.example` → API (Fastify on :4000)

## Build and run

Everything below is scripted and tested; the step-by-step guide (Indonesian) is `infra/PANDUAN-DEPLOY.md`.

```bash
# once, on a fresh Ubuntu 22.04/24.04 server, from the repo checkout (/var/www/blackbox)
sudo bash infra/setup-vps.sh --domain blackbox.example --api-domain api.blackbox.example --email ops@example.com --prelaunch

# every later update, as the app user
sudo -u blackbox -H bash infra/deploy.sh --prelaunch
```

`setup-vps.sh` is idempotent and supports `--dry-run`. It installs Node (22 by default, `--node 20` to pin the spec'd version), pnpm, PM2, Nginx, Certbot, PostgreSQL 16 and Redis 7; creates the `blackbox` user, database and `.env` with fresh secrets (`WAITLIST_SECRET`, `ADMIN_TOKEN`, `SESSION_SECRET`, database password); migrates, builds and starts PM2; renders `infra/nginx.conf` for the domains (dropping IPv6 listeners when the server has no IPv6); enables UFW (22, 80, 443), TLS with Certbot, and the nightly backup cron. `--prelaunch` builds and runs only `bb-web` and `bb-api`; drop it once the indexer has a chain to read.

## Processes (`infra/ecosystem.config.cjs`)

The file is `.cjs` because the repo is an ES module package, and it loads the repo-root `.env` into every process.

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

- Nightly `pg_dump` (`infra/backup.sh`, 03:17, keeps 14 days in `/var/backups/blackbox`); set `BACKUP_RSYNC_TARGET` to copy off the server.
- PM2 logs rotated (`pm2 install pm2-logrotate`).
- Health endpoints: `GET /v1/health` (API: db, redis, rpc) and indexer lag (latest chain block − cursor) exposed at `/v1/health/indexer`. Alert to Telegram when lag > 300 blocks or relayer balance is low.

## Recorder release (npm)

- Publish `packages/recorder` with npm Trusted Publishing from GitHub Actions on version tags.
- The CLI must run with `npx` on macOS, Linux and Windows (test all three in CI).
