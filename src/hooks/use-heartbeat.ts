"use client";

import { useEffect } from "react";

import { pingActivity } from "@/app/actions/notification";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 分

/**
 * users.lastActiveAt を 1 分間隔で更新するためのアクティブ ping フック。
 * onlineチェック (spec.md §9) に使う。
 *
 * SiteShell のような全画面共通レイアウト直下で 1 度だけマウントすればよい。
 */
export function useHeartbeat() {
  useEffect(() => {
    let cancelled = false;
    function ping() {
      if (cancelled) return;
      void pingActivity();
    }
    // 即時 + インターバル
    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    // ページ可視化時にも ping
    function onVisibilityChange() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
