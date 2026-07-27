import type { RiskLevel, VersionStatus } from "@npmax/types";

export function StatusBadge({ status }: { status: VersionStatus | RiskLevel | string }) {
  return <span className={`np-badge ${status}`}>{status}</span>;
}
