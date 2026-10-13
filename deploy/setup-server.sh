#!/usr/bin/env bash
# REIN 1V1 — one-time server setup (Ubuntu / Debian).
# Run from the project folder:   sudo bash deploy/setup-server.sh
# Safe to run again: it keeps an existing .env and only rebuilds/restarts the site.
set -euo pipefail

cd "$(dirname "$0")/.."
DEFAULT_DOMAIN="rein1v1.com"

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✖ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run it with sudo:  sudo bash deploy/setup-server.sh"
[ -f package.json ] && [ -f docker-compose.yml ] || fail "Run this from the project folder (where package.json is)."

# Files edited on Windows may have CRLF line endings — fix them so nothing breaks.
sed -i 's/\r$//' deploy/*.sh deploy/Caddyfile docker-compose.yml Dockerfile 2>/dev/null || true

# ---------------------------------------------------------------- Docker
if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is missing (apt install docker-compose-plugin)."
ok "Docker ready"

# ---------------------------------------------------------------- .env
if [ ! -f .env ]; then
  say "Creating the production settings (.env)"
  read -rp "Domain [${DEFAULT_DOMAIN}]: " DOMAIN
  DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}
  DOMAIN=${DOMAIN#https://}; DOMAIN=${DOMAIN#http://}; DOMAIN=${DOMAIN%/}

  while true; do
    read -rsp "New admin (owner) password — 12+ characters: " PW; echo
    [ ${#PW} -ge 12 ] || { echo "Too short, try again."; continue; }
    read -rsp "Repeat it: " PW2; echo
    [ "$PW" = "$PW2" ] && break
    echo "They don't match, try again."
  done

  read -rp "Is the domain proxied by Cloudflare (orange cloud)? [y/N]: " CF
  case "$CF" in [yY]*) TRUST=2 ;; *) TRUST=1 ;; esac

  ADMIN_PATH="admin-$(openssl rand -hex 12)"
  SECRET="$(openssl rand -hex 32)"

  umask 077
  cat > .env <<ENV
# ── REIN 1V1 production settings (keep this file private) ──
DOMAIN=${DOMAIN}
PUBLIC_URL=https://${DOMAIN}
PORT=3000
TRUST_PROXY=${TRUST}

ADMIN_PASSWORD=${PW}
ADMIN_PATH=${ADMIN_PATH}
SESSION_SECRET=${SECRET}

# Discord bot — leave empty if the token was saved from Admin → Discord (it is in the database)
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_MEMBERS_INTENT=false

# How many daily database backups to keep in data/backups
BACKUP_KEEP=14
ENV
  umask 022
  ok ".env created"
else
  ok "Keeping the existing .env"
  grep -q '^DOMAIN=' .env || fail ".env has no DOMAIN= line (add DOMAIN=rein1v1.com)."
fi

# ---------------------------------------------------------------- data folder (database)
mkdir -p data/backups
chown -R 1000:1000 data
chmod 700 data
ok "data/ ready ($(ls data 2>/dev/null | wc -l) items)"

# ---------------------------------------------------------------- firewall
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null || true
  ufw allow 80/tcp >/dev/null || true
  ufw allow 443/tcp >/dev/null || true
  ufw allow 443/udp >/dev/null || true
  ufw --force enable >/dev/null || true
  ok "Firewall: only SSH, HTTP and HTTPS are open"
fi

# ---------------------------------------------------------------- start
say "Building and starting the site (first time takes a few minutes)…"
docker compose up -d --build

say "Waiting for the site to answer…"
for i in $(seq 1 30); do
  if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    ok "The site is running"; break
  fi
  sleep 2
  [ "$i" -eq 30 ] && { docker compose logs --tail=40 app; fail "The site did not start — see the log above."; }
done

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
APATH=$(grep '^ADMIN_PATH=' .env | cut -d= -f2)
printf '\n\033[1;32m══════════════════════════════════════════════════════\033[0m\n'
printf '  Site:         https://%s\n' "$DOMAIN"
printf '  Admin panel:  https://%s/%s   (keep it private)\n' "$DOMAIN" "$APATH"
printf '\033[1;32m══════════════════════════════════════════════════════\033[0m\n'
echo "  The HTTPS certificate is issued automatically on the first visit (needs the DNS to point here)."
echo "  Logs:    docker compose logs -f app"
echo "  Update:  sudo bash deploy/update.sh"
