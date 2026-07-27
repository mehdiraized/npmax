import type { PackageDetails, PackageLink } from "@npmax/types";
import { TtlCache } from "../cache.js";

const cache = new TtlCache<{ version: string }>();
const detailCache = new TtlCache<PackageDetails>();

function normalizeRepoUrl(repo: unknown): string | null {
  if (!repo) return null;
  if (typeof repo === "string") {
    return repo
      .replace(/^git\+/, "")
      .replace(/^git:\/\//, "https://")
      .replace(/\.git$/, "")
      .replace(/^ssh:\/\/git@/, "https://")
      .replace(/^git@github\.com:/, "https://github.com/");
  }
  if (typeof repo === "object" && repo && "url" in repo) {
    return normalizeRepoUrl((repo as { url?: string }).url);
  }
  return null;
}

function normalizeLicense(license: unknown): string | null {
  if (!license) return null;
  if (typeof license === "string") return license;
  if (typeof license === "object" && license && "type" in license) {
    return String((license as { type?: string }).type || "");
  }
  return null;
}

function createActionLinks(
  name: string,
  latest: { homepage?: string; bugs?: { url?: string } | string },
  repositoryUrl: string | null,
): PackageLink[] {
  const links: PackageLink[] = [];
  if (repositoryUrl) links.push({ label: "Repository", type: "repository", url: repositoryUrl });
  const issues =
    typeof latest.bugs === "string"
      ? latest.bugs
      : latest.bugs?.url || (repositoryUrl ? `${repositoryUrl}/issues` : null);
  if (issues) links.push({ label: "Issues", type: "issues", url: issues });
  if (latest.homepage) links.push({ label: "Homepage", type: "homepage", url: latest.homepage });
  links.push({ label: "npm", type: "registry", url: `https://www.npmjs.com/package/${name}` });
  return links;
}

function getVersionLabels(
  distTags: Record<string, string> | undefined,
  version: string,
): string[] {
  if (!distTags) return [];
  return Object.entries(distTags)
    .filter(([, v]) => v === version)
    .map(([tag]) => tag);
}

function sortVersionsByTime(versions: string[], time: Record<string, string> | undefined): string[] {
  return [...versions].sort((a, b) => {
    const ta = time?.[a] ? Date.parse(time[a]!) : 0;
    const tb = time?.[b] ? Date.parse(time[b]!) : 0;
    return tb - ta;
  });
}

function inferBadges(
  name: string,
  latest: { types?: string; typings?: string; bin?: unknown },
): string[] {
  const badges: string[] = [];
  if (name.startsWith("@types/") || latest.types || latest.typings) badges.push("TypeScript");
  if (latest.bin) badges.push("CLI");
  return badges;
}

export async function getNpmLatest(name: string): Promise<{ version: string }> {
  const hit = cache.get(name);
  if (hit) return hit;
  const res = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name).replace(/%2F/g, "/")}/latest`,
  );
  if (!res.ok) {
    const fb = await fetch(`https://npmx.dev/api/registry/package-meta/${encodeURIComponent(name)}`);
    if (!fb.ok) throw new Error(`npm lookup failed: ${name}`);
    const data = (await fb.json()) as { version?: string };
    if (!data.version) throw new Error(`npm lookup failed: ${name}`);
    const result = { version: data.version };
    cache.set(name, result);
    return result;
  }
  const data = (await res.json()) as { version: string };
  const result = { version: data.version };
  cache.set(name, result);
  return result;
}

export async function getNpmDetails(name: string): Promise<PackageDetails> {
  const hit = detailCache.get(name);
  if (hit) return hit;

  const encoded = encodeURIComponent(name).replace(/%2F/g, "/");
  const [packumentRes, downloadsRes] = await Promise.all([
    fetch(`https://registry.npmjs.org/${encoded}`),
    fetch(`https://api.npmjs.org/downloads/point/last-week/${encoded}`).catch(() => null),
  ]);
  if (!packumentRes.ok) throw new Error(`npm details failed: ${name}`);

  const packument = (await packumentRes.json()) as {
    name?: string;
    description?: string;
    license?: unknown;
    "dist-tags"?: Record<string, string>;
    time?: Record<string, string>;
    versions?: Record<
      string,
      {
        description?: string;
        license?: unknown;
        homepage?: string;
        repository?: { url?: string } | string;
        bugs?: { url?: string } | string;
        dependencies?: Record<string, string>;
        engines?: { node?: string };
        dist?: { unpackedSize?: number };
        types?: string;
        typings?: string;
        bin?: unknown;
        maintainers?: unknown[];
      }
    >;
    maintainers?: unknown[];
  };

  const downloadData = downloadsRes?.ok
    ? ((await downloadsRes.json()) as {
        downloads?: number;
        start?: string;
        end?: string;
      })
    : null;

  const latestVersion =
    packument["dist-tags"]?.latest || Object.values(packument["dist-tags"] ?? {})[0];
  const latest = latestVersion ? packument.versions?.[latestVersion] : null;
  if (!latestVersion || !latest) throw new Error(`No latest version found for ${name}`);

  const repositoryUrl = normalizeRepoUrl(
    latest.repository || (packument as { repository?: unknown }).repository,
  );
  const publishedAt = packument.time?.[latestVersion] || packument.time?.modified || null;
  const versions = sortVersionsByTime(Object.keys(packument.versions ?? {}), packument.time)
    .slice(0, 14)
    .map((version) => ({
      version,
      date: packument.time?.[version] || undefined,
      labels: getVersionLabels(packument["dist-tags"], version),
      isLatest: version === latestVersion,
    }));

  const details: PackageDetails = {
    ecosystem: "npm",
    name: packument.name || name,
    version: latestVersion,
    description: latest.description || packument.description || "",
    badges: inferBadges(name, latest),
    links: createActionLinks(packument.name || name, latest, repositoryUrl),
    stats: [
      {
        label: "License",
        value: normalizeLicense(latest.license || packument.license) || "Unknown",
      },
      {
        label: "Dependencies",
        value: String(Object.keys(latest.dependencies ?? {}).length),
      },
      {
        label: "Install size",
        value:
          typeof latest.dist?.unpackedSize === "number" ? latest.dist.unpackedSize : "N/A",
        format: typeof latest.dist?.unpackedSize === "number" ? "bytes" : "text",
      },
      {
        label: "Published",
        value: publishedAt || "Unknown",
        format: publishedAt ? "date" : "text",
      },
    ],
    downloads:
      typeof downloadData?.downloads === "number"
        ? {
            label: "Weekly downloads",
            value: downloadData.downloads,
            start: downloadData.start,
            end: downloadData.end,
            format: "number",
          }
        : null,
    compatibility: latest.engines?.node
      ? [{ label: "Node.js", value: latest.engines.node }]
      : [],
    versions,
    install: {
      label: "npm",
      lines: [
        `npm install ${name}`,
        ...(name.startsWith("@types/") || latest.types || latest.typings
          ? ["# Type definitions included"]
          : []),
      ],
    },
    meta: {
      maintainers: (latest.maintainers || packument.maintainers || []).length,
    },
  };

  detailCache.set(name, details);
  return details;
}
