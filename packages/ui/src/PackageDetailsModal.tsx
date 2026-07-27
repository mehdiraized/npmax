import { useEffect, useMemo, useState } from "react";
import type { PackageDetails, PackageStat } from "@npmax/types";

function formatValue(value: string | number | null | undefined, format?: PackageStat["format"]) {
  if (value == null || value === "") return "N/A";
  if (format === "number") return new Intl.NumberFormat().format(Number(value));
  if (format === "bytes") return formatBytes(Number(value));
  if (format === "date") return formatDate(String(value));
  return String(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "N/A";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = units[0]!;
  for (let i = 0; i < units.length; i++) {
    unit = units[i]!;
    if (value < 1024 || i === units.length - 1) break;
    value /= 1024;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

function iconForLink(type: string) {
  switch (type) {
    case "repository":
      return "repo";
    case "issues":
      return "issue";
    case "homepage":
      return "link";
    default:
      return "box";
  }
}

function displayVersion(value?: string) {
  if (!value) return "Unknown";
  return value === "manual" ? "Manual" : `v${value}`;
}

export function PackageDetailsModal({
  open,
  detail,
  loading,
  error,
  requestedName,
  currentVersion,
  onClose,
  onOpenUrl,
}: {
  open: boolean;
  detail: PackageDetails | null;
  loading: boolean;
  error: string;
  requestedName: string;
  currentVersion?: string | null;
  onClose: () => void;
  onOpenUrl?: (url: string) => void | Promise<void>;
}) {
  const [versionFilter, setVersionFilter] = useState("");

  useEffect(() => {
    setVersionFilter("");
  }, [requestedName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredVersions = useMemo(() => {
    const versions = detail?.versions ?? [];
    const filter = versionFilter.trim().toLowerCase();
    if (!filter) return versions;
    return versions.filter((entry) => entry.version.toLowerCase().includes(filter));
  }, [detail?.versions, versionFilter]);

  if (!open) return null;

  function openLink(url: string) {
    if (onOpenUrl) void onOpenUrl(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="pkgModal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="pkgModal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={detail?.name || requestedName}
      >
        <button type="button" className="pkgModal__close" onClick={onClose} aria-label="Close details">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {loading ? (
          <div className="pkgModal__state">
            <span className="spin" />
            <p>Loading package details for {requestedName}…</p>
          </div>
        ) : error ? (
          <div className="pkgModal__state pkgModal__state--error">
            <p>{error}</p>
          </div>
        ) : detail ? (
          <div className="pkgModal__layout">
            <section className="pkgHero">
              <div className="pkgHero__titleRow">
                <div>
                  <h2 className="pkgHero__title">{detail.name}</h2>
                  <div className="pkgHero__versionRow">
                    <span className="pkgHero__version">{displayVersion(detail.version)}</span>
                    {currentVersion ? (
                      <span className="pkgHero__current">Current: {currentVersion}</span>
                    ) : null}
                  </div>
                </div>
                <div className="pkgHero__actions">
                  {(detail.links ?? []).map((link) => (
                    <button
                      key={`${link.type}:${link.url}`}
                      type="button"
                      className="pkgAction"
                      onClick={() => openLink(link.url)}
                    >
                      <span className={`pkgAction__icon pkgAction__icon--${iconForLink(link.type)}`}>
                        {iconForLink(link.type) === "repo" ? (
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M6.5 9.5 3.5 12.5" />
                            <path d="M9.5 6.5 12.5 3.5" />
                            <path d="M5 3.5h7.5V11" />
                          </svg>
                        ) : iconForLink(link.type) === "issue" ? (
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <circle cx="8" cy="8" r="6.2" />
                            <path d="M8 4.8v3.4" />
                            <circle cx="8" cy="11.4" r=".7" fill="currentColor" stroke="none" />
                          </svg>
                        ) : iconForLink(link.type) === "link" ? (
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M6.5 9.5 9.5 6.5" />
                            <path d="M5.2 11a2.4 2.4 0 0 1 0-3.4l1.4-1.4a2.4 2.4 0 1 1 3.4 3.4L9.4 10" />
                            <path d="M10.8 5a2.4 2.4 0 0 1 0 3.4l-1.4 1.4A2.4 2.4 0 0 1 6 6.4l.6-.6" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M2.5 5.5h11v5h-11z" />
                            <path d="M5 5.5V4h6v1.5" />
                          </svg>
                        )}
                      </span>
                      <span>{link.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {detail.badges?.length ? (
                <div className="pkgHero__badges">
                  {detail.badges.map((badge) => (
                    <span className="pkgBadge" key={badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              {detail.description ? <p className="pkgHero__description">{detail.description}</p> : null}

              {detail.stats?.length ? (
                <div className="pkgStats">
                  {detail.stats.map((stat) => (
                    <div className="pkgStatCard" key={stat.label}>
                      <span className="pkgStatCard__label">{stat.label}</span>
                      <strong className="pkgStatCard__value">
                        {formatValue(stat.value, stat.format)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : null}

              {detail.install ? (
                <div className="pkgInstall">
                  <div className="pkgInstall__header">
                    <span>Get Started</span>
                    <span className="pkgInstall__tool">{detail.install.label}</span>
                  </div>
                  <div className="pkgInstall__body">
                    {detail.install.lines.map((line) => (
                      <div className="pkgInstall__line" key={line}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="pkgSidebar">
              {detail.downloads ? (
                <section className="pkgSidebarCard">
                  <div className="pkgSidebarCard__eyebrow">{detail.downloads.label}</div>
                  <div className="pkgSidebarCard__value">
                    {formatValue(detail.downloads.value, detail.downloads.format || "number")}
                  </div>
                  {detail.downloads.start && detail.downloads.end ? (
                    <div className="pkgSidebarCard__meta">
                      {detail.downloads.start} to {detail.downloads.end}
                    </div>
                  ) : detail.downloads.total || detail.downloads.daily ? (
                    <div className="pkgSidebarCard__meta">
                      {detail.downloads.daily
                        ? `Daily ${formatValue(detail.downloads.daily, "number")}`
                        : null}
                      {detail.downloads.total
                        ? `${detail.downloads.daily ? " · " : ""}Total ${formatValue(detail.downloads.total, "number")}`
                        : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {detail.compatibility?.length ? (
                <section className="pkgSidebarCard">
                  <div className="pkgSidebarCard__eyebrow">Compatibility</div>
                  <div className="pkgCompatibility">
                    {detail.compatibility.map((item) => (
                      <div className="pkgCompatibility__row" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="pkgSidebarCard pkgSidebarCard--versions">
                <div className="pkgSidebarCard__eyebrow">Versions</div>
                <input
                  className="pkgVersionFilter"
                  type="text"
                  placeholder="Filter versions"
                  value={versionFilter}
                  onChange={(e) => setVersionFilter(e.target.value)}
                />
                <div className="pkgVersions">
                  {filteredVersions.map((version) => (
                    <div
                      key={version.version}
                      className={`pkgVersionItem${version.isLatest ? " pkgVersionItem--latest" : ""}`}
                    >
                      <div className="pkgVersionItem__main">
                        <div className="pkgVersionItem__name">{version.version}</div>
                        {version.labels?.length ? (
                          <div className="pkgVersionItem__labels">
                            {version.labels.map((label) => (
                              <span
                                key={label}
                                className={`pkgVersionLabel${label === "latest" ? " pkgVersionLabel--latest" : ""}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="pkgVersionItem__date">
                        {version.date ? formatDate(version.date) : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
