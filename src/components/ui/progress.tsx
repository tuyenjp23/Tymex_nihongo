import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  label,
  className,
  tone = "primary",
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
  tone?: "primary" | "success" | "accent" | "warning";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = { primary: "bg-primary", success: "bg-success", accent: "bg-accent", warning: "bg-warning" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(Math.min(value, max))}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
