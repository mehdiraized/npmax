import { useEffect, useMemo, useState } from "react";
import { compareSemver, getLatestVersion } from "@npmax/core";
import type { Ecosystem } from "@npmax/types";
import { PKG_ICONS } from "@npmax/app-shell";
import { scanGlobalPackages, type GlobalPackage } from "../lib/host";
import { startWindowDrag } from "../lib/drag";

type PackageRow = GlobalPackage & {
  latest?: string;
  status: "checking" | "current" | "update" | "unknown";
};

const REGISTRIES: Record<string, Ecosystem | undefined> = {
  npm: "npm",
  yarn: "npm",
  pnpm: "npm",
  composer: "composer",
  cargo: "rust",
  bundler: "ruby",
  flutter: "flutter",
};

function updateCommand(manager: string, name: string, latest: string) {
  switch (manager) {
    case "npm": return `npm install --global ${name}@${latest}`;
    case "yarn": return `yarn global add ${name}@${latest}`;
    case "pnpm": return `pnpm add --global ${name}@${latest}`;
    case "composer": return `composer global require ${name}:${latest}`;
    case "cargo": return `cargo install ${name} --version ${latest} --force`;
    case "bundler": return `gem update ${name}`;
    case "flutter": return `flutter pub global activate ${name} ${latest}`;
    default: return "";
  }
}

export function GlobalPackagesView({ manager }: { manager: string }) {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const Icon = PKG_ICONS[manager];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMessage("");
    setRows([]);

    void (async () => {
      try {
        const result = await scanGlobalPackages(manager);
        if (cancelled) return;
        setMessage(result.message || "");
        if (!result.supported || result.packages.length === 0) return;

        const initial = result.packages.map((pkg) => ({ ...pkg, status: "checking" as const }));
        setRows(initial);
        const ecosystem = REGISTRIES[manager];
        if (!ecosystem) return;

        for (let i = 0; i < initial.length; i += 6) {
          const batch = await Promise.all(initial.slice(i, i + 6).map(async (pkg) => {
            try {
              const latest = await getLatestVersion(ecosystem, pkg.name);
              return {
                ...pkg,
                latest,
                status: compareSemver(pkg.version, latest) < 0 ? "update" as const : "current" as const,
              };
            } catch {
              return { ...pkg, status: "unknown" as const };
            }
          }));
          if (cancelled) return;
          const byName = new Map(batch.map((pkg) => [pkg.name, pkg]));
          setRows((prev) => prev.map((pkg) => byName.get(pkg.name) || pkg));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not scan global packages.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [manager]);

  const summary = useMemo(() => ({
    updates: rows.filter((pkg) => pkg.status === "update").length,
    checking: rows.filter((pkg) => pkg.status === "checking").length,
  }), [rows]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Number(b.status === "update") - Number(a.status === "update") || a.name.localeCompare(b.name)),
    [rows],
  );

  async function copyUpdate(pkg: PackageRow) {
    if (!pkg.latest) return;
    try {
      await navigator.clipboard.writeText(updateCommand(manager, pkg.name, pkg.latest));
      setToast(`Update command copied — paste it into your terminal to update ${pkg.name}.`);
    } catch {
      setToast("Could not copy the update command.");
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="view globalPkgsView">
      <header className="hdr" onMouseDown={startWindowDrag}>
        <div className="globalPkgsView__title">
          {Icon ? <span className="globalPkgsView__icon"><Icon /></span> : null}
          <div>
            <h1 className="hdr__title">{manager} global packages</h1>
            <p className="globalPkgsView__subtitle">Packages installed globally by {manager}</p>
          </div>
        </div>
        {rows.length > 0 ? (
          <div className="hdr__right">
            {summary.checking > 0 ? <span className="stat stat--loading"><span className="spin" /> Checking {summary.checking}…</span> : null}
            {summary.updates > 0 ? <span className="stat stat--warn">{summary.updates} updates</span> : <span className="stat stat--ok">Up to date</span>}
            <span className="stat stat--total">{rows.length} packages</span>
          </div>
        ) : null}
      </header>

      <div className="body globalPkgsView__body">
        {error ? <div className="notice notice--error">{error}</div> : null}
        {loading ? <div className="notice"><span className="spin spin--lg" /> Scanning globally installed packages…</div> : null}
        {!loading && !error && (message || rows.length === 0) ? (
          <div className="grid__empty"><p>{message || "No global packages are installed."}</p></div>
        ) : null}
        {rows.length > 0 ? (
          <div className="globalPkgList">
            {sortedRows.map((pkg) => (
              <article key={pkg.name} className={`globalPkg ${pkg.status === "update" ? "globalPkg--update" : ""}`}>
                <div className="globalPkg__name">{pkg.name}</div>
                <div className="globalPkg__versions">
                  <span className="globalPkg__installed">Installed {pkg.version}</span>
                  {pkg.status === "checking" ? <span className="globalPkg__checking"><span className="spin" /> Checking…</span> : null}
                  {pkg.status === "current" ? <span className="globalPkg__current">Up to date</span> : null}
                  {pkg.status === "unknown" ? <span className="globalPkg__unknown">Version unavailable</span> : null}
                  {pkg.status === "update" && pkg.latest ? (
                    <button type="button" className="globalPkg__latest" onClick={() => void copyUpdate(pkg)} title="Copy update command">
                      {pkg.latest}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
      {toast ? <div className="updateToast">{toast}</div> : null}
    </div>
  );
}
