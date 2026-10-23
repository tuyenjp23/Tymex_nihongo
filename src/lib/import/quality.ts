import fs from "node:fs";
import path from "node:path";
import type { CollectionKey } from "../types";
import type { Source } from "../schemas";
import { validateRecord, type IdSets } from "../admin/validate";
import { recordBaseHash } from "./hash";
import { sentenceDedupeKey, wordKey } from "./normalize";

type Rec = Record<string, unknown>;

/**
 * Kiểm tra chất lượng kho dữ liệu học tập. Hàm thuần theo dữ liệu truyền vào (chỉ việc kiểm tra file ảnh/âm thanh cục bộ mới chạm đĩa),
 * dùng chung cho CLI (`npm run import:quality`) và trang Admin "Chất lượng dữ liệu".
 *
 * Mức độ:
 *  - error:   dữ liệu sai/thiếu thông tin bắt buộc → cần sửa trước khi tin dùng
 *  - warning: cần người xem (dịch máy chưa duyệt, câu trùng, thiếu tiếng Việt…)
 *  - info:    ghi nhận, không phải lỗi (ví dụ cấp độ do người soạn tự đặt, URL ngoài chưa kiểm tra được)
 */
export type Severity = "error" | "warning" | "info";

export const QUALITY_CODES = {
  invalid_format: "Sai định dạng/quy tắc dữ liệu",
  missing_reading: "Thiếu cách đọc",
  missing_meaning: "Thiếu nghĩa",
  missing_vietnamese: "Chưa có nghĩa tiếng Việt (chỉ có nghĩa gốc)",
  missing_source: "Thiếu nguồn hoặc nguồn không tồn tại",
  missing_license: "Thiếu giấy phép",
  machine_translation_unreviewed: "Có bản dịch máy chưa được người kiểm tra",
  duplicate_sentence: "Câu ví dụ trùng nội dung",
  level_without_source: "Có cấp JLPT nhưng không ghi nguồn của cấp độ",
  level_by_author: "Cấp độ do người soạn tự đặt (không có nguồn bên ngoài)",
  media_unreachable: "File ảnh/âm thanh cục bộ không tồn tại",
  media_not_verified: "URL ảnh/âm thanh bên ngoài (chưa kiểm tra được khi không có mạng)",
  homograph: "Nhiều mục từ cùng chữ + cách đọc (khác mục JMdict — giữ riêng có chủ đích)",
  edited_import: "Bản ghi nhập từ nguồn đã được quản trị viên sửa tay (được bảo vệ khỏi ghi đè)",
  imported_unverified_public: "Dữ liệu nhập chưa xác minh đang hiển thị cho người học",
} as const;
export type QualityCode = keyof typeof QUALITY_CODES;

export interface QualityIssue {
  severity: Severity;
  code: QualityCode;
  collection: CollectionKey;
  id: string;
  message: string;
}

export interface QualityReport {
  generatedAt: string;
  issues: QualityIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    byCode: Partial<Record<QualityCode, number>>;
    totals: Partial<Record<CollectionKey, number>>;
    byStatus: Partial<Record<CollectionKey, Record<string, number>>>;
  };
}

export interface QualityData {
  sources: Rec[];
  images: Rec[];
  vocabulary: Rec[];
  kanji: Rec[];
  sentences: Rec[];
}

export interface QualityOptions {
  /** Thư mục public/ của app (để kiểm tra ảnh/âm thanh /images/...) */
  publicDir?: string;
  /** Thư mục dữ liệu của Admin (để kiểm tra /api/uploads/...) */
  dataDir?: string;
  now?: string;
  /** Có chạy kiểm tra Zod đầy đủ cho từng bản ghi không (mặc định có) */
  validate?: boolean;
}

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const isImported = (r: Rec) => r.origin === "imported_dataset" || !!r.import;

function localMediaExists(p: string, o: QualityOptions): boolean | null {
  if (!p.startsWith("/")) return null;
  if (p.startsWith("/api/uploads/")) {
    if (!o.dataDir) return null;
    const name = p.slice("/api/uploads/".length);
    if (!/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(name)) return false;
    return fs.existsSync(path.join(o.dataDir, "uploads", name));
  }
  if (!o.publicDir) return null;
  const f = path.join(o.publicDir, p.replace(/^\/+/, ""));
  if (!path.resolve(f).startsWith(path.resolve(o.publicDir))) return false;
  return fs.existsSync(f);
}

export function runQualityChecks(data: QualityData, opts: QualityOptions = {}): QualityReport {
  const issues: QualityIssue[] = [];
  const add = (severity: Severity, code: QualityCode, collection: CollectionKey, id: string, message: string) => issues.push({ severity, code, collection, id, message });

  const sources = new Map(data.sources.map((x) => [s(x.id), x as unknown as Source]));
  const ids: IdSets = {
    sources: new Set(sources.keys()),
    images: new Set(data.images.map((x) => s(x.id))),
    vocabulary: new Set(data.vocabulary.map((x) => s(x.id))),
    kanji: new Set(data.kanji.map((x) => s(x.id))),
    sentences: new Set(data.sentences.map((x) => s(x.id))),
  };

  /* Sổ nguồn */
  for (const src of sources.values()) {
    if (!s(src.license_note).trim()) add("error", "missing_license", "sources", src.id, `Nguồn "${src.source_name}" chưa ghi giấy phép/điều khoản`);
    if (src.import_policy === "allowed" && (!s(src.license_name).trim() || !s(src.license_url).trim()))
      add("warning", "missing_license", "sources", src.id, `Nguồn "${src.source_name}" được phép nhập nhưng thiếu tên hoặc URL giấy phép`);
    if (src.import_policy === "allowed" && src.attribution_required && !s(src.attribution_text).trim())
      add("error", "missing_license", "sources", src.id, `Nguồn "${src.source_name}" yêu cầu ghi công nhưng chưa có câu ghi công để hiển thị`);
  }

  /* Ảnh */
  for (const img of data.images) {
    const p = s(img.path);
    const ex = localMediaExists(p, opts);
    if (ex === false) add("error", "media_unreachable", "images", s(img.id), `Không thấy file ảnh ${p}`);
    else if (ex === null && /^https?:/i.test(p)) add("info", "media_not_verified", "images", s(img.id), `Ảnh ở URL ngoài (${p}) chưa kiểm tra được từ máy này`);
  }

  const checkCommon = (collection: Extract<CollectionKey, "vocabulary" | "kanji" | "sentences">, r: Rec) => {
    const id = s(r.id);
    // Nguồn
    const sid = r.source_id ? s(r.source_id) : "";
    if (!sid) add("error", "missing_source", collection, id, "Chưa gắn nguồn (source_id)");
    else if (!sources.has(sid)) add("error", "missing_source", collection, id, `Nguồn "${sid}" không có trong sổ nguồn`);
    // Nhập từ nguồn ngoài: cần dấu vết + giấy phép
    const meta = r.import && typeof r.import === "object" ? (r.import as Rec) : null;
    if (isImported(r)) {
      if (!meta) add("error", "missing_source", collection, id, "Nhập từ bộ dữ liệu nhưng thiếu dấu vết nhập (import)");
      else {
        if (!s(meta.license).trim()) add("error", "missing_license", collection, id, "Bản ghi nhập thiếu giấy phép (import.license)");
        if (!s(meta.dataset_version).trim()) add("warning", "missing_source", collection, id, "Bản ghi nhập thiếu phiên bản bộ dữ liệu");
        if (meta.base_hash && meta.base_hash !== recordBaseHash(r)) add("info", "edited_import", collection, id, "Đã được sửa tay sau khi nhập");
      }
      if (s(r.status) === "imported" || s(r.status) === "machine_translated") {
        if (r.hidden !== true) add("info", "imported_unverified_public", collection, id, "Chưa xác minh nhưng đang hiển thị (có nhãn trạng thái cho người học)");
      }
    }
    // Cấp độ
    if (r.level) {
      const ls = r.level_source ? s(r.level_source) : "";
      if (!ls) {
        if (isImported(r) || collection === "sentences") add("error", "level_without_source", collection, id, `Có cấp ${s(r.level)} nhưng không ghi nguồn của cấp độ`);
        else add("info", "level_by_author", collection, id, `Cấp ${s(r.level)} do người soạn đặt`);
      } else if (!sources.has(ls)) add("error", "level_without_source", collection, id, `Nguồn của cấp độ "${ls}" không tồn tại`);
    }
    // Dịch máy chưa duyệt
    const mt = collection === "sentences" ? (Array.isArray(r.translations) ? (r.translations as Rec[]).some((t) => t.kind === "machine_translated") : false) : r.vi_kind === "machine_translated";
    if (mt && s(r.status) !== "verified" && s(r.status) !== "published") add("warning", "machine_translation_unreviewed", collection, id, "Có bản dịch máy chưa được người kiểm tra");
  };

  /* Từ vựng */
  const vocabKeys = new Map<string, string[]>();
  for (const r of data.vocabulary) {
    const id = s(r.id);
    checkCommon("vocabulary", r);
    if (!s(r.reading).trim()) add("error", "missing_reading", "vocabulary", id, "Thiếu cách đọc");
    const senses = Array.isArray(r.senses) ? r.senses : [];
    if (!s(r.meaning_vi).trim()) {
      if (senses.length === 0) add("error", "missing_meaning", "vocabulary", id, "Không có nghĩa nào (cả tiếng Việt lẫn nghĩa gốc)");
      else add("warning", "missing_vietnamese", "vocabulary", id, "Chỉ có nghĩa gốc (tiếng Anh), chưa có tiếng Việt");
    }
    if (r.audio_url) {
      const ex = localMediaExists(s(r.audio_url), opts);
      if (ex === false) add("error", "media_unreachable", "vocabulary", id, `Không thấy file âm thanh ${s(r.audio_url)}`);
      else if (ex === null) add("info", "media_not_verified", "vocabulary", id, "URL âm thanh ngoài chưa kiểm tra được");
    }
    const k = wordKey(s(r.word), s(r.reading));
    vocabKeys.set(k, [...(vocabKeys.get(k) ?? []), id]);
  }
  for (const [, list] of vocabKeys) if (list.length > 1) for (const id of list) add("info", "homograph", "vocabulary", id, `Cùng chữ + cách đọc với: ${list.filter((x) => x !== id).join(", ")}`);

  /* Kanji */
  for (const r of data.kanji) {
    const id = s(r.id);
    checkCommon("kanji", r);
    const on = Array.isArray(r.onyomi) ? r.onyomi.length : 0;
    const kun = Array.isArray(r.kunyomi) ? r.kunyomi.length : 0;
    if (on + kun === 0) add("warning", "missing_reading", "kanji", id, "Không có âm On lẫn âm Kun");
    const en = Array.isArray(r.meanings_en) ? r.meanings_en.length : 0;
    if (!s(r.meaning_vi).trim()) {
      if (en === 0) add("error", "missing_meaning", "kanji", id, "Không có nghĩa nào");
      else add("warning", "missing_vietnamese", "kanji", id, "Chỉ có nghĩa gốc (tiếng Anh), chưa có tiếng Việt");
    }
  }

  /* Câu ví dụ */
  const sentKeys = new Map<string, string[]>();
  for (const r of data.sentences) {
    const id = s(r.id);
    checkCommon("sentences", r);
    const tr = Array.isArray(r.translations) ? (r.translations as Rec[]) : [];
    if (tr.length === 0) add("error", "missing_meaning", "sentences", id, "Câu chưa có bản dịch nào");
    if (isImported(r) && !s(r.attribution).trim()) add("error", "missing_license", "sentences", id, "Câu nhập thiếu câu ghi công (attribution)");
    if (isImported(r) && !s(r.license).trim()) add("error", "missing_license", "sentences", id, "Câu nhập thiếu giấy phép");
    if (!tr.some((t) => t.lang === "vi")) add("info", "missing_vietnamese", "sentences", id, "Chưa có bản dịch tiếng Việt");
    const k = sentenceDedupeKey(s(r.ja));
    sentKeys.set(k, [...(sentKeys.get(k) ?? []), id]);
  }
  for (const [, list] of sentKeys) if (list.length > 1) for (const id of list) add("warning", "duplicate_sentence", "sentences", id, `Trùng nội dung với: ${list.filter((x) => x !== id).join(", ")}`);

  /* Kiểm tra định dạng theo schema + quy tắc nguồn gốc + liên kết */
  if (opts.validate !== false) {
    const ctx = { sources, ids };
    for (const c of ["vocabulary", "kanji", "sentences"] as const) {
      for (const r of data[c]) {
        const res = validateRecord(c, r, ctx);
        if (!res.ok) add("error", "invalid_format", c, s(r.id), res.errors.map((e) => `${e.path || "(chung)"}: ${e.message}`).join("; "));
      }
    }
  }

  const byCode: Partial<Record<QualityCode, number>> = {};
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const i of issues) {
    byCode[i.code] = (byCode[i.code] ?? 0) + 1;
    if (i.severity === "error") errors++;
    else if (i.severity === "warning") warnings++;
    else infos++;
  }
  const totals: QualityReport["summary"]["totals"] = {};
  const byStatus: QualityReport["summary"]["byStatus"] = {};
  for (const c of ["vocabulary", "kanji", "sentences"] as const) {
    totals[c] = data[c].length;
    const m: Record<string, number> = {};
    for (const r of data[c]) m[s(r.status)] = (m[s(r.status)] ?? 0) + 1;
    byStatus[c] = m;
  }
  return { generatedAt: opts.now ?? new Date().toISOString(), issues, summary: { errors, warnings, infos, byCode, totals, byStatus } };
}

const SEV_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function renderQualityText(r: QualityReport, perCode = 5): string {
  const L: string[] = [];
  L.push(`Kiểm tra chất lượng dữ liệu — ${r.generatedAt}`);
  for (const [c, n] of Object.entries(r.summary.totals)) L.push(`  ${c}: ${n} bản ghi · trạng thái ${JSON.stringify(r.summary.byStatus[c as CollectionKey])}`);
  L.push(`\n  Lỗi: ${r.summary.errors} · Cảnh báo: ${r.summary.warnings} · Ghi nhận: ${r.summary.infos}\n`);
  const groups = new Map<string, QualityIssue[]>();
  for (const i of r.issues) groups.set(`${i.severity}|${i.code}`, [...(groups.get(`${i.severity}|${i.code}`) ?? []), i]);
  const keys = [...groups.keys()].sort((a, b) => SEV_ORDER[a.split("|")[0] as Severity] - SEV_ORDER[b.split("|")[0] as Severity]);
  for (const k of keys) {
    const list = groups.get(k)!;
    const [sev, code] = k.split("|") as [Severity, QualityCode];
    L.push(`[${sev === "error" ? "LỖI" : sev === "warning" ? "CẢNH BÁO" : "GHI NHẬN"}] ${QUALITY_CODES[code]} — ${list.length}`);
    for (const i of list.slice(0, perCode)) L.push(`    ${i.collection}/${i.id}: ${i.message}`);
    if (list.length > perCode) L.push(`    … và ${list.length - perCode} mục nữa`);
  }
  if (r.issues.length === 0) L.push("✓ Không có vấn đề nào.");
  return L.join("\n");
}
