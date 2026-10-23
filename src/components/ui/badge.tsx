import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, ORIGIN_LABELS, type Status, type Origin } from "@/lib/types";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "border-border bg-muted text-foreground",
      primary: "border-transparent bg-[color-mix(in_oklab,var(--primary)_14%,var(--background))] text-primary",
      accent: "border-transparent bg-[color-mix(in_oklab,var(--accent)_14%,var(--background))] text-accent",
      success: "border-transparent bg-[color-mix(in_oklab,var(--success)_14%,var(--background))] text-success",
      warning: "border-transparent bg-[color-mix(in_oklab,var(--warning)_16%,var(--background))] text-warning",
      danger: "border-transparent bg-[color-mix(in_oklab,var(--danger)_14%,var(--background))] text-danger",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONE: Record<Status, "neutral" | "warning" | "primary" | "success"> = {
  draft: "neutral",
  imported: "neutral",
  machine_translated: "warning",
  ai_generated: "warning",
  needs_review: "warning",
  verified: "success",
  published: "success",
};

/** Huy hiệu trạng thái xác minh — luôn kèm chữ (không chỉ dựa vào màu). */
export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function OriginBadge({ origin }: { origin: Origin }) {
  return <Badge tone={origin === "official_sample" ? "primary" : "neutral"}>{ORIGIN_LABELS[origin]}</Badge>;
}

export function LevelBadge({ level }: { level: string }) {
  return <Badge tone="primary">{level}</Badge>;
}
