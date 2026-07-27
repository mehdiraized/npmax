import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { ShellHomeMode, ShellProject } from "./types.js";
import { PKG_ICONS } from "./PkgIcons.js";

const PKG_DEFS = [
  { key: "npm", label: "npm" },
  { key: "yarn", label: "yarn" },
  { key: "pnpm", label: "pnpm" },
  { key: "composer", label: "composer" },
  { key: "swift", label: "swift" },
  { key: "cocoapods", label: "cocoapods" },
  { key: "gradle", label: "gradle" },
  { key: "flutter", label: "flutter" },
  { key: "go", label: "go" },
  { key: "cargo", label: "cargo" },
  { key: "bundler", label: "bundler" },
] as const;

const PKGS_COLLAPSED_KEY = "npmax.pkgsCollapsed";

function loadPkgsCollapsed() {
  try {
    return localStorage.getItem(PKGS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function savePkgsCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(PKGS_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
}

function cleanToolVersion(key: string, raw: string) {
  const first = raw.split("\n")[0]?.trim() || raw.trim();
  if (!first || /this project|not found|command not found/i.test(first)) return "";
  const num = first.match(/(\d+\.\d+(?:\.\d+)?)/);
  if (key === "swift") {
    const m = first.match(/Swift version\s+([^\s]+)/i);
    return m?.[1] || num?.[1] || "";
  }
  if (
    key === "composer" ||
    key === "cargo" ||
    key === "bundler" ||
    key === "cocoapods" ||
    key === "flutter" ||
    key === "go" ||
    key === "yarn" ||
    key === "gradle"
  ) {
    return num?.[1] || "";
  }
  return num?.[1] || first;
}

function isInstalledVersion(version: string) {
  return Boolean(version && version !== "—" && /\d/.test(version));
}

export function Sidebar({
  projects,
  active,
  homeMode,
  onSelectHome,
  onSelectMcp,
  onSelectProject,
  onAddProject,
  onRemoveProject,
  onOpenSettings,
  onOpenUrl,
  onHeaderMouseDown,
  toolsVersions,
  showPackageManagers = true,
}: {
  projects: readonly ShellProject[];
  active: string;
  homeMode: ShellHomeMode;
  onSelectHome: () => void;
  onSelectMcp: () => void;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onRemoveProject: (id: string) => void;
  onOpenSettings: () => void;
  onOpenUrl: (url: string) => void | Promise<void>;
  onHeaderMouseDown?: (e: MouseEvent) => void;
  toolsVersions?: () => Promise<Record<string, string | false>>;
  showPackageManagers?: boolean;
}) {
  const [packages, setPackages] = useState<Record<string, string | false>>({});
  const [pkgsCollapsed, setPkgsCollapsed] = useState(loadPkgsCollapsed);
  const homeActive =
    homeMode === "suggest" ? active === "suggest-apps" : active === "installed-apps";

  useEffect(() => {
    if (!toolsVersions) return;
    void toolsVersions()
      .then(setPackages)
      .catch(() => undefined);
  }, [toolsVersions]);

  function togglePkgsCollapsed() {
    setPkgsCollapsed((prev) => {
      const next = !prev;
      savePkgsCollapsed(next);
      return next;
    });
  }

  const activePkgs = useMemo(() => {
    if (!showPackageManagers) return [] as { key: string; label: string; version: string; Icon: () => ReactNode }[];
    return PKG_DEFS.flatMap((p) => {
      const raw = packages[p.key];
      if (typeof raw !== "string" || !raw) return [];
      const version = cleanToolVersion(p.key, raw);
      if (!isInstalledVersion(version)) return [];
      const Icon = PKG_ICONS[p.key];
      if (!Icon) return [];
      return [{ ...p, version, Icon }];
    });
  }, [packages, showPackageManagers]);

  function openBugReport() {
    const params = new URLSearchParams({
      title: "[Bug Report] ",
      body: [
        "## Summary",
        "Describe the problem clearly.",
        "",
        "## Environment",
        `- Platform: ${typeof navigator !== "undefined" ? navigator.platform : "Unknown"}`,
        "",
        "---",
        "*Opened from npMax sidebar report shortcut*",
      ].join("\n"),
      labels: "bug",
    });
    void onOpenUrl(`https://github.com/mehdiraized/npmax/issues/new?${params.toString()}`);
  }

  return (
    <aside className="nav">
      <div className="nav__scroll" style={{ overflow: "auto", flex: 1 }}>
        <section className="nav__section">
          <div className="nav__topActions" onMouseDown={onHeaderMouseDown}>
            <button
              type="button"
              className="nav__iconBtn"
              onClick={openBugReport}
              title="Report an issue on GitHub"
              aria-label="Report an issue on GitHub"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </button>
            <button
              type="button"
              className="nav__iconBtn"
              onClick={onOpenSettings}
              title="Open application settings"
              aria-label="Open application settings"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01A1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </button>
          </div>
        </section>

        <section className="nav__section">
          <button
            type="button"
            className={`nav__item ${homeActive ? "nav__item--active" : ""}`}
            onClick={onSelectHome}
          >
            <svg className="nav__itemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              {homeMode === "suggest" ? (
                <>
                  <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.8 5.7 20.8 8 13.6 2 9.2h7.6L12 2z" />
                </>
              ) : (
                <>
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </>
              )}
            </svg>
            <span>{homeMode === "suggest" ? "Suggest Apps" : "Installed Apps"}</span>
            <span className="nav__itemBadge">{homeMode === "suggest" ? "Web" : "System"}</span>
          </button>
          <button
            type="button"
            className={`nav__item ${active === "mcp" ? "nav__item--active" : ""}`}
            onClick={onSelectMcp}
          >
            <svg className="nav__itemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 6h8v4H8zM8 14h8v4H8z" />
              <path d="M12 10v4" />
              <path d="M6 8H4M6 16H4M20 8h-2M20 16h-2" strokeLinecap="round" />
            </svg>
            <span>MCP for AI</span>
            <span className="nav__itemBadge nav__itemBadge--new">NEW</span>
          </button>
        </section>

        <section className="nav__section">
          <div className="nav__secHeader">
            <span className="nav__secLabel">Projects</span>
            <button type="button" className="nav__secAdd" onClick={onAddProject} title="Add project">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {projects.length === 0 ? (
            <button type="button" className="nav__emptyAdd" onClick={onAddProject}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              Add your first project
            </button>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`nav__project ${active === `project_${project.id}` ? "nav__project--active" : ""}`}
              >
                <button
                  type="button"
                  className="nav__projectBtn"
                  onClick={() => onSelectProject(project.id)}
                >
                  <span className="nav__projectIcon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                    </svg>
                  </span>
                  <span className="nav__projectName">{project.name}</span>
                </button>
                <button
                  type="button"
                  className="nav__projectAction"
                  aria-label="Remove project"
                  onClick={() => onRemoveProject(project.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      {activePkgs.length > 0 ? (
        <div className={`nav__pkgs ${pkgsCollapsed ? "nav__pkgs--collapsed" : ""}`}>
          <button
            type="button"
            className="nav__pkgsToggle"
            onClick={togglePkgsCollapsed}
            aria-expanded={!pkgsCollapsed}
            aria-controls="nav-pkg-list"
          >
            <span className="nav__secLabel">Package Managers</span>
            <svg
              className="nav__pkgsChevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {!pkgsCollapsed ? (
            <div id="nav-pkg-list" className="nav__pkgList">
              {activePkgs.map(({ key, label, version, Icon }) => (
                <div key={key} className="nav__pkgRow">
                  <figure className="nav__pkgIcon">
                    <Icon />
                  </figure>
                  <span className="nav__pkgName">{label}</span>
                  <span className="nav__pkgVer" title={version}>
                    {version}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
