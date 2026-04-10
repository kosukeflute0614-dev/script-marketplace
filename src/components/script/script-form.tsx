"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createScript, updateScript, type ScriptFormInput } from "@/app/actions/scripts-edit";
import {
  GENRES,
  PERFORMANCE_TYPES,
  SCRIPT_TAG_DEFINITIONS,
  TARGET_AUDIENCES,
} from "@/lib/script-tags";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; scriptId: string; initial: Partial<ScriptFormInput> & { pdfUrl?: string } };

type Props = { mode: Mode };

export function ScriptForm({ mode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [form, setForm] = useState<ScriptFormInput>(() => ({
    title: mode.kind === "edit" ? (mode.initial.title ?? "") : "",
    slug: mode.kind === "edit" ? (mode.initial.slug ?? "") : "",
    synopsis: mode.kind === "edit" ? (mode.initial.synopsis ?? "") : "",
    genres: mode.kind === "edit" ? (mode.initial.genres ?? []) : [],
    castMin: mode.kind === "edit" ? (mode.initial.castMin ?? 1) : 1,
    castMax: mode.kind === "edit" ? (mode.initial.castMax ?? 1) : 1,
    castMale: mode.kind === "edit" ? (mode.initial.castMale ?? 0) : 0,
    castFemale: mode.kind === "edit" ? (mode.initial.castFemale ?? 0) : 0,
    castUnspecified: mode.kind === "edit" ? (mode.initial.castUnspecified ?? 1) : 1,
    duration: mode.kind === "edit" ? (mode.initial.duration ?? 60) : 60,
    performanceType: mode.kind === "edit" ? (mode.initial.performanceType ?? []) : [],
    targetAudience: mode.kind === "edit" ? (mode.initial.targetAudience ?? []) : [],
    themeTags: mode.kind === "edit" ? (mode.initial.themeTags ?? []) : [],
    scriptTags: mode.kind === "edit" ? (mode.initial.scriptTags ?? []) : [],
    price: mode.kind === "edit" ? (mode.initial.price ?? 0) : 0,
    isFreeFullText: mode.kind === "edit" ? (mode.initial.isFreeFullText ?? false) : false,
    thumbnailUrl: mode.kind === "edit" ? (mode.initial.thumbnailUrl ?? "") : "",
    feeSchedule: mode.kind === "edit" ? (mode.initial.feeSchedule ?? []) : [],
    performanceHistory: mode.kind === "edit" ? (mode.initial.performanceHistory ?? []) : [],
    authorComment: mode.kind === "edit" ? (mode.initial.authorComment ?? "") : "",
  }));

  function setField<K extends keyof ScriptFormInput>(key: K, value: ScriptFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayItem<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind === "create" && !pdfFile) {
      toast.error("PDF ファイルをアップロードしてください");
      return;
    }
    startTransition(async () => {
      if (mode.kind === "create") {
        const fd = new FormData();
        fd.set("pdf", pdfFile!);
        fd.set("data", JSON.stringify(form));
        const result = await createScript(fd);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("台本を出品しました");
        router.replace(`/author/scripts`);
        router.refresh();
      } else {
        const result = await updateScript(mode.scriptId, form);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("更新しました");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode.kind === "create" ? (
        <Card>
          <CardContent className="space-y-2 p-5">
            <label className="text-sm font-medium">台本 PDF *</label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">最大 30MB の PDF</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-5">
          <Field label="タイトル *">
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              maxLength={100}
              disabled={isPending}
            />
          </Field>
          <Field label="スラッグ (URL用、空欄なら自動生成)">
            <Input
              value={form.slug ?? ""}
              onChange={(e) => setField("slug", e.target.value.toLowerCase())}
              placeholder="例: romeo-juliet"
              disabled={isPending}
            />
          </Field>
          <Field label="あらすじ * (300〜1,000文字)">
            <textarea
              value={form.synopsis}
              onChange={(e) => setField("synopsis", e.target.value)}
              rows={6}
              maxLength={1000}
              className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">{form.synopsis.length} 文字</p>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <CheckboxGroup
            label="ジャンル *"
            options={GENRES as readonly string[]}
            value={form.genres}
            onChange={(g) => setField("genres", toggleArrayItem(form.genres, g))}
            disabled={isPending}
          />
          <CheckboxGroup
            label="上演形態 *"
            options={PERFORMANCE_TYPES as readonly string[]}
            value={form.performanceType}
            onChange={(g) =>
              setField("performanceType", toggleArrayItem(form.performanceType, g))
            }
            disabled={isPending}
          />
          <CheckboxGroup
            label="対象層"
            options={TARGET_AUDIENCES as readonly string[]}
            value={form.targetAudience}
            onChange={(g) =>
              setField("targetAudience", toggleArrayItem(form.targetAudience, g))
            }
            disabled={isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="キャスト最小人数 *">
              <Input
                type="number"
                min={1}
                value={form.castMin}
                onChange={(e) => setField("castMin", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
            <Field label="キャスト最大人数 *">
              <Input
                type="number"
                min={1}
                value={form.castMax}
                onChange={(e) => setField("castMax", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
            <Field label="男性 *">
              <Input
                type="number"
                min={0}
                value={form.castMale}
                onChange={(e) => setField("castMale", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
            <Field label="女性 *">
              <Input
                type="number"
                min={0}
                value={form.castFemale}
                onChange={(e) => setField("castFemale", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
            <Field label="不問 *">
              <Input
                type="number"
                min={0}
                value={form.castUnspecified}
                onChange={(e) => setField("castUnspecified", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
            <Field label="上演時間 (分) *">
              <Input
                type="number"
                min={1}
                max={600}
                value={form.duration}
                onChange={(e) => setField("duration", Number(e.target.value))}
                disabled={isPending}
              />
            </Field>
          </div>
          <p className="text-muted-foreground text-xs">
            男 {form.castMale} + 女 {form.castFemale} + 不問 {form.castUnspecified} = {form.castMale + form.castFemale + form.castUnspecified}（最大人数 {form.castMax} と一致させてください）
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <ScriptTagsCheckboxGrid
            value={form.scriptTags}
            onChange={(t) => setField("scriptTags", toggleArrayItem(form.scriptTags, t))}
            disabled={isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <Field label="価格 (円) *">
            <Input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setField("price", Number(e.target.value))}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">0 を指定すると無料</p>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFreeFullText}
              onChange={(e) => setField("isFreeFullText", e.target.checked)}
              disabled={isPending}
            />
            全文を無料公開する（プレビュー制限なし）
          </label>
          <Field label="サムネイル画像 URL">
            <Input
              type="url"
              value={form.thumbnailUrl ?? ""}
              onChange={(e) => setField("thumbnailUrl", e.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-medium">上演料の目安</p>
          {form.feeSchedule.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input
                value={row.condition}
                onChange={(e) => {
                  const next = [...form.feeSchedule];
                  next[idx] = { ...next[idx], condition: e.target.value };
                  setField("feeSchedule", next);
                }}
                placeholder="条件 (例: 1ステージ)"
                disabled={isPending}
              />
              <Input
                type="number"
                min={0}
                value={row.amount}
                onChange={(e) => {
                  const next = [...form.feeSchedule];
                  next[idx] = { ...next[idx], amount: Number(e.target.value) };
                  setField("feeSchedule", next);
                }}
                placeholder="金額"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setField("feeSchedule", form.feeSchedule.filter((_, i) => i !== idx))
                }
                disabled={isPending}
                aria-label="削除"
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("feeSchedule", [...form.feeSchedule, { condition: "", amount: 0 }])
            }
            disabled={isPending}
          >
            <PlusIcon /> 行を追加
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-medium">作家コメント</p>
          <textarea
            value={form.authorComment ?? ""}
            onChange={(e) => setField("authorComment", e.target.value)}
            rows={4}
            maxLength={2000}
            className="border-border bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            disabled={isPending}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "送信中…" : mode.kind === "create" ? "出品する" : "更新する"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-pressed={selected}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScriptTagsCheckboxGrid({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (t: string) => void;
  disabled?: boolean;
}) {
  // category 別にグルーピング
  const byCategory = new Map<string, typeof SCRIPT_TAG_DEFINITIONS>();
  for (const tag of SCRIPT_TAG_DEFINITIONS) {
    if (!byCategory.has(tag.category)) byCategory.set(tag.category, []);
    byCategory.get(tag.category)!.push(tag);
  }
  const CATEGORY_LABELS: Record<string, string> = {
    "stage-equipment": "舞台設備",
    "performance-style": "演出・表現",
    flexibility: "上演の柔軟性",
    feature: "作品の特徴",
    "venue-size": "会場規模",
    protagonist: "主人公",
    "cast-age": "主要キャスト年齢層",
  };
  return (
    <div>
      <p className="mb-2 text-sm font-medium">特性タグ</p>
      <div className="space-y-3">
        {[...byCategory.entries()].map(([category, tags]) => (
          <div key={category}>
            <p className="text-muted-foreground mb-1 text-xs">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const selected = value.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={selected}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
