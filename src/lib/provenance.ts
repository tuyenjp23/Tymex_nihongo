import type { CollectionKey } from "./types";
import type { Source } from "./schemas";

const AI_REVIEWER = /\b(claude|gpt|chatgpt|gemini|copilot|llm|bot)\b|^ai$|\bai\b/i;

/**
 * Kiểm tra nguồn gốc ở phía server (ngoài Zod) — những quy tắc cần dữ liệu từ collection khác:
 *  1. Nội dung "mẫu chính thức" phải trỏ tới nguồn thuộc loại chính thức và nguồn đó chưa bị đánh dấu cấm/chưa rõ quyền dùng.
 *  2. Trạng thái "Đã xác minh/Đã xuất bản" cần người rà soát là người thật (không ghi AI là người xác minh).
 *  3. source_id phải tồn tại.
 * Trả về danh sách lỗi (rỗng = hợp lệ).
 */
export function checkProvenance(
  collection: CollectionKey,
  record: Record<string, unknown>,
  sources: Map<string, Source>,
): string[] {
  const errors: string[] = [];
  const status = (record.status ?? record.verification_status) as string | undefined;
  const reviewer = (record.reviewed_by as string | null) ?? "";
  if ((status === "verified" || status === "published") && reviewer && AI_REVIEWER.test(reviewer)) {
    errors.push('Người rà soát phải là người thật; AI không thể là người "xác minh" nội dung.');
  }
  if (collection === "sources" || collection === "images") return errors;
  const sourceId = record.source_id as string | null | undefined;
  if (sourceId && !sources.has(sourceId)) errors.push(`Nguồn "${sourceId}" không tồn tại`);
  if (record.origin === "official_sample") {
    const s = sourceId ? sources.get(sourceId) : undefined;
    if (!s) errors.push("Mẫu chính thức phải gắn với một nguồn trong sổ nguồn học liệu");
    else {
      if (s.source_type !== "official_exam" && s.source_type !== "official_education")
        errors.push(`Nguồn "${s.source_name}" không phải nguồn chính thức nên không thể gắn nhãn "mẫu chính thức"`);
      if (s.reuse_allowed === "no" || s.reuse_allowed === "unknown")
        errors.push(`Nguồn "${s.source_name}" chưa xác nhận được quyền sử dụng lại nội dung — không đánh dấu là mẫu chính thức được dùng đúng quyền`);
    }
  }
  if (record.origin === "imported_dataset") {
    const s = sourceId ? sources.get(sourceId) : undefined;
    if (!s) errors.push("Nội dung nhập từ bộ dữ liệu phải gắn với một nguồn trong sổ nguồn học liệu");
    else {
      if (s.import_policy !== "allowed")
        errors.push(`Nguồn "${s.source_name}" chưa được đánh dấu "Được phép nhập" (đã kiểm tra giấy phép) nên không thể là nguồn của nội dung nhập`);
      if (s.reuse_allowed === "no" || s.reuse_allowed === "unknown")
        errors.push(`Nguồn "${s.source_name}" chưa xác nhận được quyền sử dụng lại nội dung — không nhập để xuất bản`);
    }
  }
  return errors;
}
