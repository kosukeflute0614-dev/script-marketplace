"use client";

import { useHeartbeat } from "@/hooks/use-heartbeat";

/**
 * SiteShell から呼ぶ Heartbeat マウント用の Client Component。
 * 何もレンダリングせず、useHeartbeat を起動するだけ。
 */
export function Heartbeat() {
  useHeartbeat();
  return null;
}
