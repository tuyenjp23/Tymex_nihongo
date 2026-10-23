"use client";
import { useProgress } from "@/lib/progress/store";
import { Badge } from "@/components/ui/badge";

export function GameStatsBadge({ mode }: { mode: string }) {
  const p = useProgress();
  const g = p?.games[mode];
  if (!g) return <Badge tone="primary">Mới</Badge>;
  return <Badge tone="success">Cao nhất {g.best}</Badge>;
}
