import { useEffect, useMemo, useState } from "react";
import type { Project } from "@npmax/types";
import { getLatestVersion, stripVersionPrefix } from "@npmax/core";
import { applyVersionUpdate } from "@npmax/core";
import { openUrl, tauriHost } from "../lib/host";
import { startWindowDrag } from "../lib/drag";

type Info = { status: "loading" | "fetched" | "error"; version?: string; homepage?: string };

export function PackageEditor({
  project,
  rawJson,
  onRefresh,
}: {
  project: Project;
  rawJson: string;
  onRefresh: (next: string) => void;
}) {
  const pkg = useMemo(() => {
    try {
      return JSON.parse(rawJson) as {
        name?: string;
        version?: string;
        description?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
    } catch {
      return {};
    }
  }, [rawJson]);

  const [infoMap, setInfoMap] = useState<Record<string, Info>>({});
  const [lockStatus, setLockStatus] = useState<"ok" | "stale" | "missing">("ok");
  const [installing, setInstalling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    const initial: Record<string, Info> = {};
    for (const n of names) initial[n] = { status: "loading" };
    setInfoMap(initial);

    let cancelled = false;
    void (async () => {
      for (const name of names) {
        try {
          const version = await getLatestVersion("npm", name);
          if (cancelled) return;
          setInfoMap((prev) => ({ ...prev, [name]: { status: "fetched", version } }));
        } catch {
          if (cancelled) return;
          setInfoMap((prev) => ({ ...prev, [name]: { status: "error" } }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawJson]);

  useEffect(() => {
    void (async () => {
      const entries = await tauriHost.readdir!(project.path);
      if (entries.includes("pnpm-lock.yaml") || entries.includes("yarn.lock") || entries.includes("package-lock.json")) {
        setLockStatus("ok");
      } else {
        setLockStatus("missing");
      }
    })();
  }, [project.path, rawJson]);

  function getStatus(name: string, currentRaw: string) {
    const info = infoMap[name];
    if (!info || info.status === "loading") return "loading";
    if (info.status === "error" || !info.version) return "error";
    const current = stripVersionPrefix(currentRaw);
    return current === stripVersionPrefix(info.version) ? "ok" : "update";
  }

  async function handleUpdate(name: string, latest: string, isDev: boolean) {
    const dep = {
      id: name,
      name,
      version: (isDev ? pkg.devDependencies?.[name] : pkg.dependencies?.[name]) || "",
      rawRequirement: (isDev ? pkg.devDependencies?.[name] : pkg.dependencies?.[name]) || "",
      isDev,
    };
    const next = applyVersionUpdate("npm", rawJson, dep, latest);
    if (!next) return;
    await tauriHost.writeFile(`${project.path}/package.json`, next);
    onRefresh(next);
    setToast(`Updated ${name} → ${latest}`);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      const entries = await tauriHost.readdir!(project.path);
      const cmd = entries.includes("pnpm-lock.yaml")
        ? "pnpm"
        : entries.includes("yarn.lock")
          ? "yarn"
          : "npm";
      const args = cmd === "yarn" ? ["install"] : ["install"];
      await tauriHost.exec(cmd, args, { cwd: project.path, timeoutMs: 120000 });
      setLockStatus("ok");
      setToast("Install complete");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  const stats = useMemo(() => {
    let total = 0;
    let outdated = 0;
    let loading = 0;
    for (const [name, raw] of Object.entries(pkg.dependencies ?? {})) {
      total++;
      const s = getStatus(name, raw);
      if (s === "loading") loading++;
      if (s === "update") outdated++;
    }
    for (const [name, raw] of Object.entries(pkg.devDependencies ?? {})) {
      total++;
      const s = getStatus(name, raw);
      if (s === "loading") loading++;
      if (s === "update") outdated++;
    }
    return { total, outdated, loading };
  }, [pkg, infoMap]);

  function renderDepSection(
    section: "dependencies" | "devDependencies",
    entries: Record<string, string> | undefined,
    isDev: boolean,
  ) {
    if (!entries || Object.keys(entries).length === 0) return null;
    const list = Object.entries(entries);
    return (
      <>
        <div className="line">
          <span className="tok-section">&nbsp;&nbsp;"{section}"</span>
          <span className="tok-colon">: </span>
          <span className="tok-brace">{"{"}</span>
        </div>
        {list.map(([name, ver], i) => {
          const status = getStatus(name, ver);
          const latest = infoMap[name]?.version;
          return (
            <div className="line pkg-line" key={`${section}:${name}`}>
              <button type="button" className="pkg-name tok-pkg" onClick={() => void openUrl(`https://www.npmjs.com/package/${name}`)}>
                &nbsp;&nbsp;&nbsp;&nbsp;"{name}"
              </button>
              <span className="tok-colon">: </span>
              <span className={`tok-ver ${isDev ? "tok-ver--dev" : ""}`}>"{ver}"</span>
              {i < list.length - 1 ? <span className="tok-comma">,</span> : null}
              <span className="pkg-status">
                {status === "loading" ? (
                  <span className="badge badge--loading">
                    <span className="spin-sm" />
                  </span>
                ) : status === "update" && latest ? (
                  <button type="button" className="badge badge--update" onClick={() => void handleUpdate(name, latest, isDev)}>
                    ↑ {latest}
                  </button>
                ) : status === "ok" ? (
                  <span className="badge badge--ok" style={{ color: "rgba(52,199,89,.85)" }}>✓</span>
                ) : (
                  <span className="badge badge--error">✕</span>
                )}
                <a className="link-icon" href={`https://www.npmjs.com/package/${name}`} title="npm" onClick={(e) => { e.preventDefault(); void openUrl(`https://www.npmjs.com/package/${name}`); }}>
                  npm
                </a>
              </span>
            </div>
          );
        })}
        <div className="line">
          <span className="tok-brace">&nbsp;&nbsp;{"}"}</span>
          {section === "dependencies" ? <span className="tok-comma">,</span> : null}
        </div>
      </>
    );
  }

  return (
    <div className="editor">
      <div className="editor__meta" onMouseDown={startWindowDrag}>
        <div className="editor__metaLeft">
          <span className="meta__filename">package.json</span>
          {pkg.name ? (
            <>
              <span className="meta__dot">·</span>
              <span className="meta__name">{pkg.name}</span>
            </>
          ) : null}
          {pkg.version ? <span className="meta__version">v{pkg.version}</span> : null}
        </div>
        <div className="editor__metaRight">
          {lockStatus === "stale" || lockStatus === "missing" ? (
            <button type="button" className="install-btn" onClick={() => void handleInstall()} disabled={installing}>
              {installing ? (
                <>
                  <span className="spin" /> Installing…
                </>
              ) : (
                <>{lockStatus === "missing" ? "Install" : "Sync"}</>
              )}
            </button>
          ) : null}
          {stats.loading > 0 ? (
            <span className="stat stat--loading">
              <span className="spin" /> Checking {stats.loading}…
            </span>
          ) : stats.outdated > 0 ? (
            <span className="stat stat--warn">{stats.outdated} outdated</span>
          ) : (
            <span className="stat stat--ok">All up to date</span>
          )}
          <span className="stat stat--total">{stats.total} packages</span>
        </div>
      </div>

      <div className="editor__body">
        <div className="code">
          <div className="line">
            <span className="tok-brace">{"{"}</span>
          </div>
          {pkg.name ? (
            <div className="line">
              <span className="tok-key">&nbsp;&nbsp;"name"</span>
              <span className="tok-colon">: </span>
              <span className="tok-str">"{pkg.name}"</span>
              <span className="tok-comma">,</span>
            </div>
          ) : null}
          {pkg.version ? (
            <div className="line">
              <span className="tok-key">&nbsp;&nbsp;"version"</span>
              <span className="tok-colon">: </span>
              <span className="tok-str">"{pkg.version}"</span>
              <span className="tok-comma">,</span>
            </div>
          ) : null}
          {renderDepSection("dependencies", pkg.dependencies, false)}
          {renderDepSection("devDependencies", pkg.devDependencies, true)}
          <div className="line">
            <span className="tok-brace">{"}"}</span>
          </div>
        </div>
      </div>
      {toast ? (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(20,24,32,.95)", border: "1px solid rgba(255,255,255,.12)", padding: "10px 16px", borderRadius: 12, zIndex: 80 }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
