"use client";
import Link from "next/link";
import type { Status } from "@/lib/types";
import { useProgress } from "@/lib/progress/store";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Ja } from "@/components/ja";
import { Figure } from "@/components/content/figure";
import { CheckCircle2 } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface ExplorerRow {
  id: string;
  href: string;
  level: string;
  /** nhóm lọc (chủ đề / danh mục / kỹ năng) — slug */
  group?: string;
  /** Chữ lớn (Kanji) */
  big?: string;
  /** Tiêu đề: có thể chứa chú âm {漢字|かんじ} */
  title: string;
  titleIsJapanese?: boolean;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  imageAlt?: string;
  status: Status;
  /** Chuỗi tìm kiếm đã chuẩn hóa từ server (buildSearchIndex) */
  index: string;
  /** Khóa tiến độ để hiện dấu "đã xem" */
  seenKey?: string;
}


/** Lưới thẻ (không lọc, không phân trang): chỉ vẽ đúng các dòng được truyền vào + dấu "đã xem" đọc từ trình duyệt. */
export function ExplorerList({ rows }: { rows: ExplorerRow[] }) {
  const progress = useProgress();
  return (
    <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const seen = r.seenKey && progress ? !!progress.seen[r.seenKey] : false;
        return (
          <li key={r.id}>
            <Link
              href={r.href}
              className="nc-card nc-lift flex h-full gap-4 hover:bg-muted"
              style={{ padding: "calc(var(--card-padding) * 0.8)" }}
            >
              {r.imageUrl ? (
                <Figure src={r.imageUrl} alt={r.imageAlt ?? ""} className="h-20 w-20 shrink-0 rounded-lg" />
              ) : r.big ? (
                <span className="nc-display-ja grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-border-soft bg-[color-mix(in_oklab,var(--gold)_10%,var(--card))] text-5xl leading-none text-ink dark:text-foreground" lang="ja">{r.big}</span>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  {r.titleIsJapanese === false ? (
                    <span className="font-semibold tracking-wide">{r.title}</span>
                  ) : (
                    <Ja text={r.title} className={cn("text-lg font-semibold !leading-snug")} />
                  )}
                  {seen ? <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs text-success"><CheckCircle2 size={14} aria-hidden /><span>Đã xem</span></span> : null}
                </div>
                {r.subtitle ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{r.subtitle}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="primary">{r.level}</Badge>
                  {r.meta ? <Badge>{r.meta}</Badge> : null}
                  {r.status !== "verified" && r.status !== "published" ? <StatusBadge status={r.status} /> : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
