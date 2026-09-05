# Changelog

## [3.8.1] — 2026-09-05

### Fixed
- patch advisories and bump packages

### Changed
- Merge pull request #117 from mehdiraized/dependabot/npm_and_yarn/development-deps-3a922fa006
- build(deps-dev): bump the development-deps group across 1 directory with 8 updates
- Merge pull request #113 from mehdiraized/dependabot/cargo/apps/desktop/src-tauri/base64-0.23.1
- Merge pull request #115 from mehdiraized/dependabot/github_actions/github/codeql-action-4.37.6
- Merge pull request #114 from mehdiraized/dependabot/npm_and_yarn/production-deps-4b94ed4869
- build(deps): bump next in the production-deps group across 1 directory
- build(deps): bump github/codeql-action from 4.37.3 to 4.37.6
- build(deps): bump base64 in /apps/desktop/src-tauri

---

## [3.8.0] — 2026-08-10

### Added
- add global package inventory and scanning

### Fixed
- replace persian loading text with english

---

## [3.7.1] — 2026-08-06

### Fixed
- update download links to open in new tab with noopener, remove App Store link

---

## [3.7.0] — 2026-08-06

### Added
- universal build, resilient notarization, working updater

---

## [3.6.0] — 2026-08-04

### Added
- add notarization option for macOS builds in release workflow

### Changed
- Merge remote-tracking branch 'origin/master'
- Merge pull request #111 from mehdiraized/dependabot/github_actions/softprops/action-gh-release-3
- Merge pull request #112 from mehdiraized/dependabot/github_actions/actions/download-artifact-8
- Merge pull request #109 from mehdiraized/dependabot/github_actions/actions/upload-artifact-7
- Merge pull request #110 from mehdiraized/dependabot/github_actions/github/codeql-action-4.37.3
- build(deps): bump actions/upload-artifact from 4 to 7
- build(deps): bump actions/download-artifact from 4 to 8
- build(deps): bump softprops/action-gh-release from 2 to 3
- build(deps): bump github/codeql-action from 3 to 4.37.3

---

## [3.5.0] — 2026-08-03

### Added
- enhance release workflow with checksum generation and signing

### Fixed
- pin macOS version and refine notarization checks

### Changed
- Merge remote-tracking branch 'origin/master'

---

## [3.4.6] — 2026-08-01

### Fixed
- extend retries for Apple notarization process

---

## [3.4.5] — 2026-08-01

### Fixed
- refine macOS notarization process with improved error handling and retries

### Changed
- Merge remote-tracking branch 'origin/master'

---

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
