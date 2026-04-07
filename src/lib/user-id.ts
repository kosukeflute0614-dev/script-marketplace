// User ID validation rules from docs/spec.md §4
//
// - 半角英数字（小文字）+ ハイフン
// - 3〜30文字
// - 変更不可
// - 正規表現: ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$
// - 予約語は使用不可

export const USER_ID_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
export const USER_ID_MIN_LENGTH = 3;
export const USER_ID_MAX_LENGTH = 30;

export const RESERVED_USER_IDS = [
  "admin",
  "system",
  "support",
  "help",
  "about",
  "search",
  "login",
  "register",
  "api",
  "settings",
] as const;

export type UserIdValidationError =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "reserved";

export function validateUserId(userId: string): UserIdValidationError | null {
  if (!userId) return "empty";
  if (userId.length < USER_ID_MIN_LENGTH) return "too_short";
  if (userId.length > USER_ID_MAX_LENGTH) return "too_long";
  if (!USER_ID_REGEX.test(userId)) return "invalid_chars";
  if ((RESERVED_USER_IDS as readonly string[]).includes(userId)) return "reserved";
  return null;
}

export function userIdErrorMessage(error: UserIdValidationError): string {
  switch (error) {
    case "empty":
      return "ユーザーIDを入力してください";
    case "too_short":
      return `ユーザーIDは${USER_ID_MIN_LENGTH}文字以上で入力してください`;
    case "too_long":
      return `ユーザーIDは${USER_ID_MAX_LENGTH}文字以下で入力してください`;
    case "invalid_chars":
      return "半角英数字（小文字）とハイフンのみ使用できます。先頭末尾はハイフン以外にしてください";
    case "reserved":
      return "このユーザーIDは予約されているため使用できません";
  }
}
