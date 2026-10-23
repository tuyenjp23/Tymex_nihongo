import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { filterRows, listHref, pageWindow, paginate, type ListQuery } from "@/lib/listing";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ExplorerList, type ExplorerRow } from "@/components/content/explorer-list";

/**
 * Danh sách lớn (Từ vựng, Kanji…): tìm/lọc/phân trang chạy TRÊN SERVER, trình duyệt chỉ nhận đúng một trang thẻ.
 * Bộ lọc là form GET thường (hoạt động cả khi chưa tải xong JavaScript) và URL chia sẻ/đánh dấu được.
 */
export function ServerExplorer({
  basePath,
  rows,
  query,
  groups,
  groupLabel,
  searchPlaceholder = "Tìm bằng Kanji, kana, romaji hoặc tiếng Việt…",
  pageSize,
}: {
  basePath: string;
  rows: (ExplorerRow & { group?: string })[];
  query: ListQuery;
  groups?: { value: string; label: string }[];
  groupLabel?: string;
  searchPlaceholder?: string;
  pageSize?: number;
}) {
  const filtered = filterRows(rows, query);
  const res = paginate(filtered, query.page, pageSize);
  const active = !!(query.q || query.level || query.group);
  const link = (page: number) => listHref(basePath, query, { page });
  return (
    <div>
      <form key={`${query.q}|${query.level}|${query.group}`} method="get" action={basePath} role="search" aria-label="Tìm và lọc" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <div>
          <label htmlFor="ex-q" className="sr-only">Tìm kiếm</label>
          <Input id="ex-q" name="q" type="search" defaultValue={query.q} placeholder={searchPlaceholder} />
        </div>
        <div>
          <label htmlFor="ex-lv" className="sr-only">Lọc theo cấp</label>
          <Select id="ex-lv" name="level" defaultValue={query.level}>
            <option value="">Mọi cấp</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </div>
        {groups && groups.length > 0 ? (
          <div>
            <label htmlFor="ex-gr" className="sr-only">{groupLabel ?? "Nhóm"}</label>
            <Select id="ex-gr" name="group" defaultValue={query.group}>
              <option value="">{groupLabel ? `Mọi ${groupLabel.toLowerCase()}` : "Tất cả"}</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </div>
        ) : null}
        <Button type="submit">Tìm</Button>
        {active ? <ButtonLink href={basePath} variant="ghost">Xóa lọc</ButtonLink> : null}
      </form>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {res.total === 0 ? "0 mục" : `Mục ${res.from}–${res.to} / ${res.total}`}
        {active ? ` (đang lọc, tổng ${rows.length})` : ""}
      </p>

      {res.total === 0 ? (
        <EmptyState title="Không tìm thấy mục nào" description="Thử bỏ bớt bộ lọc, gõ từ khóa ngắn hơn, hoặc tìm bằng romaji/tiếng Anh/tiếng Việt không dấu." />
      ) : (
        <>
          <ExplorerList rows={res.items} />
          {res.pages > 1 ? (
            <nav aria-label="Phân trang" className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-sm">
              {res.page > 1 ? <Link className="nc-touch rounded-md border border-border px-3 py-2 hover:bg-muted" href={link(res.page - 1)} rel="prev">← Trước</Link> : <span className="px-3 py-2 text-muted-foreground">← Trước</span>}
              {pageWindow(res.page, res.pages).map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">…</span>
                ) : n === res.page ? (
                  <span key={n} aria-current="page" className="rounded-md bg-primary px-3 py-2 font-medium tabular-nums text-primary-foreground">{n}</span>
                ) : (
                  <Link key={n} className="nc-touch rounded-md border border-border px-3 py-2 tabular-nums hover:bg-muted" href={link(n)}>{n}</Link>
                ),
              )}
              {res.page < res.pages ? <Link className="nc-touch rounded-md border border-border px-3 py-2 hover:bg-muted" href={link(res.page + 1)} rel="next">Sau →</Link> : <span className="px-3 py-2 text-muted-foreground">Sau →</span>}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
