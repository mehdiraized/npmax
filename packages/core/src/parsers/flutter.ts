import type { ManifestParseResult, ParsedDependency } from "@npmax/types";

const IGNORED = new Set(["flutter", "sdk", "path", "git", "hosted", "assets", "uses-material-design"]);

function isYamlKeyChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function parseSectionKey(line: string): string | null {
  // "dependencies:" / "dev_dependencies:" — avoid unbounded character-class quantifiers
  if (!line.endsWith(":")) return null;
  if (line.startsWith(" ") || line.startsWith("\t")) return null;
  const key = line.slice(0, -1).trim();
  if (!key || key.length > 64) return null;
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) return null;
  return key;
}

function parseDepLine(line: string): { name: string; rawValue: string } | null {
  // Exactly two leading spaces, then name, then colon
  if (!line.startsWith("  ") || line.startsWith("   ")) return null;
  const rest = line.slice(2);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  const name = rest.slice(0, colon);
  if (!name || name.length > 64) return null;
  for (const ch of name) {
    if (!isYamlKeyChar(ch)) return null;
  }
  const rawValue = rest.slice(colon + 1).trim();
  return { name, rawValue };
}

function unwrapQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseNestedVersion(line: string): string | null {
  // "    version: x" with exactly four spaces
  if (!line.startsWith("    ") || line.startsWith("     ")) return null;
  const rest = line.slice(4).trim();
  if (!rest.startsWith("version:")) return null;
  return unwrapQuotes(rest.slice("version:".length).trim());
}

export function parsePubspec(raw: string): ManifestParseResult {
  const lines = raw.split(/\r?\n/);
  let section = "";
  let cursor = 0;
  const dependencies: ParsedDependency[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = cursor;
    cursor += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sectionKey = parseSectionKey(line);
    if (sectionKey) {
      section = sectionKey;
      continue;
    }
    if (section !== "dependencies" && section !== "dev_dependencies") continue;

    const dep = parseDepLine(line);
    if (!dep) continue;
    if (IGNORED.has(dep.name)) continue;

    if (!dep.rawValue) {
      let nestedVersion: string | undefined;
      let nestedStart: number | undefined;
      let nestedEnd: number | undefined;
      let nestedCursor = cursor;
      for (let j = i + 1; j < lines.length; j++) {
        const nestedLine = lines[j]!;
        if (!nestedLine.startsWith("    ")) break;
        const version = parseNestedVersion(nestedLine);
        if (version != null) {
          nestedVersion = version;
          nestedStart = nestedCursor + nestedLine.indexOf(version);
          nestedEnd = nestedStart + version.length;
          break;
        }
        nestedCursor += nestedLine.length + 1;
      }
      dependencies.push({
        id: `${section}:${dep.name}:${lineStart}`,
        name: dep.name,
        version: nestedVersion ?? "",
        rawRequirement: nestedVersion ?? "",
        isDev: section === "dev_dependencies",
        section,
        versionStart: nestedStart,
        versionEnd: nestedEnd,
      });
      continue;
    }

    const version = unwrapQuotes(dep.rawValue);
    const versionStart = version ? lineStart + line.lastIndexOf(version) : undefined;
    dependencies.push({
      id: `${section}:${dep.name}:${lineStart}`,
      name: dep.name,
      version,
      rawRequirement: version,
      isDev: section === "dev_dependencies",
      section,
      versionStart,
      versionEnd: versionStart != null ? versionStart + version.length : undefined,
    });
  }
  return { ecosystem: "flutter", fileName: "pubspec.yaml", content: raw, dependencies };
}
