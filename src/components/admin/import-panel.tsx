"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { Upload } from "@/components/icons";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";

interface RowErr {
  index: number;
  id: string | null;
  errors: { path: string; message: string }[];
}
interface Report {
  dryRun: boolean;
  imported?: number;
  counts: { create: number; update: number; error: number };
  fileErrors: string[];
  rows: RowErr[];
  truncated: boolean;
  total: number;
  error?: string;
}

export function ImportPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [collection, setCollection] = React.useState<string>("vocabulary");
  const [format, setFormat] = React.useState<"json" | "csv">("json");
  const [mode, setMode] = React.useState<"upsert" | "create_only">("upsert");
  const [onError, setOnError] = React.useState<"abort" | "skip">("abort");
  const [text, setText] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [report, setReport] = React.useState<Report | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast("File quá lớn (tối đa 5 MB)", "error");
      return;
    }
    setText(await f.text());
    setFileName(f.name);
    setReport(null);
    if (/\.csv$/i.test(f.name)) setFormat("csv");
    else if (/\.json$/i.test(f.name)) setFormat("json");
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, format, text, mode, onError, dryRun }),
      });
      const data = (await res.json().catch(() => ({}))) as Report & { error?: string };
      if (res.status === 401 || res.status === 403) {
        toast("Phiên đăng nhập đã hết hạn — hãy tải lại trang", "error");
        return;
      }
      if (!res.ok && !data.counts) {
        toast(data.error ?? `Lỗi ${res.status}`, "error");
        return;
      }
      setReport(data);
      if (!dryRun) {
        if (res.ok) {
          toast(`Đã nhập ${data.imported} bản ghi`, "success");
          router.refresh();
        } else toast(data.error ?? "Không nhập được", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  const clean = report?.dryRun && report.fileErrors.length === 0 && report.counts.error === 0 && report.counts.create + report.counts.update > 0;
  const partial = report?.dryRun && report.fileErrors.length === 0 && report.counts.error > 0 && report.counts.create + report.counts.update > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Loại nội dung" htmlFor="imp-collection">
          <Select id="imp-collection" value={collection} onChange={(e) => { setCollection(e.target.value); setReport(null); }}>
            {COLLECTION_KEYS.map((c) => (
              <option key={c} value={c}>{COLLECTION_LABELS[c].plural}</option>
            ))}
          </Select>
        </Field>
        <Field label="Định dạng" htmlFor="imp-format">
          <Select id="imp-format" value={format} onChange={(e) => { setFormat(e.target.value as "json" | "csv"); setReport(null); }}>
            <option value="json">JSON</option>
            <option value="csv">CSV (UTF-8)</option>
          </Select>
        </Field>
        <Field label="Khi ID đã tồn tại" htmlFor="imp-mode">
          <Select id="imp-mode" value={mode} onChange={(e) => { setMode(e.target.value as "upsert" | "create_only"); setReport(null); }}>
            <option value="upsert">Cập nhật bản ghi cũ</option>
            <option value="create_only">Báo lỗi (chỉ thêm mới)</option>
          </Select>
        </Field>
        <Field label="Khi có dòng lỗi" htmlFor="imp-onerror">
          <Select id="imp-onerror" value={onError} onChange={(e) => setOnError(e.target.value as "abort" | "skip")}>
            <option value="abort">Không nhập gì cả (an toàn)</option>
            <option value="skip">Nhập dòng hợp lệ, bỏ dòng lỗi</option>
          </Select>
        </Field>
      </div>

      <div>
        <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" aria-label="Chọn file nhập" onChange={(e) => readFile(e.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Chọn file…
          </Button>
          <span className="text-sm text-muted-foreground">{fileName || "hoặc dán nội dung vào ô dưới"}</span>
        </div>
      </div>

      <Field label="Nội dung file" htmlFor="imp-text" hint="CSV: ô chứa danh sách/đối tượng phải ghi dạng JSON; xuất mẫu từ chính loại nội dung này để biết cột. Trường/cột vắng mặt: bản ghi đã có giữ giá trị cũ; bản ghi mới dùng mặc định an toàn (tự biên soạn – bản nháp). Trường bắt buộc vẫn phải có.">
        <Textarea id="imp-text" rows={9} className="font-mono text-xs" spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy || !text.trim()} onClick={() => run(true)}>
          {busy ? "Đang kiểm tra…" : "1. Chạy thử (không ghi)"}
        </Button>
        <Button type="button" disabled={busy || !(clean || partial) || (partial && onError === "abort")} onClick={() => run(false)}>
          2. Nhập thật
        </Button>
      </div>

      {report ? (
        <div className="space-y-3" aria-live="polite">
          {report.fileErrors.map((e) => (
            <Alert key={e} tone="danger">{e}</Alert>
          ))}
          {report.error ? <Alert tone="danger">{report.error}</Alert> : null}
          {report.fileErrors.length === 0 ? (
            <Alert tone={report.counts.error === 0 ? "success" : "warning"} title={report.dryRun ? "Kết quả chạy thử" : report.imported ? `Đã nhập ${report.imported} bản ghi` : "Chưa nhập"}>
              {report.total} bản ghi: sẽ thêm {report.counts.create}, cập nhật {report.counts.update}, lỗi {report.counts.error}.
              {report.dryRun && partial && onError === "abort" ? " Đang ở chế độ \"không nhập gì cả\" — sửa lỗi hoặc đổi sang bỏ dòng lỗi." : ""}
            </Alert>
          ) : null}
          {report.rows.length > 0 ? (
            <div className="max-h-96 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Các dòng bị lỗi</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-3 py-2">Dòng</th>
                    <th scope="col" className="px-3 py-2">ID</th>
                    <th scope="col" className="px-3 py-2">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.index} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2 tabular-nums">{r.index}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.id ?? "—"}</td>
                      <td className="px-3 py-2">
                        <ul className="list-disc pl-4">
                          {r.errors.map((e, i) => (
                            <li key={i}>{e.path ? <code className="text-xs">{e.path}</code> : null} {e.message}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.truncated ? <p className="p-2 text-xs text-muted-foreground">Chỉ hiển thị {report.rows.length} lỗi đầu tiên.</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
