import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 認証エリア・管理画面はクロール対象外
        disallow: [
          "/login",
          "/register",
          "/setup/",
          "/verify-email",
          "/mypage/",
          "/profile/",
          "/admin/",
          "/chat/",
          "/preview/",
          "/checkout/",
          "/hearing-sheet/",
          "/author/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
