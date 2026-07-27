import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ecosystem, Project } from "@npmax/types";
import {
  detectNpmPackageManager,
  detectProjectFromFiles,
  getLatestVersion,
  getPackageDetails,
} from "@npmax/core";
import {
  McpView,
  PackageEditor,
  Sidebar,
  type PackageEditorAdapter,
} from "@npmax/app-shell";
import { openProjectDialog, openUrl, tauriHost, toolsVersions } from "./lib/host";
import { loadActive, loadProjects, saveActive, saveProjects } from "./lib/projects";
import { startWindowDrag } from "./lib/drag";
import { InstalledAppsView } from "./views/InstalledAppsView";
import { SettingsView } from "./views/SettingsView";
import { UpdateNotification } from "./views/UpdateNotification";

function installCommand(ecosystem: Ecosystem, pm: "npm" | "yarn" | "pnpm"): { cmd: string; args: string[] } {
  switch (ecosystem) {
    case "npm":
      if (pm === "pnpm") return { cmd: "pnpm", args: ["install"] };
      if (pm === "yarn") return { cmd: "yarn", args: ["install"] };
      return { cmd: "npm", args: ["install"] };
    case "composer":
      return { cmd: "composer", args: ["install"] };
    case "flutter":
      return { cmd: "flutter", args: ["pub", "get"] };
    case "go":
      return { cmd: "go", args: ["mod", "tidy"] };
    case "rust":
      return { cmd: "cargo", args: ["fetch"] };
    case "ruby":
      return { cmd: "bundle", args: ["install"] };
    case "cocoapods":
      return { cmd: "pod", args: ["install"] };
    default:
      return { cmd: "npm", args: ["install"] };
  }
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [active, setActive] = useState(() => loadActive());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rawManifest, setRawManifest] = useState("");
  const [manifestName, setManifestName] = useState("package.json");
  const [ecosystem, setEcosystem] = useState<Ecosystem>("npm");
  const [projectError, setProjectError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<"ok" | "stale" | "missing">("ok");
  const [checkUpdatesToken, setCheckUpdatesToken] = useState(0);

  const current = useMemo(
    () => projects.find((p) => `project_${p.id}` === active),
    [projects, active],
  );

  useEffect(() => {
    document.body.dataset.platform = navigator.platform.toLowerCase().includes("mac")
      ? "darwin"
      : navigator.platform.toLowerCase().includes("win")
        ? "win32"
        : "linux";
  }, []);

  useEffect(() => {
    if (!current) {
      setRawManifest("");
      return;
    }
    void (async () => {
      setProjectError(null);
      try {
        const entries = await tauriHost.readdir!(current.path);
        const detected = detectProjectFromFiles(entries);
        if (!detected) throw new Error("No supported manifest in this project");
        const content = await tauriHost.readFile(`${current.path}/${detected.fileName}`);
        setManifestName(detected.fileName);
        setEcosystem(detected.ecosystem);
        setRawManifest(content);

        if (detected.ecosystem === "npm") {
          const pm = detectNpmPackageManager(entries);
          const hasLock =
            entries.includes("pnpm-lock.yaml") ||
            entries.includes("yarn.lock") ||
            entries.includes("package-lock.json");
          setLockStatus(hasLock ? "ok" : "missing");
          void pm;
        } else {
          setLockStatus("ok");
        }
      } catch (e) {
        setProjectError(e instanceof Error ? e.message : String(e));
        setRawManifest("");
      }
    })();
  }, [current?.id, current?.path]);

  async function addProject() {
    const path = await openProjectDialog();
    if (!path) return;
    const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
    const existing = projects.find((p) => p.path === path);
    if (existing) {
      setActive(`project_${existing.id}`);
      saveActive(`project_${existing.id}`);
      return;
    }
    const project: Project = { id: crypto.randomUUID(), name, path };
    const next = [...projects, project];
    setProjects(next);
    saveProjects(next);
    setActive(`project_${project.id}`);
    saveActive(`project_${project.id}`);
  }

  function removeProject(id: string) {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    saveProjects(next);
    setActive("installed-apps");
    saveActive("installed-apps");
  }

  const fetchLatest = useCallback(
    async (eco: Ecosystem, name: string, meta?: { repositoryUrl?: string }) => {
      return getLatestVersion(eco, name, meta);
    },
    [],
  );

  const fetchDetails = useCallback(
    async (eco: Ecosystem, name: string, meta?: { repositoryUrl?: string }) => {
      return getPackageDetails(eco, name, meta);
    },
    [],
  );

  const openExternal = useCallback(async (url: string) => {
    await openUrl(url);
  }, []);

  const adapter: PackageEditorAdapter | null = current
    ? {
        mode: "desktop",
        openUrl: openExternal,
        persistManifest: async (content) => {
          await tauriHost.writeFile(`${current.path}/${manifestName}`, content);
        },
        fetchLatest,
        fetchDetails,
        lockStatus,
        install: async () => {
          const entries = await tauriHost.readdir!(current.path);
          const pm = detectNpmPackageManager(entries);
          const { cmd, args } = installCommand(ecosystem, pm);
          await tauriHost.exec(cmd, args, { cwd: current.path, timeoutMs: 180000 });
          setLockStatus("ok");
        },
      }
    : null;

  return (
    <div className="app-root">
      <Sidebar
        projects={projects}
        active={active}
        homeMode="installed"
        onSelectHome={() => {
          setActive("installed-apps");
          saveActive("installed-apps");
        }}
        onSelectMcp={() => {
          setActive("mcp");
          saveActive("mcp");
        }}
        onSelectProject={(id) => {
          setActive(`project_${id}`);
          saveActive(`project_${id}`);
        }}
        onAddProject={() => void addProject()}
        onRemoveProject={removeProject}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenUrl={openExternal}
        onHeaderMouseDown={startWindowDrag}
        toolsVersions={toolsVersions}
        showPackageManagers
      />
      <div className="main-pane">
        {active === "mcp" ? (
          <McpView onOpenUrl={openExternal} onHeaderMouseDown={startWindowDrag} />
        ) : active === "installed-apps" || !current ? (
          <InstalledAppsView />
        ) : projectError ? (
          <div className="notice notice--error" style={{ margin: 24 }}>
            {projectError}
          </div>
        ) : rawManifest && adapter ? (
          <PackageEditor
            projectName={current.name}
            fileName={manifestName}
            rawJson={rawManifest}
            onRefresh={(next) => setRawManifest(next)}
            adapter={adapter}
            onHeaderMouseDown={startWindowDrag}
          />
        ) : (
          <div className="notice" style={{ margin: 24 }}>
            Loading project…
          </div>
        )}
      </div>
      <SettingsView
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCheckUpdates={() => setCheckUpdatesToken((n) => n + 1)}
      />
      <UpdateNotification
        checkToken={checkUpdatesToken}
        onOpenUrl={openExternal}
      />
    </div>
  );
}
