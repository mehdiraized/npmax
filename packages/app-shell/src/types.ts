import type { Ecosystem, PackageDetails, StoredWebProject } from "@npmax/types";

export type ShellHomeMode = "suggest" | "installed";

export type PackageEditorMode = "desktop" | "web";

export interface PackageEditorAdapter {
  readonly mode: PackageEditorMode;
  openUrl(url: string): void | Promise<void>;
  persistManifest(content: string): Promise<void>;
  fetchLatest(
    ecosystem: Ecosystem,
    name: string,
    meta?: { repositoryUrl?: string },
  ): Promise<string>;
  fetchDetails?(
    ecosystem: Ecosystem,
    name: string,
    meta?: { repositoryUrl?: string },
  ): Promise<PackageDetails>;
  /** Desktop: run package manager install. Web: omitted. */
  install?: () => Promise<void>;
  lockStatus?: "ok" | "stale" | "missing";
}

export interface ShellProject {
  readonly id: string;
  readonly name: string;
  readonly path?: string;
}

export type ActiveView =
  | "suggest-apps"
  | "installed-apps"
  | "mcp"
  | `project_${string}`;

export function isProjectActive(active: string, id: string) {
  return active === `project_${id}`;
}

export type { StoredWebProject };
