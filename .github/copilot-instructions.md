# GitHub Copilot Instructions — npmax-desktop

## Comment Style

This is a JavaScript project (Svelte + Electron). Follow these rules when generating comments.

### JSDoc — exported functions and public APIs

- Use `/** */` only. Never use `/* */`.
- One imperative sentence. No trailing period.
- Skip `@param` / `@returns` for obvious arguments and return types.

```js
// ✅ Correct
/**
 * Compare two Composer normalized version strings
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareNormalized(a, b) { ... }

// ❌ Wrong — uses /* */ instead of /** */
/* Compare two version strings */
function compareNormalized(a, b) { ... }

// ❌ Wrong — "This function" phrasing
/**
 * This function is used to compare two version strings.
 */
```

### Inline comments

- Use `//` only.
- Explain *why*, not *what*.
- Keep them short — one line preferred.

```js
// ✅ Correct
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ❌ Wrong — states the obvious
const cache = new Map(); // create a new Map
```

### Rules summary

- `/** */` → exported functions, public APIs
- `//` → inline clarifications
- `/* */` → **never use**
