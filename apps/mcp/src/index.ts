#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  analyzeManifest,
  applyVersionUpdate,
  assessUpdate,
  detectProjectFromFiles,
  getLatestVersion,
  getPackageDetails,
  parseManifest,
  stripVersionPrefix,
} from "@npmax/core";
import type { Ecosystem } from "@npmax/types";
import { NpmaxApiClient } from "@npmax/api-client";
import { nodeHost } from "./host.js";

const apiUrl = process.env.NPMAX_API_URL;
const api = apiUrl ? new NpmaxApiClient(apiUrl) : null;

const server = new McpServer({
  name: "npmax",
  version: "3.3.0",
});

server.tool(
  "analyze_manifest",
  "Parse a manifest from content or a filesystem path and report dependency status",
  {
    fileName: z.string().optional().describe("Manifest file name, e.g. package.json"),
    content: z.string().optional().describe("Raw manifest content"),
    path: z.string().optional().describe("Absolute path to a manifest file"),
  },
  async ({ fileName, content, path }) => {
    let name = fileName || "package.json";
    let body = content || "";
    if (path) {
      body = await nodeHost.readFile(path);
      name = path.split(/[/\\]/).pop() || name;
    }
    if (!body) {
      return { content: [{ type: "text", text: "Provide content or path" }], isError: true };
    }
    const result = api
      ? await api.analyze(name, body)
      : await analyzeManifest(name, body);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "check_package",
  "Fetch latest version and package details for one package",
  {
    ecosystem: z.enum([
      "npm",
      "composer",
      "swift",
      "cocoapods",
      "android",
      "flutter",
      "go",
      "rust",
      "ruby",
    ]),
    name: z.string(),
  },
  async ({ ecosystem, name }) => {
    const details = api
      ? await api.getPackage(ecosystem as Ecosystem, name)
      : await getPackageDetails(ecosystem as Ecosystem, name);
    const latest = await getLatestVersion(ecosystem as Ecosystem, name);
    return {
      content: [{ type: "text", text: JSON.stringify({ latest, details }, null, 2) }],
    };
  },
);

server.tool(
  "get_changelog",
  "Fetch release notes / changelog entries between versions (heuristic via GitHub when possible)",
  {
    ecosystem: z.enum([
      "npm",
      "composer",
      "swift",
      "cocoapods",
      "android",
      "flutter",
      "go",
      "rust",
      "ruby",
    ]),
    name: z.string(),
    from: z.string(),
    to: z.string(),
    repositoryUrl: z.string().optional(),
  },
  async (args) => {
    const report = api
      ? await api.getAdvisory(args.ecosystem as Ecosystem, args.name, args.from, args.to)
      : await assessUpdate({
          ecosystem: args.ecosystem as Ecosystem,
          name: args.name,
          fromVersion: stripVersionPrefix(args.from),
          toVersion: stripVersionPrefix(args.to),
          repositoryUrl: args.repositoryUrl,
        });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ changelog: report.changelog, migrationUrls: report.migrationUrls }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "assess_update",
  "Heuristic risk assessment for upgrading a package (no LLM). Returns safe|caution|avoid.",
  {
    ecosystem: z.enum([
      "npm",
      "composer",
      "swift",
      "cocoapods",
      "android",
      "flutter",
      "go",
      "rust",
      "ruby",
    ]),
    name: z.string(),
    from: z.string(),
    to: z.string(),
    repositoryUrl: z.string().optional(),
  },
  async (args) => {
    const report = api
      ? await api.getAdvisory(args.ecosystem as Ecosystem, args.name, args.from, args.to)
      : await assessUpdate({
          ecosystem: args.ecosystem as Ecosystem,
          name: args.name,
          fromVersion: stripVersionPrefix(args.from),
          toVersion: stripVersionPrefix(args.to),
          repositoryUrl: args.repositoryUrl,
        });
    return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
  },
);

server.tool(
  "list_outdated",
  "List outdated dependencies from a project directory or pasted manifest",
  {
    projectPath: z.string().optional(),
    fileName: z.string().optional(),
    content: z.string().optional(),
  },
  async ({ projectPath, fileName, content }) => {
    let name = fileName || "package.json";
    let body = content || "";
    if (projectPath) {
      const entries = await nodeHost.readdir!(projectPath);
      const detected = detectProjectFromFiles(entries);
      if (!detected) {
        return { content: [{ type: "text", text: "No supported manifest found" }], isError: true };
      }
      name = detected.fileName;
      body = await nodeHost.readFile(`${projectPath}/${name}`);
    }
    const result = await analyzeManifest(name, body);
    const outdated = result.dependencies.filter((d) => d.status === "update");
    return { content: [{ type: "text", text: JSON.stringify({ ecosystem: result.ecosystem, outdated }, null, 2) }] };
  },
);

server.tool(
  "suggest_manifest_patch",
  "Return patched manifest text for one dependency update (caller writes the file)",
  {
    fileName: z.string(),
    content: z.string(),
    packageName: z.string(),
    latestVersion: z.string(),
    isDev: z.boolean().optional(),
  },
  async ({ fileName, content, packageName, latestVersion, isDev }) => {
    const parsed = parseManifest(fileName, content);
    const dep = parsed.dependencies.find(
      (d) => d.name === packageName && (isDev == null || !!d.isDev === isDev),
    );
    if (!dep) {
      return { content: [{ type: "text", text: "Dependency not found" }], isError: true };
    }
    const next = applyVersionUpdate(parsed.ecosystem, content, dep, latestVersion);
    return { content: [{ type: "text", text: next || "Could not patch" }] };
  },
);

server.tool(
  "search_post_update_issues",
  "Search for post-update bug/regression issue signals (heuristic GitHub search)",
  {
    ecosystem: z.enum([
      "npm",
      "composer",
      "swift",
      "cocoapods",
      "android",
      "flutter",
      "go",
      "rust",
      "ruby",
    ]),
    name: z.string(),
    version: z.string(),
    repositoryUrl: z.string().optional(),
  },
  async (args) => {
    const report = await assessUpdate({
      ecosystem: args.ecosystem as Ecosystem,
      name: args.name,
      fromVersion: "0.0.0",
      toVersion: stripVersionPrefix(args.version),
      repositoryUrl: args.repositoryUrl,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { issueHits: report.issueHits, issueUrls: report.issueUrls, recommendation: report.recommendation },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.resource("npmax://docs/ecosystems", "Supported ecosystems and manifests", async () => ({
  contents: [
    {
      uri: "npmax://docs/ecosystems",
      mimeType: "text/markdown",
      text: `# Ecosystems\n\n- npm: package.json\n- composer: composer.json\n- flutter: pubspec.yaml\n- go: go.mod\n- rust: Cargo.toml\n- ruby: Gemfile\n- android: build.gradle(.kts) / libs.versions.toml\n- swift: Package.swift\n- cocoapods: Podfile\n`,
    },
  ],
}));

server.resource("npmax://docs/risk-levels", "How risk recommendations are computed", async () => ({
  contents: [
    {
      uri: "npmax://docs/risk-levels",
      mimeType: "text/markdown",
      text: `# Risk levels (heuristic, no LLM)\n\n- **safe / yes**: no major bump, no breaking/migration keywords, few issue hits\n- **caution**: major bump and/or breaking/migration keywords and/or moderate issue hits\n- **avoid / no**: elevated issue hits after release\n`,
    },
  ],
}));

server.prompt("review-upgrade", "Review a dependency upgrade using npMax tool outputs", {
  ecosystem: z.string(),
  name: z.string(),
  from: z.string(),
  to: z.string(),
}, async ({ ecosystem, name, from, to }) => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: `Use npMax tools assess_update and get_changelog for ${ecosystem} package ${name} from ${from} to ${to}. Summarize risk, migrations, and whether to upgrade.`,
      },
    },
  ],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
