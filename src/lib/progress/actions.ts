"use client";
import * as React from "react";
import { progressStore } from "./store";
import { awardBadges, logStudy, type Progress } from "./model";
import { BADGES, earnedBadgeIds } from "./badges";
import { todayString } from "../dates";

/**
 * Ghi một hoạt động học (phút/XP/lượt ôn) + tự cấp huy hiệu đạt điều kiện.
 * Trả về danh sách tiêu đề huy hiệu MỚI nhận để giao diện báo (toast).
 */
export function recordActivity(add: { minutes?: number; xp?: number; reviews?: number }, mutate?: (p: Progress) => Progress): string[] {
  const today = todayString();
  let fresh: string[] = [];
  progressStore.update((p) => {
    let next = logStudy(mutate ? mutate(p) : p, today, add);
    const ids = earnedBadgeIds(next, today).filter((id) => !next.badges[id]);
    fresh = ids;
    next = awardBadges(next, ids, today);
    return next;
  });
  return fresh.map((id) => BADGES.find((b) => b.id === id)?.title ?? id);
}

/** Đồng hồ thời gian học thật: số phút từ lúc component mount (tối đa `capMinutes`, tránh tính cả lúc bỏ tab mở). */
export function useStudyTimer(capMinutes = 30) {
  const start = React.useRef<number>(0);
  React.useEffect(() => {
    start.current = Date.now();
  }, []);
  return React.useCallback(() => {
    if (!start.current) return 0;
    const m = (Date.now() - start.current) / 60000;
    return Math.min(capMinutes, Math.round(m * 10) / 10);
  }, [capMinutes]);
}
