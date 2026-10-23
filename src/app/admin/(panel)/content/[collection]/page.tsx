import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS, LEVELS, STATUSES, STATUS_LABELS, type CollectionKey, type Status } from "@/lib/types";
import { COLLECTION_LABELS, levelOfRecord, recordTitle } from "@/lib/schemas";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge, LevelBadge, OriginBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Plus } from "@/components/icons";
import { formatDateTimeVi } from "@/lib/dates";
import type { Origin } from "@/lib/types";

const PAGE_SIZE = 40;

type Rec = Record<string, unknown> & { id: string; updated_at: string };

export default async function ContentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ q?: string; status?: string; level?: string; hidden?: string; source?: string; vi?: string; page?: string }>;
}) {
  await requireAdmin();
  const { collection } = await params;
  if (!(COLLECTION_KEYS as readonly string[]).includes(collection)) notFound();
  const c = collection as CollectionKey;
  const sp = await searchParams;
  const store = await getStore();
  const all = (await store.list(c)) as unknown as Rec[];
  const sourceList = (await store.list("sources")) as unknown as { id: string; source_name: string }[];
  const hasVi = c === "vocabulary" || c === "kanji" || c === "sentences";
  const viMissing = (r: Rec) => (c === "sentences" ? !((r.translations as { lang: string }[] | undefined) ?? []).some((t) => t.lang === "vi") : !String(r.meaning_vi ?? "").trim());

  const q = (sp.q ?? "").trim().toLowerCase();
  const statusOf = (r: Rec) => (r.status ?? r.verification_status ?? "draft") as Status;
  const filtered = all
    .filter((r) => {
      if (sp.status && (STATUSES as readonly string[]).includes(sp.status) && statusOf(r) !== sp.status) return false;
      if (sp.level && levelOfRecord(r) !== sp.level) return false;
      if (sp.hidden === "1" && !r.hidden) return false;
      if (sp.hidden === "0" && r.hidden) return false;
      if (sp.source && String(r.source_id ?? "") !== sp.source) return false;
      if (hasVi && sp.vi === "missing" && !viMissing(r)) return false;
      if (hasVi && sp.vi === "machine" && !(r.vi_kind === "machine_translated" || ((r.translations as { kind: string }[] | undefined) ?? []).some((t) => t.kind === "machine_translated"))) return false;
      if (q) {
        const hay = `${r.id} ${recordTitle(c, r)} ${JSON.stringify(r.tags ?? "")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasLevel = c !== "sources" && c !== "images";
  const label = COLLECTION_LABELS[c];

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, status: sp.status, level: sp.level, hidden: sp.hidden, source: sp.source, vi: sp.vi, ...over })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={label.plural}
        description={`${all.length} bản ghi${filtered.length !== all.length ? ` · đang lọc ${filtered.length}` : ""}`}
        actions={
          <ButtonLink href={`/admin/content/${c}/new`}>
            <Plus size={16} aria-hidden="true" /> Thêm {label.singular.toLowerCase()}
          </ButtonLink>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search" aria-label="Lọc danh sách">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="mb-1 block text-xs text-muted-foreground">Tìm theo ID / tiêu đề / thẻ</label>
          <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Tìm…" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted-foreground">Trạng thái</label>
          <Select id="status" name="status" defaultValue={sp.status ?? ""}>
            <option value="">Tất cả</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>
        {hasLevel ? (
          <div>
            <label htmlFor="level" className="mb-1 block text-xs text-muted-foreground">Cấp</label>
            <Select id="level" name="level" defaultValue={sp.level ?? ""}>
              <option value="">Tất cả</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </div>
        ) : null}
        <div>
          <label htmlFor="hidden" className="mb-1 block text-xs text-muted-foreground">Hiển thị</label>
          <Select id="hidden" name="hidden" defaultValue={sp.hidden ?? ""}>
            <option value="">Tất cả</option>
            <option value="0">Đang hiện</option>
            <option value="1">Đang ẩn</option>
          </Select>
        </div>
        <div>
          <label htmlFor="source" className="mb-1 block text-xs text-muted-foreground">Nguồn</label>
          <Select id="source" name="source" defaultValue={sp.source ?? ""}>
            <option value="">Tất cả</option>
            {sourceList.map((s) => (
              <option key={s.id} value={s.id}>{s.source_name.slice(0, 48)}</option>
            ))}
          </Select>
        </div>
        {hasVi ? (
          <div>
            <label htmlFor="vi" className="mb-1 block text-xs text-muted-foreground">Tiếng Việt</label>
            <Select id="vi" name="vi" defaultValue={sp.vi ?? ""}>
              <option value="">Tất cả</option>
              <option value="missing">Chưa có tiếng Việt</option>
              <option value="machine">Có dịch máy</option>
            </Select>
          </div>
        ) : null}
        <Button type="submit" variant="secondary">Lọc</Button>
        {sp.q || sp.status || sp.level || sp.hidden || sp.source || sp.vi ? (
          <ButtonLink href={`/admin/content/${c}`} variant="ghost">Xóa lọc</ButtonLink>
        ) : null}
      </form>

      {shown.length === 0 ? (
        <EmptyState title="Không có bản ghi nào" description={all.length === 0 ? "Hãy thêm bản ghi đầu tiên hoặc nhập từ file." : "Không có bản ghi khớp bộ lọc."} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">Danh sách {label.plural}</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2">Tiêu đề</th>
                {hasLevel ? <th scope="col" className="px-2 py-2">Cấp</th> : null}
                <th scope="col" className="px-2 py-2">Trạng thái</th>
                <th scope="col" className="px-2 py-2">Nguồn gốc</th>
                <th scope="col" className="px-4 py-2">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/content/${c}/${encodeURIComponent(r.id)}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      <span lang="ja">{recordTitle(c, r) || r.id}</span>
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.id}{r.hidden ? <Badge className="ml-2" tone="warning">Ẩn</Badge> : null}</div>
                  </td>
                  {hasLevel ? <td className="px-2 py-2">{levelOfRecord(r) ? <LevelBadge level={levelOfRecord(r)!} /> : null}</td> : null}
                  <td className="px-2 py-2"><StatusBadge status={statusOf(r)} /></td>
                  <td className="px-2 py-2">{r.origin ? <OriginBadge origin={r.origin as Origin} /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{formatDateTimeVi(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 ? (
        <nav aria-label="Phân trang" className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? <Link className="text-primary underline" href={qs({ page: page - 1 })}>← Trước</Link> : <span className="text-muted-foreground">← Trước</span>}
          <span>Trang {page}/{pages}</span>
          {page < pages ? <Link className="text-primary underline" href={qs({ page: page + 1 })}>Sau →</Link> : <span className="text-muted-foreground">Sau →</span>}
        </nav>
      ) : null}
    </>
  );
}
