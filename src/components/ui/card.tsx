import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("nc-card", className)} {...props} />;
}

export function CardTitle({ className, as: As = "h2", ...props }: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" }) {
  return <As className={cn("text-base font-semibold leading-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function PageHeader({
  title,
  titleJa,
  description,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  /** Nhãn tiếng Nhật của mục (vd. 語彙) — hiện nhỏ phía trên tiêu đề, chỉ để tạo bản sắc và gợi từ Nhật cho người học */
  titleJa?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-border-soft pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</div> : null}
        {titleJa && !eyebrow ? <p className="nc-eyebrow mb-1.5" lang="ja"><span className="nc-display-ja text-sm tracking-[0.3em] normal-case">{titleJa}</span></p> : null}
        <h1 className="text-2xl font-bold leading-tight sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
