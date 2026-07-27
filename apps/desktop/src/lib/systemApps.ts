import type { InstalledApp } from "@npmax/types";
import { APP_CATALOG, findCatalogEntry } from "@npmax/core";
import { scanInstalledApps, tauriHost } from "./host";

const normalizeKey = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** Strip brew build tokens like "3.13.10,4f02290…" → "3.13.10" */
export const cleanVersion = (value?: string | null) =>
  String(value || "")
    .trim()
    .split(",")[0]
    ?.replace(/^v/i, "")
    .replace(/^release[-_\s]*/i, "")
    .trim() || "";

const normalizeVersion = (value: string) => cleanVersion(value).replace(/^[^0-9]*/, "");

export function resolveVersionStatus(installed?: string | null, latest?: string | null) {
  if (!installed || !latest) return "unknown";
  const a = normalizeVersion(installed);
  const b = normalizeVersion(latest);
  if (!a || !b) return "unknown";
  if (a === b) return "current";
  const tokenize = (value: string) =>
    value
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map((part) => {
        const n = Number(part);
        return Number.isNaN(n) ? part.toLowerCase() : n;
      });
  const left = tokenize(a);
  const right = tokenize(b);
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) {
    const x = left[i];
    const y = right[i];
    if (x == null) return "outdated";
    if (y == null) return "ahead";
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x < y ? "outdated" : "ahead";
    return String(x).localeCompare(String(y)) < 0 ? "outdated" : "ahead";
  }
  return "current";
}

function buildAppRecord(data: Partial<InstalledApp> & { name: string }): InstalledApp {
  const catalog = findCatalogEntry(data.name);
  return {
    id:
      data.id ||
      `app:${normalizeKey(data.name)}:${normalizeKey(data.path || data.source || "app")}`,
    name: data.name,
    version: data.version || "",
    platform: data.platform || "darwin",
    path: data.path,
    publisher: data.publisher,
    source: data.source || "system",
    sourceId: data.sourceId,
    website: data.website || catalog?.website,
    installType: data.installType || "system",
    catalogId: catalog?.id,
    latestVersion: data.latestVersion,
    updateAvailable: !!data.updateAvailable,
    updateSource: data.updateSource,
    updateUrl: data.updateUrl,
    updateCommand: data.updateCommand,
    updateConfidence: data.updateConfidence,
    status: data.status || "unknown",
  };
}

async function tryExec(cmd: string, args: string[]) {
  try {
    const result = await tauriHost.exec(cmd, args, { timeoutMs: 90_000 });
    if (result.code !== 0) return "";
    return result.stdout;
  } catch {
    return "";
  }
}

async function getMacApps(): Promise<InstalledApp[]> {
  const raw = await tryExec("system_profiler", ["SPApplicationsDataType", "-json"]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as {
      SPApplicationsDataType?: {
        _name?: string;
        version?: string;
        path?: string;
        obtained_from?: string;
      }[];
    };
    return (parsed.SPApplicationsDataType || [])
      .filter((item) => item._name && item.obtained_from !== "apple")
      .map((item) =>
        buildAppRecord({
          name: item._name!,
          version: item.version || "",
          path: item.path,
          publisher: item.obtained_from || undefined,
          source:
            item.obtained_from === "identified_developer"
              ? "system"
              : item.obtained_from || "system",
          platform: "darwin",
        }),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

async function enrichMacBrew(apps: InstalledApp[]): Promise<InstalledApp[]> {
  const outdatedRaw = await tryExec("brew", ["outdated", "--json=v2", "--greedy"]);
  if (!outdatedRaw) return apps;
  try {
    const parsed = JSON.parse(outdatedRaw) as {
      casks?: {
        name: string;
        installed_versions?: string[];
        current_version?: string;
      }[];
    };
    const byToken = new Map(
      (parsed.casks || []).map((c) => [
        c.name,
        {
          installed: c.installed_versions?.[0] || "",
          latest: c.current_version || "",
        },
      ]),
    );

    return apps.map((app) => {
      const catalog = APP_CATALOG.find((c) => c.id === app.catalogId);
      const token = catalog?.platforms?.darwin?.brewCask;
      if (!token || !byToken.has(token)) return app;
      const info = byToken.get(token)!;
      const latest = cleanVersion(info.latest);
      const installed = cleanVersion(app.version || info.installed);
      const status = resolveVersionStatus(installed, latest);
      return {
        ...app,
        version: installed || app.version,
        latestVersion: latest,
        updateAvailable: status === "outdated",
        status,
        source: "brew-cask",
        updateSource: "brew",
        updateCommand: `brew upgrade --cask ${token}`,
        updateConfidence: "high",
      };
    });
  } catch {
    return apps;
  }
}

export async function getInstalledAppsInventory(): Promise<InstalledApp[]> {
  // Prefer richer TS scanner on macOS; fall back to Rust command elsewhere.
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) {
    const apps = await getMacApps();
    return enrichMacBrew(apps);
  }
  return (await scanInstalledApps()) as InstalledApp[];
}

export async function enrichAppsWithRemoteVersions(
  apps: InstalledApp[],
  onProgress?: (id: string, payload: Partial<InstalledApp> | null) => void,
) {
  const candidates = apps.filter((a) => !a.updateAvailable && a.catalogId && a.version);
  for (const app of candidates) {
    const catalog = findCatalogEntry(app.name);
    const brewCask = catalog?.platforms?.darwin?.brewCask;
    if (brewCask) {
      try {
        const res = await fetch(`https://formulae.brew.sh/api/cask/${brewCask}.json`);
        if (res.ok) {
          const data = (await res.json()) as { version?: string; homepage?: string };
          if (data.version) {
            const latest = cleanVersion(data.version);
            const status = resolveVersionStatus(app.version, latest);
            onProgress?.(app.id, {
              latestVersion: latest,
              updateAvailable: status === "outdated",
              status,
              updateSource: "brew-api",
              updateUrl: data.homepage || catalog?.website,
              updateCommand: `brew upgrade --cask ${brewCask}`,
              updateConfidence: "medium",
            });
            continue;
          }
        }
      } catch {
        /* ignore */
      }
    }
    onProgress?.(app.id, null);
  }
}
