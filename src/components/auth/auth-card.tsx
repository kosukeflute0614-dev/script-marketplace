import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * ログイン/登録画面の共通カードレイアウト。
 * ヘッダー・フッターのない (public) ページで使う想定。
 */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-heading text-foreground inline-block text-xl font-bold">
            脚本マーケット
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-base">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-center">{description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer ? <div className="text-muted-foreground mt-6 text-center text-xs">{footer}</div> : null}
      </div>
    </div>
  );
}
