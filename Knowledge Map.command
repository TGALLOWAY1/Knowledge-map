#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Knowledge Map — one-click local launcher (macOS)
#
# Double-click this file in Finder to start the app. It:
#   • installs dependencies and sets up the database the first time,
#   • starts the local server, and
#   • opens Knowledge Map in your browser.
#
# Your study data lives in a single local file (prisma/knowledge-map.db) and
# stays put between launches. Nothing is uploaded anywhere.
#
# Leave this Terminal window open while you use the app; closing it (or pressing
# Ctrl-C) stops the server. Re-open the app anytime by double-clicking again.
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail

# Run from the folder this script lives in, so it works no matter where it is.
cd "$(dirname "$0")" || exit 1

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

# GUI-launched scripts get a bare PATH, so add where Node usually lives.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# shellcheck disable=SC1090
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

echo "──────────────────────────────────────────"
echo "  Knowledge Map"
echo "──────────────────────────────────────────"

# Already running? Just open the browser and stop here.
if curl -s --max-time 2 "$URL" >/dev/null 2>&1; then
  echo "Already running — opening $URL"
  open "$URL"
  exit 0
fi

# Node is required.
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js isn't installed (or isn't on the PATH)."
  echo "Install the LTS version from https://nodejs.org, then double-click this again."
  open "https://nodejs.org/en/download" >/dev/null 2>&1
  echo
  read -r -p "Press Return to close…" _
  exit 1
fi
echo "Using Node $(node -v)"

# First-run setup ------------------------------------------------------------

# Make sure a .env exists (Next.js and Prisma read it automatically).
if [ ! -f .env ]; then
  echo "Creating .env from .env.example…"
  cp .env.example .env
fi

# Install dependencies on first run (postinstall also runs `prisma generate`).
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only, this can take a minute)…"
  npm install || { echo "npm install failed."; read -r -p "Press Return to close…" _; exit 1; }
fi

# Create + seed the local database the first time.
if [ ! -f prisma/knowledge-map.db ]; then
  echo "Setting up your local database…"
  npx prisma db push || { echo "Database setup failed."; read -r -p "Press Return to close…" _; exit 1; }
  echo "Loading the starter infographic collection…"
  npm run db:seed || echo "(Seed skipped — you can add content from the Studio.)"
fi

# Build for production the first time (fast, cached afterwards).
if [ ! -d .next ]; then
  echo "Building the app (first run only)…"
  npm run build || { echo "Build failed."; read -r -p "Press Return to close…" _; exit 1; }
fi

# Start the server -----------------------------------------------------------

echo "Starting Knowledge Map…"
npm run start -- -p "$PORT" &
SERVER_PID=$!

# Stop the server when this window is closed / Ctrl-C.
trap 'echo; echo "Stopping Knowledge Map…"; kill "$SERVER_PID" 2>/dev/null; exit 0' INT TERM

# Wait until the server is accepting connections, then open the browser.
for _ in $(seq 1 60); do
  if curl -s --max-time 2 "$URL" >/dev/null 2>&1; then
    echo "Opening $URL"
    open "$URL"
    break
  fi
  sleep 1
done

echo
echo "Knowledge Map is running. Keep this window open while you study."
echo "Close it (or press Ctrl-C) to stop."

# Keep the script alive alongside the server.
wait "$SERVER_PID"
