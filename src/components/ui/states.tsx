import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "@/components/icons";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("nc-skeleton h-4 w-full", className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Đang tải" className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

const ALERT_STYLES = {
  info: { cls: "border-primary/40", Icon: Info, color: "text-primary" },
  warning: { cls: "border-warning/60", Icon: AlertTriangle, color: "text-warning" },
  danger: { cls: "border-danger/60", Icon: XCircle, color: "text-danger" },
  success: { cls: "border-success/60", Icon: CheckCircle2, color: "text-success" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT_STYLES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = ALERT_STYLES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-md border bg-card p-3 text-sm", s.cls, className)}>
      <s.Icon size={18} className={cn("mt-0.5 shrink-0", s.color)} aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5 text-muted-foreground" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
