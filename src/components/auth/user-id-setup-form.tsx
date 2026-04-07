"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  RESERVED_USER_IDS,
  USER_ID_MAX_LENGTH,
  USER_ID_MIN_LENGTH,
  USER_ID_REGEX,
} from "@/lib/user-id";
import { setUserId } from "@/app/actions/auth";

const schema = z.object({
  userId: z
    .string()
    .trim()
    .toLowerCase()
    .min(USER_ID_MIN_LENGTH, `${USER_ID_MIN_LENGTH}文字以上で入力してください`)
    .max(USER_ID_MAX_LENGTH, `${USER_ID_MAX_LENGTH}文字以下で入力してください`)
    .regex(USER_ID_REGEX, "半角英数字（小文字）とハイフンのみ。先頭末尾はハイフン以外")
    .refine(
      (v) => !(RESERVED_USER_IDS as readonly string[]).includes(v),
      "このユーザーIDは予約されているため使用できません",
    ),
});
type FormValues = z.infer<typeof schema>;

export function UserIdSetupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "" },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await setUserId(values.userId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("ユーザーIDを設定しました");
      router.replace("/mypage");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザーID</FormLabel>
              <FormControl>
                <Input
                  inputMode="text"
                  autoComplete="username"
                  placeholder="例: yamada-taro"
                  {...field}
                  // 入力時点で強制的に小文字化して表示する
                  // （Server Action 側でも toLowerCase されるが、表示と送信値を一致させる）
                  onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                />
              </FormControl>
              <FormDescription>
                3〜30文字の半角英数字（小文字）とハイフン。一度設定すると
                <strong className="text-foreground"> 変更できません</strong>。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "設定中…" : "ユーザーIDを設定する"}
        </Button>
      </form>
    </Form>
  );
}
