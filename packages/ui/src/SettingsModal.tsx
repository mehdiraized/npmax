export function SettingsModal({
  open,
  onClose,
  version = "3.0.0",
}: {
  open: boolean;
  onClose: () => void;
  version?: string;
}) {
  if (!open) return null;
  return (
    <div className="np-modal-backdrop" onClick={onClose}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="np-muted">npMax {version}</p>
        <p>
          <a href="https://buymeacoffee.com/farobox" target="_blank" rel="noreferrer">Donate</a>
          {" · "}
          <a href="https://github.com/mehdiraized/npmax/issues" target="_blank" rel="noreferrer">Issues</a>
        </p>
        <button type="button" className="np-btn primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
