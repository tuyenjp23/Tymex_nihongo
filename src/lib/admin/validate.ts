import type { ZodIssue } from "zod";
import type { CollectionKey } from "../types";
import { COLLECTION_SCHEMAS, type Source } from "../schemas";
import { checkProvenance } from "../provenance";
import { normalizeRecord } from "./field-specs";

export interface FieldError {
  /** Đường dẫn dạng "examples.0.ja"; "" = lỗi chung của bản ghi */
  path: string;
  message: string;
}

/** Tập ID của các collection (dùng kiểm tra liên kết giữa các bản ghi). */
export type IdSets = Partial<Record<CollectionKey, Set<string>>>;

export interface ValidationContext {
  sources: Map<string, Source>;
  ids: IdSets;
}

export function issuePath(issue: ZodIssue): string {
  return issue.path.map(String).join(".");
}

const AI_REVIEWER_RULE = 'Trạng thái "Đã xác minh/Đã xuất bản" cần người rà soát và ngày xác minh';

/** Kiểm tra liên kết: id trỏ tới bản ghi phải tồn tại. */
export function checkReferences(collection: CollectionKey, r: Record<string, unknown>, ids: IdSets): FieldError[] {
  const errs: FieldError[] = [];
  const has = (c: CollectionKey, id: unknown) => typeof id === "string" && (ids[c]?.has(id) ?? false);
  if ((collection === "vocabulary" || collection === "kanji") && r.image_id && !has("images", r.image_id)) {
    errs.push({ path: "image_id", message: `Hình "${String(r.image_id)}" không tồn tại` });
  }
  // Nguồn của cấp độ phải có trong sổ nguồn
  if (r.level_source && !has("sources", r.level_source)) errs.push({ path: "level_source", message: `Nguồn "${String(r.level_source)}" không tồn tại` });
  if (collection === "sentences" && Array.isArray(r.word_refs)) {
    r.word_refs.forEach((id, i) => {
      if (!has("vocabulary", id)) errs.push({ path: `word_refs.${i}`, message: `Không có từ vựng "${String(id)}"` });
    });
  }
  if (r.import && typeof r.import === "object") {
    const sid = (r.import as { source_id?: string }).source_id;
    if (sid && !has("sources", sid)) errs.push({ path: "import.source_id", message: `Nguồn "${sid}" không tồn tại` });
  }
  if (collection === "questions") {
    if (r.passage_id && !has("passages", r.passage_id)) errs.push({ path: "passage_id", message: `Bài "${String(r.passage_id)}" không tồn tại` });
    if (r.ref_type && !r.ref_id) errs.push({ path: "ref_id", message: "Chọn loại liên kết thì cần nhập ID mục học" });
    if (r.ref_id && !r.ref_type) errs.push({ path: "ref_type", message: "Nhập ID mục học thì cần chọn loại" });
    if (r.ref_type && r.ref_id && !has(r.ref_type as CollectionKey, r.ref_id))
      errs.push({ path: "ref_id", message: `Không có ${String(r.ref_type)}/${String(r.ref_id)}` });
  }
  if (collection === "quiz_sets" && Array.isArray(r.items)) {
    r.items.forEach((it, i) => {
      const id = (it as { question_id?: string }).question_id;
      if (id && !has("questions", id)) errs.push({ path: `items.${i}.question_id`, message: `Không có câu hỏi "${id}"` });
    });
  }
  if (collection === "lessons" && Array.isArray(r.item_refs)) {
    const map: Record<string, CollectionKey> = { vocabulary: "vocabulary", kanji: "kanji", grammar: "grammar", conversation: "conversations", passage: "passages" };
    r.item_refs.forEach((ref, i) => {
      const x = ref as { type?: string; id?: string };
      const c = x.type ? map[x.type] : undefined;
      if (c && x.id && !has(c, x.id)) errs.push({ path: `item_refs.${i}.id`, message: `Không có ${x.type}/${x.id}` });
    });
  }
  return errs;
}

export type ValidationResult =
  | { ok: true; record: Record<string, unknown> }
  | { ok: false; errors: FieldError[] };

/**
 * Kiểm tra đầy đủ một bản ghi: chuẩn hóa → Zod → quy tắc nguồn gốc (checkProvenance) → liên kết.
 * Hàm thuần (không đụng database) nên test được; server truyền vào `ctx` đã nạp sẵn.
 */
export function validateRecord(
  collection: CollectionKey,
  input: unknown,
  ctx: ValidationContext,
  opts: { now?: string } = {},
): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: [{ path: "", message: "Bản ghi phải là một đối tượng" }] };
  }
  const now = opts.now ?? new Date().toISOString();
  const normalized = normalizeRecord(collection, input as Record<string, unknown>);
  // created_at/updated_at do server quản lý: luôn dùng giá trị hợp lệ (store sẽ ghi lại)
  if (typeof normalized.created_at !== "string" || normalized.created_at.length < 10) normalized.created_at = now;
  normalized.updated_at = now;

  const parsed = COLLECTION_SCHEMAS[collection].safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => ({ path: issuePath(i), message: i.message })) };
  }
  const record = parsed.data as Record<string, unknown>;
  const errors: FieldError[] = [];

  // Nguồn & ảnh không có superRefine → áp quy tắc "đã xác minh cần người + ngày" ở đây
  if (collection === "sources" || collection === "images") {
    const status = (record.status ?? record.verification_status) as string;
    if ((status === "verified" || status === "published") && (!String(record.reviewed_by ?? "").trim() || !record.last_verified)) {
      errors.push({ path: "reviewed_by", message: AI_REVIEWER_RULE });
    }
  }

  for (const msg of checkProvenance(collection, record, ctx.sources)) {
    const path = /nguồn|chính thức/i.test(msg) && !/rà soát/i.test(msg) ? "source_id" : "reviewed_by";
    errors.push({ path, message: msg });
  }
  errors.push(...checkReferences(collection, record, ctx.ids));

  return errors.length > 0 ? { ok: false, errors } : { ok: true, record };
}

/** Những bản ghi khác đang trỏ tới `id` của `collection` (để chặn xóa khi còn được dùng). */
export function findUsages(
  collection: CollectionKey,
  id: string,
  data: Partial<Record<CollectionKey, Record<string, unknown>[]>>,
): { collection: CollectionKey; id: string }[] {
  const out: { collection: CollectionKey; id: string }[] = [];
  const push = (c: CollectionKey, rec: Record<string, unknown>) => out.push({ collection: c, id: String(rec.id) });
  const each = (c: CollectionKey, fn: (r: Record<string, unknown>) => boolean) => (data[c] ?? []).forEach((r) => fn(r) && push(c, r));
  const learnRecord: CollectionKey[] = ["vocabulary", "kanji", "grammar", "sentences", "questions", "quiz_sets", "passages", "conversations", "lessons"];

  if (collection === "sources") {
    for (const c of learnRecord) each(c, (r) => r.source_id === id || r.level_source === id || (r.import as { source_id?: string } | null)?.source_id === id);
  }
  if (collection === "questions") each("quiz_sets", (r) => Array.isArray(r.items) && r.items.some((x) => (x as { question_id: string }).question_id === id));
  if (collection === "images") {
    each("vocabulary", (r) => r.image_id === id);
    each("kanji", (r) => r.image_id === id);
  }
  if (collection === "passages") {
    each("questions", (r) => r.passage_id === id);
    each("lessons", (r) => Array.isArray(r.item_refs) && r.item_refs.some((x) => (x as { type: string; id: string }).type === "passage" && (x as { id: string }).id === id));
  }
  if (collection === "vocabulary" || collection === "kanji" || collection === "grammar") {
    each("questions", (r) => r.ref_type === collection && r.ref_id === id);
    if (collection === "vocabulary") each("sentences", (r) => Array.isArray(r.word_refs) && r.word_refs.includes(id));
    each("lessons", (r) => Array.isArray(r.item_refs) && r.item_refs.some((x) => (x as { type: string; id: string }).type === collection && (x as { id: string }).id === id));
  }
  if (collection === "conversations") {
    each("lessons", (r) => Array.isArray(r.item_refs) && r.item_refs.some((x) => (x as { type: string; id: string }).type === "conversation" && (x as { id: string }).id === id));
  }
  return out;
}
