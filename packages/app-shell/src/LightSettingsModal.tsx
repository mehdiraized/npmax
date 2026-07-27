import { useEffect } from "react";

export function LightSettingsModal({
  open,
  onClose,
  onClearData,
  onOpenUrl,
}: {
  open: boolean;
  onClose: () => void;
  onClearData: () => void;
  onOpenUrl: (url: string) => void | Promise<void>;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="settingsModal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settingsWindow" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="settingsTitlebar">
          <div />
          <div className="settingsTitle">Settings</div>
          <button type="button" className="settingsClose" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="settingsBody">
          <section className="settingsSection">
            <div className="settingsGroup">
              <div className="settingsGroup__label">Browser data</div>
              <div className="settingsCard settingsCard--stack">
                <div className="settingsAction">
                  <div>
                    <strong>Clear local projects</strong>
                    <p>Remove all projects and manifests stored in this browser.</p>
                  </div>
                  <button
                    type="button"
                    className="secondaryBtn"
                    onClick={() => {
                      onClearData();
                      onClose();
                    }}
                  >
                    Clear data
                  </button>
                </div>
              </div>
            </div>

            <div className="settingsGroup">
              <div className="settingsGroup__label">Links</div>
              <div className="settingsCard settingsCard--stack">
                <div className="settingsAction">
                  <div>
                    <strong>Desktop app</strong>
                    <p>Download npMax for macOS, Windows, and Linux.</p>
                  </div>
                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={() =>
                      void onOpenUrl("https://github.com/mehdiraized/npmax/releases/latest")
                    }
                  >
                    Download
                  </button>
                </div>
                <div className="settingsAction">
                  <div>
                    <strong>Docs</strong>
                    <p>Web vs desktop capabilities and MCP setup.</p>
                  </div>
                  <button type="button" className="secondaryBtn" onClick={() => void onOpenUrl("/docs")}>
                    Open docs
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
