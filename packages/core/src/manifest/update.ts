import type { Ecosystem, ParsedDependency } from "@npmax/types";
import { applyVersionPrefix } from "../semver.js";
import { updateComposerJsonContent, updatePackageJsonContent } from "../parsers/json-ecosystems.js";

export function applyOffsetUpdate(content: string, dep: ParsedDependency, newVersion: string): string | null {
  if (dep.versionStart == null || dep.versionEnd == null) return null;
  return content.slice(0, dep.versionStart) + newVersion + content.slice(dep.versionEnd);
}

export function applyVersionUpdate(
  ecosystem: Ecosystem,
  content: string,
  dep: ParsedDependency,
  latestVersion: string,
): string | null {
  if (ecosystem === "npm") {
    return updatePackageJsonContent(content, dep.name, latestVersion, !!dep.isDev);
  }
  if (ecosystem === "composer") {
    return updateComposerJsonContent(content, dep.name, latestVersion, !!dep.isDev);
  }
  if (ecosystem === "go") {
    const normalized = latestVersion.replace(/^v/, "");
    return applyOffsetUpdate(content, dep, normalized);
  }
  // Prefer offset rewrite when available; otherwise prefix-aware for JSON-like
  const offset = applyOffsetUpdate(content, dep, latestVersion);
  if (offset) return offset;
  if (dep.rawRequirement) {
    return applyOffsetUpdate(content, { ...dep, versionStart: 0, versionEnd: 0 }, applyVersionPrefix(dep.rawRequirement, latestVersion));
  }
  return null;
}
