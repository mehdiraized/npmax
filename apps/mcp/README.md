# @npmax/mcp

Heuristic-first MCP server for npMax dependency analysis.

## Cursor config

```json
{
  "mcpServers": {
    "npmax": {
      "command": "npx",
      "args": ["-y", "@npmax/mcp"],
      "env": {
        "NPMAX_API_URL": "http://localhost:3000",
        "GITHUB_TOKEN": ""
      }
    }
  }
}
```

`NPMAX_API_URL` is optional. Without it, tools call registries directly via `@npmax/core`.

## Tools

- `analyze_manifest`
- `check_package`
- `get_changelog`
- `assess_update`
- `list_outdated`
- `suggest_manifest_patch`
- `search_post_update_issues`
