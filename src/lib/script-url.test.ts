import { describe, expect, it } from "vitest";

import { canonicalScriptPath, parseScriptHandle } from "./script-url";

describe("parseScriptHandle", () => {
  it("ハイフンを含む handle を slug + id に分割する", () => {
    const r = parseScriptHandle("romeo-to-juliet-seedRomeo");
    expect(r.slugFromUrl).toBe("romeo-to-juliet");
    expect(r.id).toBe("seedRomeo");
    expect(r.isShortForm).toBe(false);
  });

  it("ハイフンなしの handle を id だけと判定する", () => {
    const r = parseScriptHandle("seedRomeo");
    expect(r.slugFromUrl).toBe("");
    expect(r.id).toBe("seedRomeo");
    expect(r.isShortForm).toBe(true);
  });

  it("空文字を空 id として返す", () => {
    const r = parseScriptHandle("");
    expect(r.id).toBe("");
    expect(r.isShortForm).toBe(true);
  });
});

describe("canonicalScriptPath", () => {
  it("slug がある場合は SEO 形式の URL を返す", () => {
    expect(canonicalScriptPath("romeo-to-juliet", "seedRomeo")).toBe(
      "/scripts/romeo-to-juliet-seedRomeo",
    );
  });

  it("slug が空なら短縮 URL を返す", () => {
    expect(canonicalScriptPath("", "seedRomeo")).toBe("/scripts/seedRomeo");
  });
});
