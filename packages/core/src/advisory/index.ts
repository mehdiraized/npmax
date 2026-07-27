import type { AdvisoryReport, ChangelogEntry, Ecosystem, RiskLevel, UpdateRecommendation } from "@npmax/types";
import { isMajorBump } from "../semver.js";

const BREAKING_RE = /\b(breaking(\s+change)?|migration|migrate|deprecated|removed|incompatible)\b/i;
const MIGRATION_URL_RE = /https?:\/\/[^\s)]*(migration|upgrade|breaking)[^\s)]*/gi;

function githubAuthHeaders(): Record<string, string> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const token = env?.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function extractSignals(body: string) {
  const hasBreaking = BREAKING_RE.test(body);
  const hasMigration = /migration|upgrade guide/i.test(body);
  const migrationUrls = Array.from(body.matchAll(MIGRATION_URL_RE)).map((m) => m[0]!);
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
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=15`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...githubAuthHeaders(),
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { tag_name: string; name?: string; body?: string; published_at?: string; html_url?: string }[];
  return data.map((r) => ({
    version: r.tag_name.replace(/^v/, ""),
    title: r.name,
    body: r.body || "",
    date: r.published_at,
    url: r.html_url,
  }));
}

export async function searchPostUpdateIssues(owner: string, repo: string, version: string): Promise<{ count: number; urls: string[] }> {
  const q = encodeURIComponent(`repo:${owner}/${repo} is:issue ${version} label:bug created:>2024-01-01`);
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

function parseGithubRepo(url?: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
  if (!m) return null;
  return { owner: m[1]!, repo: m[2]! };
}

export async function assessUpdate(opts: {
  ecosystem: Ecosystem;
  name: string;
  fromVersion: string;
  toVersion: string;
  repositoryUrl?: string;
}): Promise<AdvisoryReport> {
  const majorBump = isMajorBump(opts.fromVersion, opts.toVersion);
  const gh = parseGithubRepo(opts.repositoryUrl);
  let changelog: ChangelogEntry[] = [];
  let issueHits = 0;
  let issueUrls: string[] = [];

  if (gh) {
    changelog = await fetchGithubReleases(gh.owner, gh.repo);
    const issues = await searchPostUpdateIssues(gh.owner, gh.repo, opts.toVersion);
    issueHits = Math.min(issues.count, 50);
    issueUrls = issues.urls;
  }

  // Filter changelog entries between from and to roughly by including toVersion and nearby
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
