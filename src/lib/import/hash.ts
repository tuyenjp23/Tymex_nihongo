import { createHash } from "node:crypto";

/** JSON chuẩn hóa: khóa sắp xếp, bỏ undefined — cùng nội dung luôn cho cùng chuỗi, bất kể thứ tự khóa. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex").slice(0, 20);
}

/** Các khóa không tính vào băm "bản ghi này đã bị sửa tay chưa": dấu vết nhập + thời gian do hệ thống quản lý. */
const VOLATILE = new Set(["import", "created_at", "updated_at"]);

/** Băm toàn bộ nội dung bản ghi (trừ dấu vết nhập và thời gian). Lệch với import.base_hash lúc nhập = đã có người sửa. */
export function recordBaseHash(record: Record<string, unknown>): string {
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(record)) if (!VOLATILE.has(k)) o[k] = record[k];
  return hashOf(o);
}
