#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04 / 24.04 VPS for Blackbox. Safe to run again.
#
#   sudo bash infra/setup-vps.sh --domain blackbox.example --api-domain api.blackbox.example \
#        --email you@example.com [--prelaunch] [--skip-tls] [--node 22] [--dry-run]
#
# Run it from the repository checkout (e.g. /var/www/blackbox). It installs Node, pnpm, PM2,
# Nginx, Certbot, PostgreSQL 16 and Redis 7, creates the database and .env with fresh secrets,
# builds, starts the apps under PM2, configures Nginx and TLS, a firewall and nightly backups.
# --prelaunch runs only the website and the waitlist API (no indexer: nothing on chain yet).
set -euo pipefail

DOMAIN=""
API_DOMAIN=""
EMAIL=""
PRELAUNCH=0
SKIP_TLS=0
DRY_RUN=0
NODE_MAJOR=22
APP_USER=blackbox
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() { sed -n '2,12p' "$0"; exit 1; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --api-domain) API_DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --prelaunch) PRELAUNCH=1; shift ;;
    --skip-tls) SKIP_TLS=1; shift ;;
    --node) NODE_MAJOR="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done
[[ -n "$DOMAIN" && -n "$API_DOMAIN" ]] || usage
[[ $SKIP_TLS -eq 1 || -n "$EMAIL" ]] || { echo "--email is required for the TLS certificate (or pass --skip-tls)"; exit 1; }
[[ $DRY_RUN -eq 1 || $EUID -eq 0 ]] || { echo "Run as root: sudo bash $0 ..."; exit 1; }

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
run() { if [[ $DRY_RUN -eq 1 ]]; then printf '  [dry-run] %s\n' "$*"; else "$@"; fi; }
as_app() { run sudo -u "$APP_USER" -H bash -lc "cd '$REPO_DIR' && $*"; }
secret() { openssl rand -hex "$1"; }

ONLY="bb-web,bb-api,bb-indexer"
BUILD_FILTER=""
if [[ $PRELAUNCH -eq 1 ]]; then
  ONLY="bb-web,bb-api"
  BUILD_FILTER="--filter=@blackbox/web --filter=@blackbox/api"
fi

step "System packages"
run apt-get update -qq
run env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl git gnupg openssl ufw nginx certbot python3-certbot-nginx redis-server postgresql-common
if ! command -v psql >/dev/null 2>&1 || ! psql --version | grep -q ' 16\.'; then
  # PostgreSQL 16 from the official PostgreSQL apt repository (Ubuntu 22.04 ships 14).
  run env YES=yes /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16
fi
run systemctl enable --now postgresql redis-server nginx

step "Node.js $NODE_MAJOR, pnpm and PM2"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  run bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -"
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi
PNPM_VERSION="$(node -p "require('$REPO_DIR/package.json').packageManager.split('@')[1]" 2>/dev/null || echo 10.28.0)"
run corepack enable
run corepack prepare "pnpm@${PNPM_VERSION}" --activate
command -v pm2 >/dev/null 2>&1 || run npm install -g pm2@6

step "App user and files"
id "$APP_USER" >/dev/null 2>&1 || run useradd --create-home --shell /bin/bash "$APP_USER"
run chown -R "$APP_USER:$APP_USER" "$REPO_DIR"
as_app "git submodule update --init --recursive"

step "Database"
ENV_FILE="$REPO_DIR/.env"
if [[ -f "$ENV_FILE" ]] && grep -q '^DATABASE_URL=postgresql://blackbox:' "$ENV_FILE" && ! grep -q 'change-me' "$ENV_FILE"; then
  DB_PASSWORD="$(sed -n 's#^DATABASE_URL=postgresql://blackbox:\([^@]*\)@.*#\1#p' "$ENV_FILE")"
  echo "  Keeping the existing database password from .env"
else
  DB_PASSWORD="$(secret 24)"
fi
run sudo -u postgres psql -v ON_ERROR_STOP=1 -q -c "DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'blackbox') THEN CREATE ROLE blackbox LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE ALTER ROLE blackbox PASSWORD '${DB_PASSWORD}'; END IF; END \$\$;"
if [[ $DRY_RUN -eq 1 ]] || ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='blackbox'" | grep -q 1; then
  run sudo -u postgres createdb -O blackbox blackbox
fi

step "Environment (.env)"
set_env() { # set_env KEY VALUE: replace or append in .env
  if [[ $DRY_RUN -eq 1 ]]; then printf '  [dry-run] %s=%s\n' "$1" "$( [[ "$1" =~ SECRET|TOKEN|PASSWORD|DATABASE_URL ]] && echo '<generated>' || echo "$2")"; return; fi
  if grep -q "^$1=" "$ENV_FILE"; then sed -i "s#^$1=.*#$1=$2#" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}
get_env() { sed -n "s#^$1=##p" "$ENV_FILE" 2>/dev/null | head -1; }
[[ -f "$ENV_FILE" ]] || run cp "$REPO_DIR/.env.example" "$ENV_FILE"
set_env NODE_ENV production
set_env APP_URL "https://$DOMAIN"
set_env API_URL "https://$API_DOMAIN"
set_env DATABASE_URL "postgresql://blackbox:${DB_PASSWORD}@127.0.0.1:5432/blackbox"
set_env NEXT_PUBLIC_API_URL "https://$API_DOMAIN"
set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
set_env SIWE_DOMAIN "$DOMAIN"
# Keep secrets that already exist, so links in sent emails and the admin token keep working.
[[ "$(get_env WAITLIST_SECRET)" =~ ^.{32,}$ ]] || set_env WAITLIST_SECRET "$(secret 32)"
[[ "$(get_env ADMIN_TOKEN)" =~ ^.{24,}$ ]] || set_env ADMIN_TOKEN "$(secret 24)"
[[ "$(get_env SESSION_SECRET)" =~ ^.{32,}$ && "$(get_env SESSION_SECRET)" != change-me* ]] || set_env SESSION_SECRET "$(secret 32)"
run chown "$APP_USER:$APP_USER" "$ENV_FILE"
run chmod 600 "$ENV_FILE"

step "Install, migrate, build"
as_app "pnpm install --frozen-lockfile"
as_app "pnpm --filter api prisma migrate deploy"
as_app "pnpm turbo run build $BUILD_FILTER"

step "Start with PM2 ($ONLY)"
as_app "pm2 startOrReload infra/ecosystem.config.cjs --only $ONLY && pm2 save"
run env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER"
as_app "pm2 install pm2-logrotate >/dev/null"

step "Nginx"
SITE=/etc/nginx/sites-available/blackbox
if [[ $DRY_RUN -eq 1 ]]; then
  echo "  [dry-run] render infra/nginx.conf for $DOMAIN and $API_DOMAIN into $SITE"
elif [[ -f "$SITE" ]] && grep -q 'managed by Certbot' "$SITE"; then
  echo "  $SITE already has TLS from Certbot; leaving it as is"
else
  sed -e "s/api\.blackbox\.example/$API_DOMAIN/g" -e "s/blackbox\.example/$DOMAIN/g" "$REPO_DIR/infra/nginx.conf" > "$SITE"
  # Some VPS plans have IPv6 disabled; nginx refuses to start if it can't listen on [::].
  [[ -f /proc/net/if_inet6 ]] || sed -i '/listen \[::\]/d' "$SITE"
fi
run ln -sf "$SITE" /etc/nginx/sites-enabled/blackbox
run rm -f /etc/nginx/sites-enabled/default
run nginx -t
run systemctl reload nginx

step "Firewall: SSH, HTTP, HTTPS only"
run ufw allow OpenSSH
run ufw allow 'Nginx Full'
run ufw --force enable

if [[ $SKIP_TLS -eq 0 ]]; then
  step "TLS certificates (DNS for $DOMAIN and $API_DOMAIN must point here)"
  run certbot --nginx -d "$DOMAIN" -d "$API_DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect
fi

step "Nightly database backup (03:17, keeps 14 days)"
CRON="17 3 * * * $REPO_DIR/infra/backup.sh >> /var/log/blackbox-backup.log 2>&1"
if [[ $DRY_RUN -eq 1 ]]; then echo "  [dry-run] root crontab: $CRON"
else ( crontab -l 2>/dev/null | grep -v 'infra/backup.sh'; echo "$CRON" ) | crontab -
fi

step "Health check"
SCHEME=https; [[ $SKIP_TLS -eq 1 ]] && SCHEME=http
if [[ $DRY_RUN -eq 0 ]]; then
  sleep 3
  curl -fsS "$SCHEME://$API_DOMAIN/v1/health" && echo || echo "  API health check failed; see: sudo -u $APP_USER pm2 logs bb-api"
  curl -fsS -o /dev/null -w "  website: HTTP %{http_code}\n" "$SCHEME://$DOMAIN/" || echo "  Website check failed; see: sudo -u $APP_USER pm2 logs bb-web"
fi

cat <<DONE

Done.
  Website: $SCHEME://$DOMAIN
  API:     $SCHEME://$API_DOMAIN/v1/health
  Admin:   $SCHEME://$DOMAIN/admin
  Admin token (also in $ENV_FILE as ADMIN_TOKEN): $( [[ $DRY_RUN -eq 1 ]] && echo '<generated>' || get_env ADMIN_TOKEN )

Next: add SMTP_URL and MAIL_FROM to .env for confirmation emails, then run infra/deploy.sh.
DONE
