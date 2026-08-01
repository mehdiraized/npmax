# Changelog

## [3.4.4] — 2026-08-01

### Fixed
- enhance macOS build process with retry logic for notarization

---

## [3.4.3] — 2026-07-30

### Fixed
- update author name in package.json for consistency
- update README formatting and remove outdated links

---

## [3.4.2] — 2026-07-30

### Fixed
- enhance error handling for macOS codesigning in release workflow

### Changed
- Merge remote-tracking branch 'origin/master'

---

## [3.4.1] — 2026-07-30

### Fixed
- improve macOS codesigning process in release workflow

### Changed
- Merge remote-tracking branch 'origin/master'

---

## [3.4.0] — 2026-07-30

### Added
- implement installed apps caching and update PackageEditor for dependency version caching

### Fixed
- streamline window effects configuration and update updater public key

### Changed
- chore: update .gitignore, remove PRODUCTION.md, and enhance release workflow
- ci(release): use bash for tauri build on all OS
- ci(release): skip mac codesign when secrets missing
- chore(ci): recover desktop release when GitHub Release is missing
- chore(deps): bump devDependencies and base64; tune CodeQL
- chore: update glib dependency and enhance security documentation
- chore: enhance GitHub integration and update CI workflows
- chore: update dependencies and CI workflows
- Merge remote-tracking branch 'origin/master'
- chore: update homepage URLs and CI workflows

---

## [3.3.0] — 2026-07-29

### Added
- implement installed apps caching and update PackageEditor for dependency version caching

### Changed
- ci(release): use bash for tauri build on all OS
- ci(release): skip mac codesign when secrets missing
- chore(ci): recover desktop release when GitHub Release is missing
- chore(deps): bump devDependencies and base64; tune CodeQL
- chore: update glib dependency and enhance security documentation
- chore: enhance GitHub integration and update CI workflows
- chore: update dependencies and CI workflows
- Merge remote-tracking branch 'origin/master'
- chore: update homepage URLs and CI workflows

---

## [3.2.0] — 2026-07-28

### Added
- enhance GitHub Actions workflow for Tauri app builds and releases

### Changed
- Merge remote-tracking branch 'origin/master'

---

## [3.1.0] — 2026-07-28

### Added
- integrate @vercel/analytics and update landing page assets

### Changed
- refactor: migrate vercel.json configuration to apps/web directory
- chore: simplify build commands and update TypeScript route imports

---

## [3.0.0] — 2026-07-25

### Added
- Tauri 2 desktop rewrite with shared `@npmax/core` / MCP / web monorepo
- MCP intro surface in the desktop sidebar (install guides for Cursor & Claude)
- Vitest + Rust unit tests for core parsers, version cleaning, and tool version extraction
- GitHub Actions CI and multi-platform release workflows for Tauri
- Production / notarization / App Store notes (`PRODUCTION.md`)

### Changed
- Desktop shell uses native macOS sidebar vibrancy (non–App Store builds)
- Brew latest versions are cleaned (strip build tokens after `,`)
- About settings no longer expose runtime/framework details

### Notes
- Full feature set (brew / system apps / shell tools) targets **GitHub Releases** distribution
- Mac App Store builds require sandbox config and will be feature-limited
