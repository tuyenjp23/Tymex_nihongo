"use client";
import * as React from "react";
import { matchesQuery } from "@/lib/search";
import { LEVELS } from "@/lib/types";
import { useProgress } from "@/lib/progress/store";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Search } from "@/components/icons";
import { ExplorerList, type ExplorerRow } from "@/components/content/explorer-list";

export type { ExplorerRow };

const PAGE = 48;

export function Explorer({
  rows,
  groupLabel,
  groups,
  levels = [...LEVELS],
  emptyHint,
  showLevelFilter = true,
  initialLevel = "",
  initialGroup = "",
  searchPlaceholder = "Tìm bằng Kanji, kana, romaji hoặc tiếng Việt…",
}: {
  rows: ExplorerRow[];
  groupLabel?: string;
  groups?: { value: string; label: string }[];
  levels?: string[];
  emptyHint?: string;
  showLevelFilter?: boolean;
  initialLevel?: string;
  initialGroup?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = React.useState("");
  const [level, setLevel] = React.useState(initialLevel);
  const [group, setGroup] = React.useState(initialGroup);
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
          <ExplorerList rows={filtered.slice(0, limit)} />
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
