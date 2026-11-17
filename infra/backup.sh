#!/usr/bin/env bash
# Nightly PostgreSQL backup (installed in root's crontab by setup-vps.sh). Keeps 14 days.
# Copy the backups off the server too: set BACKUP_RSYNC_TARGET (e.g. user@backup-host:/backups/blackbox).
set -euo pipefail
DIR=/var/backups/blackbox
KEEP_DAYS=14
mkdir -p "$DIR"
chmod 700 "$DIR"
FILE="$DIR/blackbox-$(date -u +%Y%m%d-%H%M).sql.gz"
sudo -u postgres pg_dump --no-owner blackbox | gzip -9 > "$FILE"
chmod 600 "$FILE"
find "$DIR" -name 'blackbox-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
if [[ -n "${BACKUP_RSYNC_TARGET:-}" ]]; then
  rsync -a --delete "$DIR/" "$BACKUP_RSYNC_TARGET/"
fi
echo "$(date -u +%FT%TZ) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
