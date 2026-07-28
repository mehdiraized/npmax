import type { ManifestParseResult, ParsedDependency } from "@npmax/types";
import { isGithubHostUrl } from "../github.js";

const SWIFT_PACKAGE_PREFIX = ".package";
const SWIFT_VERSION_PATTERNS = [
  { kind: "from", regex: /from:\s*"([^"]+)"/ },
  { kind: "exact", regex: /exact:\s*"([^"]+)"/ },
  { kind: "revision", regex: /revision:\s*"([^"]+)"/ },
  { kind: "branch", regex: /branch:\s*"([^"]+)"/ },
  { kind: "upToNextMajor", regex: /upToNextMajor\s*\(\s*from:\s*"([^"]+)"\s*\)/ },
  { kind: "upToNextMinor", regex: /upToNextMinor\s*\(\s*from:\s*"([^"]+)"\s*\)/ },
];
const POD_LINE_RE = /^\s*pod\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/gm;

function extractSwiftPackageBlocks(raw: string) {
  const blocks: { start: number; end: number; text: string }[] = [];
  let cursor = 0;
  while (cursor < raw.length) {
    const prefixIndex = raw.indexOf(SWIFT_PACKAGE_PREFIX, cursor);
    if (prefixIndex === -1) break;
    const openParenIndex = raw.indexOf("(", prefixIndex);
    if (openParenIndex === -1) break;
    let depth = 0;
    let closeParenIndex = openParenIndex;
    for (; closeParenIndex < raw.length; closeParenIndex++) {
      const char = raw[closeParenIndex];
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth === 0) break;
    }
    if (depth !== 0) break;
    blocks.push({ start: prefixIndex, end: closeParenIndex + 1, text: raw.slice(prefixIndex, closeParenIndex + 1) });
    cursor = closeParenIndex + 1;
  }
  return blocks;
}

function matchSwiftVersion(block: string) {
  for (const pattern of SWIFT_VERSION_PATTERNS) {
    const match = block.match(pattern.regex);
    if (!match) continue;
    const value = match[1]!;
    const captureIndex = match.index! + match[0].indexOf(value);
    return { kind: pattern.kind, value, start: captureIndex, end: captureIndex + value.length };
  }
  return null;
}

const displayNameFromSource = (source = "") =>
  source.replace(/\.git$/i, "").split(/[/:]/).filter(Boolean).pop() || source;

export function parseSwiftManifest(raw: string): ManifestParseResult {
  const dependencies: ParsedDependency[] = extractSwiftPackageBlocks(raw).map((block, index) => {
    const urlMatch = block.text.match(/url:\s*"([^"]+)"/);
    const pathMatch = block.text.match(/path:\s*"([^"]+)"/);
    const nameMatch = block.text.match(/name:\s*"([^"]+)"/);
    const versionMatch = matchSwiftVersion(block.text);
    const repositoryUrl = urlMatch?.[1];
    const localPath = pathMatch?.[1];
    const displayName = nameMatch?.[1] || (repositoryUrl ? displayNameFromSource(repositoryUrl) : null) || (localPath ? displayNameFromSource(localPath) : `dependency-${index + 1}`);
    return {
      id: `${displayName}:${repositoryUrl || localPath || index}`,
      name: displayName,
      displayName,
      version: versionMatch?.value || "",
      rawRequirement: versionMatch?.value || "",
      sourceType: localPath
        ? "local"
        : isGithubHostUrl(repositoryUrl)
          ? "github"
          : repositoryUrl
            ? "remote"
            : "unknown",
      repositoryUrl,
      versionStart: versionMatch == null ? undefined : block.start + versionMatch.start,
      versionEnd: versionMatch == null ? undefined : block.start + versionMatch.end,
    };
  });
  return { ecosystem: "swift", fileName: "Package.swift", content: raw, dependencies };
}

export function parsePodfile(raw: string): ManifestParseResult {
  const dependencies: ParsedDependency[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(POD_LINE_RE.source, "gm");
  while ((match = re.exec(raw)) !== null) {
    const version = match[2] || "";
    const versionStart = version ? match.index + match[0].lastIndexOf(version) : undefined;
    dependencies.push({
      id: `pod:${match[1]}:${match.index}`,
      name: match[1]!,
      version,
      rawRequirement: version,
      versionStart,
      versionEnd: versionStart != null ? versionStart + version.length : undefined,
    });
  }
  return { ecosystem: "cocoapods", fileName: "Podfile", content: raw, dependencies };
}
