# Claude Code Instructions — npmax-desktop

## Comment Style Rules

This project uses JavaScript (Svelte + Electron). Follow these rules strictly when writing or generating comments.

### JSDoc (`/** */`) — for exported functions and public APIs

- Use for every exported function/constant that has non-obvious behavior.
- Write a single imperative sentence as the description (no trailing period).
- Do **not** add `@param` or `@returns` unless the type or contract is non-obvious.
- Do **not** use `/* */` block comments — only `/** */` for JSDoc.

**Correct:**
```js
/**
 * Fetch the latest stable package info from Packagist with in-memory caching.
 * Returns { version, homepage, repository } or throws on failure.
 */
export const getPackageInfo = async (name) => { ... };
```

**Wrong — avoid these patterns:**
```js
/* This function fetches package info */ // wrong delimiter
/** @param {string} name - The package name */ // unnecessary @param for obvious args
/**
 * This function is used to fetch...
 */ // "This function" phrasing — write imperatively
```

### Inline comments (`//`) — for non-obvious logic inside functions

- Place on the same line or the line above the relevant code.
- Keep them short and to the point.
- Do **not** state what the code obviously does — explain *why*.

**Correct:**
```js
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
```

**Wrong:**
```js
// We are creating a new Map
const cache = new Map(); // don't comment obvious code
```

### Summary of rules

| Situation | Use |
|---|---|
| Exported function / public API | `/** */` JSDoc |
| Inline clarification | `//` single-line |
| Block of internal logic | `//` multiple single-lines |
| Never use | `/* */` block comments |
