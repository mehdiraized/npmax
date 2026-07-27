import type { DependencyStatus } from "@npmax/types";
import { StatusBadge } from "./StatusBadge.js";

export function PackageTable({
  rows,
  onUpdate,
  onDetails,
  showUpdate = true,
}: {
  rows: readonly DependencyStatus[];
  onUpdate?: (row: DependencyStatus) => void;
  onDetails?: (row: DependencyStatus) => void;
  showUpdate?: boolean;
}) {
  return (
    <table className="np-table">
      <thead>
        <tr>
          <th>Package</th>
          <th>Current</th>
          <th>Latest</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <button className="np-btn ghost" type="button" onClick={() => onDetails?.(row)}>
                {row.displayName || row.name}
              </button>
            </td>
            <td><code>{row.version || row.rawRequirement || "—"}</code></td>
            <td><code>{row.latestVersion || "—"}</code></td>
            <td><StatusBadge status={row.status} /></td>
            <td>
              {showUpdate && row.status === "update" && row.latestVersion ? (
                <button className="np-btn primary" type="button" onClick={() => onUpdate?.(row)}>
                  Update
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
