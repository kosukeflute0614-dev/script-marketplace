import { describe, expect, it } from "vitest";

import { chatIdFor } from "./chat";

describe("chatIdFor", () => {
  it("2人の uid から決定論的に同じ ID を生成する", () => {
    const id1 = chatIdFor("uid-a", "uid-b");
    const id2 = chatIdFor("uid-b", "uid-a");
    expect(id1).toBe(id2);
  });

  it("ソート後に _ で結合した形式", () => {
    expect(chatIdFor("uid-b", "uid-a")).toBe("uid-a_uid-b");
  });

  it("同じ uid でも結果は決定論的", () => {
    expect(chatIdFor("a", "a")).toBe("a_a");
  });
});
