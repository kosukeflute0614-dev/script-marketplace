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

import { updateProfile } from "@/app/actions/auth";
import type { SerializedUser } from "@/types/user";

const schema = z.object({
  displayName: z.string().trim().min(1, "表示名を入力してください").max(50, "50文字以下で入力してください"),
  bio: z.string().trim().max(500, "500文字以下で入力してください").optional(),
  iconUrl: z.string().trim().url("URLの形式が正しくありません").optional().or(z.literal("")),
  twitter: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^@?[A-Za-z0-9_]{1,15}$/.test(v),
      "X(Twitter)のユーザー名の形式が正しくありません",
    ),
  website: z.string().trim().url("URLの形式が正しくありません").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  user: SerializedUser;
};

export function ProfileEditForm({ user }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      iconUrl: user.iconUrl ?? "",
      twitter: user.snsLinks?.twitter ?? "",
      website: user.snsLinks?.website ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateProfile({
        displayName: values.displayName,
        bio: values.bio,
        iconUrl: values.iconUrl,
        twitter: values.twitter,
        website: values.website,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("プロフィールを更新しました");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>表示名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>自己紹介</FormLabel>
              <FormControl>
                <Input placeholder="500文字以内" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="iconUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>アイコン画像URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>画像のURL。後ほど直接アップロード機能を追加予定。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="twitter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>X (Twitter)</FormLabel>
              <FormControl>
                <Input placeholder="例: yamada_taro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webサイト</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "更新中…" : "更新する"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
