import { useEffect, useMemo, useState } from "react";
import type { InstalledApp } from "@npmax/types";
import { getFileIcon, openUrl } from "../lib/host";
import { startWindowDrag } from "../lib/drag";
import {
  cleanVersion,
  enrichAppsWithRemoteVersions,
  getInstalledAppsInventory,
} from "../lib/systemApps";

export function InstalledAppsView() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "updates" | "supported" | "unsupported">("updates");
  const [sortMode, setSortMode] = useState<"updates" | "name" | "installed">("updates");
  const [remoteChecksPending, setRemoteChecksPending] = useState(0);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [issuesDone, setIssuesDone] = useState<{ type: string; count: number } | null>(null);

  const summary = useMemo(
    () => ({
      total: apps.length,
      updates: apps.filter((a) => a.updateAvailable).length,
      supported: apps.filter((a) => a.catalogId).length,
      unmatched: apps.filter((a) => !a.catalogId).length,
    }),
    [apps],
  );

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((app) => {
        if (filter === "updates" && !app.updateAvailable) return false;
        if (filter === "supported" && !app.catalogId) return false;
        if (filter === "unsupported" && app.catalogId) return false;
        if (!q) return true;
        return [app.name, app.version, app.latestVersion, app.source, app.publisher]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name);
        if (sortMode === "installed") return (b.version ? 1 : 0) - (a.version ? 1 : 0);
        if (a.updateAvailable !== b.updateAvailable) return a.updateAvailable ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [apps, filter, query, sortMode]);

  async function loadApps({ silent = true } = {}) {
    setError("");
    setRemoteChecksPending(0);
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const inventory = await getInstalledAppsInventory();
      setApps(inventory);
      setLastScannedAt(new Date().toISOString());
      void loadIcons(inventory);
      const candidates = inventory.filter((a) => !a.updateAvailable && a.catalogId && a.version);
      setRemoteChecksPending(candidates.length);
      await enrichAppsWithRemoteVersions(inventory, (id, payload) => {
        setRemoteChecksPending((n) => Math.max(0, n - 1));
        if (!payload) return;
        setApps((prev) =>
          prev.map((app) => (app.id === id ? { ...app, ...payload } : app)),
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan installed apps.");
      setRemoteChecksPending(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadIcons(list: InstalledApp[]) {
    const missing = list.filter((app) => app.path && !(app.id in icons));
    const BATCH = 6;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (app) => {
          try {
            const dataUrl = await getFileIcon(app.path!);
            return dataUrl ? ([app.id, dataUrl] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      const updates: Record<string, string> = {};
      for (const row of results) {
        if (row) updates[row[0]] = row[1];
      }
      if (Object.keys(updates).length > 0) {
        setIcons((prev) => ({ ...prev, ...updates }));
      }
    }
  }

  useEffect(() => {
    void loadApps({ silent: false });
  }, []);

  function displayVersion(value?: string | null) {
    return cleanVersion(value) || "—";
  }

  function formatTime(value: string | null) {
    if (!value) return "Not scanned yet";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function sourceLabel(app: InstalledApp) {
    const map: Record<string, string> = {
      "brew-cask": "Homebrew",
      winget: "winget",
      flatpak: "Flatpak",
      snap: "Snap",
      registry: "Registry",
      "desktop-entry": ".desktop",
      apple: "Apple",
      identified_developer: "Developer",
      mac_app_store: "App Store",
      system: "System",
    };
    return map[app.source || ""] || app.source || "System";
  }

  function publisherLabel(value?: string | null) {
    if (!value) return "";
    const map: Record<string, string> = {
      identified_developer: "Developer",
      mac_app_store: "App Store",
      apple: "Apple",
    };
    return map[value] || value;
  }

  function openCatalogIssue() {
    const unmatched = apps.filter((a) => !a.catalogId);
    if (unmatched.length === 0) return;
    const body = [
      "## Summary",
      `The installed apps scanner found **${unmatched.length}** app(s) that are not yet in the catalog.`,
      "",
      "## Apps",
      ...unmatched.map(
        (app, index) =>
          `${index + 1}. **${app.name}**\n   - Installed version: ${app.version || "Unknown"}\n   - Path: ${app.path || "Unknown"}\n   - Source: ${app.source || "system"}`,
      ),
      "",
      "---",
      "*Auto-generated by npMax installed apps scanner*",
    ].join("\n");
    const params = new URLSearchParams({
      title: `[App Catalog] Add support for ${unmatched.length} unmatched app${unmatched.length === 1 ? "" : "s"}`,
      body,
      labels: "app-catalog",
    });
    void openUrl(`https://github.com/mehdiraized/npmax/issues/new?${params.toString()}`);
    setIssuesDone({ type: "catalog", count: unmatched.length });
  }

  function reportApp(app: InstalledApp) {
    const body = [
      "## App Details",
      `- Name: ${app.name}`,
      `- Installed version: ${app.version || "Unknown"}`,
      `- Path: ${app.path || "Unknown"}`,
      `- Source: ${app.source || "system"}`,
      "",
      "Please add this app to the catalog.",
    ].join("\n");
    const params = new URLSearchParams({
      title: `[App Catalog] Add support for "${app.name}"`,
      body,
      labels: "app-catalog",
    });
    void openUrl(`https://github.com/mehdiraized/npmax/issues/new?${params.toString()}`);
  }

  return (
    <div className="view">
      <header className="hdr" onMouseDown={startWindowDrag}>
        <div>
          <h1 className="hdr__title">Installed Apps</h1>
        </div>
        <div className="hdr__right">
          {lastScannedAt ? <span className="hdr__time">Scanned {formatTime(lastScannedAt)}</span> : null}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadApps({ silent: true })}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? (
              <>
                <span className="spin" /> Scanning…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="search-wrap">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-wrap__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search app, version, source…"
          />
        </div>
        <div className="toolbar__right">
          <select
            className="select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
          >
            <option value="updates">Updates first</option>
            <option value="name">A → Z</option>
            <option value="installed">Installed version</option>
          </select>
          {filter === "unsupported" && summary.unmatched > 0 ? (
            <button type="button" className="btn btn--accent" onClick={openCatalogIssue}>
              Open GitHub issue for {summary.unmatched}
            </button>
          ) : null}
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ["all", "All", summary.total, false],
            ["updates", "Updates", summary.updates, true],
            ["supported", "In Catalog", summary.supported, false],
            ["unsupported", "Unmatched", summary.unmatched, false],
          ] as const
        ).map(([id, label, count, blue]) => (
          <button
            key={id}
            type="button"
            className={`tab ${filter === id ? "tab--active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
            {count > 0 || id === "all" ? (
              <span className={`tab__badge ${blue && count > 0 ? "tab__badge--blue" : ""}`}>{count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {issuesDone ? (
        <div className="result-banner">
          <span>
            GitHub issue page opened with {issuesDone.count} unmatched app
            {issuesDone.count === 1 ? "" : "s"} pre-filled. Just review and click submit.
          </span>
          <button type="button" className="btn btn--ghost" onClick={() => setIssuesDone(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="body">
        {error ? (
          <div className="notice notice--error">{error}</div>
        ) : loading ? (
          <div className="notice">
            <span className="spin spin--lg" />
            Scanning installed apps across this machine…
          </div>
        ) : (
          <>
            <div className="body__bar">
              {remoteChecksPending > 0 ? (
                <span className="body__pending">
                  <span className="spin" />
                  Checking {remoteChecksPending} catalog sources…
                </span>
              ) : null}
            </div>
            <div className="grid">
              {filteredApps.length === 0 ? (
                <div className="grid__empty">
                  {filter === "updates" ? <p>All apps are up to date</p> : <p>No apps matched this filter</p>}
                </div>
              ) : (
                filteredApps.map((app) => (
                  <article
                    key={app.id}
                    className={`card ${app.updateAvailable ? "card--outdated" : ""}`}
                  >
                    <div className="card__head">
                      <div className="card__icon">
                        {icons[app.id] ? (
                          <img src={icons[app.id]} alt="" width={32} height={32} />
                        ) : (
                          <span className="card__iconFallback" aria-hidden title={app.name}>
                            {(app.name.trim().charAt(0) || "?").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="card__meta">
                        <h3 className="card__name">{app.name}</h3>
                        <span className="card__source">{sourceLabel(app)}</span>
                      </div>
                      {app.updateAvailable ? (
                        <span className="badge badge--blue">Update</span>
                      ) : app.status === "current" ? (
                        <span className="badge badge--dim">Current</span>
                      ) : null}
                    </div>

                    <div className="card__vers">
                      <div className="card__ver">
                        <span>Installed</span>
                        <strong>{displayVersion(app.version)}</strong>
                      </div>
                      <div className="card__verSep" />
                      <div className="card__ver card__ver--r">
                        <span>Latest</span>
                        <strong className={app.updateAvailable ? "card__ver__new" : undefined}>
                          {app.latestVersion
                            ? displayVersion(app.latestVersion)
                            : remoteChecksPending > 0 && app.catalogId
                              ? "…"
                              : "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="card__foot">
                      <div className="card__footRow">
                        <div className="card__tags">
                          {app.catalogId ? <span className="tag tag--blue">catalog</span> : null}
                          {app.publisher ? <span className="tag">{publisherLabel(app.publisher)}</span> : null}
                          {!app.catalogId ? (
                            <button type="button" className="tag tag--action" onClick={() => reportApp(app)}>
                              Suggest app
                            </button>
                          ) : null}
                        </div>
                        {app.updateUrl || app.website ? (
                          <button
                            type="button"
                            className="card__link"
                            onClick={() => void openUrl(app.updateUrl || app.website || "")}
                          >
                            ↗
                          </button>
                        ) : null}
                      </div>
                      {app.updateCommand ? <code className="card__cmd">{app.updateCommand}</code> : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
