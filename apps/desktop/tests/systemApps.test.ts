import { describe, expect, it } from "vitest";
import { cleanVersion, resolveVersionStatus } from "../src/lib/systemApps";

describe("cleanVersion", () => {
  it("strips brew build tokens after a comma", () => {
    expect(cleanVersion("3.13.10,4f02290ccd9304f0e6bf8ee85f6e9106f02ac1f7")).toBe("3.13.10");
    expect(
      cleanVersion("2026.1.2.11,quail2-patch1,AI-261.25134.95.2612.15914620"),
    ).toBe("2026.1.2.11");
  });

  it("strips leading v / release prefixes", () => {
    expect(cleanVersion("v1.2.3")).toBe("1.2.3");
    expect(cleanVersion("release-2.0.0")).toBe("2.0.0");
  });
});

describe("resolveVersionStatus", () => {
  it("marks older installed versions as outdated", () => {
    expect(resolveVersionStatus("2025.3", "2026.1.2.11")).toBe("outdated");
  });

  it("marks equal cleaned versions as current", () => {
    expect(
      resolveVersionStatus("3.13.10", "3.13.10,4f02290ccd9304f0e6bf8ee85f6e9106f02ac1f7"),
    ).toBe("current");
  });

  it("returns unknown when a side is missing", () => {
    expect(resolveVersionStatus("", "1.0.0")).toBe("unknown");
    expect(resolveVersionStatus("1.0.0", null)).toBe("unknown");
  });
});
