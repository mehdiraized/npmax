import type { AdvisoryReport } from "@npmax/types";
import { StatusBadge } from "./StatusBadge.js";

export function AdvisoryCard({ report }: { report: AdvisoryReport }) {
  return (
    <div className="np-card">
      <div className="np-row" style={{ justifyContent: "space-between" }}>
        <strong>{report.name}</strong>
        <StatusBadge status={report.risk} />
      </div>
      <p className="np-muted" style={{ margin: "8px 0" }}>
        {report.fromVersion} → {report.toVersion} · recommend <strong>{report.recommendation}</strong>
      </p>
      <ul>
        {report.reasons.map((r) => (
          <li key={r.code}>{r.message}</li>
        ))}
      </ul>
      {report.migrationUrls.length > 0 ? (
        <p>
          Migration:{" "}
          {report.migrationUrls.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">{u}</a>
          ))}
        </p>
      ) : null}
      {report.codeHints.length > 0 ? (
        <ul>
          {report.codeHints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
