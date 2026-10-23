import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getDataDir, getStore } from "@/lib/store";
import { STATUSES, STATUS_LABELS, type CollectionKey, type Status } from "@/lib/types";
import { IMPORT_POLICY_LABELS, SOURCE_TYPE_LABELS, type Source } from "@/lib/schemas";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/states";
import { formatDateTimeVi } from "@/lib/dates";

export const metadata = { title: "Nguồn dữ liệu" };
export const dynamic = "force-dynamic";

type Rec = Record<string, unknown> & { id: string };
const LEARN: { key: Extract<CollectionKey, "vocabulary" | "kanji" | "sentences" | "grammar" | "questions" | "passages" | "conversations" | "lessons">; label: string }[] = [
  { key: "vocabulary", label: "Từ vựng" },
  { key: "kanji", label: "Kanji" },
  { key: "sentences", label: "Câu ví dụ" },
  { key: "grammar", label: "Ngữ pháp" },
  { key: "questions", label: "Câu hỏi" },
  { key: "passages", label: "Bài đọc/nghe" },
  { key: "conversations", label: "Hội thoại" },
  { key: "lessons", label: "Bài học" },
];

const REUSE_LABELS: Record<string, string> = { no: "Không được sao chép", personal_only: "Chỉ dùng cá nhân", conditional: "Có điều kiện", unknown: "Chưa rõ", own: "Tự biên soạn" };

interface SavedReport {
  runId: string;
  mode: string;
  startedAt: string;
  group: string;
  dataset: { version: string };
  counts: Record<string, { created: number; updated: number; skipped: number; errors: number }>;
  _file: string;
}

function recentReports(dataDir: string): SavedReport[] {
  const dir = path.join(dataDir, "import", "reports");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ ...(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as SavedReport), _file: f }))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 8);
  } catch {
    return [];
  }
}

export default async function DataSourcesPage() {
  await requireAdmin();
  const store = await getStore();
  const sources = (await store.list("sources")) as unknown as Source[];
  const data = Object.fromEntries(await Promise.all(LEARN.map(async (c) => [c.key, (await store.list(c.key)) as unknown as Rec[]] as const))) as Record<(typeof LEARN)[number]["key"], Rec[]>;

  // Đếm bản ghi theo nguồn: nguồn nội dung (source_id), nguồn của cấp độ (level_source)
  const stats = new Map<string, { byCollection: Record<string, number>; byStatus: Record<string, number>; levelRefs: number; total: number }>();
  const slot = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = { byCollection: {}, byStatus: {}, levelRefs: 0, total: 0 };
      stats.set(id, s);
    }
    return s;
  };
  for (const c of LEARN) {
    for (const r of data[c.key]) {
      if (r.source_id) {
        const s = slot(String(r.source_id));
        s.byCollection[c.key] = (s.byCollection[c.key] ?? 0) + 1;
        s.byStatus[String(r.status)] = (s.byStatus[String(r.status)] ?? 0) + 1;
        s.total++;
      }
      if (r.level_source) slot(String(r.level_source)).levelRefs++;
    }
  }

  const used = sources.filter((s) => (stats.get(s.id)?.total ?? 0) > 0 || (stats.get(s.id)?.levelRefs ?? 0) > 0);
  const unused = sources.filter((s) => !used.includes(s));
  const reports = store.mode === "local" ? recentReports(getDataDir()) : [];
  const importedTotal = LEARN.reduce((n, c) => n + data[c.key].filter((r) => r.origin === "imported_dataset").length, 0);
  const warn = sources.filter((s) => s.import_policy === "allowed" && (!s.license_name || !s.license_url || (s.attribution_required && !s.attribution_text)));

  const Row = ({ s }: { s: Source }) => {
    const st = stats.get(s.id);
    return (
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold">{s.source_name}</h3>
            <p className="text-sm text-muted-foreground">{s.publisher} · {SOURCE_TYPE_LABELS[s.source_type]}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={s.import_policy === "allowed" ? "success" : s.import_policy === "blocked" ? "danger" : "neutral"}>{IMPORT_POLICY_LABELS[s.import_policy]}</Badge>
            <Link href={`/admin/content/sources/${encodeURIComponent(s.id)}`} className="text-sm text-primary underline-offset-4 hover:underline">Sửa</Link>
          </div>
        </div>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[11rem_1fr]">
          <dt className="text-muted-foreground">Giấy phép</dt>
          <dd>{s.license_name || "—"}{s.license_url ? <> · <a className="break-all text-primary underline" href={s.license_url} target="_blank" rel="noopener noreferrer">điều khoản</a></> : null}</dd>
          <dt className="text-muted-foreground">Quyền dùng nội dung</dt><dd>{REUSE_LABELS[s.reuse_allowed]}{s.allowed_use ? ` — ${s.allowed_use}` : ""}</dd>
          <dt className="text-muted-foreground">Phiên bản / ngày lấy</dt><dd>{s.version || "—"} · {s.retrieved_at ?? "chưa có"}</dd>
          <dt className="text-muted-foreground">Ghi công</dt><dd>{s.attribution_required ? (s.attribution_text || <span className="text-danger">BẮT BUỘC nhưng chưa có câu ghi công</span>) : "Không bắt buộc"}</dd>
          {s.source_url ? (<><dt className="text-muted-foreground">Liên kết</dt><dd><a className="break-all text-primary underline" href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_url}</a></dd></>) : null}
        </dl>
        {st ? (
          <div className="text-sm">
            <p className="font-medium">Dữ liệu từ nguồn này trong kho: {st.total} bản ghi{st.levelRefs ? ` · làm căn cứ cấp độ cho ${st.levelRefs} bản ghi` : ""}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {Object.entries(st.byCollection).map(([k, n]) => (
                <li key={k}>
                  <Link className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted" href={`/admin/content/${k}?source=${encodeURIComponent(s.id)}`}>{LEARN.find((x) => x.key === k)?.label ?? k}: {n}</Link>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">{STATUSES.filter((x) => st.byStatus[x]).map((x) => `${STATUS_LABELS[x as Status]}: ${st.byStatus[x]}`).join(" · ")}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có bản ghi nào trong kho dùng nguồn này.</p>
        )}
        {s.update_history.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Lịch sử cập nhật ({s.update_history.length})</summary>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {[...s.update_history].reverse().slice(0, 15).map((u, i) => (
                <li key={i}>{formatDateTimeVi(u.at)} · {u.version} · nhóm {u.group} · {u.summary}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <p className="text-xs text-muted-foreground">{s.license_note}</p>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Nguồn dữ liệu" description="Nguồn nào đang được dùng, giấy phép gì, phiên bản nào và dữ liệu nào trong kho đến từ đâu." />
      <Alert tone="info" title="Quy tắc nhập dữ liệu" className="mb-4">
        Chỉ nguồn được đánh dấu <strong>“Được phép nhập”</strong> (đã đọc giấy phép) mới được công cụ nhập sử dụng; nguồn <strong>“CHẶN nhập”</strong> chỉ để liên kết.
        Công cụ nhập chạy bằng dòng lệnh (<code>npm run import:plan</code> / <code>import:apply</code>) — app không tự nhập khi mở.
        {store.mode !== "local" ? " (Chế độ Supabase: lệnh nhập chỉ chạy với kho local; dùng gói xuất/nhập để chuyển dữ liệu.)" : ""}
      </Alert>
      {warn.length > 0 ? (
        <Alert tone="warning" title="Nguồn thiếu thông tin giấy phép/ghi công" className="mb-4">
          {warn.map((s) => s.source_name).join("; ")}. Bổ sung trước khi nhập thêm dữ liệu.
        </Alert>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Nguồn trong sổ</p><p className="text-3xl font-bold">{sources.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Bản ghi nhập từ bộ dữ liệu mở</p><p className="text-3xl font-bold">{importedTotal}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Nguồn bị chặn nhập</p><p className="text-3xl font-bold">{sources.filter((s) => s.import_policy === "blocked").length}</p></Card>
      </div>

      <h2 className="mb-2 text-lg font-semibold">Nguồn đang được dùng ({used.length})</h2>
      <ul className="mb-6 space-y-3">{used.map((s) => <li key={s.id}><Row s={s} /></li>)}</ul>

      <h2 className="mb-2 text-lg font-semibold">Nguồn chưa có dữ liệu trong kho ({unused.length})</h2>
      <ul className="mb-6 space-y-3">{unused.map((s) => <li key={s.id}><Row s={s} /></li>)}</ul>

      <Card>
        <CardTitle>Các lần nhập gần đây</CardTitle>
        {store.mode !== "local" ? (
          <p className="mt-2 text-sm text-muted-foreground">Báo cáo nhập được lưu trên máy chạy lệnh (kho local) — không có trong chế độ Supabase.</p>
        ) : reports.length === 0 ? (
          <div className="mt-2"><EmptyState title="Chưa có lần nhập nào" description="Chạy npm run import:plan -- --group jlpt-n5 để xem thử, rồi import:apply để nhập." /></div>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {reports.map((r) => (
              <li key={r._file} className="py-2">
                <p><Badge tone={r.mode === "apply" ? "success" : "neutral"} className="mr-2">{r.mode === "apply" ? "Đã ghi" : "Chạy thử"}</Badge><span className="font-medium">{r.runId}</span> · nhóm {r.group} · {r.dataset.version}</p>
                <p className="text-xs text-muted-foreground">{formatDateTimeVi(r.startedAt)} · {Object.entries(r.counts).map(([k, c]) => `${k}: +${c.created}/~${c.updated}/bỏ qua ${c.skipped}/lỗi ${c.errors}`).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">Báo cáo chi tiết: data/import/reports/{r._file.replace(/\.json$/, ".md")}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
