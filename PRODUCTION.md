# npMax 3.x — Production & Apple distribution

This document covers shipping the **Tauri** desktop app, GitHub Releases, notarization, and Mac App Store options.

## Recommended distribution (GitHub Releases)

npMax needs local shell access (`brew`, `system_profiler`, package managers). That conflicts with a strict **App Sandbox**.

**Primary path:** notarized **DMG / ZIP** via GitHub Releases (same model as the previous Electron app).

| Need | Why |
|------|-----|
| Apple Developer Program | Signing + notarization |
| Developer ID Application certificate | Sign `.app` outside the store |
| App-specific password or API key | Notarization (`notarytool`) |
| Optional: updater keypair | Tauri updater `pubkey` in `tauri.conf.json` |

### Local production build (unsigned, smoke)

```bash
pnpm install
pnpm --filter @npmax/types --filter @npmax/core --filter @npmax/ui --filter @npmax/app-shell build
pnpm --filter @npmax/desktop test
pnpm --filter @npmax/desktop test:rust
pnpm build:desktop
```

Artifacts land under `apps/desktop/src-tauri/target/release/bundle/`.

### Generate icon set

```bash
cd apps/desktop
pnpm tauri icon src-tauri/icons/icon.png
```

### Signing + notarization (CI secrets)

Set these GitHub Actions secrets for `.github/workflows/release.yml`:

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64 `.p12` of **Developer ID Application** |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-char Team ID |
| `TAURI_SIGNING_PRIVATE_KEY` | Updater private key (optional) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Optional |

Export certificate:

```bash
base64 -i YourCert.p12 | pbcopy
```

Generate updater keys:

```bash
cd apps/desktop
pnpm tauri signer generate -w ~/.tauri/npmax.key
# put public key into tauri.conf.json → plugins.updater.pubkey
```

## Mac App Store (optional / limited)

MAS requires:

1. **App Sandbox** (`Entitlements.plist`) — replace `TEAM_ID`
2. **No private APIs** — use `tauri.appstore.conf.json` (`macOSPrivateApi: false`, no vibrancy)
3. Separate **Mac App Distribution** certificate + provisioning profile
4. App Store Connect record (bundle id `app.mehdir.npmax`)
5. Screenshots, privacy policy, category (Productivity)

Build MAS bundle:

```bash
cd apps/desktop
pnpm tauri build --config src-tauri/tauri.appstore.conf.json
```

### Honest limitation

Under App Sandbox, spawning `brew` / `system_profiler` / arbitrary CLIs is heavily restricted. A store build would need redesigned permissions (user-selected folders only, no package-manager orchestration) or entitlement exceptions Apple may reject.

**Advice:** ship full npMax on GitHub Releases; treat MAS as a future, reduced-feature product if you still want store presence.

## Checklist before first 3.0.0 public release

- [ ] Version is `3.0.0` across packages (`pnpm version:bump 3.0.0` if needed)
- [ ] Fill `Entitlements.plist` Team ID if attempting MAS
- [ ] Add Apple secrets to GitHub (optional for unsigned CI smoke)
- [ ] Generate updater pubkey
- [ ] Run CI green (`.github/workflows/ci.yml`)
- [ ] Push to `master` with conventional commits (or ensure `v3.0.0` tag does not exist yet) to trigger release
- [ ] Smoke-test DMG on Intel + Apple Silicon
- [ ] Verify Gatekeeper opens the notarized app

## Versioning

- Monorepo root: `package.json`
- Desktop native: `apps/desktop/src-tauri/tauri.conf.json` + `Cargo.toml`
- Conventional commits drive auto-bump in release workflow (`feat` → minor, `fix` → patch, `!` / BREAKING → major)
- If `package.json` version has no matching `v*` tag yet, release publishes that version as-is
