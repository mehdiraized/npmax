import type { ManifestParseResult, ParsedDependency } from "@npmax/types";

const GO_LINE_RE = /^\s*([^\s]+)\s+v([^\s]+)\s*$/;
const CARGO_SECTION_RE = /^\s*\[([^\]]+)\]\s*$/;
const CARGO_SIMPLE_RE = /^\s*([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"\s*$/;
const CARGO_INLINE_RE = /^\s*([A-Za-z0-9_-]+)\s*=\s*\{(.+)\}\s*$/;
const GEM_LINE_RE = /^\s*gem\s+["']([^"']+)["']\s*(?:,\s*["']([^"']+)["'])?/;

const parseInlineFields = (raw: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [rawKey, ...rawValue] = part.split("=");
    if (!rawKey || rawValue.length === 0) continue;
    fields[rawKey.trim()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
  }
  return fields;
};

export function parseGoMod(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  const dependencies: ParsedDependency[] = [];
  let inRequireBlock = false;
  let cursor = 0;

  for (const line of lines) {
    const lineStart = cursor;
    cursor += line.length + 1;
    const trimmed = line.trim();

    if (trimmed === "require (") {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && trimmed === ")") {
      inRequireBlock = false;
      continue;
    }

    let content = line;
    if (trimmed.startsWith("require ") && !inRequireBlock) {
      content = trimmed.slice("require ".length);
    } else if (!inRequireBlock) {
      continue;
    }

    const match = content.match(GO_LINE_RE);
    if (!match) continue;
    const modulePath = match[1]!;
    const version = match[2]!;
    const versionStart = lineStart + line.lastIndexOf(version);

    dependencies.push({
      id: `go:${modulePath}:${lineStart}`,
      name: modulePath,
      displayName: modulePath,
      version: `v${version}`,
      rawRequirement: `v${version}`,
      versionStart,
      versionEnd: versionStart + version.length,
    });
  }

  return { ecosystem: "go", fileName: "go.mod", content: raw, dependencies };
}

export function parseCargoToml(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  const dependencies: ParsedDependency[] = [];
  let section = "";
  let cursor = 0;

  for (const line of lines) {
    const lineStart = cursor;
    cursor += line.length + 1;
    const sectionMatch = line.match(CARGO_SECTION_RE);
    if (sectionMatch) {
      section = sectionMatch[1]!;
      continue;
    }
    if (!["dependencies", "dev-dependencies", "build-dependencies"].includes(section)) continue;

    const simple = line.match(CARGO_SIMPLE_RE);
    if (simple) {
      const versionStart = lineStart + line.lastIndexOf(simple[2]!);
      dependencies.push({
        id: `cargo:${section}:${simple[1]}:${lineStart}`,
        name: simple[1]!,
        version: simple[2]!,
        rawRequirement: simple[2]!,
        section,
        isDev: section !== "dependencies",
        versionStart,
        versionEnd: versionStart + simple[2]!.length,
      });
      continue;
    }

    const inline = line.match(CARGO_INLINE_RE);
    if (!inline) continue;
    const fields = parseInlineFields(inline[2]!);
    if (!fields.version) continue;
    const versionStart = lineStart + line.lastIndexOf(fields.version);
    dependencies.push({
      id: `cargo:${section}:${inline[1]}:${lineStart}`,
      name: inline[1]!,
      version: fields.version,
      rawRequirement: fields.version,
      section,
      isDev: section !== "dependencies",
      versionStart,
      versionEnd: versionStart + fields.version.length,
    });
  }

  return { ecosystem: "rust", fileName: "Cargo.toml", content: raw, dependencies };
}

export function parseGemfile(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  const dependencies: ParsedDependency[] = [];
  let cursor = 0;

  for (const line of lines) {
    const lineStart = cursor;
    cursor += line.length + 1;
    const match = line.match(GEM_LINE_RE);
    if (!match) continue;
    const version = match[2] || "";
    const versionStart = version ? lineStart + line.lastIndexOf(version) : undefined;
    dependencies.push({
      id: `gem:${match[1]}:${lineStart}`,
      name: match[1]!,
      version,
      rawRequirement: version,
      versionStart,
      versionEnd: versionStart != null ? versionStart + version.length : undefined,
    });
  }

  return { ecosystem: "ruby", fileName: "Gemfile", content: raw, dependencies };
}
