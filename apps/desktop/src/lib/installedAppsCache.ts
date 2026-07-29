import type { InstalledApp } from "@npmax/types";

type InstalledAppsCachePayload = {
  apps: InstalledApp[];
  cachedAt: number;
};

const KEY = "npmax.cache.installedApps.v1";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function safeLoad(): InstalledAppsCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InstalledAppsCachePayload>;
    if (!parsed || !Array.isArray(parsed.apps) || typeof parsed.cachedAt !== "number") return null;
    return { apps: parsed.apps as InstalledApp[], cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
}

export function loadInstalledAppsCache() {
  return safeLoad();
}

export function saveInstalledAppsCache(apps: InstalledApp[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: InstalledAppsCachePayload = { apps, cachedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode failures
  }
}

export function isInstalledAppsCacheStale(cachedAt: number, now = Date.now()) {
  return now - cachedAt > TTL_MS;
}

