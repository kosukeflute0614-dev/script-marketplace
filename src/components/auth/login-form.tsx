"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

import { signInWithEmail, signInWithGoogle } from "@/lib/auth-client";
import { createSession } from "@/app/actions/auth";

import { GoogleButton } from "./google-button";

const schema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/mypage";

  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function handleEmailSubmit(values: FormValues) {
    const result = await signInWithEmail(values.email, values.password);
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
      toast.success("ログインしました");
      router.replace(redirectTo);
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
      toast.success("ログインしました");
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <GoogleButton label="Googleでログイン" onClick={handleGoogle} loading={googleLoading} />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">または</span>
        <Separator className="flex-1" />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="grid gap-4">
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
                <FormLabel>パスワード</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isPending || googleLoading}>
            {isPending ? "ログイン中…" : "メールアドレスでログイン"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
