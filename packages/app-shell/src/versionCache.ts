import type { Ecosystem, ParsedDependency } from "@npmax/types";

type DepLatestEntry = {
  version: string;
  fetchedAt: number;
};

type DepLatestCachePayload = {
  schemaVersion: 1;
  byDepKey: Record<string, DepLatestEntry>;
};

const KEY = "npmax.cache.depLatest.v1";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function buildDepKey(ecosystem: Ecosystem, dep: ParsedDependency): string {
  const req = dep.rawRequirement ?? dep.version ?? "";
  if (ecosystem === "swift") {
    return `${ecosystem}:${dep.name}:${dep.repositoryUrl ?? ""}:${req}`;
  }
  return `${ecosystem}:${dep.name}:${req}`;
}

function safeLoad(): DepLatestCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DepLatestCachePayload>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.byDepKey || typeof parsed.byDepKey !== "object") {
      return null;
    }
    return {
      schemaVersion: 1,
      byDepKey: parsed.byDepKey as Record<string, DepLatestEntry>,
    };
  } catch {
    return null;
  }
}

export function loadDepLatestCache() {
  return safeLoad();
}

export function saveDepLatestResult(depKey: string, version: string) {
  if (typeof window === "undefined") return;
  try {
    const current = safeLoad();
    const next: DepLatestCachePayload = current ?? { schemaVersion: 1, byDepKey: {} };
    next.byDepKey[depKey] = { version, fetchedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode failures
  }
}

export function isDepLatestStale(fetchedAt: number, now = Date.now()) {
  return now - fetchedAt > TTL_MS;
}

