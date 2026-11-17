#!/usr/bin/env bash
# Deploys the latest code on the VPS. Run as the app user from the repo:
#   sudo -u blackbox -H bash infra/deploy.sh [--prelaunch] [--branch main]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PRELAUNCH=0
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prelaunch) PRELAUNCH=1; shift ;;
    --branch) BRANCH="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done
ONLY="bb-web,bb-api,bb-indexer"
FILTER=""
if [[ $PRELAUNCH -eq 1 ]]; then ONLY="bb-web,bb-api"; FILTER="--filter=@blackbox/web --filter=@blackbox/api"; fi

echo "==> Updating to origin/$BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"
git submodule update --init --recursive

echo "==> Install, migrate, build"
pnpm install --frozen-lockfile
pnpm --filter api prisma migrate deploy
# shellcheck disable=SC2086 # FILTER is a list of flags
pnpm turbo run build $FILTER

echo "==> Reloading $ONLY (zero downtime in cluster mode)"
pm2 startOrReload infra/ecosystem.config.cjs --only "$ONLY" --update-env
pm2 save

API_URL="$(sed -n 's#^API_URL=##p' .env | head -1)"
sleep 3
curl -fsS "${API_URL}/v1/health" && echo || { echo "API health check failed: pm2 logs bb-api"; exit 1; }
echo "Deployed $(git rev-parse --short HEAD)."
