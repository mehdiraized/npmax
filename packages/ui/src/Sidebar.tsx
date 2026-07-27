import type { Project } from "@npmax/types";

export function Sidebar({
  projects,
  activeId,
  onSelect,
  onAdd,
  onSelectInstalled,
  installedActive,
}: {
  projects: readonly Project[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onSelectInstalled: () => void;
  installedActive?: boolean;
}) {
  return (
    <aside className="np-sidebar">
      <div className="np-brand">npMax</div>
      <button
        type="button"
        className={`np-nav-btn ${installedActive ? "active" : ""}`}
        onClick={onSelectInstalled}
      >
        Installed Apps
      </button>
      <div className="np-muted" style={{ fontSize: 12, marginTop: 8 }}>Projects</div>
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`np-nav-btn ${activeId === p.id ? "active" : ""}`}
          onClick={() => onSelect(p.id)}
        >
          {p.name}
        </button>
      ))}
      <button type="button" className="np-btn" onClick={onAdd}>+ Add project</button>
    </aside>
  );
}
