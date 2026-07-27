import type { ManifestParseResult, ParsedDependency } from "@npmax/types";

const SECTION_RE = /^([A-Za-z_][A-Za-z0-9_-]*):\s*$/;
const DEP_LINE_RE = /^\s{2}([A-Za-z0-9_]+):\s*(.+)?$/;
const SIMPLE_VERSION_RE = /^["']?([^"']+)["']?$/;
const IGNORED = new Set(["flutter", "sdk", "path", "git", "hosted", "assets", "uses-material-design"]);

export function parsePubspec(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  let section = "";
  let cursor = 0;
  const dependencies: ParsedDependency[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = cursor;
    cursor += line.length + 1;
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) { section = sectionMatch[1]!; continue; }
    if (section !== "dependencies" && section !== "dev_dependencies") continue;
    const depMatch = line.match(DEP_LINE_RE);
    if (!depMatch) continue;
    const name = depMatch[1]!;
    if (IGNORED.has(name)) continue;
    const rawValue = depMatch[2]?.trim() || "";
    if (!rawValue) {
      let nestedVersion: string | undefined;
      let nestedStart: number | undefined;
      let nestedEnd: number | undefined;
      let nestedCursor = cursor;
      for (let j = i + 1; j < lines.length; j++) {
        const nestedLine = lines[j]!;
        if (!nestedLine.startsWith("    ")) break;
        const versionMatch = nestedLine.match(/^\s{4}version:\s*["']?([^"']+)["']?\s*$/);
        if (versionMatch) {
          nestedVersion = versionMatch[1];
          nestedStart = nestedCursor + nestedLine.indexOf(versionMatch[1]!);
          nestedEnd = nestedStart + versionMatch[1]!.length;
          break;
        }
        nestedCursor += nestedLine.length + 1;
      }
      dependencies.push({
        id: `${section}:${name}:${lineStart}`,
        name, version: nestedVersion ?? "", rawRequirement: nestedVersion ?? "",
        isDev: section === "dev_dependencies", section,
        versionStart: nestedStart, versionEnd: nestedEnd,
      });
      continue;
    }
    const simple = rawValue.match(SIMPLE_VERSION_RE);
    const version = simple?.[1] || "";
    const versionStart = version ? lineStart + line.lastIndexOf(version) : undefined;
    dependencies.push({
      id: `${section}:${name}:${lineStart}`,
      name, version, rawRequirement: version,
      isDev: section === "dev_dependencies", section,
      versionStart, versionEnd: versionStart != null ? versionStart + version.length : undefined,
    });
  }
  return { ecosystem: "flutter", fileName: "pubspec.yaml", content: raw, dependencies };
}
