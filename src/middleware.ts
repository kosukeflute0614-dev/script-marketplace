import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "__session";

/**
 * Edge runtime で動くため firebase-admin は使えない。
 * cookie の **存在チェック** だけを行い、本格的な検証は (app)/layout.tsx で実施する。
 *
 * - (app)/* 配下: cookie がなければ /login へリダイレクト
 * - 全ページ: x-pathname ヘッダーをセット（layout.tsx でリダイレクト判定に使う）
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Next.js の Route Group 名 `(app)` は URL に含まれないので、
  // ここでは「`(public)` の既知パス以外は (app)」と判定するのではなく、
  // matcher で対象を絞り込む（下の config を参照）。
  const isProtected = isProtectedPath(pathname);
  if (isProtected) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      // ログイン後に元のページへ戻れるよう redirect パラメータを付ける
      loginUrl.searchParams.set("redirect", pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * 保護対象のパス。`src/app/(app)/` 配下の URL を列挙する。
 * Route Group `(app)` は URL に出ないため、内部の最上位ディレクトリを直接指定する。
 */
function isProtectedPath(pathname: string): boolean {
  const PROTECTED_PREFIXES = [
    "/setup",
    "/mypage",
    "/author",
    "/chat",
    "/hearing-sheet",
    "/preview",
    "/checkout",
    "/profile",
    "/admin",
    "/verify-email",
  ];
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export const config = {
  // 静的ファイルと _next 配下を除外
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|js|css|map)$).*)",
  ],
};
