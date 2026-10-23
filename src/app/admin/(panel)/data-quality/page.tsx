import Link from "next/link";
import path from "node:path";
import { requireAdmin } from "@/lib/auth/admin";
import { getDataDir, getStore } from "@/lib/store";
import { QUALITY_CODES, runQualityChecks, type QualityCode, type QualityIssue, type Severity } from "@/lib/import/quality";
import { Card, CardTitle, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { STATUS_LABELS, type Status } from "@/lib/types";

export const metadata = { title: "Chất lượng dữ liệu" };
export const dynamic = "force-dynamic";

const FULL_VALIDATE_LIMIT = 5000;
const SHOW_PER_CODE = 25;
const TONE: Record<Severity, "danger" | "warning" | "neutral"> = { error: "danger", warning: "warning", info: "neutral" };
const SEV_LABEL: Record<Severity, string> = { error: "Lỗi", warning: "Cảnh báo", info: "Ghi nhận" };

export default async function DataQualityPage({ searchParams }: { searchParams: Promise<{ validate?: string; code?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const store = await getStore();
  const [sources, images, vocabulary, kanji, sentences] = await Promise.all([store.list("sources"), store.list("images"), store.list("vocabulary"), store.list("kanji"), store.list("sentences")]);
  const total = vocabulary.length + kanji.length + sentences.length;
  const full = sp.validate === "1" || (sp.validate !== "0" && total <= FULL_VALIDATE_LIMIT);
  const report = runQualityChecks(
    { sources, images, vocabulary, kanji, sentences } as never,
    { publicDir: path.join(process.cwd(), "public"), dataDir: store.mode === "local" ? getDataDir() : undefined, validate: full },
  );

  const groups = new Map<string, QualityIssue[]>();
  for (const i of report.issues) groups.set(`${i.severity}|${i.code}`, [...(groups.get(`${i.severity}|${i.code}`) ?? []), i]);
  const order: Severity[] = ["error", "warning", "info"];
  const keys = [...groups.keys()].sort((a, b) => order.indexOf(a.split("|")[0] as Severity) - order.indexOf(b.split("|")[0] as Severity) || groups.get(b)!.length - groups.get(a)!.length);

  return (
    <>
      <PageHeader
        title="Chất lượng dữ liệu"
        description="Thiếu cách đọc/nghĩa/nguồn/giấy phép, bản dịch máy chưa duyệt, câu trùng, cấp độ không có nguồn, file ảnh/âm thanh không tồn tại."
        actions={<ButtonLink href={`?validate=${full ? "0" : "1"}`} variant="secondary">{full ? "Bỏ kiểm tra định dạng đầy đủ (nhanh hơn)" : "Kiểm tra định dạng đầy đủ (chậm)"}</ButtonLink>}
      />
      {!full ? <Alert tone="warning" className="mb-4">Đang bỏ qua kiểm tra định dạng theo schema cho từng bản ghi (kho có {total} bản ghi). Bấm “Kiểm tra định dạng đầy đủ” nếu cần.</Alert> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Lỗi cần sửa</p><p className="text-3xl font-bold text-danger">{report.summary.errors}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Cảnh báo cần người xem</p><p className="text-3xl font-bold text-warning">{report.summary.warnings}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Ghi nhận (không phải lỗi)</p><p className="text-3xl font-bold">{report.summary.infos}</p></Card>
      </div>

      <Card className="mb-4">
        <CardTitle>Trạng thái các bản ghi học tập</CardTitle>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Loại</th><th className="py-1 text-right">Tổng</th><th className="py-1">Theo trạng thái</th></tr></thead>
          <tbody>
            {(["vocabulary", "kanji", "sentences"] as const).map((c) => (
              <tr key={c} className="border-t border-border">
                <th scope="row" className="py-1 text-left font-medium"><Link className="text-primary underline-offset-4 hover:underline" href={`/admin/content/${c}`}>{c === "vocabulary" ? "Từ vựng" : c === "kanji" ? "Kanji" : "Câu ví dụ"}</Link></th>
                <td className="py-1 text-right tabular-nums">{report.summary.totals[c]}</td>
                <td className="py-1 text-xs text-muted-foreground">{Object.entries(report.summary.byStatus[c] ?? {}).map(([s, n]) => `${STATUS_LABELS[s as Status] ?? s}: ${n}`).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Trạng thái “Đã xác minh” và “Đã xuất bản” chỉ được đặt bởi người rà soát — công cụ nhập không bao giờ tự đặt.</p>
      </Card>

      {report.issues.length === 0 ? (
        <EmptyState title="Không phát hiện vấn đề" description="Mọi bản ghi qua các kiểm tra hiện có." />
      ) : (
        <ul className="space-y-3">
          {keys.map((k) => {
            const list = groups.get(k)!;
            const [sev, code] = k.split("|") as [Severity, QualityCode];
            const open = sp.code === code;
            return (
              <li key={k}>
                <Card>
                  <details open={open || sev === "error"}>
                    <summary className="cursor-pointer">
                      <Badge tone={TONE[sev]} className="mr-2">{SEV_LABEL[sev]}</Badge>
                      <span className="font-medium">{QUALITY_CODES[code]}</span> <span className="text-muted-foreground">— {list.length}</span>
                    </summary>
                    <ul className="mt-2 divide-y divide-border text-sm">
                      {list.slice(0, SHOW_PER_CODE).map((i, n) => (
                        <li key={`${i.collection}/${i.id}/${n}`} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                          <span className="min-w-0">{i.message}</span>
                          <Link className="shrink-0 text-xs text-primary underline-offset-4 hover:underline" href={`/admin/content/${i.collection}/${encodeURIComponent(i.id)}`}>{i.collection}/{i.id}</Link>
                        </li>
                      ))}
                    </ul>
                    {list.length > SHOW_PER_CODE ? <p className="mt-1 text-xs text-muted-foreground">… và {list.length - SHOW_PER_CODE} mục nữa (chạy <code>npm run import:quality</code> để xem đầy đủ).</p> : null}
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
