import { describe, expect, it } from "vitest";
import {
  applyVersionPrefix,
  compareSemver,
  isMajorBump,
  stripVersionPrefix,
} from "../src/semver.js";
import {
  detectNpmPackageManager,
  parsePackageJson,
  updatePackageJsonContent,
} from "../src/parsers/json-ecosystems.js";
import { detectProjectFromFiles } from "../src/detect.js";
import { githubApiRepoUrl, isGithubHostUrl, parseGithubRepoUrl } from "../src/github.js";
import { extractSignals } from "../src/advisory/index.js";
import { parsePubspec } from "../src/parsers/flutter.js";

describe("semver helpers", () => {
  it("strips common prefixes", () => {
    expect(stripVersionPrefix("^1.2.3")).toBe("1.2.3");
    expect(stripVersionPrefix("~2.0.0")).toBe("2.0.0");
    expect(stripVersionPrefix("v3.1.0")).toBe("3.1.0");
  });

  it("applies the original prefix to a new version", () => {
    expect(applyVersionPrefix("^1.0.0", "2.1.0")).toBe("^2.1.0");
    expect(applyVersionPrefix("1.0.0", "1.1.0")).toBe("1.1.0");
  });

  it("detects major bumps", () => {
    expect(isMajorBump("1.9.0", "2.0.0")).toBe(true);
    expect(isMajorBump("^1.9.0", "1.10.0")).toBe(false);
  });

  it("compares semver", () => {
    expect(compareSemver("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("package.json parser", () => {
  it("parses dependencies and devDependencies", () => {
    const result = parsePackageJson(
      JSON.stringify({
        dependencies: { lodash: "^4.17.21" },
        devDependencies: { vitest: "^3.0.0" },
      }),
    );
    expect(result.ecosystem).toBe("npm");
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies.find((d) => d.name === "lodash")?.isDev).toBe(false);
    expect(result.dependencies.find((d) => d.name === "vitest")?.isDev).toBe(true);
  });

  it("updates a dependency while preserving prefix", () => {
    const next = updatePackageJsonContent(
      JSON.stringify({ dependencies: { lodash: "^4.0.0" } }, null, 2),
      "lodash",
      "4.17.21",
      false,
    );
    expect(next).toContain('"lodash": "^4.17.21"');
  });

  it("detects package manager from lockfiles", () => {
    expect(detectNpmPackageManager(["pnpm-lock.yaml", "package.json"])).toBe("pnpm");
    expect(detectNpmPackageManager(["yarn.lock", "package.json"])).toBe("yarn");
    expect(detectNpmPackageManager(["package.json"])).toBe("npm");
  });
});

describe("project detection", () => {
  it("detects npm projects from package.json", () => {
    const detected = detectProjectFromFiles(["README.md", "package.json", "src"]);
    expect(detected?.fileName).toBe("package.json");
  });

  it("detects composer projects", () => {
    const detected = detectProjectFromFiles(["composer.json", "src"]);
    expect(detected?.fileName).toBe("composer.json");
  });
});

describe("github url parsing", () => {
  it("accepts https and ssh github urls", () => {
    expect(parseGithubRepoUrl("https://github.com/foo/bar")).toEqual({
      owner: "foo",
      repo: "bar",
    });
    expect(parseGithubRepoUrl("git@github.com:foo/bar.git")).toEqual({
      owner: "foo",
      repo: "bar",
    });
    expect(isGithubHostUrl("https://github.com/foo/bar")).toBe(true);
  });

  it("rejects non-github hosts and path traversal", () => {
    expect(parseGithubRepoUrl("https://evil.com/foo/bar")).toBeNull();
    expect(parseGithubRepoUrl("https://github.com/../etc/passwd")).toBeNull();
    expect(githubApiRepoUrl("foo", "bar", "/releases/latest")).toBe(
      "https://api.github.com/repos/foo/bar/releases/latest",
    );
    expect(githubApiRepoUrl("../x", "bar")).toBeNull();
  });
});

describe("advisory signals", () => {
  it("detects breaking keywords and migration urls without regex backtracking", () => {
    const signals = extractSignals(
      "This is a BREAKING CHANGE.\nSee https://example.com/docs/migration for details.",
    );
    expect(signals.hasBreaking).toBe(true);
    expect(signals.hasMigration).toBe(true);
    expect(signals.migrationUrls).toContain("https://example.com/docs/migration");
  });
});

describe("flutter parser", () => {
  it("parses simple and nested dependency versions", () => {
    const result = parsePubspec(`name: demo
dependencies:
  http: ^1.2.0
  collection:
    version: 1.9.0
dev_dependencies:
  test: any
`);
    expect(result.ecosystem).toBe("flutter");
    expect(result.dependencies.find((d) => d.name === "http")?.version).toBe("^1.2.0");
    expect(result.dependencies.find((d) => d.name === "collection")?.version).toBe("1.9.0");
    expect(result.dependencies.find((d) => d.name === "test")?.isDev).toBe(true);
  });
});
