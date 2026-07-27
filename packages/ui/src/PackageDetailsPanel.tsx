import type { DependencyStatus, PackageDetails } from "@npmax/types";
import { PackageDetailsModal } from "./PackageDetailsModal.js";

/** @deprecated Prefer PackageDetailsModal */
export function PackageDetailsPanel({
  row,
  details,
  onClose,
}: {
  row?: DependencyStatus;
  details?: PackageDetails;
  onClose: () => void;
}) {
  return (
    <PackageDetailsModal
      open={Boolean(row)}
      detail={details ?? null}
      loading={false}
      error=""
      requestedName={row?.name || ""}
      currentVersion={row?.rawRequirement || row?.version}
      onClose={onClose}
    />
  );
}
