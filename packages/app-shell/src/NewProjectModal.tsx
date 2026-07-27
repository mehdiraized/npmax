import { useEffect, useState, type FormEvent } from "react";

export function NewProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    onClose();
  }

  return (
    <div
      className="settingsModal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settingsWindow settingsWindow--sm" role="dialog" aria-modal="true" aria-label="Add project">
        <header className="settingsTitlebar">
          <div />
          <div className="settingsTitle">New project</div>
          <button type="button" className="settingsClose" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <form className="settingsBody" onSubmit={submit}>
          <label className="npField">
            <span>Project name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-app"
              className="npInput"
            />
          </label>
          <div className="npFieldActions">
            <button type="button" className="secondaryBtn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primaryBtn" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
