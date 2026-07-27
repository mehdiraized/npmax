import { analyzeManifest, assessUpdate, stripVersionPrefix } from "@npmax/core";
import type { AdvisoryReport } from "@npmax/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { fileName?: string; content?: string };
  if (!body.fileName || !body.content) {
    return Response.json({ error: "fileName and content required" }, { status: 400 });
  }
  const result = await analyzeManifest(body.fileName, body.content);
  const outdated = result.dependencies.filter((d) => d.status === "update" && d.latestVersion).slice(0, 8);
  const advisories: AdvisoryReport[] = [];
  for (const dep of outdated) {
    try {
      advisories.push(
        await assessUpdate({
          ecosystem: result.ecosystem,
          name: dep.name,
          fromVersion: stripVersionPrefix(dep.version || dep.rawRequirement),
          toVersion: stripVersionPrefix(dep.latestVersion!),
        }),
      );
    } catch {
      /* skip advisory failures */
    }
  }
  return Response.json({ ...result, advisories });
}
