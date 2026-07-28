# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| 2.x     | :x: (legacy Electron; security fixes only if critical) |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Please report security issues privately by emailing **mehdiraized@gmail.com**.

Include:

- Affected surface (Desktop / Web / MCP)
- npMax version
- Steps to reproduce
- Impact assessment if known

You can expect an acknowledgement within a few days. Please do not open a public GitHub issue for undisclosed vulnerabilities.

## Known dependency notes

### `glib` (RUSTSEC-2024-0429 / GHSA-wrw7-89jp-8q8g)

Dependabot may report `glib` 0.18.5 via `apps/desktop/src-tauri/Cargo.lock`. Tauri 2's Linux backend depends on GTK3 bindings that require `glib ^0.18`, so upgrading to the advisory's patched line (`>= 0.20.0`) is not possible until Tauri moves to GTK4.

We apply the upstream soundness fix locally under `apps/desktop/src-tauri/patches/glib` via `[patch.crates-io]`. Dismiss or ignore the Dependabot finding while that patch is in place; remove the patch once `glib` 0.18.6 (or Tauri GTK4) is available.
