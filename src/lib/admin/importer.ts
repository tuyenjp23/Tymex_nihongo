import type { CollectionKey } from "../types";
import { parseCsv } from "../csv";
import { allSpecs, blankRecord, coerceCsvCell } from "./field-specs";
import { validateRecord, type FieldError, type ValidationContext } from "./validate";

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ImportFormat = "json" | "csv";
export type ImportMode = "upsert" | "create_only";

export interface ImportRowReport {
  /** Số thứ tự dòng/bản ghi (bắt đầu từ 1) */
  index: number;
  id: string | null;
  action: "create" | "update" | "error";
  errors: FieldError[];
}

export interface ImportPlan {
  rows: ImportRowReport[];
  /** Các bản ghi đã hợp lệ (đã qua Zod + nguồn gốc + liên kết) */
  valid: Record<string, unknown>[];
  /** Lỗi chung của file (không thuộc dòng nào) */
  fileErrors: string[];
  counts: { create: number; update: number; error: number };
}

function parseJsonRecords(text: string): { records: unknown[]; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch (e) {
    return { records: [], errors: [`JSON không hợp lệ: ${(e as Error).message}`] };
  }
  if (Array.isArray(data)) return { records: data, errors: [] };
  if (data && typeof data === "object" && Array.isArray((data as { records?: unknown }).records)) {
    return { records: (data as { records: unknown[] }).records, errors: [] };
  }
  return { records: [], errors: ["JSON phải là một mảng bản ghi (hoặc đối tượng có trường \"records\")"] };
}

function parseCsvRecords(collection: CollectionKey, text: string): { records: unknown[]; errors: string[]; rowErrors: Map<number, string> } {
  const { rows, errors } = parseCsv(text);
  const specs = new Map(allSpecs(collection).map((s) => [s.key, s]));
  const rowErrors = new Map<number, string>();
  const records: unknown[] = [];
  rows.forEach((row, i) => {
    const rec: Record<string, unknown> = {};
    try {
      for (const [col, raw] of Object.entries(row)) {
        const spec = specs.get(col);
        const v = spec ? coerceCsvCell(spec, raw) : raw;
        // Ô trống ở trường không cho phép null/số: coi như "vắng mặt" → bản ghi cũ giữ giá trị hiện có, bản mới dùng mặc định
        if (v !== undefined) rec[col] = v;
      }
    } catch (e) {
      rowErrors.set(i, `Ô JSON không hợp lệ: ${(e as Error).message}`);
    }
    records.push(rec);
  });
  return { records, errors, rowErrors };
}

/**
 * Chạy thử nhập dữ liệu (dry-run): đọc file, kiểm tra TỪNG dòng bằng đúng bộ quy tắc như khi sửa tay,
 * và cho biết sẽ tạo/cập nhật/lỗi bao nhiêu. Không ghi gì cả. Hàm thuần nên test được.
 */
export function planImport(args: {
  collection: CollectionKey;
  format: ImportFormat;
  text: string;
  mode: ImportMode;
  /** Bản ghi hiện có theo id (để gộp trường vắng mặt và phân biệt thêm mới/cập nhật) */
  existing: Map<string, Record<string, unknown>>;
  ctx: ValidationContext;
  now?: string;
  /** Mặc định MAX_IMPORT_ROWS / MAX_IMPORT_BYTES; khôi phục toàn bộ dùng giới hạn lớn hơn */
  limits?: { maxRows: number; maxBytes: number };
}): ImportPlan {
  const { collection, format, text, mode, existing, ctx } = args;
  const maxRows = args.limits?.maxRows ?? MAX_IMPORT_ROWS;
  const maxBytes = args.limits?.maxBytes ?? MAX_IMPORT_BYTES;
  const empty = (fileErrors: string[]): ImportPlan => ({ rows: [], valid: [], fileErrors, counts: { create: 0, update: 0, error: 0 } });

  if (new TextEncoder().encode(text).length > maxBytes) return empty([`File quá lớn (tối đa ${maxBytes / 1024 / 1024} MB)`]);

  let records: unknown[];
  let fileErrors: string[] = [];
  let rowErrors = new Map<number, string>();
  if (format === "json") {
    const r = parseJsonRecords(text);
    records = r.records;
    fileErrors = r.errors;
  } else {
    const r = parseCsvRecords(collection, text);
    records = r.records;
    fileErrors = r.errors;
    rowErrors = r.rowErrors;
  }
  if (records.length === 0 && fileErrors.length === 0) fileErrors = ["File không có bản ghi nào"];
  if (records.length > maxRows) return empty([`Quá nhiều bản ghi (${records.length}); tối đa ${maxRows} mỗi lần nhập`]);

  // ID trong file được thêm vào tập ID để các bản ghi trong cùng file có thể tham chiếu nhau (ví dụ: nhập ảnh rồi từ vựng cùng lúc không áp dụng; nhập cùng collection thì có)
  const ctx2: ValidationContext = { ...ctx, ids: { ...ctx.ids, [collection]: new Set([...(ctx.ids[collection] ?? []), ...records.map((r) => (r as { id?: string })?.id).filter((x): x is string => typeof x === "string")]) } };

  const seen = new Set<string>();
  const rows: ImportRowReport[] = [];
  const valid: Record<string, unknown>[] = [];
  records.forEach((rec, i) => {
    const rawId = (rec as { id?: unknown } | null)?.id;
    const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : null;
    const preErr = rowErrors.get(i);
    if (preErr) {
      rows.push({ index: i + 1, id, action: "error", errors: [{ path: "", message: preErr }] });
      return;
    }
    // Trường vắng mặt: bản ghi cũ giữ giá trị hiện có; bản ghi mới dùng mặc định an toàn (tự biên soạn – bản nháp).
    // Trường bắt buộc vẫn phải có giá trị → thiếu thì Zod báo lỗi.
    const prev = id ? existing.get(id) : undefined;
    const base = prev ?? (id ? blankRecord(collection, id) : {});
    const merged = rec && typeof rec === "object" && !Array.isArray(rec) ? { ...base, ...(rec as Record<string, unknown>) } : rec;
    const res = validateRecord(collection, merged, ctx2, { now: args.now });
    const errors: FieldError[] = res.ok ? [] : [...res.errors];
    if (id && seen.has(id)) errors.push({ path: "id", message: `ID "${id}" bị trùng trong file` });
    if (id) seen.add(id);
    const exists = id ? existing.has(id) : false;
    if (exists && mode === "create_only") errors.push({ path: "id", message: `ID "${id}" đã tồn tại (chế độ chỉ thêm mới)` });
    if (errors.length > 0 || !res.ok) {
      rows.push({ index: i + 1, id, action: "error", errors });
    } else {
      rows.push({ index: i + 1, id, action: exists ? "update" : "create", errors: [] });
      valid.push(res.record);
    }
  });

  const counts = { create: 0, update: 0, error: 0 };
  for (const r of rows) counts[r.action]++;
  return { rows, valid, fileErrors, counts };
}
