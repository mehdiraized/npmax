import { assessUpdate, stripVersionPrefix } from "@npmax/core";
import type { Ecosystem } from "@npmax/types";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ ecosystem: string; name: string[] }> },
) {
  const { ecosystem, name } = await ctx.params;
  const pkgName = name.map(decodeURIComponent).join("/");
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "0.0.0";
  const to = url.searchParams.get("to") || "0.0.0";
  const repositoryUrl = url.searchParams.get("repositoryUrl") || undefined;
  try {
    const report = await assessUpdate({
      ecosystem: ecosystem as Ecosystem,
      name: pkgName,
      fromVersion: stripVersionPrefix(from),
      toVersion: stripVersionPrefix(to),
      repositoryUrl,
    });
    return Response.json(report);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
