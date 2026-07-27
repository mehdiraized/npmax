import type { AnalyzeResponse, DependencyStatus } from "@npmax/types";
import { parseManifest } from "./parsers/index.js";
import { mapPool } from "./pool.js";
import { getLatestVersion } from "./registries/index.js";
import { stripVersionPrefix, compareSemver } from "./semver.js";

export async function analyzeManifest(fileName: string, content: string): Promise<AnalyzeResponse> {
  const parsed = parseManifest(fileName, content);
  const dependencies = await mapPool(parsed.dependencies, 6, async (dep): Promise<DependencyStatus> => {
    try {
      const latestVersion = await getLatestVersion(parsed.ecosystem, dep.name, {
        repositoryUrl: (dep as { sourceType?: string }).sourceType === "github" ? undefined : undefined,
      });
      const current = stripVersionPrefix(dep.version || dep.rawRequirement || "");
      const latest = stripVersionPrefix(latestVersion);
      let status: DependencyStatus["status"] = "ok";
      if (current && latest && compareSemver(current, latest) < 0) status = "update";
      else if (!current) status = "unknown";
      return { ...dep, latestVersion, status };
    } catch (e) {
      return {
        ...dep,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  return {
    ecosystem: parsed.ecosystem,
    fileName: parsed.fileName,
    dependencies,
  };
}
