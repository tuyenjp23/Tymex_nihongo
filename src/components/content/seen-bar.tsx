"use client";
import { useProgress } from "@/lib/progress/store";
import { useItemLevels } from "@/lib/use-item-levels";
import { Progress } from "@/components/ui/progress";
import type { Level } from "@/lib/types";

/** Thanh "đã xem x/y mục" của một cấp: tổng do server tính, số đã xem đếm ở trình duyệt từ tiến độ của người học. */
export function SeenBar({ level, total, label }: { level: Level; total: number; label: string }) {
  const p = useProgress();
  const levels = useItemLevels();
  const ready = !!p && levels !== null && levels !== "error";
  let seen = 0;
  if (ready) for (const k of Object.keys(p.seen)) if (p.seen[k] && levels.get(k) === level) seen++;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{ready ? `${seen}/${total}` : levels === "error" ? "—" : "…"}</span>
      </div>
      <Progress value={seen} max={Math.max(total, 1)} label={label} />
    </div>
  );
}
