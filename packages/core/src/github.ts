/** Safe GitHub owner/repo identifiers (no path traversal / SSRF). */
const GITHUB_NAME_RE = /^[A-Za-z0-9_.-]+$/;

export type GithubRepoRef = { owner: string; repo: string };

/**
 * Parse a GitHub repository URL into owner/repo.
 * Rejects anything that is not clearly github.com (hostname check via URL).
 */
export function parseGithubRepoUrl(input?: string): GithubRepoRef | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // git@github.com:owner/repo(.git)?
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) {
    return sanitizeRef(ssh[1]!, ssh[2]!);
  }

  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    // Reject traversal before URL normalization collapses it.
    if (/(^|\/)\.\.(\/|$)/.test(withScheme)) return null;
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/i, "");
    return sanitizeRef(owner, repo);
  } catch {
    return null;
  }
}

export function isGithubHostUrl(input?: string): boolean {
  return parseGithubRepoUrl(input) != null;
}

function sanitizeRef(owner: string, repo: string): GithubRepoRef | null {
  if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) return null;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") return null;
  return { owner, repo };
}

/** Build a GitHub API URL only after owner/repo are validated. */
export function githubApiRepoUrl(owner: string, repo: string, path = ""): string | null {
  const ref = sanitizeRef(owner, repo);
  if (!ref) return null;
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}${suffix}`;
}
