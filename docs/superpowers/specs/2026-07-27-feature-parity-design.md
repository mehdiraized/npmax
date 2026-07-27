# Feature Parity Design (Old Electron → New Monorepo)

**Date:** 2026-07-27  
**Status:** Approved (approach 2, scope C, targets Desktop + Web)

## Goal

Restore feature parity with the old Electron app so users do not lose capabilities: rich package details modal, multi-ecosystem project editing, and in-app update notifications (Desktop).

## Scope

In scope:
- Package details modal (click package name) with stats, downloads, versions, links, install hints
- Unified ManifestEditor for npm, composer, swift, cocoapods, android, flutter, go, rust, ruby
- Desktop project detect + load correct manifest
- Web: same editor + modal; ManifestInbox accepts all supported manifests
- Desktop UpdateNotification via `tauri-plugin-updater` + Settings “Check for Updates”

Out of scope:
- Rewriting Installed Apps
- Landing page changes
- New MCP tools (MCP benefits from richer `getPackageDetails` automatically)

## Architecture

```
@npmax/core       parseManifest, applyVersionUpdate, getLatestVersion, getPackageDetails (rich)
@npmax/types      PackageDetails aligned with old modal shape
@npmax/ui         PackageDetailsModal (shared presentational)
@npmax/app-shell  PackageEditor (manifest-driven) + wiring
apps/desktop      detect project, updater UI
apps/web          ecosystem-aware API fetch + ManifestInbox
```

## Data flow

1. Host provides `fileName` + `content`
2. `parseManifest` → ecosystem + dependencies
3. Per dep: `getLatestVersion(ecosystem, name)`
4. Name click → `getPackageDetails` → modal
5. Update click → `applyVersionUpdate` → `persistManifest`

## Error handling

- Details fetch failure shows error state in modal
- Unsupported / missing manifest shows project error notice
- Updater failures surface toast / banner message; macOS may fall back to releases URL
