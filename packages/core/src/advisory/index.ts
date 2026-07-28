import type { AdvisoryReport, ChangelogEntry, Ecosystem, RiskLevel, UpdateRecommendation } from "@npmax/types";
import { isMajorBump } from "../semver.js";
import { githubApiRepoUrl, parseGithubRepoUrl } from "../github.js";

const BREAKING_KEYWORDS = [
  "breaking change",
  "breaking changes",
  "breaking",
  "migration",
  "migrate",
  "deprecated",
  "removed",
  "incompatible",
] as const;

const MIGRATION_HINTS = ["migration", "upgrade guide"] as const;
const MIGRATION_URL_HINTS = ["migration", "upgrade", "breaking"] as const;

function githubAuthHeaders(): Record<string, string> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const token = env?.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function includesKeyword(haystack: string, keywords: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/** Extract http(s) URLs without nested quantifiers (ReDoS-safe). */
function extractHttpUrls(body: string): string[] {
  const urls: string[] = [];
  const lower = body.toLowerCase();
  let i = 0;
  while (i < body.length) {
    const httpIdx = lower.indexOf("http://", i);
    const httpsIdx = lower.indexOf("https://", i);
    let start = -1;
    if (httpIdx === -1) start = httpsIdx;
    else if (httpsIdx === -1) start = httpIdx;
    else start = Math.min(httpIdx, httpsIdx);
    if (start === -1) break;

    let end = start;
    while (end < body.length) {
      const ch = body[end]!;
      if (/\s|[)\]>'"<>]/.test(ch)) break;
      end++;
      // Cap URL length to avoid pathological input
      if (end - start > 2048) break;
    }
    const url = body.slice(start, end).replace(/[.,;:!?]+$/, "");
    if (url.length > 8) urls.push(url);
    i = end + 1;
  }
  return urls;
}

export function extractSignals(body: string) {
  const hasBreaking = includesKeyword(body, BREAKING_KEYWORDS);
  const hasMigration = includesKeyword(body, MIGRATION_HINTS);
  const migrationUrls = extractHttpUrls(body).filter((url) =>
    includesKeyword(url, MIGRATION_URL_HINTS),
  );
  return { hasBreaking, hasMigration, migrationUrls };
}

export function scoreRisk(opts: {
  majorBump: boolean;
  hasBreaking: boolean;
  hasMigration: boolean;
  issueHits: number;
}): { risk: RiskLevel; recommendation: UpdateRecommendation; reasons: { code: string; message: string }[] } {
  const reasons: { code: string; message: string }[] = [];
  let risk: RiskLevel = "safe";
  let recommendation: UpdateRecommendation = "yes";

  if (opts.majorBump) {
    reasons.push({ code: "major_bump", message: "Major version bump detected" });
    risk = "caution";
    recommendation = "caution";
  }
  if (opts.hasBreaking) {
    reasons.push({ code: "breaking", message: "Changelog mentions breaking changes" });
    risk = "caution";
    recommendation = "caution";
  }
  if (opts.hasMigration) {
    reasons.push({ code: "migration", message: "Migration / upgrade guide referenced" });
    risk = "caution";
    recommendation = "caution";
  }
  if (opts.issueHits >= 5) {
    reasons.push({ code: "issues", message: `${opts.issueHits} recent issue signals after release` });
    risk = "avoid";
    recommendation = "no";
  } else if (opts.issueHits >= 2) {
    reasons.push({ code: "issues", message: `${opts.issueHits} recent issue signals after release` });
    if (risk === "safe") risk = "caution";
    recommendation = "caution";
  }
  if (reasons.length === 0) {
    reasons.push({ code: "clean", message: "No breaking/migration keywords detected in sampled changelog" });
  }
  return { risk, recommendation, reasons };
}

export async function fetchGithubReleases(owner: string, repo: string): Promise<ChangelogEntry[]> {
  const apiUrl = githubApiRepoUrl(owner, repo, "/releases?per_page=15");
  if (!apiUrl) return [];
  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      ...githubAuthHeaders(),
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    tag_name: string;
    name?: string;
    body?: string;
    published_at?: string;
    html_url?: string;
  }[];
  return data.map((r) => ({
    version: r.tag_name.replace(/^v/, ""),
    title: r.name,
    body: r.body || "",
    date: r.published_at,
    url: r.html_url,
  }));
}

export async function searchPostUpdateIssues(
  owner: string,
  repo: string,
  version: string,
): Promise<{ count: number; urls: string[] }> {
  const ref = parseGithubRepoUrl(`https://github.com/${owner}/${repo}`);
  if (!ref) return { count: 0, urls: [] };
  const safeVersion = version.replace(/[^\w.+\-]/g, "").slice(0, 64);
  const q = encodeURIComponent(
    `repo:${ref.owner}/${ref.repo} is:issue ${safeVersion} label:bug created:>2024-01-01`,
  );
  const res = await fetch(`https://api.github.com/search/issues?q=${q}&per_page=5`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...githubAuthHeaders(),
    },
  });
  if (!res.ok) return { count: 0, urls: [] };
  const data = (await res.json()) as { total_count?: number; items?: { html_url: string }[] };
  return {
    count: data.total_count || 0,
    urls: (data.items || []).map((i) => i.html_url),
  };
}

export async function assessUpdate(opts: {
  ecosystem: Ecosystem;
  name: string;
  fromVersion: string;
  toVersion: string;
  repositoryUrl?: string;
}): Promise<AdvisoryReport> {
  const majorBump = isMajorBump(opts.fromVersion, opts.toVersion);
  const gh = parseGithubRepoUrl(opts.repositoryUrl);
  let changelog: ChangelogEntry[] = [];
  let issueHits = 0;
  let issueUrls: string[] = [];

  if (gh) {
    changelog = await fetchGithubReleases(gh.owner, gh.repo);
    const issues = await searchPostUpdateIssues(gh.owner, gh.repo, opts.toVersion);
    issueHits = Math.min(issues.count, 50);
    issueUrls = issues.urls;
  }

  const relevant = changelog.filter((c) => c.version === opts.toVersion || c.body);
  const body = relevant.map((c) => `${c.title || ""}\n${c.body}`).join("\n");
  const signals = extractSignals(body || "");

  const codeHints: string[] = [];
  if (signals.hasMigration) codeHints.push("Review migration guide links before upgrading.");
  if (majorBump) codeHints.push("Major bump: check peer dependencies and renamed APIs in release notes.");

  const scored = scoreRisk({
    majorBump,
    hasBreaking: signals.hasBreaking,
    hasMigration: signals.hasMigration,
    issueHits,
  });

  return {
    ecosystem: opts.ecosystem,
    name: opts.name,
    fromVersion: opts.fromVersion,
    toVersion: opts.toVersion,
    risk: scored.risk,
    recommendation: scored.recommendation,
    majorBump,
    hasBreaking: signals.hasBreaking,
    hasMigration: signals.hasMigration,
    migrationUrls: signals.migrationUrls,
    reasons: scored.reasons,
    changelog: relevant.slice(0, 10),
    issueHits,
    issueUrls,
    codeHints,
  };
}
