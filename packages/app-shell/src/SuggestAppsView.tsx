import type { SuggestedApp } from "@npmax/types";
import type { MouseEvent } from "react";
import { SUGGESTED_APPS } from "./suggestedApps.js";

export function SuggestAppsView({
  apps = SUGGESTED_APPS,
  onOpenUrl,
  onHeaderMouseDown,
}: {
  apps?: readonly SuggestedApp[];
  onOpenUrl: (url: string) => void | Promise<void>;
  onHeaderMouseDown?: (e: MouseEvent) => void;
}) {
  return (
    <div className="view suggestView">
      <header className="hdr" onMouseDown={onHeaderMouseDown}>
        <div>
          <h1 className="hdr__title">Suggest Apps</h1>
          <p className="mcpView__lead">
            Apps we recommend alongside npMax — curated by the same team. More picks coming soon.
          </p>
        </div>
      </header>

      <div className="suggestView__scroll">
        {apps.map((app) => (
          <article key={app.id} className="suggestCard">
            <div className="suggestCard__top">
              <div className="suggestCard__icon" aria-hidden>
                ∞
              </div>
              <div>
                <div className="suggestCard__titleRow">
                  <h2 className="suggestCard__name">{app.name}</h2>
                  {app.badge ? <span className="nav__itemBadge">{app.badge}</span> : null}
                </div>
                <p className="suggestCard__tagline">{app.tagline}</p>
              </div>
            </div>
            <p className="suggestCard__desc">{app.description}</p>
            <div className="suggestCard__actions">
              <button
                type="button"
                className="btn btn--accent"
                onClick={() => void onOpenUrl(app.url)}
              >
                Open website
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
