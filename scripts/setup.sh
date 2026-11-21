#!/usr/bin/env bash
# One-command setup for a teammate laptop (macOS or Linux). Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n== %s\n' "$1"; }

step "Node 24"
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$node_major" != "24" ]; then
  echo "Need Node 24 (found: ${node_major}). Install: https://github.com/nvm-sh/nvm then 'nvm install 24 && nvm use'"
  exit 1
fi

step "Google Application Default Credentials"
if ! command -v gcloud >/dev/null; then
  echo "Install gcloud: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  gcloud auth application-default login
fi

step "Local config"
local_env=".env.local"
# '|| true': with set -e a failing substitution would end the script without a message.
project="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get project 2>/dev/null || true)}"
# An existing file with an empty project is the leftover of an earlier run: regenerate it.
if [ ! -f "$local_env" ] || grep -Eq '^GOOGLE_CLOUD_PROJECT=[[:space:]]*$' "$local_env"; then
  if [ -z "$project" ]; then
    echo "No Google Cloud project found. Set a project: gcloud config set project <id>"
    echo "Or run: export GOOGLE_CLOUD_PROJECT=<id>   Then run this script again."
    exit 1
  fi
  printf 'GOOGLE_CLOUD_PROJECT=%s\nGOOGLE_CLOUD_LOCATION=global\nGOOGLE_CLOUD_QUOTA_PROJECT=%s\n' "$project" "$project" > "$local_env"
  echo "Wrote $local_env for project $project (git-ignored)."
else
  echo "$local_env already exists; left untouched."
fi

step "Install and test"
npm ci
npm test

step "Ready"
echo "Run: npx expo start   (scan the QR code with Expo Go; same Wi-Fi as this laptop)"
echo "Wi-Fi blocks the phone? npx expo start --tunnel, or use the phone's hotspot."
