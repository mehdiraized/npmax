"use client";

import { useCallback } from "react";
import { WebAppShell } from "@npmax/app-shell";
import type { Ecosystem, PackageDetails } from "@npmax/types";

function packagePath(ecosystem: Ecosystem, name: string) {
  return `/api/package/${ecosystem}/${name.split("/").map(encodeURIComponent).join("/")}`;
}

export default function AppPage() {
  const fetchLatest = useCallback(
    async (ecosystem: Ecosystem, name: string): Promise<string> => {
      const res = await fetch(packagePath(ecosystem, name));
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as PackageDetails;
      if (!data.version) throw new Error("No version");
      return data.version;
    },
    [],
  );

  const fetchDetails = useCallback(
    async (ecosystem: Ecosystem, name: string): Promise<PackageDetails> => {
      const res = await fetch(packagePath(ecosystem, name));
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<PackageDetails>;
    },
    [],
  );

  return <WebAppShell fetchLatest={fetchLatest} fetchDetails={fetchDetails} />;
}
