import { useState } from "react";
import { openUrl } from "../lib/host";
import { startWindowDrag } from "../lib/drag";

const CURSOR_CONFIG = `{
  "mcpServers": {
    "npmax": {
      "command": "npx",
      "args": ["-y", "@npmax/mcp"]
    }
  }
}`;

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "npmax": {
      "command": "npx",
      "args": ["-y", "@npmax/mcp"]
    }
  }
}`;

const TOOLS = [
  {
    name: "analyze_manifest",
    desc: "Parse package.json / composer.json / and other manifests and report dependency status.",
  },
  {
    name: "list_outdated",
    desc: "List outdated dependencies in a project path so the AI knows what needs attention.",
  },
  {
    name: "check_package",
    desc: "Fetch the latest version and package details for one dependency.",
  },
  {
    name: "get_changelog",
    desc: "Pull changelog / release notes signals for a package update.",
  },
  {
    name: "assess_update",
    desc: "Heuristic risk score (semver major, changelog keywords, GitHub issue signals) — no LLM call inside the server.",
  },
  {
    name: "suggest_manifest_patch",
    desc: "Propose a safe manifest version bump while preserving constraint prefixes (^, ~, …).",
  },
  {
    name: "search_post_update_issues",
    desc: "Surface recent GitHub issues that may relate to a version bump.",
  },
] as const;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function McpView() {
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(id: string, text: string) {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(id);
    window.setTimeout(() => setCopied((cur) => (cur === id ? null : cur)), 1600);
  }

  return (
    <div className="view mcpView">
      <header className="hdr" onMouseDown={startWindowDrag}>
        <div>
          <h1 className="hdr__title">
            npMax MCP
            <span className="nav__itemBadge nav__itemBadge--new mcpView__titleBadge">NEW</span>
          </h1>
          <p className="mcpView__lead">
            Give Claude, Cursor, and other AI tools live dependency context for your projects —
            outdated packages, changelog risk, and safe version bumps.
          </p>
        </div>
      </header>

      <div className="mcpView__scroll">
        <section className="mcpCard">
          <h2 className="mcpCard__title">What it does for AI</h2>
          <p className="mcpCard__body">
            MCP (Model Context Protocol) lets assistants call npMax tools instead of guessing from
            chat history. When you ask Claude or Cursor “what should I update in this repo?”, they
            can analyze manifests, check registries, score update risk with heuristics, and suggest
            a patch — using the same core logic as the desktop app.
          </p>
          <ul className="mcpList">
            <li>Works with your local project paths (npm, Composer, Swift, CocoaPods, Flutter, Go, Rust, Ruby, Gradle…)</li>
            <li>Heuristic-first: no LLM is required inside the MCP server</li>
            <li>Helps AI answer with real latest versions and caution flags before you bump</li>
          </ul>
        </section>

        <section className="mcpCard">
          <h2 className="mcpCard__title">How to install</h2>
          <p className="mcpCard__body">
            You only need Node.js. The server runs via <code>npx</code> — no separate global install
            required.
          </p>

          <div className="mcpBlock">
            <div className="mcpBlock__head">
              <strong>Cursor</strong>
              <span className="mcpBlock__hint">`.cursor/mcp.json` or Cursor Settings → MCP</span>
            </div>
            <pre className="mcpCode">{CURSOR_CONFIG}</pre>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void handleCopy("cursor", CURSOR_CONFIG)}
            >
              {copied === "cursor" ? "Copied" : "Copy Cursor config"}
            </button>
          </div>

          <div className="mcpBlock">
            <div className="mcpBlock__head">
              <strong>Claude Desktop</strong>
              <span className="mcpBlock__hint">Claude → Settings → Developer → Edit Config</span>
            </div>
            <pre className="mcpCode">{CLAUDE_DESKTOP_CONFIG}</pre>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void handleCopy("claude", CLAUDE_DESKTOP_CONFIG)}
            >
              {copied === "claude" ? "Copied" : "Copy Claude config"}
            </button>
          </div>

          <p className="mcpCard__note">
            Optional env: <code>NPMAX_API_URL</code> to route through the npMax web API, and{" "}
            <code>GITHUB_TOKEN</code> for higher GitHub rate limits. Without{" "}
            <code>NPMAX_API_URL</code>, tools talk to registries directly.
          </p>
        </section>

        <section className="mcpCard">
          <h2 className="mcpCard__title">Suggested workflow with your projects</h2>
          <ol className="mcpSteps">
            <li>
              Open a project folder in Claude / Cursor and ask something like:{" "}
              <em>“Use npMax MCP to list outdated dependencies.”</em>
            </li>
            <li>
              For each major bump, have the agent call <code>assess_update</code> +{" "}
              <code>get_changelog</code>.
            </li>
            <li>
              If risk looks fine (<code>yes</code> / <code>caution</code>), apply with{" "}
              <code>suggest_manifest_patch</code>, then run install / tests yourself.
            </li>
          </ol>
        </section>

        <section className="mcpCard">
          <h2 className="mcpCard__title">Available tools</h2>
          <div className="mcpTools">
            {TOOLS.map((tool) => (
              <div key={tool.name} className="mcpTool">
                <code className="mcpTool__name">{tool.name}</code>
                <p>{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mcpCard mcpCard--actions">
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => void openUrl("https://github.com/mehdiraized/npmax")}
          >
            Open npMax on GitHub
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() =>
              void openUrl("https://modelcontextprotocol.io/docs/getting-started/intro")
            }
          >
            What is MCP?
          </button>
        </section>
      </div>
    </div>
  );
}
