import type { Ecosystem, PackageDetails, PackageLink } from "@npmax/types";
import { TtlCache } from "../cache.js";
import { githubApiRepoUrl, parseGithubRepoUrl } from "../github.js";

const cache = new TtlCache<{ version: string }>();
const detailCache = new TtlCache<PackageDetails>();

export async function getGoLatest(name: string): Promise<{ version: string }> {
  const key = `go:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://proxy.golang.org/${name}/@latest`);
  if (!res.ok) throw new Error(`go proxy failed: ${name}`);
  const data = (await res.json()) as { Version: string };
  const result = { version: data.Version };
  cache.set(key, result);
  return result;
}

export async function getCratesLatest(name: string): Promise<{ version: string }> {
  const key = `crate:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`crates.io failed: ${name}`);
  const data = (await res.json()) as {
    crate?: { max_stable_version?: string; max_version?: string; description?: string };
  };
  const version = data.crate?.max_stable_version || data.crate?.max_version;
  if (!version) throw new Error(`crates.io no version: ${name}`);
  const result = { version };
  cache.set(key, result);
  return result;
}

export async function getRubyGemsLatest(name: string): Promise<{ version: string }> {
  const key = `gem:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`);
  if (!res.ok) throw new Error(`rubygems failed: ${name}`);
  const data = (await res.json()) as { version: string };
  const result = { version: data.version };
  cache.set(key, result);
  return result;
}

export async function getFlutterLatest(name: string): Promise<{ version: string }> {
  const key = `pub:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://pub.dev/api/packages/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`pub.dev failed: ${name}`);
  const data = (await res.json()) as { latest?: { version?: string } };
  if (!data.latest?.version) throw new Error(`pub.dev no version: ${name}`);
  const result = { version: data.latest.version };
  cache.set(key, result);
  return result;
}

export async function getAndroidLatest(name: string): Promise<{ version: string }> {
  const [group, artifact] = name.split(":");
  if (!group || !artifact) throw new Error(`invalid maven coord: ${name}`);
  const q = encodeURIComponent(`g:"${group}" AND a:"${artifact}"`);
  const res = await fetch(`https://search.maven.org/solrsearch/select?q=${q}&rows=1&wt=json`);
  if (!res.ok) throw new Error(`maven failed: ${name}`);
  const data = (await res.json()) as { response?: { docs?: { latestVersion?: string }[] } };
  const version = data.response?.docs?.[0]?.latestVersion;
  if (!version) throw new Error(`maven no version: ${name}`);
  return { version };
}

export async function getCocoaPodLatest(name: string): Promise<{ version: string }> {
  const res = await fetch(`https://trunk.cocoapods.org/api/v1/pods/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`cocoapods failed: ${name}`);
  const data = (await res.json()) as { versions?: { name: string }[] };
  const version = data.versions?.[0]?.name;
  if (!version) throw new Error(`cocoapods no version: ${name}`);
  return { version };
}

export async function getSwiftLatest(
  name: string,
  repositoryUrl?: string,
): Promise<{ version: string }> {
  const ref = parseGithubRepoUrl(repositoryUrl);
  const apiUrl = ref ? githubApiRepoUrl(ref.owner, ref.repo, "/releases/latest") : null;
  if (apiUrl) {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { tag_name?: string };
      if (data.tag_name) return { version: data.tag_name.replace(/^v/, "") };
    }
  }
  throw new Error(`swift latest unresolved: ${name}`);
}

function registryLink(ecosystem: Ecosystem, name: string): PackageLink {
  switch (ecosystem) {
    case "flutter":
      return { label: "pub.dev", type: "registry", url: `https://pub.dev/packages/${name}` };
    case "go":
      return { label: "pkg.go.dev", type: "registry", url: `https://pkg.go.dev/${name}` };
    case "rust":
      return { label: "crates.io", type: "registry", url: `https://crates.io/crates/${name}` };
    case "ruby":
      return { label: "RubyGems", type: "registry", url: `https://rubygems.org/gems/${name}` };
    case "android":
      return {
        label: "Maven Central",
        type: "registry",
        url: `https://search.maven.org/search?q=${encodeURIComponent(name)}`,
      };
    case "cocoapods":
      return { label: "CocoaPods", type: "registry", url: `https://cocoapods.org/pods/${name}` };
    case "swift":
      return { label: "Swift Package", type: "registry", url: `https://swiftpackageindex.com/${name}` };
    default:
      return { label: ecosystem, type: "registry", url: "#" };
  }
}

function installHint(ecosystem: Ecosystem, name: string, version: string) {
  switch (ecosystem) {
    case "flutter":
      return { label: "flutter", lines: [`flutter pub add ${name}`] };
    case "go":
      return { label: "go", lines: [`go get ${name}@${version}`] };
    case "rust":
      return { label: "cargo", lines: [`cargo add ${name}@${version}`] };
    case "ruby":
      return { label: "bundler", lines: [`bundle add ${name}`] };
    case "android":
      return { label: "gradle", lines: [`implementation("${name}:${version}")`] };
    case "cocoapods":
      return { label: "pod", lines: [`pod '${name}', '~> ${version}'`] };
    case "swift":
      return { label: "swift", lines: [`.package(url: "…", from: "${version}")`] };
    default:
      return { label: ecosystem, lines: [`${name}@${version}`] };
  }
}

export function detailsStub(ecosystem: Ecosystem, name: string, version: string): PackageDetails {
  return {
    ecosystem,
    name,
    version,
    links: [registryLink(ecosystem, name)],
    install: installHint(ecosystem, name, version),
  };
}

export async function getFlutterDetails(name: string): Promise<PackageDetails> {
  const key = `pub-detail:${name}`;
  const hit = detailCache.get(key);
  if (hit) return hit;

  const res = await fetch(`https://pub.dev/api/packages/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`pub.dev details failed: ${name}`);
  const data = (await res.json()) as {
    latest?: {
      version?: string;
      published?: string;
      pubspec?: {
        description?: string;
        homepage?: string;
        repository?: string;
        environment?: { sdk?: string };
      };
    };
    versions?: { version: string; published?: string }[];
  };

  const version = data.latest?.version;
  if (!version) throw new Error(`pub.dev no version: ${name}`);
  const pubspec = data.latest?.pubspec || {};
  const details: PackageDetails = {
    ecosystem: "flutter",
    name,
    version,
    description: pubspec.description || "",
    badges: ["Flutter"],
    links: [
      registryLink("flutter", name),
      ...(pubspec.repository
        ? [{ label: "Repository", type: "repository", url: pubspec.repository }]
        : []),
      ...(pubspec.homepage
        ? [{ label: "Homepage", type: "homepage", url: pubspec.homepage }]
        : []),
    ],
    stats: [
      { label: "SDK", value: pubspec.environment?.sdk || "Unknown" },
      {
        label: "Published",
        value: data.latest?.published || "Unknown",
        format: data.latest?.published ? "date" : "text",
      },
    ],
    compatibility: pubspec.environment?.sdk
      ? [{ label: "Dart SDK", value: pubspec.environment.sdk }]
      : [],
    versions: (data.versions || [])
      .slice()
      .reverse()
      .slice(0, 14)
      .map((entry) => ({
        version: entry.version,
        date: entry.published,
        labels: entry.version === version ? ["latest"] : [],
        isLatest: entry.version === version,
      })),
    install: installHint("flutter", name, version),
  };
  detailCache.set(key, details);
  return details;
}

export async function getCratesDetails(name: string): Promise<PackageDetails> {
  const key = `crate-detail:${name}`;
  const hit = detailCache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`crates.io details failed: ${name}`);
  const data = (await res.json()) as {
    crate?: {
      max_stable_version?: string;
      max_version?: string;
      description?: string;
      homepage?: string;
      repository?: string;
      documentation?: string;
      downloads?: number;
    };
    versions?: { num: string; created_at?: string }[];
  };
  const version = data.crate?.max_stable_version || data.crate?.max_version;
  if (!version) throw new Error(`crates.io no version: ${name}`);
  const details: PackageDetails = {
    ecosystem: "rust",
    name,
    version,
    description: data.crate?.description || "",
    links: [
      registryLink("rust", name),
      ...(data.crate?.repository
        ? [{ label: "Repository", type: "repository", url: data.crate.repository }]
        : []),
      ...(data.crate?.homepage
        ? [{ label: "Homepage", type: "homepage", url: data.crate.homepage }]
        : []),
      ...(data.crate?.documentation
        ? [{ label: "Docs", type: "homepage", url: data.crate.documentation }]
        : []),
    ],
    stats: [
      {
        label: "Downloads",
        value: data.crate?.downloads ?? 0,
        format: "number",
      },
    ],
    downloads:
      typeof data.crate?.downloads === "number"
        ? { label: "Total downloads", value: data.crate.downloads, format: "number" }
        : null,
    versions: (data.versions || []).slice(0, 14).map((v) => ({
      version: v.num,
      date: v.created_at,
      labels: v.num === version ? ["latest"] : [],
      isLatest: v.num === version,
    })),
    install: installHint("rust", name, version),
  };
  detailCache.set(key, details);
  return details;
}

export async function getRubyGemsDetails(name: string): Promise<PackageDetails> {
  const key = `gem-detail:${name}`;
  const hit = detailCache.get(key);
  if (hit) return hit;
  const res = await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`);
  if (!res.ok) throw new Error(`rubygems details failed: ${name}`);
  const data = (await res.json()) as {
    version: string;
    info?: string;
    homepage_uri?: string;
    source_code_uri?: string;
    project_uri?: string;
    downloads?: number;
  };
  const details: PackageDetails = {
    ecosystem: "ruby",
    name,
    version: data.version,
    description: data.info || "",
    links: [
      registryLink("ruby", name),
      ...(data.source_code_uri
        ? [{ label: "Repository", type: "repository", url: data.source_code_uri }]
        : []),
      ...(data.homepage_uri
        ? [{ label: "Homepage", type: "homepage", url: data.homepage_uri }]
        : []),
    ],
    downloads:
      typeof data.downloads === "number"
        ? { label: "Total downloads", value: data.downloads, format: "number" }
        : null,
    install: installHint("ruby", name, data.version),
  };
  detailCache.set(key, details);
  return details;
}

export async function getPolyglotDetails(
  ecosystem: Ecosystem,
  name: string,
  meta?: { repositoryUrl?: string },
): Promise<PackageDetails> {
  switch (ecosystem) {
    case "flutter":
      return getFlutterDetails(name);
    case "rust":
      return getCratesDetails(name);
    case "ruby":
      return getRubyGemsDetails(name);
    default: {
      let version: string;
      try {
        if (ecosystem === "swift") {
          version = (await getSwiftLatest(name, meta?.repositoryUrl)).version;
        } else if (ecosystem === "go") {
          version = (await getGoLatest(name)).version;
        } else if (ecosystem === "android") {
          version = (await getAndroidLatest(name)).version;
        } else if (ecosystem === "cocoapods") {
          version = (await getCocoaPodLatest(name)).version;
        } else {
          version = "unknown";
        }
      } catch {
        version = "unknown";
      }
      return detailsStub(ecosystem, name, version);
    }
  }
}
