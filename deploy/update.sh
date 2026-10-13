#!/usr/bin/env bash
# REIN 1V1 — apply new files after uploading them:   sudo bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
sed -i 's/\r$//' deploy/*.sh deploy/Caddyfile docker-compose.yml Dockerfile 2>/dev/null || true

# Safety copy of the database before every update.
if [ -f data/rein.db ]; then
  mkdir -p data/backups
  docker compose exec -T app node --disable-warning=ExperimentalWarning -e "
    import('./server/backup.js').then(m => console.log('backup:', m.backupNow('before-update')))" 2>/dev/null \
    || echo "(backup skipped — site not running)"
fi

chown -R 1000:1000 data
docker compose up -d --build
docker image prune -f >/dev/null
echo "✔ Updated. Logs: docker compose logs -f app"
