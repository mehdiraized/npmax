import { getPackageDetails } from "@npmax/core";
import type { Ecosystem } from "@npmax/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ecosystem: string; name: string[] }> },
) {
  const { ecosystem, name } = await ctx.params;
  const pkgName = name.map(decodeURIComponent).join("/");
  try {
    const details = await getPackageDetails(ecosystem as Ecosystem, pkgName);
    return Response.json(details);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 404 });
  }
}
