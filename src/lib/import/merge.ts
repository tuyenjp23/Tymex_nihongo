import { recordBaseHash } from "./hash";
import type { SkipReason } from "./normalize";

/**
 * Chính sách gộp khi nhập lại — nơi bảo vệ dữ liệu của quản trị viên.
 *
 *  1. Bản ghi cùng ID nhưng KHÔNG do pipeline tạo (import = null): không đụng tới.
 *  2. Bản ghi do pipeline tạo nhưng đã bị sửa tay (băm hiện tại ≠ import.base_hash): không ghi đè.
 *  3. Bản ghi đã được rà soát bởi người (trạng thái ngoài imported/machine_translated): không tự cập nhật.
 *  4. Nội dung nguồn không đổi (content_hash trùng): bỏ qua.
 *  5. Còn lại (chưa ai đụng tới, nguồn có thay đổi): cập nhật — nhưng giữ bản dịch tiếng Việt hiện có nếu bản mới không có.
 *  Không bao giờ xóa bản ghi.
 */
export type MergeDecision = { action: "create" } | { action: "update"; record: Record<string, unknown> } | { action: "skip"; reason: SkipReason; detail?: string };

type Rec = Record<string, unknown>;
const imp = (r: Rec) => (r.import && typeof r.import === "object" ? (r.import as Record<string, unknown>) : null);

export function decideMerge(existing: Rec | undefined, candidate: Rec): MergeDecision {
  if (!existing) return { action: "create" };
  const meta = imp(existing);
  if (!meta) return { action: "skip", reason: "exists_manual_record", detail: String(existing.id) };
  if (meta.base_hash !== recordBaseHash(existing)) return { action: "skip", reason: "edited_by_admin", detail: String(existing.id) };
  const status = String(existing.status);
  if (status !== "imported" && status !== "machine_translated") return { action: "skip", reason: "reviewed_by_human", detail: `${String(existing.id)} (${status})` };
  if (meta.content_hash === imp(candidate)?.content_hash) return { action: "skip", reason: "unchanged" };
  return { action: "update", record: mergeForUpdate(existing, candidate) };
}

/** Bản cập nhật: lấy dữ liệu nguồn mới nhưng giữ created_at, và không làm mất bản dịch tiếng Việt đã có. */
export function mergeForUpdate(existing: Rec, candidate: Rec): Rec {
  const out: Rec = { ...candidate, created_at: existing.created_at ?? candidate.created_at };
  if ("vi_kind" in candidate && candidate.vi_kind === "missing" && existing.vi_kind && existing.vi_kind !== "missing" && String(existing.meaning_vi ?? "").trim()) {
    out.meaning_vi = existing.meaning_vi;
    out.vi_kind = existing.vi_kind;
    out.status = existing.status;
    out.source_note = existing.source_note;
  }
  if (Array.isArray(existing.translations) && Array.isArray(candidate.translations)) {
    const cand = candidate.translations as { lang: string; kind: string }[];
    const keep = (existing.translations as { lang: string; kind: string }[]).filter((t) => t.kind !== "source" && !cand.some((c) => c.lang === t.lang && c.kind === t.kind));
    if (keep.length > 0) {
      out.translations = [...cand, ...keep];
      if (keep.some((t) => t.kind === "machine_translated")) {
        out.status = existing.status === "machine_translated" ? "machine_translated" : out.status;
        out.source_note = existing.source_note;
      }
    }
  }
  return out;
}
