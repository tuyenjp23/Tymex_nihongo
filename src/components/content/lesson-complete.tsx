"use client";
import * as React from "react";
import { progressStore, useProgress } from "@/lib/progress/store";
import { setLessonStatus } from "@/lib/progress/model";
import { recordActivity, useStudyTimer } from "@/lib/progress/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2 } from "@/components/icons";

export function LessonComplete({ lessonId, estMinutes }: { lessonId: string; estMinutes: number }) {
  const progress = useProgress();
  const elapsed = useStudyTimer(Math.max(estMinutes * 2, 10));
  const { toast } = useToast();
  const done = progress?.lessons[lessonId]?.status === "done";

  function complete() {
    if (done) return;
    const badges = recordActivity({ minutes: elapsed(), xp: 20 }, (p) => setLessonStatus(p, lessonId, "done"));
    toast("Đã đánh dấu hoàn thành bài (+20 XP)", "success");
    for (const b of badges) toast(`Huy hiệu mới: ${b}`, "success");
  }
  function undo() {
    progressStore.update((p) => {
      const lessons = { ...p.lessons, [lessonId]: { status: "started" as const, at: new Date().toISOString() } };
      return { ...p, lessons };
    });
  }

  if (!progress) return null;
  return done ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
        <CheckCircle2 size={18} aria-hidden="true" /> Bạn đã hoàn thành bài này
      </span>
      <Button variant="ghost" size="sm" onClick={undo}>Bỏ đánh dấu</Button>
    </div>
  ) : (
    <Button onClick={complete}>Đánh dấu hoàn thành</Button>
  );
}
