import type { Ecosystem, ManifestParseResult, ParsedDependency } from "@npmax/types";
import { applyVersionPrefix } from "../semver.js";

export function parsePackageJson(content: string): ManifestParseResult {
  const pkg = JSON.parse(content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies: ParsedDependency[] = [];

  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    dependencies.push({
      id: `npm:dep:${name}`,
      name,
      version,
      rawRequirement: version,
      isDev: false,
      section: "dependencies",
    });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
    dependencies.push({
      id: `npm:dev:${name}`,
      name,
      version,
      rawRequirement: version,
      isDev: true,
      section: "devDependencies",
    });
  }

  return {
    ecosystem: "npm",
    fileName: "package.json",
    content,
    dependencies,
  };
}

export function updatePackageJsonContent(
  content: string,
  packageName: string,
  latestVersion: string,
  isDev: boolean,
): string | null {
  const pkg = JSON.parse(content) as Record<string, Record<string, string>>;
  const section = isDev ? "devDependencies" : "dependencies";
  if (!pkg[section]?.[packageName]) return null;
  const prefix = applyVersionPrefix(pkg[section][packageName], latestVersion);
  pkg[section][packageName] = prefix;
  return JSON.stringify(pkg, null, 2) + "\n";
}

export function detectNpmPackageManager(fileNames: readonly string[]): "npm" | "yarn" | "pnpm" {
  if (fileNames.includes("pnpm-lock.yaml")) return "pnpm";
  if (fileNames.includes("yarn.lock")) return "yarn";
  return "npm";
}

export function isPlatformComposerPackage(name: string): boolean {
  return name === "php" || name.startsWith("ext-") || name.startsWith("lib-");
}

export function parseComposerJson(content: string): ManifestParseResult {
  const pkg = JSON.parse(content) as {
    require?: Record<string, string>;
    "require-dev"?: Record<string, string>;
  };
  const dependencies: ParsedDependency[] = [];

  for (const [name, version] of Object.entries(pkg.require ?? {})) {
    if (isPlatformComposerPackage(name)) continue;
    dependencies.push({
      id: `composer:req:${name}`,
      name,
      version,
      rawRequirement: version,
      isDev: false,
      section: "require",
    });
  }
  for (const [name, version] of Object.entries(pkg["require-dev"] ?? {})) {
    if (isPlatformComposerPackage(name)) continue;
    dependencies.push({
      id: `composer:dev:${name}`,
      name,
      version,
      rawRequirement: version,
      isDev: true,
      section: "require-dev",
    });
  }

  return {
    ecosystem: "composer",
    fileName: "composer.json",
    content,
    dependencies,
  };
}

export function updateComposerJsonContent(
  content: string,
  packageName: string,
  latestVersion: string,
  isDev: boolean,
): string | null {
  const pkg = JSON.parse(content) as Record<string, Record<string, string>>;
  const section = isDev ? "require-dev" : "require";
  if (!pkg[section]?.[packageName]) return null;
  pkg[section][packageName] = applyVersionPrefix(pkg[section][packageName], latestVersion);
  return JSON.stringify(pkg, null, 2) + "\n";
}

export type DetectedKind = {
  ecosystem: Ecosystem;
  fileName: string;
  androidVariant?: "gradle" | "version-catalog";
};

const FILE_MAP: Record<string, DetectedKind> = {
  "composer.json": { ecosystem: "composer", fileName: "composer.json" },
  "package.json": { ecosystem: "npm", fileName: "package.json" },
  "pubspec.yaml": { ecosystem: "flutter", fileName: "pubspec.yaml" },
  "go.mod": { ecosystem: "go", fileName: "go.mod" },
  "Cargo.toml": { ecosystem: "rust", fileName: "Cargo.toml" },
  Gemfile: { ecosystem: "ruby", fileName: "Gemfile" },
  Podfile: { ecosystem: "cocoapods", fileName: "Podfile" },
  "Package.swift": { ecosystem: "swift", fileName: "Package.swift" },
  "libs.versions.toml": {
    ecosystem: "android",
    fileName: "libs.versions.toml",
    androidVariant: "version-catalog",
  },
  "build.gradle.kts": {
    ecosystem: "android",
    fileName: "build.gradle.kts",
    androidVariant: "gradle",
  },
  "build.gradle": {
    ecosystem: "android",
    fileName: "build.gradle",
    androidVariant: "gradle",
  },
};

/** Detect ecosystem from a single uploaded/pasted file name. */
export function detectFromFileName(fileName: string): DetectedKind | null {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  return FILE_MAP[base] ?? null;
}

/** Detect project type from a list of files in a directory (basename). */
export function detectProjectFromFiles(fileNames: readonly string[]): DetectedKind | null {
  const set = new Set(fileNames);
  const order = [
    "composer.json",
    "package.json",
    "pubspec.yaml",
    "go.mod",
    "Cargo.toml",
    "Gemfile",
    "libs.versions.toml",
    "build.gradle.kts",
    "build.gradle",
    "Podfile",
    "Package.swift",
  ];
  for (const name of order) {
    if (set.has(name)) return FILE_MAP[name]!;
  }
  return null;
}
