export type Ecosystem =
  | "npm"
  | "composer"
  | "swift"
  | "cocoapods"
  | "android"
  | "flutter"
  | "go"
  | "rust"
  | "ruby";

export type Platform = "darwin" | "win32" | "linux" | "web" | "mcp";

export type VersionStatus = "ok" | "update" | "loading" | "error" | "unknown";

export type RiskLevel = "safe" | "caution" | "avoid";

export type UpdateRecommendation = "yes" | "caution" | "no";

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly ecosystem?: Ecosystem;
}

/** Browser-persisted project (localStorage). */
export interface StoredWebProject {
  readonly id: string;
  readonly name: string;
  readonly fileName?: string;
  readonly content?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface SuggestedApp {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly url: string;
  readonly badge?: string;
}

export interface ParsedDependency {
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly version: string;
  readonly rawRequirement: string;
  readonly versionStart?: number;
  readonly versionEnd?: number;
  readonly isDev?: boolean;
  readonly group?: string;
  readonly artifact?: string;
  readonly sourceType?: string;
  readonly section?: string;
  readonly repositoryUrl?: string;
}

export interface PackageLink {
  readonly label: string;
  readonly type: string;
  readonly url: string;
}

export interface PackageVersionInfo {
  readonly version: string;
  readonly date?: string;
  readonly labels?: readonly string[];
  readonly isLatest?: boolean;
}

export interface PackageStat {
  readonly label: string;
  readonly value: string | number;
  readonly format?: "number" | "bytes" | "date" | "text";
}

export interface PackageDownloads {
  readonly label: string;
  readonly value: number;
  readonly format?: "number";
  readonly start?: string;
  readonly end?: string;
  readonly total?: number;
  readonly daily?: number;
}

export interface PackageCompatibility {
  readonly label: string;
  readonly value: string;
}

export interface PackageDetails {
  readonly ecosystem: Ecosystem;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly badges?: readonly string[];
  readonly links?: readonly PackageLink[];
  readonly stats?: readonly PackageStat[];
  readonly downloads?: PackageDownloads | null;
  readonly compatibility?: readonly PackageCompatibility[];
  readonly versions?: readonly PackageVersionInfo[];
  readonly install?: { readonly label: string; readonly lines: readonly string[] };
  readonly meta?: Record<string, unknown>;
}

export interface DependencyStatus extends ParsedDependency {
  readonly latestVersion?: string;
  readonly status: VersionStatus;
  readonly error?: string;
  readonly details?: PackageDetails;
}

export interface ManifestParseResult {
  readonly ecosystem: Ecosystem;
  readonly fileName: string;
  readonly content: string;
  readonly dependencies: readonly ParsedDependency[];
  readonly packageManager?: "npm" | "yarn" | "pnpm";
}

export interface LockStatus {
  readonly exists: boolean;
  readonly stale: boolean;
  readonly fileName?: string;
  readonly packageManager?: string;
}

export interface AppCatalogPlatforms {
  readonly darwin?: { readonly brewCask?: string };
  readonly win32?: { readonly wingetId?: string };
  readonly linux?: {
    readonly flatpakId?: string;
    readonly snapName?: string;
    readonly githubRepo?: string;
  };
}

export interface AppCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly platforms?: AppCatalogPlatforms;
  readonly website?: string;
}

export interface InstalledApp {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly platform: string;
  readonly path?: string;
  readonly publisher?: string;
  readonly source?: string;
  readonly sourceId?: string;
  readonly website?: string;
  readonly installType?: string;
  readonly catalogId?: string;
  readonly latestVersion?: string;
  readonly updateAvailable?: boolean;
  readonly updateSource?: string;
  readonly updateUrl?: string;
  readonly updateCommand?: string;
  readonly updateConfidence?: string;
  readonly status?: "outdated" | "current" | "ahead" | "unknown";
  readonly iconDataUrl?: string;
}

export interface ChangelogEntry {
  readonly version: string;
  readonly date?: string;
  readonly title?: string;
  readonly body: string;
  readonly url?: string;
  readonly tags?: readonly string[];
}

export interface AdvisoryReason {
  readonly code: string;
  readonly message: string;
  readonly evidence?: string;
}

export interface AdvisoryReport {
  readonly ecosystem: Ecosystem;
  readonly name: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly risk: RiskLevel;
  readonly recommendation: UpdateRecommendation;
  readonly majorBump: boolean;
  readonly hasBreaking: boolean;
  readonly hasMigration: boolean;
  readonly migrationUrls: readonly string[];
  readonly reasons: readonly AdvisoryReason[];
  readonly changelog: readonly ChangelogEntry[];
  readonly issueHits: number;
  readonly issueUrls: readonly string[];
  readonly codeHints: readonly string[];
}

export interface AnalyzeRequest {
  readonly fileName: string;
  readonly content: string;
}

export interface AnalyzeResponse {
  readonly ecosystem: Ecosystem;
  readonly fileName: string;
  readonly dependencies: readonly DependencyStatus[];
  readonly advisories?: readonly AdvisoryReport[];
}

export interface ExecOpts {
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly env?: Record<string, string>;
}

export interface ExecResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
}

export interface HostIO {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  exec(cmd: string, args: string[], opts?: ExecOpts): Promise<ExecResult>;
  readdir?(path: string): Promise<readonly string[]>;
}
