import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  applyVersionUpdate,
  parseManifest,
  stripVersionPrefix,
} from "@npmax/core";
import type { Ecosystem, PackageDetails, ParsedDependency } from "@npmax/types";
import { PackageDetailsModal } from "@npmax/ui";
import type { PackageEditorAdapter } from "./types.js";
import {
  buildDepKey,
  isDepLatestStale,
  loadDepLatestCache,
  saveDepLatestResult,
} from "./versionCache.js";

type Info = { status: "loading" | "fetched" | "error"; version?: string };

function registryUrl(ecosystem: Ecosystem, name: string): string {
  switch (ecosystem) {
    case "npm":
      return `https://www.npmjs.com/package/${name}`;
    case "composer":
      return `https://packagist.org/packages/${name}`;
    case "flutter":
      return `https://pub.dev/packages/${name}`;
    case "go":
      return `https://pkg.go.dev/${name}`;
    case "rust":
      return `https://crates.io/crates/${name}`;
    case "ruby":
      return `https://rubygems.org/gems/${name}`;
    case "android":
      return `https://search.maven.org/search?q=${encodeURIComponent(name)}`;
    case "cocoapods":
      return `https://cocoapods.org/pods/${name}`;
    case "swift":
      return `https://swiftpackageindex.com/${name}`;
    default:
      return "#";
  }
}

export function PackageEditor({
  projectName,
  fileName,
  rawJson,
  onRefresh,
  adapter,
  onHeaderMouseDown,
}: {
  projectName: string;
  fileName: string;
  rawJson: string;
  onRefresh: (next: string) => void;
  adapter: PackageEditorAdapter;
  onHeaderMouseDown?: (e: MouseEvent) => void;
}) {
  const parsed = useMemo(() => {
    try {
      return parseManifest(fileName || "package.json", rawJson);
    } catch {
      return null;
    }
  }, [fileName, rawJson]);

  const ecosystem = parsed?.ecosystem ?? "npm";
  const deps = parsed?.dependencies ?? [];

  const [infoMap, setInfoMap] = useState<Record<string, Info>>({});
  const [installing, setInstalling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [details, setDetails] = useState<PackageDetails | null>(null);
  const [detailsName, setDetailsName] = useState("");
  const [detailsCurrent, setDetailsCurrent] = useState<string | null>(null);
  const lockStatus = adapter.lockStatus ?? "ok";
  const [latestUpdateInFlight, setLatestUpdateInFlight] = useState(false);

  const fetchLatest = adapter.fetchLatest;
  const fetchDetails = adapter.fetchDetails;

  const depKey = useMemo(
    () => deps.map((d) => `${d.id}:${d.rawRequirement}`).join("|"),
    [deps],
  );

  useEffect(() => {
    const list = parsed?.dependencies ?? [];
    const cache = loadDepLatestCache();

    const initial: Record<string, Info> = {};
    const toFetch: ParsedDependency[] = [];

    for (const dep of list) {
      const depCacheKey = buildDepKey(ecosystem, dep);
      const cached = cache?.byDepKey?.[depCacheKey];
      if (cached && !isDepLatestStale(cached.fetchedAt)) {
        initial[dep.id] = { status: "fetched", version: cached.version };
      } else {
        initial[dep.id] = { status: "loading" };
        toFetch.push(dep);
      }
    }

    setInfoMap(initial);
    setLatestUpdateInFlight(toFetch.length > 0);

    if (toFetch.length === 0) return;

    let cancelled = false;
    void (async () => {
      const next: Record<string, Info> = {};
      for (const dep of toFetch) {
        try {
          const meta = ecosystem === "swift" ? { repositoryUrl: dep.repositoryUrl } : undefined;
          const version = await fetchLatest(ecosystem, dep.name, meta);
          if (cancelled) return;

          const depCacheKey = buildDepKey(ecosystem, dep);
          saveDepLatestResult(depCacheKey, version);

          next[dep.id] = { status: "fetched", version };
        } catch {
          if (cancelled) return;
          next[dep.id] = { status: "error" };
        }
      }

      if (cancelled) return;

      setInfoMap((prev) => {
        const updated = { ...prev };
        for (const dep of toFetch) {
          const info = next[dep.id];
          if (info) updated[dep.id] = info;
        }
        return updated;
      });
      setLatestUpdateInFlight(false);
    })();

    return () => {
      cancelled = true;
      setLatestUpdateInFlight(false);
    };
  }, [rawJson, fetchLatest, ecosystem, depKey, parsed?.dependencies]);

  function getStatus(dep: ParsedDependency) {
    const info = infoMap[dep.id];
    if (!info || info.status === "loading") return "loading";
    if (info.status === "error" || !info.version) return "error";
    const current = stripVersionPrefix(dep.rawRequirement || dep.version);
    return current === stripVersionPrefix(info.version) ? "ok" : "update";
  }

  async function handleUpdate(dep: ParsedDependency, latest: string) {
    const next = applyVersionUpdate(ecosystem, rawJson, dep, latest);
    if (!next) {
      setToast("Unable to update this dependency in-place");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    await adapter.persistManifest(next);
    onRefresh(next);
    setToast(`Updated ${dep.name} → ${latest}`);
    setTimeout(() => setToast(null), 2500);
  }

  async function openPackageDetails(dep: ParsedDependency) {
    setDetailsName(dep.name);
    setDetailsCurrent(dep.rawRequirement || dep.version);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    setDetails(null);
    try {
      if (fetchDetails) {
        const meta = ecosystem === "swift" ? { repositoryUrl: dep.repositoryUrl } : undefined;
        setDetails(await fetchDetails(ecosystem, dep.name, meta));
      } else {
        await adapter.openUrl(registryUrl(ecosystem, dep.name));
        setDetailsOpen(false);
      }
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Failed to load package details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleInstall() {
    if (!adapter.install) return;
    setInstalling(true);
    try {
      await adapter.install();
      setToast("Install complete");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  function downloadManifest() {
    const blob = new Blob([rawJson], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "manifest";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyManifest() {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(null), 2000);
    }
  }

  const sections = useMemo(() => {
    const map = new Map<string, ParsedDependency[]>();
    for (const dep of deps) {
      const key = dep.section || (dep.isDev ? "dev" : "dependencies");
      const list = map.get(key) ?? [];
      list.push(dep);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [deps]);

  const stats = useMemo(() => {
    let total = 0;
    let outdated = 0;
    let loading = 0;
    for (const dep of deps) {
      total++;
      const s = getStatus(dep);
      if (s === "loading") loading++;
      if (s === "update") outdated++;
    }
    return { total, outdated, loading };
  }, [deps, infoMap]);

  if (!parsed) {
    return (
      <div className="editor">
        <div className="notice notice--error" style={{ margin: 24 }}>
          Unable to parse {fileName || "manifest"}
        </div>
      </div>
    );
  }

  return (
    <div className="editor">
      <div className="editor__meta" onMouseDown={onHeaderMouseDown}>
        <div className="editor__metaLeft">
          <span className="meta__filename">{fileName || parsed.fileName}</span>
          <span className="meta__dot">·</span>
          <span className="meta__name">{projectName}</span>
          <span className="meta__dot">·</span>
          <span className="meta__name">{ecosystem}</span>
        </div>
        <div className="editor__metaRight">
          {adapter.mode === "web" ? (
            <>
              <button type="button" className="install-btn" onClick={() => void copyManifest()}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className="install-btn" onClick={downloadManifest}>
                Download
              </button>
            </>
          ) : null}
          {adapter.mode === "desktop" && (lockStatus === "stale" || lockStatus === "missing") ? (
            <button
              type="button"
              className="install-btn"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
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
              <span className="spin" />{" "}
              {latestUpdateInFlight ? `Updating ${stats.loading}…` : `Checking ${stats.loading}…`}
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
          {sections.map(([section, list]) => (
            <div key={section} className="depSection">
              <div className="line">
                <span className="tok-section">{section}</span>
              </div>
              {list.map((dep) => {
                const status = getStatus(dep);
                const latest = infoMap[dep.id]?.version;
                return (
                  <div className="line pkg-line" key={dep.id}>
                    <button
                      type="button"
                      className="pkg-name tok-pkg"
                      onClick={() => void openPackageDetails(dep)}
                      title="View package details"
                    >
                      {dep.displayName || dep.name}
                    </button>
                    <span className="tok-colon"> </span>
                    <span className={`tok-ver ${dep.isDev ? "tok-ver--dev" : ""}`}>
                      {dep.rawRequirement || dep.version}
                    </span>
                    <span className="pkg-status">
                      {status === "loading" ? (
                        <span className="badge badge--loading">
                          <span className="spin-sm" />
                        </span>
                      ) : status === "update" && latest ? (
                        <button
                          type="button"
                          className="badge badge--update"
                          onClick={() => void handleUpdate(dep, latest)}
                        >
                          ↑ {latest}
                        </button>
                      ) : status === "ok" ? (
                        <span className="badge badge--ok" style={{ color: "rgba(52,199,89,.85)" }}>
                          ✓
                        </span>
                      ) : (
                        <span className="badge badge--error">✕</span>
                      )}
                      <a
                        className="link-icon"
                        href={registryUrl(ecosystem, dep.name)}
                        title="Open registry"
                        onClick={(e) => {
                          e.preventDefault();
                          void adapter.openUrl(registryUrl(ecosystem, dep.name));
                        }}
                      >
                        ↗
                      </a>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {deps.length === 0 ? (
            <div className="line">
              <span className="tok-key">No dependencies found</span>
            </div>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,24,32,.95)",
            border: "1px solid rgba(255,255,255,.12)",
            padding: "10px 16px",
            borderRadius: 12,
            zIndex: 80,
          }}
        >
          {toast}
        </div>
      ) : null}

      <PackageDetailsModal
        open={detailsOpen}
        detail={details}
        loading={detailsLoading}
        error={detailsError}
        requestedName={detailsName}
        currentVersion={detailsCurrent}
        onClose={() => setDetailsOpen(false)}
        onOpenUrl={adapter.openUrl}
      />
    </div>
  );
}
