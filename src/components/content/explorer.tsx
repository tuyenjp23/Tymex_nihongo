"use client";
import * as React from "react";
import Link from "next/link";
import { matchesQuery } from "@/lib/search";
import { LEVELS } from "@/lib/types";
import type { Status } from "@/lib/types";
import { useProgress } from "@/lib/progress/store";
import { Input, Select } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Ja } from "@/components/ja";
import { Figure } from "@/components/content/figure";
import { CheckCircle2, Search } from "@/components/icons";
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

const PAGE = 48;

export function Explorer({
  rows,
  groupLabel,
  groups,
  levels = [...LEVELS],
  emptyHint,
  showLevelFilter = true,
  initialLevel = "",
  searchPlaceholder = "Tìm bằng Kanji, kana, romaji hoặc tiếng Việt…",
}: {
  rows: ExplorerRow[];
  groupLabel?: string;
  groups?: { value: string; label: string }[];
  levels?: string[];
  emptyHint?: string;
  showLevelFilter?: boolean;
  initialLevel?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = React.useState("");
  const [level, setLevel] = React.useState(initialLevel);
  const [group, setGroup] = React.useState("");
  const [seenFilter, setSeenFilter] = React.useState<"" | "seen" | "unseen">("");
  const [limit, setLimit] = React.useState(PAGE);
  const progress = useProgress();
  const id = React.useId();

  const filtered = React.useMemo(
    () =>
      rows.filter((r) => {
        if (level && r.level !== level) return false;
        if (group && r.group !== group) return false;
        if (seenFilter && progress && r.seenKey) {
          const seen = !!progress.seen[r.seenKey];
          if (seenFilter === "seen" && !seen) return false;
          if (seenFilter === "unseen" && seen) return false;
        }
        return matchesQuery(r.index, q);
      }),
    [rows, q, level, group, seenFilter, progress],
  );

  React.useEffect(() => setLimit(PAGE), [q, level, group, seenFilter]);

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <label htmlFor={`${id}-q`} className="sr-only">Tìm kiếm</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="pl-9" />
        </div>
        {showLevelFilter ? (
          <div>
            <label htmlFor={`${id}-lv`} className="sr-only">Lọc theo cấp</label>
            <Select id={`${id}-lv`} value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Mọi cấp</option>
              {levels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
        ) : null}
        {groups && groups.length > 0 ? (
          <div>
            <label htmlFor={`${id}-gr`} className="sr-only">{groupLabel ?? "Nhóm"}</label>
            <Select id={`${id}-gr`} value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">{groupLabel ? `Mọi ${groupLabel.toLowerCase()}` : "Tất cả"}</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <label htmlFor={`${id}-seen`} className="sr-only">Lọc theo đã xem</label>
          <Select id={`${id}-seen`} value={seenFilter} onChange={(e) => setSeenFilter(e.target.value as typeof seenFilter)}>
            <option value="">Đã xem + chưa xem</option>
            <option value="unseen">Chưa xem</option>
            <option value="seen">Đã xem</option>
          </Select>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} / {rows.length} mục
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy mục nào"
          description={emptyHint ?? "Thử bỏ bớt bộ lọc, gõ từ khóa ngắn hơn, hoặc tìm bằng romaji/tiếng Việt không dấu."}
        />
      ) : (
        <>
          <ul className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, limit).map((r) => {
              const seen = r.seenKey && progress ? !!progress.seen[r.seenKey] : false;
              return (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    className="nc-card flex h-full gap-3 transition-colors hover:bg-muted"
                    style={{ padding: "calc(var(--card-padding) * 0.8)" }}
                  >
                    {r.imageUrl ? (
                      <Figure src={r.imageUrl} alt={r.imageAlt ?? ""} className="h-16 w-16 shrink-0" />
                    ) : r.big ? (
                      <span className="jp grid h-16 w-16 shrink-0 place-items-center rounded-md bg-muted text-4xl" lang="ja">{r.big}</span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {r.titleIsJapanese === false ? (
                          <span className="font-semibold">{r.title}</span>
                        ) : (
                          <Ja text={r.title} className={cn("text-lg font-semibold leading-snug")} />
                        )}
                        {seen ? <CheckCircle2 size={16} className="mt-1 shrink-0 text-success" aria-label="Đã xem" /> : null}
                      </div>
                      {r.subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{r.subtitle}</p> : null}
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
          {filtered.length > limit ? (
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="nc-touch h-10 rounded-md border border-border px-5 text-sm hover:bg-muted">
                Xem thêm ({filtered.length - limit} mục)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
