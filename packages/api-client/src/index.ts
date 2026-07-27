import type { AdvisoryReport, AnalyzeResponse, Ecosystem, PackageDetails } from "@npmax/types";

export class NpmaxApiClient {
  constructor(private readonly baseUrl: string) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async health(): Promise<{ ok: boolean }> {
    const res = await fetch(this.url("/api/health"));
    if (!res.ok) throw new Error("health check failed");
    return res.json() as Promise<{ ok: boolean }>;
  }

  async analyze(fileName: string, content: string): Promise<AnalyzeResponse> {
    const res = await fetch(this.url("/api/analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, content }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<AnalyzeResponse>;
  }

  async getPackage(ecosystem: Ecosystem, name: string): Promise<PackageDetails> {
    const res = await fetch(this.url(`/api/package/${ecosystem}/${encodeURIComponent(name)}`));
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<PackageDetails>;
  }

  async getAdvisory(
    ecosystem: Ecosystem,
    name: string,
    from?: string,
    to?: string,
  ): Promise<AdvisoryReport> {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const res = await fetch(
      this.url(`/api/advisory/${ecosystem}/${encodeURIComponent(name)}?${qs.toString()}`),
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<AdvisoryReport>;
  }
}
