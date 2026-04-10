import { describe, expect, it } from "vitest";

import { generateSlug, slugCandidates } from "./slug";

describe("generateSlug", () => {
  it("ASCII タイトルを小文字ハイフンに変換する", () => {
    expect(generateSlug("Romeo and Juliet")).toBe("romeo-and-juliet");
  });

  it("特殊文字を除去する", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
  });

  it("先頭末尾のハイフンを除去する", () => {
    expect(generateSlug("  --test--  ")).toBe("test");
  });

  it("日本語タイトルは 'script' を返す", () => {
    expect(generateSlug("ロミオとジュリエット")).toBe("script");
  });

  it("空文字は 'untitled' を返す", () => {
    expect(generateSlug("")).toBe("untitled");
    expect(generateSlug("   ")).toBe("untitled");
  });
});

describe("slugCandidates", () => {
  it("ベース → ベース-2 → ベース-3 の順に候補を返す", () => {
    const gen = slugCandidates("test");
    expect(gen.next().value).toBe("test");
    expect(gen.next().value).toBe("test-2");
    expect(gen.next().value).toBe("test-3");
  });
});
