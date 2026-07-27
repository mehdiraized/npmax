import type { ManifestParseResult, ParsedDependency } from "@npmax/types";

const GRADLE_DEP_RE = /^\s*([A-Za-z][A-Za-z0-9]*)\s*\(?\s*['"]([^:'"]+):([^:'"]+):([^'"]+)['"]\s*\)?/gm;
const TOML_SECTION_RE = /^\s*\[([^\]]+)\]\s*$/;
const TOML_VERSION_RE = /^\s*([A-Za-z0-9._-]+)\s*=\s*"([^"]+)"\s*$/;
const TOML_LIBRARY_RE = /^\s*([A-Za-z0-9._-]+)\s*=\s*\{(.+)\}\s*$/;

const parseTomlInlineFields = (rawFields: string) => {
  const fields: Record<string, string> = {};
  for (const part of rawFields.split(",")) {
    const [rawKey, ...rawValue] = part.split("=");
    if (!rawKey || rawValue.length === 0) continue;
    fields[rawKey.trim()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
  }
  return fields;
};

export function parseGradleManifest(raw: string): ManifestParseResult {
  const dependencies: ParsedDependency[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(GRADLE_DEP_RE.source, "gm");
  while ((match = re.exec(raw)) !== null) {
    const [full, , group, artifact, version] = match;
    const versionStart = match.index + full!.lastIndexOf(version!);
    dependencies.push({
      id: `${match[1]}:${group}:${artifact}:${match.index}`,
      name: `${group}:${artifact}`,
      group: group!, artifact: artifact!, version: version!, rawRequirement: version!,
      versionStart, versionEnd: versionStart + version!.length,
    });
  }
  return { ecosystem: "android", fileName: "build.gradle", content: raw, dependencies };
}

export function parseVersionCatalog(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  const versions: Record<string, string> = {};
  const versionLocations: Record<string, { versionStart: number; versionEnd: number }> = {};
  const libraries: ParsedDependency[] = [];
  let section = "";
  let cursor = 0;
  for (const line of lines) {
    const lineStart = cursor;
    cursor += line.length + 1;
    const sectionMatch = line.match(TOML_SECTION_RE);
    if (sectionMatch) { section = sectionMatch[1]!; continue; }
    if (section === "versions") {
      const m = line.match(TOML_VERSION_RE);
      if (!m) continue;
      const alias = m[1]!;
      const version = m[2]!;
      const versionStart = lineStart + line.indexOf(`"${version}"`) + 1;
      versions[alias] = version;
      versionLocations[alias] = { versionStart, versionEnd: versionStart + version.length };
      continue;
    }
    if (section === "libraries") {
      const m = line.match(TOML_LIBRARY_RE);
      if (!m) continue;
      const alias = m[1]!;
      const fields = parseTomlInlineFields(m[2]!);
      const module = fields.module;
      const group = fields.group || module?.split(":")[0];
      const artifact = fields.name || module?.split(":")[1];
      const versionRef = fields["version.ref"];
      const inlineVersion = fields.version;
      const resolvedVersion = versionRef ? versions[versionRef] || "" : inlineVersion || "";
      const inlineNeedle = inlineVersion ? `"${inlineVersion}"` : null;
      const inlineVersionStart = inlineNeedle && line.includes(inlineNeedle) ? lineStart + line.indexOf(inlineNeedle) + 1 : undefined;
      libraries.push({
        id: `catalog:${alias}:${lineStart}`,
        name: module || `${group}:${artifact}`,
        group, artifact, version: resolvedVersion, rawRequirement: resolvedVersion,
        versionStart: versionRef ? versionLocations[versionRef]?.versionStart : inlineVersionStart,
        versionEnd: versionRef ? versionLocations[versionRef]?.versionEnd : inlineVersionStart != null && inlineVersion ? inlineVersionStart + inlineVersion.length : undefined,
      });
    }
  }
  return { ecosystem: "android", fileName: "libs.versions.toml", content: raw, dependencies: libraries };
}
