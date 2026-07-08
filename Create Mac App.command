#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Create a real "Knowledge Map.app" you can keep in your Dock or Applications.
#
# Double-click this ONCE. It builds a small Mac app whose icon launches
# Knowledge Map (via the launcher script in this same folder). You can then drag
# "Knowledge Map.app" to your Dock or into /Applications and open it like any
# other app.
#
# Re-run this if you ever move the project folder to a new location.
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail
cd "$(dirname "$0")" || exit 1

REPO="$(pwd)"
LAUNCHER="$REPO/Knowledge Map.command"
APP="$REPO/Knowledge Map.app"

if [ ! -f "$LAUNCHER" ]; then
  echo "Can't find 'Knowledge Map.command' next to this script."
  read -r -p "Press Return to close…" _
  exit 1
fi

echo "Building 'Knowledge Map.app'…"
rm -rf "$APP"

# Compile an AppleScript app that opens Terminal and runs the launcher, so you
# still see the app's status window (and can close it to quit).
osacompile -o "$APP" <<APPLESCRIPT
on run
	set launcherPath to "$LAUNCHER"
	tell application "Terminal"
		activate
		do script "clear; " & quoted form of launcherPath
	end tell
end run
APPLESCRIPT

if [ -d "$APP" ]; then
  echo "Done. Created:"
  echo "  $APP"
  echo
  echo "Drag it to your Dock or into your Applications folder, then open it anytime."
  open -R "$APP"
else
  echo "Something went wrong creating the app."
fi

echo
read -r -p "Press Return to close…" _
