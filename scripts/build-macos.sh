#!/usr/bin/env bash
#
# Build, sign and notarize the macOS universal DMG locally, the same way CI does.
#
#   scripts/build-macos.sh
#
# Reads credentials from .env at the repo root (APPLE_SIGNING_IDENTITY, APPLE_ID,
# APPLE_PASSWORD, APPLE_TEAM_ID). Pass --no-notarize to stop after signing.
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET=universal-apple-darwin
NOTARIZE=true
[ "${1:-}" = "--no-notarize" ] && NOTARIZE=false

# Parse .env without letting the shell evaluate it. APPLE_SIGNING_IDENTITY
# contains "(TEAMID)" and the base64 cert ends in "==", both of which break
# `source .env`. IFS='=' splits on the first = only, so padding survives.
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    case "$key" in '' | '#'*) continue ;; esac
    export "$key=${value%$'\r'}"
  done < .env
fi

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "build-macos: APPLE_SIGNING_IDENTITY is not set (checked .env and the environment)" >&2
  exit 1
fi

# Homebrew's rust ships only the host target, so a cargo from /opt/homebrew
# cannot build the x86_64 half of a universal binary even after `rustup target
# add` — it fails with E0463 "can't find crate for `core`". Prefer rustup's shims.
if [ -x "$HOME/.cargo/bin/rustup" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# Two sets of variables are deliberately withheld from the bundler:
#
#   APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID — Tauri notarizes inline as soon as it
#   sees these, via `notarytool submit --wait`, which has no timeout and hangs for
#   hours. We notarize separately below with a bounded poll loop.
#
#   APPLE_CERTIFICATE/_PASSWORD — these make Tauri build a throwaway keychain from
#   the .p12 instead of using the login keychain. That path is for CI, which has no
#   keychain; locally it only adds a way for a stale .p12 to shadow the real
#   identity. Sign with whatever `security find-identity -v -p codesigning` shows.
env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_TEAM_ID \
    -u APPLE_CERTIFICATE -u APPLE_CERTIFICATE_PASSWORD \
  pnpm --filter @npmax/desktop exec tauri build --target "$TARGET"

BUNDLE_DIR="apps/desktop/src-tauri/target/$TARGET/release/bundle"
APP_PATH="$(find "$BUNDLE_DIR/macos" -maxdepth 1 -type d -name '*.app' -print -quit)"
DMG_PATH="$(find "$BUNDLE_DIR/dmg" -maxdepth 1 -type f -name '*.dmg' -print -quit)"

if [ -z "$APP_PATH" ] || [ -z "$DMG_PATH" ]; then
  echo "build-macos: bundler did not produce a .app and .dmg under $BUNDLE_DIR" >&2
  exit 1
fi

echo "=== Verifying signature ==="
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
lipo -archs "$APP_PATH/Contents/MacOS/npmax"

if [ "$NOTARIZE" != true ]; then
  echo "Skipped notarization. Signed DMG: $DMG_PATH"
  exit 0
fi

scripts/notarize-macos.sh "$DMG_PATH"
echo "Done: $DMG_PATH"
