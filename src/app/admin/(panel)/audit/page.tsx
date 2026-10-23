import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { formatDateTimeVi } from "@/lib/dates";
import { AuditRestoreButton } from "@/components/admin/audit-restore-button";

export const metadata = { title: "Nhật ký thay đổi" };

const ACTION_LABELS: Record<string, string> = { create: "Thêm", update: "Sửa", delete: "Xóa", import: "Nhập", settings: "Cấu hình", reset: "Reset", restore: "Khôi phục" };

function short(v: unknown): string {
  const s = JSON.stringify(v, null, 2) ?? "";
  return s.length > 4000 ? `${s.slice(0, 4000)}\n… (rút gọn)` : s;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const store = await getStore();
  const entries = await store.listAudit({ collection: sp.collection || undefined, limit: 200 });
  const options = [...COLLECTION_KEYS, "settings"] as string[];
  return (
    <>
      <PageHeader title="Nhật ký thay đổi" description="Ai đã làm gì, lúc nào. Với bản ghi đã sửa hoặc đã xóa, có thể khôi phục lại bản trước." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="collection" className="mb-1 block text-xs text-muted-foreground">Lọc theo loại</label>
          <Select id="collection" name="collection" defaultValue={sp.collection ?? ""}>
            <option value="">Tất cả</option>
            {options.map((c) => (
              <option key={c} value={c}>{c in COLLECTION_LABELS ? COLLECTION_LABELS[c as keyof typeof COLLECTION_LABELS].plural : c === "settings" ? "Cấu hình" : c}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">Lọc</Button>
      </form>
      {entries.length === 0 ? (
        <EmptyState title="Chưa có thay đổi nào" description="Mọi thao tác thêm, sửa, xóa, nhập và đổi cấu hình sẽ được ghi ở đây." />
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const canRestore = (e.action === "update" || e.action === "delete") && !!e.before && !!e.record_id && (COLLECTION_KEYS as readonly string[]).includes(e.collection);
            return (
              <li key={e.id}>
                <Card className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      <Badge className="mr-2">{ACTION_LABELS[e.action] ?? e.action}</Badge>
                      {e.summary}
                    </p>
                    <p className="text-xs text-muted-foreground">{e.actor} · {formatDateTimeVi(e.at)}</p>
                  </div>
                  {e.before || e.after ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Xem dữ liệu trước/sau</summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="mb-1 font-semibold">Trước</p>
                          <pre className="max-h-64 overflow-auto rounded bg-muted p-2">{e.before ? short(e.before) : "—"}</pre>
                        </div>
                        <div>
                          <p className="mb-1 font-semibold">Sau</p>
                          <pre className="max-h-64 overflow-auto rounded bg-muted p-2">{e.after ? short(e.after) : "—"}</pre>
                        </div>
                      </div>
                    </details>
                  ) : null}
                  {canRestore ? <AuditRestoreButton auditId={e.id} target={`${e.collection}/${e.record_id}`} deleted={e.action === "delete"} /> : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
