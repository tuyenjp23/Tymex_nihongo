"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { Upload } from "@/components/icons";
import { COLLECTION_LABELS } from "@/lib/schemas";
import type { CollectionKey } from "@/lib/types";

interface RowErr {
  index: number;
  id: string | null;
  errors: { path: string; message: string }[];
}
interface Report {
  dryRun: boolean;
  ok: boolean;
  fileErrors: string[];
  totals: { create: number; update: number; error: number; settings: number };
  collections: { collection: CollectionKey; total: number; counts: { create: number; update: number; error: number }; errorRows: RowErr[]; truncated: boolean }[];
  settings: { key: string; status: "apply" | "skip_empty" | "error"; errors: { path: string; message: string }[] }[];
  applied?: string[];
  error?: string;
}

const SETTING_LABELS: Record<string, string> = { theme: "Giao diện", navigation: "Menu", dashboard: "Trang Tổng quan", content: "Nội dung", games: "Kanji Quest" };

export function RestorePanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [report, setReport] = React.useState<Report | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      toast("File quá lớn (tối đa 20 MB)", "error");
      return;
    }
    setText(await f.text());
    setFileName(f.name);
    setReport(null);
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, dryRun }) });
      const data = (await res.json().catch(() => ({}))) as Report;
      if (res.status === 401 || res.status === 403) {
        toast("Phiên đăng nhập đã hết hạn hoặc không đủ quyền — hãy tải lại trang", "error");
        return;
      }
      if (!res.ok && !data.totals) {
        toast(data.error ?? `Lỗi ${res.status}`, "error");
        return;
      }
      setReport(data);
      if (!dryRun) {
        if (res.ok) {
          toast("Đã khôi phục từ bản sao lưu", "success");
          router.refresh();
        } else toast(data.error ?? "Không khôi phục được", "error");
      }
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  const canApply = !!report && report.dryRun && report.ok;

  return (
    <div className="space-y-4">
      <div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Chọn file sao lưu toàn bộ" onChange={(e) => readFile(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Chọn file sao lưu…
          </Button>
          <span className="text-sm text-muted-foreground">{fileName || "file nihongo-compass-backup-….json đã tải ở mục Xuất dữ liệu"}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy || !text.trim()} onClick={() => run(true)}>
          {busy && !confirm ? "Đang kiểm tra…" : "1. Chạy thử (không ghi)"}
        </Button>
        <Button type="button" disabled={busy || !canApply} onClick={() => setConfirm(true)}>
          2. Khôi phục thật
        </Button>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Khôi phục toàn bộ từ bản sao lưu?"
        confirmLabel="Khôi phục"
        busy={busy}
        onConfirm={() => run(false)}
        onCancel={() => setConfirm(false)}
        message="Các bản ghi trong file sẽ được thêm mới hoặc ghi đè theo ID, và cấu hình trong file sẽ được lưu thành phiên bản mới. Bản ghi tạo sau thời điểm sao lưu KHÔNG bị xóa. Mọi thay đổi đều có trong Nhật ký thay đổi. Bạn đã tải bản sao lưu hiện tại trước khi khôi phục chưa?"
      />

      {report ? (
        <div className="space-y-3" aria-live="polite">
          {report.fileErrors.map((e) => (
            <Alert key={e} tone="danger">{e}</Alert>
          ))}
          {report.error ? <Alert tone="danger">{report.error}</Alert> : null}
          {!report.dryRun && !report.error && report.applied ? <Alert tone="success" title="Đã khôi phục">Đã ghi: {report.applied.join(", ")}.</Alert> : null}
          {report.fileErrors.length === 0 || report.collections.length > 0 ? (
            <Alert tone={report.totals.error === 0 && report.fileErrors.length === 0 ? "success" : "warning"} title={report.dryRun ? "Kết quả chạy thử" : "Kết quả"}>
              Sẽ thêm {report.totals.create} bản ghi, cập nhật {report.totals.update}, lưu {report.totals.settings} nhóm cấu hình; lỗi {report.totals.error}.
              {report.dryRun && !report.ok ? " Chỉ khôi phục khi không còn lỗi nào." : ""}
            </Alert>
          ) : null}
          {report.collections.length > 0 ? (
            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Chi tiết theo loại nội dung</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2">Loại</th>
                    <th scope="col" className="px-3 py-2">Thêm</th>
                    <th scope="col" className="px-3 py-2">Cập nhật</th>
                    <th scope="col" className="px-3 py-2">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.collections.map((c) => (
                    <tr key={c.collection} className="border-b border-border last:border-0">
                      <th scope="row" className="px-3 py-2 text-left font-medium">{COLLECTION_LABELS[c.collection].plural}</th>
                      <td className="px-3 py-2 tabular-nums">{c.counts.create}</td>
                      <td className="px-3 py-2 tabular-nums">{c.counts.update}</td>
                      <td className="px-3 py-2 tabular-nums">{c.counts.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {report.settings.length > 0 ? (
            <ul className="text-sm">
              {report.settings.map((s) => (
                <li key={s.key}>
                  Cấu hình {SETTING_LABELS[s.key] ?? s.key}: {s.status === "apply" ? "sẽ lưu" : s.status === "skip_empty" ? "trống trong file — giữ nguyên" : `lỗi — ${s.errors[0]?.message ?? ""}`}
                </li>
              ))}
            </ul>
          ) : null}
          {report.collections.some((c) => c.errorRows.length > 0) ? (
            <div className="max-h-96 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Các bản ghi bị lỗi</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2">Loại</th>
                    <th scope="col" className="px-3 py-2">Dòng / ID</th>
                    <th scope="col" className="px-3 py-2">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.collections.flatMap((c) =>
                    c.errorRows.map((r) => (
                      <tr key={`${c.collection}-${r.index}`} className="border-b border-border align-top last:border-0">
                        <td className="px-3 py-2">{COLLECTION_LABELS[c.collection].plural}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.index} · {r.id ?? "—"}</td>
                        <td className="px-3 py-2">
                          <ul className="list-disc pl-4">
                            {r.errors.map((e, i) => (
                              <li key={i}>{e.path ? <code className="text-xs">{e.path}</code> : null} {e.message}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
