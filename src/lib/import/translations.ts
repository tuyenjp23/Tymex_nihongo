import fs from "node:fs";
import readline from "node:readline";
import type { CollectionKey } from "../types";

/**
 * Bản dịch tiếng Việt đi kèm (file JSONL, mỗi dòng một bản ghi):
 *   {"collection":"vocabulary","id":"jm-1198180","vi":"gặp, gặp gỡ","by":"AI (Claude), 2026-10-23"}
 * Nguồn gốc dữ liệu chỉ có tiếng Anh, nên mọi bản dịch ở đây LUÔN được gắn nhãn "dịch máy – chưa kiểm tra":
 * pipeline không có đường nào đặt chúng thành "tự biên soạn" hay "đã xác minh".
 */
export type TranslatableCollection = Extract<CollectionKey, "vocabulary" | "kanji" | "sentences">;

export interface Translation {
  vi: string;
  by: string;
}

export interface TranslationLoad {
  map: Map<string, Translation>;
  errors: { line: number; message: string }[];
  duplicates: number;
  /** Số dòng chưa điền bản dịch (vi rỗng) */
  pending: number;
}

export const translationKey = (collection: string, id: string) => `${collection}/${id}`;

const MAX_VI: Record<TranslatableCollection, number> = { vocabulary: 4000, kanji: 4000, sentences: 1000 };

export function parseTranslationLine(line: string): { collection: TranslatableCollection; id: string; tr: Translation } | { pending: true } | { error: string } {
  let o: unknown;
  try {
    o = JSON.parse(line);
  } catch {
    return { error: "không phải JSON hợp lệ" };
  }
  if (!o || typeof o !== "object") return { error: "không phải đối tượng" };
  const r = o as Record<string, unknown>;
  const collection = r.collection;
  if (collection !== "vocabulary" && collection !== "kanji" && collection !== "sentences") return { error: 'collection phải là "vocabulary", "kanji" hoặc "sentences"' };
  if (typeof r.id !== "string" || !r.id.trim()) return { error: "thiếu id" };
  if (typeof r.vi !== "string") return { error: "thiếu trường vi" };
  if (!r.vi.trim()) return { pending: true }; // dòng xuất để dịch nhưng chưa điền — bỏ qua, không phải lỗi
  const vi = r.vi.trim();
  if (vi.length > MAX_VI[collection]) return { error: `bản dịch quá dài (> ${MAX_VI[collection]} ký tự)` };
  const by = typeof r.by === "string" && r.by.trim() ? r.by.trim().slice(0, 120) : "không rõ người/công cụ dịch";
  return { collection, id: r.id.trim(), tr: { vi, by } };
}

export async function loadTranslations(file: string | undefined): Promise<TranslationLoad> {
  const out: TranslationLoad = { map: new Map(), errors: [], duplicates: 0, pending: 0 };
  if (!file || !fs.existsSync(file)) return out;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let n = 0;
  for await (const raw of rl) {
    n++;
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const p = parseTranslationLine(line);
    if ("pending" in p) {
      out.pending++;
      continue;
    }
    if ("error" in p) {
      out.errors.push({ line: n, message: p.error });
      continue;
    }
    const k = translationKey(p.collection, p.id);
    if (out.map.has(k)) out.duplicates++;
    out.map.set(k, p.tr);
  }
  return out;
}

/** Áp bản dịch vào bản ghi (trước khi kiểm tra Zod). Luôn gắn nhãn dịch máy. */
export function applyTranslation(collection: TranslatableCollection, record: Record<string, unknown>, tr: Translation): Record<string, unknown> {
  const note = ` Bản dịch tiếng Việt: dịch máy/AI (${tr.by}), chưa có người kiểm tra.`;
  const out: Record<string, unknown> = { ...record, status: "machine_translated" };
  const baseNote = String(record.source_note ?? "");
  out.source_note = (baseNote + note).slice(0, 1000);
  if (collection === "sentences") {
    const existing = (record.translations as { lang: string; text: string; kind: string }[]) ?? [];
    out.translations = [...existing.filter((t) => !(t.lang === "vi" && t.kind === "machine_translated")), { lang: "vi", text: tr.vi, kind: "machine_translated" }];
  } else {
    out.meaning_vi = tr.vi;
    out.vi_kind = "machine_translated";
  }
  return out;
}
