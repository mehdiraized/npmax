# Contributing Guidelines

Thanks for helping with **npMax**. Please follow these guidelines before opening a PR:

- Use **English** in code, commits, docs, and discussions
- Prefer conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, …) — they drive automated releases
- Keep comments rare and useful (`/** */` for public APIs, `//` for why)
- Do not disable linting with inline comments in a PR unless necessary
- Match the monorepo layout: put shared logic in `packages/*`, host-specific code in `apps/*`

## Setup

```bash
pnpm install
```

### Desktop (Tauri)

Requires [Rust](https://rustup.rs) and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm dev:desktop
```

### Web

```bash
pnpm dev:web
```

### MCP

```bash
pnpm dev:mcp
```

## Checks before a PR

```bash
pnpm test
pnpm typecheck
```

These guidelines are not rigid law — they help us stay in sync. You can PR any file, including this one.

#### One clear note

Contributing to npMax (or open source in general) does not mean payment, hiring, or employment. By contributing you acknowledge you are volunteering your time.

Thank you — we would love to have you on board.
