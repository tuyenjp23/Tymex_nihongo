import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS, STATUSES, STATUS_LABELS, type CollectionKey, type Status } from "@/lib/types";
import { COLLECTION_LABELS, type Source } from "@/lib/schemas";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeVi } from "@/lib/dates";

export const metadata = { title: "Tổng quan" };

type Rec = { id: string; status?: Status; verification_status?: Status; hidden?: boolean; source_id?: string | null; origin?: string };

export default async function AdminHome() {
  await requireAdmin();
  const store = await getStore();
  const data = Object.fromEntries(await Promise.all(COLLECTION_KEYS.map(async (c) => [c, (await store.list(c)) as unknown as Rec[]] as const))) as Record<CollectionKey, Rec[]>;
  const audit = await store.listAudit({ limit: 8 });
  const sources = new Map((data.sources as unknown as Source[]).map((s) => [s.id, s]));

  const statusOf = (r: Rec): Status => (r.status ?? r.verification_status ?? "draft") as Status;
  let totalNeedsWork = 0;
  const rows = COLLECTION_KEYS.map((c) => {
    const by = Object.fromEntries(STATUSES.map((st) => [st, 0])) as Record<Status, number>;
    for (const r of data[c]) by[statusOf(r)]++;
    totalNeedsWork += by.draft + by.imported + by.machine_translated + by.ai_generated + by.needs_review;
    return { c, total: data[c].length, by, hidden: data[c].filter((r) => r.hidden).length };
  });

  // Cảnh báo chất lượng/nguồn gốc
  const warnings: string[] = [];
  const learn: CollectionKey[] = ["vocabulary", "kanji", "grammar", "sentences", "questions", "quiz_sets", "passages", "conversations", "lessons"];
  let badSource = 0;
  let officialWithoutSource = 0;
  for (const c of learn) {
    for (const r of data[c]) {
      const s = r.source_id ? sources.get(r.source_id) : undefined;
      if (r.origin === "official_sample" && (!s || s.reuse_allowed === "no" || s.reuse_allowed === "unknown")) officialWithoutSource++;
      if (s && s.verification_status !== "verified" && s.verification_status !== "published" && (statusOf(r) === "verified" || statusOf(r) === "published")) badSource++;
    }
  }
  if (officialWithoutSource > 0) warnings.push(`${officialWithoutSource} mục gắn nhãn "mẫu chính thức" nhưng nguồn thiếu hoặc chưa rõ quyền dùng lại. Cần rà soát ngay.`);
  if (badSource > 0) warnings.push(`${badSource} mục đã xác minh/xuất bản nhưng nguồn của chúng chưa được xác minh.`);
  const unverifiedSources = [...sources.values()].filter((s) => s.verification_status !== "verified" && s.verification_status !== "published").length;
  if (unverifiedSources > 0) warnings.push(`${unverifiedSources} nguồn trong sổ nguồn chưa được xác minh.`);

  return (
    <>
      <PageHeader title="Tổng quan" description="Tình trạng nội dung và hoạt động gần đây." />
      {warnings.length > 0 ? (
        <div className="mb-4 space-y-2">
          {warnings.map((w) => (
            <Alert key={w} tone="warning">
              {w}
            </Alert>
          ))}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Tổng số bản ghi</p>
          <p className="text-3xl font-bold">{rows.reduce((a, r) => a + r.total, 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Chưa xác minh (nháp / nhập / dịch máy / AI / cần rà soát)</p>
          <p className="text-3xl font-bold">{totalNeedsWork}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Chế độ dữ liệu</p>
          <p className="text-xl font-bold">{store.mode === "supabase" ? "Supabase" : "Local (file JSON)"}</p>
        </Card>
      </div>

      <Card className="mb-6 overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Số bản ghi theo trạng thái xác minh</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2">Loại</th>
              <th scope="col" className="px-2 py-2 text-right">Tổng</th>
              {STATUSES.map((s) => (
                <th key={s} scope="col" className="px-2 py-2 text-right">{STATUS_LABELS[s]}</th>
              ))}
              <th scope="col" className="px-4 py-2 text-right">Ẩn</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.c} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-medium">
                  <Link href={`/admin/content/${r.c}`} className="text-primary underline-offset-4 hover:underline">
                    {COLLECTION_LABELS[r.c].plural}
                  </Link>
                </th>
                <td className="px-2 py-2 text-right font-semibold">{r.total}</td>
                {STATUSES.map((s) => (
                  <td key={s} className="px-2 py-2 text-right tabular-nums">{r.by[s]}</td>
                ))}
                <td className="px-4 py-2 text-right tabular-nums">{r.hidden}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Hoạt động gần đây</CardTitle>
          <Link href="/admin/audit" className="text-sm text-primary underline-offset-4 hover:underline">Xem tất cả</Link>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có thay đổi nào.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Badge className="mr-2">{a.action}</Badge>
                  {a.summary}
                </span>
                <span className="text-xs text-muted-foreground">{a.actor} · {formatDateTimeVi(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
