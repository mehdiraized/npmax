import { useRef, useState, type MouseEvent } from "react";
import { detectFromFileName } from "@npmax/core";

const ACCEPT =
  ".json,.yaml,.yml,.toml,.swift,.gradle,.kts,package.json,composer.json,pubspec.yaml,go.mod,Cargo.toml,Gemfile,Podfile,Package.swift,libs.versions.toml,build.gradle,build.gradle.kts";

export function ManifestInbox({
  projectName,
  onManifest,
  onHeaderMouseDown,
}: {
  projectName: string;
  onManifest: (fileName: string, content: string) => void;
  onHeaderMouseDown?: (e: MouseEvent) => void;
}) {
  const [paste, setPaste] = useState("");
  const [pasteName, setPasteName] = useState("package.json");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function applyContent(fileName: string, content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Manifest is empty");
      return;
    }
    const detected = detectFromFileName(fileName);
    if (!detected) {
      setError(
        "Unsupported manifest. Try package.json, composer.json, pubspec.yaml, go.mod, Cargo.toml, Gemfile, Podfile, Package.swift, or Gradle files.",
      );
      return;
    }
    if (detected.ecosystem === "npm" || detected.ecosystem === "composer") {
      try {
        JSON.parse(trimmed);
      } catch {
        setError(`Invalid JSON — paste a valid ${detected.fileName}`);
        return;
      }
    }
    setError(null);
    onManifest(detected.fileName, trimmed);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    applyContent(file.name || "package.json", text);
  }

  return (
    <div className="view suggestView">
      <header className="hdr" onMouseDown={onHeaderMouseDown}>
        <div>
          <h1 className="hdr__title">{projectName}</h1>
          <p className="mcpView__lead">
            Upload or paste a supported manifest. Everything stays in this browser only.
          </p>
        </div>
      </header>

      <div className="suggestView__scroll">
        <section className="suggestCard">
          <h2 className="suggestCard__name">Upload manifest</h2>
          <p className="suggestCard__desc">
            Drop package.json, composer.json, pubspec.yaml, go.mod, Cargo.toml, Gemfile, Podfile,
            Package.swift, or Gradle files.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <div
            className="manifestDrop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            <button type="button" className="btn btn--accent" onClick={() => inputRef.current?.click()}>
              Choose file
            </button>
            <span className="manifestDrop__hint">or drag &amp; drop here</span>
          </div>
        </section>

        <section className="suggestCard">
          <h2 className="suggestCard__name">Paste manifest</h2>
          <label className="settingsGroup__label" htmlFor="paste-filename">
            Filename
          </label>
          <input
            id="paste-filename"
            className="npTextarea"
            style={{ minHeight: 40, marginBottom: 12 }}
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="package.json"
          />
          <textarea
            className="npTextarea"
            rows={12}
            placeholder="Paste manifest contents…"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <div className="suggestCard__actions">
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => applyContent(pasteName || "package.json", paste)}
            >
              Use pasted content
            </button>
          </div>
        </section>

        <section className="suggestCard suggestCard--disabled">
          <h2 className="suggestCard__name">
            Connect GitHub project{" "}
            <span className="nav__itemBadge">Coming soon</span>
          </h2>
          <p className="suggestCard__desc">
            Link a GitHub repo and we’ll read the manifest automatically. Disabled for now —
            choose Upload or Paste today.
          </p>
          <button type="button" className="btn btn--ghost" disabled>
            Connect GitHub
          </button>
        </section>

        {error ? <p className="notice notice--error">{error}</p> : null}
      </div>
    </div>
  );
}
