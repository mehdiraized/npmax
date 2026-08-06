#!/usr/bin/env bash
#
# Submit a signed macOS artifact to Apple's notary service, wait for the ticket,
# and staple it. Used by both CI and local builds so they behave identically.
#
#   scripts/notarize-macos.sh path/to/npMax.dmg
#
# Requires APPLE_ID, APPLE_PASSWORD (app-specific password) and APPLE_TEAM_ID.
#
# Why this exists instead of `notarytool submit --wait` (which is what Tauri's
# bundler does internally): that call long-polls a single session with no
# timeout. On this account it has sat on "In Progress" for 150+ minutes on
# submissions Apple had already accepted, and locally it hangs indefinitely.
# One short `notarytool info` request per minute cannot get stuck that way.
set -euo pipefail

ARTIFACT="${1:?usage: notarize-macos.sh <path-to-dmg-or-zip>}"
# Apple's queue on this account regularly runs 1-3h; 66 minutes and 150+ minutes
# have both been observed on the same day. Budget generously.
DEADLINE_SECONDS="${NOTARIZE_DEADLINE_SECONDS:-18000}" # 5h
POLL_SECONDS="${NOTARIZE_POLL_SECONDS:-60}"

if [ ! -e "$ARTIFACT" ]; then
  echo "notarize-macos: no such file: $ARTIFACT" >&2
  exit 1
fi

for var in APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID; do
  if [ -z "${!var:-}" ]; then
    echo "notarize-macos: $var is required" >&2
    exit 1
  fi
done

notary() {
  xcrun notarytool "$@" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID"
}

echo "=== Submitting $(basename "$ARTIFACT") to Apple ==="
submission_id=""
for attempt in 1 2 3; do
  if output="$(notary submit "$ARTIFACT" --no-s3-acceleration --output-format json)"; then
    submission_id="$(printf '%s' "$output" | sed -nE 's/.*"id"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p')"
    [ -n "$submission_id" ] && break
  fi
  echo "Upload attempt ${attempt}/3 failed."
  [ "$attempt" -lt 3 ] && sleep 60
done

if [ -z "$submission_id" ]; then
  echo "::error::Could not upload $(basename "$ARTIFACT") to Apple's notary service."
  exit 1
fi

echo "Submission ID: $submission_id"
printf '%s\n' "$submission_id" > "$(dirname "$ARTIFACT")/notarization-submission.txt"

started=$SECONDS
status=""
while :; do
  # A transient network failure leaves status empty; that just means "poll again",
  # never "give up" — the submission is server-side and outlives this loop.
  status="$(notary info "$submission_id" 2>/dev/null \
    | sed -nE 's/^[[:space:]]*status:[[:space:]]*(.+)$/\1/p' | head -1)"

  case "$status" in
    Accepted)
      break
      ;;
    Invalid | Rejected)
      echo "::error::Apple rejected $(basename "$ARTIFACT") ($status). Submission: $submission_id"
      notary log "$submission_id" || true
      exit 1
      ;;
  esac

  elapsed=$((SECONDS - started))
  if [ "$elapsed" -ge "$DEADLINE_SECONDS" ]; then
    echo "::error::Still '${status:-unreachable}' after $((elapsed / 60))m. Submission: $submission_id"
    echo "The submission is still queued at Apple. Check it later with:"
    echo "  xcrun notarytool info $submission_id --apple-id \$APPLE_ID --password \$APPLE_PASSWORD --team-id \$APPLE_TEAM_ID"
    notary log "$submission_id" || true
    exit 1
  fi

  echo "Status: ${status:-unreachable} ($((elapsed / 60))m elapsed) — checking again in ${POLL_SECONDS}s"
  sleep "$POLL_SECONDS"
done

echo "=== Accepted after $(((SECONDS - started) / 60))m; stapling ==="
xcrun stapler staple "$ARTIFACT"
xcrun stapler validate "$ARTIFACT"
echo "notarized" > "$(dirname "$ARTIFACT")/notarization-status.txt"
