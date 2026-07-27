"use client";

import { useCallback, useMemo, useState } from "react";
import type { Ecosystem, StoredWebProject } from "@npmax/types";
import { detectFromFileName } from "@npmax/core";
import { Sidebar } from "./Sidebar.js";
import { McpView } from "./McpView.js";
import { SuggestAppsView } from "./SuggestAppsView.js";
import { NewProjectModal } from "./NewProjectModal.js";
import { LightSettingsModal } from "./LightSettingsModal.js";
import { ManifestInbox } from "./ManifestInbox.js";
import { PackageEditor } from "./PackageEditor.js";
import {
  clearWebStorage,
  loadWebActive,
  loadWebProjects,
  saveWebActive,
  saveWebProjects,
  upsertWebProject,
} from "./storage.js";
import type { PackageEditorAdapter } from "./types.js";
import "./styles.css";

async function defaultOpenUrl(url: string) {
  if (url.startsWith("/")) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function WebAppShell({
  fetchLatest,
  fetchDetails,
  openUrl = defaultOpenUrl,
}: {
  fetchLatest: PackageEditorAdapter["fetchLatest"];
  fetchDetails?: PackageEditorAdapter["fetchDetails"];
  openUrl?: (url: string) => void | Promise<void>;
}) {
  const [projects, setProjects] = useState<StoredWebProject[]>(() => loadWebProjects());
  const [active, setActive] = useState(() => loadWebActive());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const current = useMemo(
    () => projects.find((p) => `project_${p.id}` === active),
    [projects, active],
  );

  const select = useCallback((next: string) => {
    setActive(next);
    saveWebActive(next);
  }, []);

  function createProject(name: string) {
    const project: StoredWebProject = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => {
      const next = [...prev, project];
      saveWebProjects(next);
      return next;
    });
    select(`project_${project.id}`);
  }

  function removeProject(id: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveWebProjects(next);
      return next;
    });
    select("suggest-apps");
  }

  function setManifest(projectId: string, fileName: string, content: string) {
    setProjects((prev) => {
      const existing = prev.find((p) => p.id === projectId);
      if (!existing) return prev;
      const updated: StoredWebProject = {
        ...existing,
        fileName,
        content,
        updatedAt: Date.now(),
      };
      const next = upsertWebProject(prev, updated);
      saveWebProjects(next);
      return next;
    });
  }

  const adapter: PackageEditorAdapter | null = current?.content
    ? {
        mode: "web",
        openUrl,
        persistManifest: async (content) => {
          setManifest(current.id, current.fileName || "package.json", content);
        },
        fetchLatest,
        fetchDetails,
      }
    : null;

  return (
    <div className="app-root app-root--web">
      <Sidebar
        projects={projects}
        active={active}
        homeMode="suggest"
        onSelectHome={() => select("suggest-apps")}
        onSelectMcp={() => select("mcp")}
        onSelectProject={(id) => select(`project_${id}`)}
        onAddProject={() => setNewProjectOpen(true)}
        onRemoveProject={removeProject}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenUrl={openUrl}
        showPackageManagers={false}
      />
      <div className="main-pane">
        {active === "mcp" ? (
          <McpView onOpenUrl={openUrl} />
        ) : active === "suggest-apps" || !current ? (
          <SuggestAppsView onOpenUrl={openUrl} />
        ) : current.content && adapter ? (
          <PackageEditor
            projectName={current.name}
            fileName={current.fileName || "package.json"}
            rawJson={current.content}
            onRefresh={(next) => setManifest(current.id, current.fileName || "package.json", next)}
            adapter={adapter}
          />
        ) : (
          <ManifestInbox
            projectName={current.name}
            onManifest={(fileName, content) => {
              const detected = detectFromFileName(fileName);
              setManifest(current.id, detected?.fileName || fileName, content);
            }}
          />
        )}
      </div>
      <NewProjectModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProject}
      />
      <LightSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearData={() => {
          clearWebStorage();
          setProjects([]);
          select("suggest-apps");
        }}
        onOpenUrl={openUrl}
      />
    </div>
  );
}

export type { Ecosystem };
