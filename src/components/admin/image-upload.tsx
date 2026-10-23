"use client";
import * as React from "react";
import { Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Nút tải ảnh lên (PNG/JPG/WebP/GIF ≤ 2 MB). Server kiểm tra lại loại file bằng chữ ký đầu file. */
export function ImageUpload({ onUploaded, label = "Tải ảnh lên" }: { onUploaded: (path: string) => void; label?: string }) {
  const { toast } = useToast();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Ảnh quá lớn (tối đa 2 MB)", "error");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!res.ok || !data.path) throw new Error(data.error ?? `Lỗi ${res.status}`);
      onUploaded(data.path);
      toast("Đã tải ảnh lên — nhớ bấm Lưu", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label={label} onChange={(e) => onFile(e.target.files?.[0])} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        <Upload size={14} aria-hidden="true" /> {busy ? "Đang tải…" : label}
      </Button>
    </div>
  );
}
