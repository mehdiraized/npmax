import type { Project } from "@npmax/types";

const KEY = "npmax.projects";
const ACTIVE = "npmax.active";

export function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Project[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function loadActive(): string {
  return localStorage.getItem(ACTIVE) || "installed-apps";
}

export function saveActive(id: string) {
  localStorage.setItem(ACTIVE, id);
}
