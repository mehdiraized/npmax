# GitHub Copilot Instructions — npMax

## Stack

pnpm + Turborepo monorepo: Tauri 2 (Rust) desktop, Next.js web, shared TypeScript packages (`@npmax/core`, `@npmax/ui`, `@npmax/app-shell`), MCP server.

## Comment Style

### JSDoc — exported functions and public APIs

- Use `/** */` only. Never use `/* */`.
- One imperative sentence. Prefer TypeScript types over redundant `@param` / `@returns`.

```ts
// ✅ Correct
/**
 * Compare two normalized Composer version strings
 */
function compareNormalized(a: string, b: string): number { ... }

// ❌ Wrong — uses /* */ instead of /** */
/* Compare two version strings */
function compareNormalized(a: string, b: string): number { ... }
```

### Inline comments

- Use `//` only.
- Explain *why*, not *what*.
- Keep them short — one line preferred.

### Rules summary

- `/** */` → exported functions, public APIs
- `//` → inline clarifications
- `/* */` → **never use**

## Layout notes

- Shared analysis logic lives in `packages/core`
- UI shells: `packages/app-shell` + `packages/ui`
- Desktop-only host bridges: `apps/desktop/src/lib` + `apps/desktop/src-tauri`
- Do not revive Electron / Svelte / `docs/` GitHub Pages paths
