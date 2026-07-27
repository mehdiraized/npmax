import type { Ecosystem, PackageDetails } from "@npmax/types";
import { getComposerDetails, getComposerLatest } from "./composer.js";
import { getNpmDetails, getNpmLatest } from "./npm.js";
import {
  getAndroidLatest,
  getCocoaPodLatest,
  getCratesLatest,
  getFlutterLatest,
  getGoLatest,
  getPolyglotDetails,
  getRubyGemsLatest,
  getSwiftLatest,
} from "./polyglot.js";

export async function getLatestVersion(
  ecosystem: Ecosystem,
  name: string,
  meta?: { repositoryUrl?: string },
): Promise<string> {
  switch (ecosystem) {
    case "npm":
      return (await getNpmLatest(name)).version;
    case "composer":
      return (await getComposerLatest(name)).version;
    case "flutter":
      return (await getFlutterLatest(name)).version;
    case "go":
      return (await getGoLatest(name)).version;
    case "rust":
      return (await getCratesLatest(name)).version;
    case "ruby":
      return (await getRubyGemsLatest(name)).version;
    case "android":
      return (await getAndroidLatest(name)).version;
    case "cocoapods":
      return (await getCocoaPodLatest(name)).version;
    case "swift":
      return (await getSwiftLatest(name, meta?.repositoryUrl)).version;
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

export async function getPackageDetails(
  ecosystem: Ecosystem,
  name: string,
  meta?: { repositoryUrl?: string },
): Promise<PackageDetails> {
  switch (ecosystem) {
    case "npm":
      return getNpmDetails(name);
    case "composer":
      return getComposerDetails(name);
    default:
      return getPolyglotDetails(ecosystem, name, meta);
  }
}

export * from "./npm.js";
export * from "./composer.js";
export * from "./polyglot.js";
