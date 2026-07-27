import type { PackageDetails, PackageLink } from "@npmax/types";
import { TtlCache } from "../cache.js";

const cache = new TtlCache<{ version: string }>();
const detailCache = new TtlCache<PackageDetails>();

type ComposerVersion = {
  version: string;
  version_normalized?: string;
  description?: string;
  time?: string;
  type?: string;
  homepage?: string;
  license?: string | string[];
  require?: Record<string, string>;
  support?: { source?: string; issues?: string };
};

function isStable(key: string) {
  const lower = key.toLowerCase();
  return (
    !lower.startsWith("dev-") &&
    !lower.endsWith("-dev") &&
    !lower.includes("alpha") &&
    !lower.includes("beta") &&
    !lower.includes("-rc") &&
    key !== "dev-master"
  );
}

function getStabilityLabel(version: string): string | null {
  const lower = version.toLowerCase();
  if (lower.includes("alpha")) return "alpha";
  if (lower.includes("beta")) return "beta";
  if (lower.includes("rc")) return "rc";
  if (lower.startsWith("dev-") || lower.endsWith("-dev")) return "dev";
  return null;
}

function resolveLatestStable(versionsMap: Record<string, ComposerVersion>): ComposerVersion | null {
  const versions = Object.entries(versionsMap)
    .filter(([k]) => isStable(k))
    .map(([, v]) => v);
  versions.sort((a, b) =>
    (a.version_normalized || "").localeCompare(b.version_normalized || "", undefined, {
      numeric: true,
    }),
  );
  return versions[versions.length - 1] ?? null;
}

function sortVersions(versions: ComposerVersion[]): ComposerVersion[] {
  return [...versions].sort((a, b) =>
    (b.version_normalized || b.version).localeCompare(a.version_normalized || a.version, undefined, {
      numeric: true,
    }),
  );
}

export async function getComposerLatest(name: string): Promise<{ version: string }> {
  const hit = cache.get(name);
  if (hit) return hit;
  const res = await fetch(`https://packagist.org/packages/${encodeURIComponent(name)}.json`);
  if (!res.ok) throw new Error(`packagist failed: ${name}`);
  const data = (await res.json()) as {
    package?: { versions?: Record<string, ComposerVersion> };
  };
  const latest = resolveLatestStable(data.package?.versions ?? {});
  if (!latest) throw new Error(`No stable version for ${name}`);
  const result = { version: latest.version };
  cache.set(name, result);
  return result;
}

export async function getComposerDetails(name: string): Promise<PackageDetails> {
  const hit = detailCache.get(name);
  if (hit) return hit;

  const res = await fetch(`https://packagist.org/packages/${encodeURIComponent(name)}.json`);
  if (!res.ok) throw new Error(`packagist failed: ${name}`);
  const data = (await res.json()) as {
    package?: {
      name?: string;
      description?: string;
      repository?: string;
      type?: string;
      time?: string;
      github_stars?: number;
      github_open_issues?: number;
      github_forks?: number;
      favers?: number;
      downloads?: { total?: number; monthly?: number; daily?: number };
      versions?: Record<string, ComposerVersion>;
    };
  };

  const versionsMap = data.package?.versions ?? {};
  const latest = resolveLatestStable(versionsMap);
  if (!latest) throw new Error(`No stable version found for ${name}`);

  const versions = sortVersions(Object.values(versionsMap))
    .slice(0, 14)
    .map((version) => ({
      version: version.version,
      date: version.time || undefined,
      labels: [
        ...(version.version === latest.version ? ["latest"] : []),
        getStabilityLabel(version.version),
      ].filter(Boolean) as string[],
      isLatest: version.version === latest.version,
    }));

  const support = latest.support ?? {};
  const repositoryUrl = support.source || data.package?.repository || null;
  const phpConstraint = latest.require?.php || null;
  const downloads = data.package?.downloads ?? null;

  const links: PackageLink[] = [
    ...(latest.homepage
      ? [{ label: "Homepage", type: "homepage", url: latest.homepage }]
      : []),
    ...(repositoryUrl
      ? [{ label: "Repository", type: "repository", url: repositoryUrl }]
      : []),
    ...(support.issues ? [{ label: "Issues", type: "issues", url: support.issues }] : []),
    {
      label: "Packagist",
      type: "registry",
      url: `https://packagist.org/packages/${name}`,
    },
  ];

  const details: PackageDetails = {
    ecosystem: "composer",
    name: data.package?.name || name,
    version: latest.version,
    description: latest.description || data.package?.description || "",
    badges: [
      latest.type || data.package?.type || "package",
      ...(phpConstraint ? [`PHP ${phpConstraint}`] : []),
    ],
    links,
    stats: [
      {
        label: "License",
        value: Array.isArray(latest.license)
          ? latest.license.join(", ")
          : latest.license || "Unknown",
      },
      {
        label: "Dependencies",
        value: String(
          Object.keys(latest.require ?? {}).filter((n) => n !== "php").length,
        ),
      },
      {
        label: "Stars",
        value: data.package?.github_stars ?? 0,
        format: "number",
      },
      {
        label: "Published",
        value: latest.time || data.package?.time || "Unknown",
        format: latest.time || data.package?.time ? "date" : "text",
      },
    ],
    downloads: downloads?.monthly
      ? {
          label: "Monthly downloads",
          value: downloads.monthly,
          total: downloads.total,
          daily: downloads.daily,
          format: "number",
        }
      : null,
    compatibility: phpConstraint ? [{ label: "PHP", value: phpConstraint }] : [],
    versions,
    install: {
      label: "composer",
      lines: [`composer require ${name}`],
    },
    meta: {
      favers: data.package?.favers ?? 0,
      openIssues: data.package?.github_open_issues ?? 0,
      forks: data.package?.github_forks ?? 0,
    },
  };

  detailCache.set(name, details);
  return details;
}
