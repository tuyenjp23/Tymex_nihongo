"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { progressStore } from "@/lib/progress/store";
import { formatDateTimeVi } from "@/lib/dates";

/**
 * Đồng bộ thủ công: tải tiến độ trên máy chủ → GỘP với tiến độ trong trình duyệt (không bên nào bị mất) → lưu lại cả hai nơi.
 * Gộp theo từng mục: mục nào ôn gần hơn thì thắng; ngày học lấy số lớn hơn; lịch sử bài làm hợp nhất theo id.
 * Giới hạn: hai thiết bị đồng bộ cùng lúc có thể ghi đè nhau một phần; hãy đồng bộ lần lượt.
 */
export function SyncPanel() {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      const remote = (await res.json().catch(() => ({}))) as { progress?: unknown; error?: string };
      if (!res.ok) throw new Error(remote.error ?? `Lỗi ${res.status}`);
      if (remote.progress) {
        const r = progressStore.importJson(JSON.stringify(remote.progress), "merge");
        if (!r.ok) throw new Error(`Dữ liệu trên máy chủ không đọc được: ${r.error}`);
      }
      const put = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: JSON.parse(progressStore.exportJson()) }),
      });
      const out = (await put.json().catch(() => ({}))) as { error?: string };
      if (!put.ok) throw new Error(out.error ?? `Lỗi ${put.status}`);
      setLast(new Date().toISOString());
      toast("Đã đồng bộ tiến độ", "success");
    } catch (e) {
      setError((e as Error).message);
      toast("Đồng bộ chưa thành công", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <CardTitle>Đồng bộ tiến độ</CardTitle>
        <CardDescription className="mt-1">Gộp tiến độ trên thiết bị này với tiến độ đã lưu trong tài khoản, rồi lưu lại cả hai nơi. Chỉ bạn đọc được dữ liệu này.</CardDescription>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={sync} disabled={busy}>{busy ? "Đang đồng bộ…" : "Đồng bộ ngay"}</Button>
        {last ? <span className="text-sm text-muted-foreground">Lần gần nhất: {formatDateTimeVi(last)}</span> : null}
      </div>
    </Card>
  );
}
