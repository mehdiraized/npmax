import { useCallback, useState } from "react";

export function ManifestDropzone({
  onManifest,
}: {
  onManifest: (fileName: string, content: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const readFile = useCallback(async (file: File) => {
    const content = await file.text();
    onManifest(file.name, content);
  }, [onManifest]);

  return (
    <div
      className={`np-dropzone ${dragging ? "drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void readFile(file);
      }}
    >
      <p>Drag & drop a manifest, or paste / upload</p>
      <div className="np-row" style={{ justifyContent: "center", marginTop: 12 }}>
        <label className="np-btn primary">
          Upload
          <input
            type="file"
            hidden
            accept=".json,.yaml,.yml,.toml,.gradle,.kts,.mod,.swift,Gemfile,Podfile"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        <button
          className="np-btn"
          type="button"
          onClick={async () => {
            const content = await navigator.clipboard.readText();
            const fileName = content.includes('"require"') ? "composer.json"
              : content.includes("dependencies") && content.includes("{") ? "package.json"
              : "package.json";
            onManifest(fileName, content);
          }}
        >
          Paste clipboard
        </button>
      </div>
      <p className="np-muted" style={{ marginTop: 12, fontSize: 13 }}>
        package.json, composer.json, Podfile, Package.swift, Gradle, pubspec.yaml, go.mod, Cargo.toml, Gemfile
      </p>
    </div>
  );
}
