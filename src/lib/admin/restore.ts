import { COLLECTION_KEYS, type CollectionKey } from "../types";
import type { Source } from "../schemas";
import { SETTING_KEYS, SETTING_SCHEMAS, type SettingKey } from "../settings-schemas";
import { planImport, type ImportRowReport } from "./importer";
import { extraSettingChecks } from "./setting-checks";
import { issuePath, type FieldError, type ValidationContext } from "./validate";

/**
 * KHÔI PHỤC TOÀN BỘ từ file "Sao lưu toàn bộ (JSON)" ({ app, format, collections, settings }).
 * Hàm thuần: nhận file + dữ liệu hiện có → trả KẾ HOẠCH (chạy thử), không ghi gì. Lớp API mới ghi.
 * Mọi bản ghi đi qua đúng bộ quy tắc như sửa tay/nhập từng loại (Zod + nguồn gốc + liên kết).
 * Khôi phục là "thêm/cập nhật theo ID" — KHÔNG xóa bản ghi tạo sau thời điểm sao lưu.
 */

export const MAX_RESTORE_BYTES = 20 * 1024 * 1024;
export const MAX_RESTORE_ROWS_PER_COLLECTION = 20000;

/** Thứ tự ghi: nguồn/hình/bài đọc trước, rồi nội dung dùng chúng, bài học (tham chiếu tất cả) sau cùng. */
export const RESTORE_ORDER: CollectionKey[] = ["sources", "images", "passages", "vocabulary", "kanji", "grammar", "conversations", "questions", "quiz_sets", "lessons"].filter((c): c is CollectionKey =>
  (COLLECTION_KEYS as readonly string[]).includes(c),
);

export interface BackupFile {
  collections: Partial<Record<CollectionKey, unknown[]>>;
  settings: Partial<Record<SettingKey, unknown>>;
  exportedAt?: string;
}

export function parseBackup(text: string): { backup: BackupFile | null; errors: string[] } {
  if (new TextEncoder().encode(text).length > MAX_RESTORE_BYTES) return { backup: null, errors: [`File quá lớn (tối đa ${MAX_RESTORE_BYTES / 1024 / 1024} MB)`] };
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch (e) {
    return { backup: null, errors: [`JSON không hợp lệ: ${(e as Error).message}`] };
  }
  const o = data as { app?: unknown; format?: unknown; collections?: unknown; settings?: unknown; exported_at?: unknown } | null;
  if (!o || typeof o !== "object" || Array.isArray(o)) return { backup: null, errors: ["Đây không phải file sao lưu toàn bộ của Nihongo Compass"] };
  if (o.app !== "nihongo-compass") return { backup: null, errors: ["Đây không phải file sao lưu toàn bộ của Nihongo Compass (thiếu app: \"nihongo-compass\")"] };
  if (o.format !== 1) return { backup: null, errors: [`Phiên bản định dạng sao lưu không được hỗ trợ: ${String(o.format)} (ứng dụng này đọc được format 1)`] };
  if (!o.collections || typeof o.collections !== "object" || Array.isArray(o.collections)) return { backup: null, errors: ["File sao lưu thiếu phần \"collections\""] };

  const errors: string[] = [];
  const collections: BackupFile["collections"] = {};
  for (const [k, v] of Object.entries(o.collections as Record<string, unknown>)) {
    if (!(COLLECTION_KEYS as readonly string[]).includes(k)) {
      errors.push(`Loại nội dung không biết: "${k}" (file từ phiên bản khác?)`);
      continue;
    }
    if (!Array.isArray(v)) {
      errors.push(`"${k}" phải là một mảng bản ghi`);
      continue;
    }
    collections[k as CollectionKey] = v;
  }
  const settings: BackupFile["settings"] = {};
  if (o.settings && typeof o.settings === "object" && !Array.isArray(o.settings)) {
    for (const [k, v] of Object.entries(o.settings as Record<string, unknown>)) {
      if (!(SETTING_KEYS as readonly string[]).includes(k)) errors.push(`Loại cấu hình không biết: "${k}"`);
      else settings[k as SettingKey] = v;
    }
  }
  return { backup: { collections, settings, exportedAt: typeof o.exported_at === "string" ? o.exported_at : undefined }, errors };
}

export interface CollectionPlan {
  collection: CollectionKey;
  total: number;
  counts: { create: number; update: number; error: number };
  errorRows: ImportRowReport[];
  valid: Record<string, unknown>[];
}
export interface SettingPlan {
  key: SettingKey;
  status: "apply" | "skip_empty" | "error";
  errors: FieldError[];
  value?: unknown;
}
export interface RestorePlan {
  fileErrors: string[];
  collections: CollectionPlan[];
  settings: SettingPlan[];
  /** Tổng số bản ghi sẽ ghi / số lỗi */
  totals: { create: number; update: number; error: number; settings: number };
  /** Có thể áp dụng? (không có lỗi nào và có gì đó để ghi) */
  ok: boolean;
}

export function planRestore(args: {
  text: string;
  /** Bản ghi hiện có theo collection → id */
  existing: Partial<Record<CollectionKey, Map<string, Record<string, unknown>>>>;
  ctx: ValidationContext;
  now?: string;
}): RestorePlan {
  const { backup, errors } = parseBackup(args.text);
  const empty = (fileErrors: string[]): RestorePlan => ({ fileErrors, collections: [], settings: [], totals: { create: 0, update: 0, error: 0, settings: 0 }, ok: false });
  if (!backup) return empty(errors);

  // Ngữ cảnh kiểm tra liên kết: ID hiện có + ID trong file (để bản ghi tham chiếu được nhau); nguồn: hiện có + nguồn hợp lệ trong file
  const ids: ValidationContext["ids"] = {};
  for (const c of COLLECTION_KEYS) {
    const fromFile = (backup.collections[c] ?? []).map((r) => (r as { id?: unknown } | null)?.id).filter((x): x is string => typeof x === "string");
    ids[c] = new Set([...(args.ctx.ids[c] ?? []), ...fromFile]);
  }
  const sources = new Map<string, Source>(args.ctx.sources);
  const plans: CollectionPlan[] = [];
  for (const c of RESTORE_ORDER) {
    const records = backup.collections[c];
    if (!records || records.length === 0) continue;
    if (records.length > MAX_RESTORE_ROWS_PER_COLLECTION) {
      errors.push(`"${c}" có ${records.length} bản ghi; tối đa ${MAX_RESTORE_ROWS_PER_COLLECTION} mỗi loại`);
      continue;
    }
    const plan = planImport({
      collection: c,
      format: "json",
      text: JSON.stringify(records),
      mode: "upsert",
      existing: args.existing[c] ?? new Map(),
      ctx: { sources, ids },
      now: args.now,
      limits: { maxRows: MAX_RESTORE_ROWS_PER_COLLECTION, maxBytes: MAX_RESTORE_BYTES },
    });
    for (const fe of plan.fileErrors) errors.push(`${c}: ${fe}`);
    if (c === "sources") for (const s of plan.valid as unknown as Source[]) sources.set(s.id, s);
    plans.push({ collection: c, total: plan.rows.length, counts: plan.counts, errorRows: plan.rows.filter((r) => r.action === "error"), valid: plan.valid });
  }

  const settingPlans: SettingPlan[] = [];
  for (const key of SETTING_KEYS) {
    if (!(key in backup.settings)) continue;
    const v = backup.settings[key];
    if (v === null || v === undefined) {
      settingPlans.push({ key, status: "skip_empty", errors: [] });
      continue;
    }
    const parsed = SETTING_SCHEMAS[key].safeParse(v);
    if (!parsed.success) {
      settingPlans.push({ key, status: "error", errors: parsed.error.issues.map((i) => ({ path: issuePath(i), message: i.message })) });
      continue;
    }
    const extra = extraSettingChecks(key, parsed.data);
    settingPlans.push(extra.length ? { key, status: "error", errors: extra } : { key, status: "apply", errors: [], value: parsed.data });
  }

  const totals = { create: 0, update: 0, error: 0, settings: settingPlans.filter((s) => s.status === "apply").length };
  for (const p of plans) {
    totals.create += p.counts.create;
    totals.update += p.counts.update;
    totals.error += p.counts.error;
  }
  totals.error += settingPlans.filter((s) => s.status === "error").length;
  const ok = errors.length === 0 && totals.error === 0 && totals.create + totals.update + totals.settings > 0;
  return { fileErrors: errors, collections: plans, settings: settingPlans, totals, ok };
}
