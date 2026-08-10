import { invoke } from "@tauri-apps/api/core";
import type { ExecOpts, ExecResult, HostIO } from "@npmax/types";

export const tauriHost: HostIO = {
  async readFile(path: string) {
    return invoke<string>("fs_read", { path });
  },
  async writeFile(path: string, content: string) {
    await invoke("fs_write", { path, content });
  },
  async exists(path: string) {
    return invoke<boolean>("fs_exists", { path });
  },
  async readdir(path: string) {
    return invoke<string[]>("fs_readdir", { path });
  },
  async exec(cmd: string, args: string[], opts?: ExecOpts) {
    return invoke<ExecResult>("shell_exec", {
      cmd,
      args,
      cwd: opts?.cwd,
      timeoutMs: opts?.timeoutMs,
    });
  },
};

export async function openProjectDialog(): Promise<string | null> {
  return invoke<string | null>("project_open_dialog");
}

export async function scanInstalledApps() {
  return invoke("installed_apps_scan");
}

export async function toolsVersions() {
  return invoke<Record<string, string | false>>("tools_versions");
}

export type GlobalPackage = { name: string; version: string };
export type GlobalPackagesResult = {
  supported: boolean;
  packages: GlobalPackage[];
  message?: string;
};

export async function scanGlobalPackages(manager: string) {
  return invoke<GlobalPackagesResult>("global_packages_scan", { manager });
}

export async function getFileIcon(path: string) {
  return invoke<string | null>("get_file_icon", { path });
}

export async function openUrl(url: string) {
  return invoke("open_url", { url });
}

export async function getAppInfo() {
  return invoke<{
    name: string;
    version: string;
    description?: string;
    copyright?: string;
    license?: string;
    homepage?: string;
    repositoryUrl?: string;
    releasesUrl?: string;
    issuesUrl?: string;
    platform?: string;
    arch?: string;
    tauriVersion?: string;
  }>("get_app_info");
}
