"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  getCurrentIdToken,
  reloadCurrentUser,
  resendVerificationEmail,
  signOutClient,
} from "@/lib/auth-client";
import { destroySession, createSession } from "@/app/actions/auth";

type Props = {
  email: string;
};

export function VerifyEmailPending({ email }: Props) {
  const router = useRouter();
  const [isResending, setResending] = useState(false);
  const [isChecking, setChecking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const checkVerifiedAndRedirect = useCallback(
    async (silent = false) => {
      setChecking(true);
      try {
        const verified = await reloadCurrentUser();
        if (verified) {
          // 新しい ID トークンを取得し直し、Server 側 cookie を更新する
          const idToken = await getCurrentIdToken(true);
          if (idToken) {
            startTransition(async () => {
              const r = await createSession(idToken);
              if (r.success) {
                toast.success("メールアドレスを確認しました");
                router.replace("/setup/user-id");
                router.refresh();
              } else {
                toast.error(r.error);
              }
            });
          }
        } else if (!silent) {
          toast.info("まだ確認されていません。メールのリンクを開いてください");
        }
      } finally {
        setChecking(false);
      }
    },
    [router],
  );

  // 初回マウント時にも一度チェック（既にリンクをクリック済みの可能性がある）
  useEffect(() => {
    void checkVerifiedAndRedirect(true);
  }, [checkVerifiedAndRedirect]);

  async function handleResend() {
    setResending(true);
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        toast.success("確認メールを再送しました");
      } else {
        toast.error(result.error ?? "再送に失敗しました");
      }
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    await signOutClient();
    await destroySession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <span className="font-medium">{email}</span>{" "}
        宛に確認メールを送信しました。メール内のリンクをクリックして、メールアドレスの確認を完了してください。
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => checkVerifiedAndRedirect(false)}
        disabled={isChecking || isPending}
      >
        {isChecking || isPending ? "確認中…" : "確認を完了した"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleResend}
        disabled={isResending}
      >
        {isResending ? "送信中…" : "確認メールを再送する"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={handleSignOut}
      >
        別のアカウントでログイン
      </Button>
    </div>
  );
}
