"use client";
import * as React from "react";
import { progressStore } from "@/lib/progress/store";
import { markSeen, setLessonStatus } from "@/lib/progress/model";
import { todayString } from "@/lib/dates";

/** Ghi nhận "đã xem" khi người học mở trang chi tiết. Không hiển thị gì. */
export function MarkSeen({ itemKey }: { itemKey: string }) {
  React.useEffect(() => {
    progressStore.update((p) => markSeen(p, itemKey, todayString()));
  }, [itemKey]);
  return null;
}

/** Đánh dấu bài học đã bắt đầu khi mở trang. */
export function MarkLessonStarted({ lessonId }: { lessonId: string }) {
  React.useEffect(() => {
    progressStore.update((p) => setLessonStatus(p, lessonId, "started"));
  }, [lessonId]);
  return null;
}
