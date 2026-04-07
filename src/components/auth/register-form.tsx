"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

import { registerWithEmailClient, signInWithGoogle } from "@/lib/auth-client";
import { createSession } from "@/app/actions/auth";

import { GoogleButton } from "./google-button";

const schema = z.object({
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(50, "表示名は50文字以下で入力してください"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください").max(128),
});
type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  async function handleEmailSubmit(values: FormValues) {
    const result = await registerWithEmailClient(values.email, values.password, values.displayName);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    startTransition(async () => {
      const sessionResult = await createSession(result.idToken);
      if (!sessionResult.success) {
        toast.error(sessionResult.error);
        return;
      }
      toast.success("登録しました。確認メールを送信しました");
      router.replace("/verify-email");
      router.refresh();
    });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const sessionResult = await createSession(result.idToken);
      if (!sessionResult.success) {
        toast.error(sessionResult.error);
        return;
      }
      toast.success("登録しました");
      router.replace("/setup/user-id");
      router.refresh();
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <GoogleButton label="Googleで登録" onClick={handleGoogle} loading={googleLoading} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">または</span>
        <Separator className="flex-1" />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>表示名</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="例: 山田 太郎" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード（6文字以上）</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isPending || googleLoading}>
            {isPending ? "登録中…" : "メールアドレスで登録"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
