"use client";
import { useProgress } from "@/lib/progress/store";
import { Progress } from "@/components/ui/progress";

/** Thanh "đã xem x/y mục" cho một tập khóa tiến độ (đọc từ trình duyệt). */
export function SeenBar({ keys, label }: { keys: string[]; label: string }) {
  const p = useProgress();
  const seen = p ? keys.filter((k) => p.seen[k]).length : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{p ? `${seen}/${keys.length}` : "…"}</span>
      </div>
      <Progress value={seen} max={Math.max(keys.length, 1)} label={label} />
    </div>
  );
}
