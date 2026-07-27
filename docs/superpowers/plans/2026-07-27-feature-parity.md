# Feature Parity Implementation Plan

> Implemented directly after user approval of approach 2 / scope C / Desktop+Web.

**Goal:** Restore old Electron capabilities: package details modal, multi-ecosystem editors, Desktop updater UI.

**Architecture:** Shared `@npmax/core` registries + `parseManifest`; `@npmax/ui` `PackageDetailsModal`; `@npmax/app-shell` ecosystem-aware `PackageEditor`; Desktop detect + updater; Web ManifestInbox + API fetch.

## Done

- [x] Enrich `PackageDetails` types (stats format, downloads object, compatibility rows)
- [x] Rich `getNpmDetails` / `getComposerDetails` + better polyglot details
- [x] `PackageDetailsModal` + styles
- [x] `PackageEditor` uses `parseManifest` / click opens modal
- [x] Desktop loads any detected manifest; Settings check + `UpdateNotification`
- [x] Web ManifestInbox accepts all manifests; ecosystem-aware package API fetch
