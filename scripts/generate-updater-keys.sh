#!/usr/bin/env bash
# Generate Tauri updater signing keys for npMax.
# Private key stays on your machine / in GitHub Secrets — never commit it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_PATH="${TAURI_UPDATER_KEY_PATH:-$HOME/.tauri/npmax.key}"
KEY_DIR="$(dirname "$KEY_PATH")"

mkdir -p "$KEY_DIR"

if [[ -f "$KEY_PATH" ]]; then
  echo "Key already exists at: $KEY_PATH"
  echo "Remove it first if you want to regenerate (also rotate GitHub secret + pubkey)."
  echo
else
  echo "Generating updater keypair → $KEY_PATH"
  cd "$ROOT/apps/desktop"
  pnpm exec tauri signer generate -w "$KEY_PATH"
  echo
fi

if [[ ! -f "$KEY_PATH.pub" ]]; then
  echo "error: expected public key at $KEY_PATH.pub" >&2
  exit 1
fi

PUBKEY="$(tr -d '\n' < "$KEY_PATH.pub")"

echo "=== Public key (paste into apps/desktop/src-tauri/tauri.conf.json → plugins.updater.pubkey) ==="
echo "$PUBKEY"
echo
echo "=== GitHub Actions secrets ==="
echo "TAURI_SIGNING_PRIVATE_KEY = full contents of: $KEY_PATH"
echo "TAURI_SIGNING_PRIVATE_KEY_PASSWORD = password you set during generate (leave empty secret if none)"
echo
echo "Never commit $KEY_PATH or any *.key file."
