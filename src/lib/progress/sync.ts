import { parseProgress, type Progress } from "./model";

/** Giới hạn kích thước tiến độ gửi lên máy chủ (khớp ràng buộc 2 MB của bảng user_progress, chừa dư địa). */
export const MAX_PROGRESS_BYTES = 1_500_000;

/** Kiểm tra dữ liệu tiến độ do client gửi lên trước khi lưu: đúng cấu trúc (Zod) và không quá lớn. Hàm thuần. */
export function validateProgressPayload(body: unknown): { ok: true; value: Progress } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== "object" || !("progress" in body)) return { ok: false, error: "Thiếu trường progress", status: 400 };
  const raw = (body as { progress: unknown }).progress;
  const size = new TextEncoder().encode(JSON.stringify(raw ?? null)).length;
  if (size > MAX_PROGRESS_BYTES) return { ok: false, error: "Dữ liệu tiến độ quá lớn", status: 413 };
  const parsed = parseProgress(raw);
  return parsed.ok ? parsed : { ok: false, error: parsed.error, status: 422 };
}
