import { describe, expect, it } from "vitest";

import { validateUserId, userIdErrorMessage } from "./user-id";

describe("validateUserId", () => {
  it("正常な userId を許可する", () => {
    expect(validateUserId("yamada-taro")).toBeNull();
    expect(validateUserId("user123")).toBeNull();
    expect(validateUserId("a-b-c")).toBeNull();
    expect(validateUserId("abc")).toBeNull(); // 最小長
    expect(validateUserId("a".repeat(30))).toBeNull(); // 最大長
  });

  it("空文字を弾く", () => {
    expect(validateUserId("")).toBe("empty");
  });

  it("3文字未満を弾く", () => {
    expect(validateUserId("ab")).toBe("too_short");
    expect(validateUserId("a")).toBe("too_short");
  });

  it("30文字超を弾く", () => {
    expect(validateUserId("a".repeat(31))).toBe("too_long");
  });

  it("先頭末尾のハイフンを弾く", () => {
    expect(validateUserId("-abc")).toBe("invalid_chars");
    expect(validateUserId("abc-")).toBe("invalid_chars");
  });

  it("大文字を弾く", () => {
    expect(validateUserId("Abc")).toBe("invalid_chars");
  });

  it("記号を弾く", () => {
    expect(validateUserId("ab_c")).toBe("invalid_chars");
    expect(validateUserId("ab.c")).toBe("invalid_chars");
    expect(validateUserId("ab/c")).toBe("invalid_chars");
  });

  it("予約語を弾く", () => {
    expect(validateUserId("admin")).toBe("reserved");
    expect(validateUserId("system")).toBe("reserved");
    expect(validateUserId("login")).toBe("reserved");
    expect(validateUserId("api")).toBe("reserved");
  });
});

describe("userIdErrorMessage", () => {
  it("各エラーコードに対応する日本語メッセージを返す", () => {
    expect(userIdErrorMessage("empty")).toContain("入力");
    expect(userIdErrorMessage("too_short")).toContain("3");
    expect(userIdErrorMessage("too_long")).toContain("30");
    expect(userIdErrorMessage("invalid_chars")).toContain("半角");
    expect(userIdErrorMessage("reserved")).toContain("予約");
  });
});
