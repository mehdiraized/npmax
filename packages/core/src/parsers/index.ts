import type { ManifestParseResult } from "@npmax/types";
import { detectFromFileName } from "./json-ecosystems.js";
import { parseComposerJson, parsePackageJson } from "./json-ecosystems.js";
import { parseSwiftManifest, parsePodfile } from "./apple.js";
import { parseGradleManifest, parseVersionCatalog } from "./android.js";
import { parsePubspec } from "./flutter.js";
import { parseCargoToml, parseGemfile, parseGoMod } from "./polyglot.js";

export * from "./json-ecosystems.js";
export * from "./apple.js";
export * from "./android.js";
export * from "./flutter.js";
export * from "./polyglot.js";

export function parseManifest(fileName: string, content: string): ManifestParseResult {
  const detected = detectFromFileName(fileName);
  if (!detected) throw new Error(`Unsupported manifest: ${fileName}`);
  switch (detected.ecosystem) {
    case "npm": return parsePackageJson(content);
    case "composer": return parseComposerJson(content);
    case "swift": return parseSwiftManifest(content);
    case "cocoapods": return parsePodfile(content);
    case "android":
      return detected.androidVariant === "version-catalog"
        ? parseVersionCatalog(content)
        : parseGradleManifest(content);
    case "flutter": return parsePubspec(content);
    case "go": return parseGoMod(content);
    case "rust": return parseCargoToml(content);
    case "ruby": return parseGemfile(content);
    default:
      throw new Error(`Unsupported ecosystem: ${detected.ecosystem}`);
  }
}
