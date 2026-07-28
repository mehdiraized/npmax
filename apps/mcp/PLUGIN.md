# Plugin / MCP install notes for AI agents

## Cursor

Add to `.cursor/mcp.json` or global MCP settings:

```json
{
  "mcpServers": {
    "npmax": {
      "command": "npx",
      "args": ["-y", "@npmax/mcp"],
      "env": {
        "NPMAX_API_URL": "https://npmax.vercel.app"
      }
    }
  }
}
```

## Suggested agent workflow

1. `list_outdated` or `analyze_manifest` on the project
2. For each major update, `assess_update` + `get_changelog`
3. If recommendation is `yes` or `caution`, apply with `suggest_manifest_patch`
4. Run project tests / install outside MCP

Risk scoring is heuristic (semver major, changelog keywords, GitHub issue volume) — no LLM is called by the server.
