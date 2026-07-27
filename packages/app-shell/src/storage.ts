import type { StoredWebProject } from "@npmax/types";

const PROJECTS_KEY = "npmax.web.projects";
const ACTIVE_KEY = "npmax.web.active";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadWebProjects(): StoredWebProject[] {
  if (typeof window === "undefined") return [];
  const list = safeParse<StoredWebProject[]>(localStorage.getItem(PROJECTS_KEY), []);
  return Array.isArray(list) ? list : [];
}

export function saveWebProjects(projects: readonly StoredWebProject[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadWebActive(): string {
  if (typeof window === "undefined") return "suggest-apps";
  return localStorage.getItem(ACTIVE_KEY) || "suggest-apps";
}

export function saveWebActive(active: string) {
  localStorage.setItem(ACTIVE_KEY, active);
}

export function clearWebStorage() {
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(ACTIVE_KEY);
}

export function upsertWebProject(
  projects: readonly StoredWebProject[],
  next: StoredWebProject,
): StoredWebProject[] {
  const idx = projects.findIndex((p) => p.id === next.id);
  if (idx === -1) return [...projects, next];
  const copy = [...projects];
  copy[idx] = next;
  return copy;
}
