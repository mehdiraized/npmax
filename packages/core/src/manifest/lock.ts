import type { LockStatus } from "@npmax/types";

export function inferNpmLockStatus(fileNames: readonly string[]): LockStatus {
  if (fileNames.includes("pnpm-lock.yaml")) return { exists: true, stale: false, fileName: "pnpm-lock.yaml", packageManager: "pnpm" };
  if (fileNames.includes("yarn.lock")) return { exists: true, stale: false, fileName: "yarn.lock", packageManager: "yarn" };
  if (fileNames.includes("package-lock.json")) return { exists: true, stale: false, fileName: "package-lock.json", packageManager: "npm" };
  return { exists: false, stale: true, packageManager: "npm" };
}

export function syncCommandFor(ecosystem: string, packageManager?: string): { cmd: string; args: string[] } {
  switch (ecosystem) {
    case "npm":
      if (packageManager === "yarn") return { cmd: "yarn", args: ["install"] };
      if (packageManager === "pnpm") return { cmd: "pnpm", args: ["install"] };
      return { cmd: "npm", args: ["install"] };
    case "composer": return { cmd: "composer", args: ["install"] };
    case "swift": return { cmd: "swift", args: ["package", "resolve"] };
    case "cocoapods": return { cmd: "pod", args: ["install"] };
    case "flutter": return { cmd: "flutter", args: ["pub", "get"] };
    case "go": return { cmd: "go", args: ["mod", "tidy"] };
    case "rust": return { cmd: "cargo", args: ["check"] };
    case "ruby": return { cmd: "bundle", args: ["install"] };
    case "android": return { cmd: "./gradlew", args: ["help"] };
    default: return { cmd: "echo", args: ["unsupported"] };
  }
}
