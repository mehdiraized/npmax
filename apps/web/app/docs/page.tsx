export default function DocsPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 24,
        color: "#e8eef7",
        fontFamily: "IBM Plex Sans, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1>npMax 3 — Web vs Desktop</h1>
      <ul>
        <li>
          <strong>Web</strong> (<code>/app</code>): Suggest Apps home, MCP setup, browser-local
          projects (upload/paste package.json), Copy &amp; Download patched manifests. Data stays in
          your browser localStorage.
        </li>
        <li>
          <strong>Desktop</strong>: open real project folders, rewrite manifests on disk, run
          install/sync, scan Installed Apps.
        </li>
        <li>
          <strong>MCP</strong>: agents call the same analyze/advisory tools from Cursor / Claude.
        </li>
      </ul>
      <p>
        <a href="/" style={{ color: "#60a5fa" }}>
          ← Landing
        </a>
        {" · "}
        <a href="/app" style={{ color: "#60a5fa" }}>
          Open PWA App
        </a>
      </p>
    </main>
  );
}
