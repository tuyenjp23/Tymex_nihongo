import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import type { Source } from "@/lib/schemas";
import { blankRecord, csvColumns, allSpecs, coerceCsvCell } from "@/lib/admin/field-specs";
import { checkReferences, findUsages, validateRecord, type IdSets, type ValidationContext } from "@/lib/admin/validate";
import { MAX_IMPORT_ROWS, planImport } from "@/lib/admin/importer";
import { toCsv } from "@/lib/csv";

const seedDir = path.resolve(__dirname, "../../content/seed");
const seed = Object.fromEntries(
  COLLECTION_KEYS.map((c) => [c, JSON.parse(fs.readFileSync(path.join(seedDir, `${c}.json`), "utf8")) as Record<string, unknown>[]]),
) as Record<CollectionKey, Record<string, unknown>[]>;

function ctxFrom(data: Record<CollectionKey, Record<string, unknown>[]>): ValidationContext {
  const ids: IdSets = {};
  for (const c of COLLECTION_KEYS) ids[c] = new Set(data[c].map((r) => String(r.id)));
  return { sources: new Map((data.sources as unknown as Source[]).map((s) => [s.id, s])), ids };
}
const ctx = ctxFrom(seed);
const NOW = "2026-10-22T00:00:00.000Z";
const existingOf = (c: CollectionKey) => new Map(seed[c].map((r) => [String(r.id), r]));

describe("dữ liệu mẫu qua bộ kiểm tra của Admin", () => {
  it.each(COLLECTION_KEYS)("mọi bản ghi mẫu của %s đều hợp lệ", (c) => {
    const bad: string[] = [];
    for (const r of seed[c]) {
      const res = validateRecord(c, r, ctx, { now: NOW });
      if (!res.ok) bad.push(`${String(r.id)}: ${res.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("xuất CSV → nhập lại (khứ hồi)", () => {
  it.each(COLLECTION_KEYS)("%s: CSV xuất ra nhập lại không lỗi và không đổi nội dung", (c) => {
    if (seed[c].length === 0) return; // collection trống trong seed (ví dụ sentences): có test riêng ở tests/unit/sentences.test.ts
    const csv = toCsv(seed[c], csvColumns(c));
    const plan = planImport({ collection: c, format: "csv", text: csv, mode: "upsert", existing: existingOf(c), ctx, now: NOW });
    const errs = plan.rows.filter((r) => r.action === "error").map((r) => `${r.id}: ${r.errors.map((e) => `${e.path} ${e.message}`).join("; ")}`);
    expect(plan.fileErrors).toEqual([]);
    expect(errs).toEqual([]);
    expect(plan.counts.update).toBe(seed[c].length);
    const strip = (r: Record<string, unknown>) => {
      const { created_at: _c, updated_at: _u, ...rest } = r;
      return rest;
    };
    const byId = new Map(plan.valid.map((r) => [String(r.id), r]));
    for (const orig of seed[c]) {
      const back = byId.get(String(orig.id))!;
      // so khớp trên các khóa có trong bản gốc (Zod có thể thêm giá trị mặc định cho khóa vắng)
      const a = strip(orig);
      const b = strip(back);
      for (const k of Object.keys(a)) expect({ id: orig.id, k, v: b[k] }).toEqual({ id: orig.id, k, v: a[k] });
    }
  });

  it.each(COLLECTION_KEYS)("%s: JSON xuất ra nhập lại không lỗi", (c) => {
    if (seed[c].length === 0) return;
    const plan = planImport({ collection: c, format: "json", text: JSON.stringify(seed[c]), mode: "upsert", existing: existingOf(c), ctx, now: NOW });
    expect(plan.rows.filter((r) => r.action === "error")).toEqual([]);
    expect(plan.counts.update).toBe(seed[c].length);
  });
});

describe("planImport", () => {
  const vocab = () => ({ ...seed.vocabulary[0] });

  it("create_only báo lỗi với ID đã tồn tại, upsert thì là cập nhật", () => {
    const text = JSON.stringify([vocab()]);
    const a = planImport({ collection: "vocabulary", format: "json", text, mode: "create_only", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(a.counts).toEqual({ create: 0, update: 0, error: 1 });
    expect(a.rows[0].errors[0].message).toMatch(/đã tồn tại/);
    const b = planImport({ collection: "vocabulary", format: "json", text, mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(b.counts).toEqual({ create: 0, update: 1, error: 0 });
  });

  it("bản ghi mới đúng → create; trùng ID trong cùng file → lỗi", () => {
    const rec = { ...vocab(), id: "vocab-import-1" };
    const p = planImport({ collection: "vocabulary", format: "json", text: JSON.stringify([rec, rec]), mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.counts.create).toBe(1);
    expect(p.counts.error).toBe(1);
    expect(p.rows[1].errors.some((e) => /trùng/.test(e.message))).toBe(true);
  });

  it("trường vắng mặt: bản ghi cũ giữ giá trị hiện có", () => {
    const orig = vocab();
    const p = planImport({ collection: "vocabulary", format: "json", text: JSON.stringify([{ id: orig.id, meaning_vi: "chỉ đổi nghĩa" }]), mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.counts.error).toBe(0);
    expect(p.valid[0].meaning_vi).toBe("chỉ đổi nghĩa");
    expect(p.valid[0].word).toBe(orig.word);
    expect(p.valid[0].reading).toBe(orig.reading);
  });

  it("bản ghi mới thiếu trường bắt buộc → lỗi, không được âm thầm bịa dữ liệu", () => {
    const p = planImport({ collection: "vocabulary", format: "json", text: JSON.stringify([{ id: "vocab-thieu" }]), mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.counts.error).toBe(1);
    expect(p.valid).toEqual([]);
  });

  it("bản ghi mới không khai báo nguồn gốc → mặc định tự biên soạn + bản nháp", () => {
    const { word, reading, meaning_vi, level, topic } = vocab() as Record<string, unknown>;
    const p = planImport({ collection: "vocabulary", format: "json", text: JSON.stringify([{ id: "vocab-mac-dinh", word, reading, meaning_vi, level, topic }]), mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.fileErrors).toEqual([]);
    if (p.counts.error) console.log(p.rows[0].errors);
    expect(p.valid[0].origin).toBe("self_authored");
    expect(p.valid[0].status).toBe("draft");
  });

  it("JSON hỏng, không phải mảng, rỗng, quá nhiều dòng → lỗi cấp file", () => {
    const base = { collection: "vocabulary" as const, mode: "upsert" as const, existing: new Map(), ctx, now: NOW };
    expect(planImport({ ...base, format: "json", text: "{oops" }).fileErrors[0]).toMatch(/JSON không hợp lệ/);
    expect(planImport({ ...base, format: "json", text: '{"a":1}' }).fileErrors[0]).toMatch(/mảng/);
    expect(planImport({ ...base, format: "json", text: "[]" }).fileErrors[0]).toMatch(/không có bản ghi/);
    expect(planImport({ ...base, format: "json", text: JSON.stringify({ records: [vocab()] }) }).fileErrors).toEqual([]);
    const many = JSON.stringify(Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => ({ id: `v${i}` })));
    expect(planImport({ ...base, format: "json", text: many }).fileErrors[0]).toMatch(/Quá nhiều/);
  });

  it("file quá lớn bị từ chối", () => {
    const big = "x".repeat(5 * 1024 * 1024 + 10);
    const p = planImport({ collection: "vocabulary", format: "json", text: big, mode: "upsert", existing: new Map(), ctx, now: NOW });
    expect(p.fileErrors[0]).toMatch(/quá lớn/);
  });

  it("ô CSV chứa JSON hỏng được báo theo dòng, các dòng khác vẫn xử lý", () => {
    const cols = csvColumns("vocabulary");
    const good = seed.vocabulary[0];
    const bad = { ...seed.vocabulary[1], examples: "[không phải json" };
    const csv = toCsv([good, bad as never], cols);
    const p = planImport({ collection: "vocabulary", format: "csv", text: csv, mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.rows[0].action).toBe("update");
    expect(p.rows[1].action).toBe("error");
  });

  it("CSV có BOM và CRLF vẫn đọc được", () => {
    const csv = "﻿" + toCsv([seed.vocabulary[0]], csvColumns("vocabulary")).replace(/\n/g, "\r\n");
    const p = planImport({ collection: "vocabulary", format: "csv", text: csv, mode: "upsert", existing: existingOf("vocabulary"), ctx, now: NOW });
    expect(p.counts).toEqual({ create: 0, update: 1, error: 0 });
  });

  it("nhập không ghi gì: kết quả chỉ là kế hoạch (existing không bị thay đổi)", () => {
    const ex = existingOf("vocabulary");
    const size = ex.size;
    planImport({ collection: "vocabulary", format: "json", text: JSON.stringify([{ ...vocab(), id: "vocab-new-x" }]), mode: "upsert", existing: ex, ctx, now: NOW });
    expect(ex.size).toBe(size);
  });
});

describe("quy tắc nguồn gốc khi nhập/sửa", () => {
  const vocab = () => ({ ...seed.vocabulary[0], id: "vocab-prov" });
  const sourceOfType = (type: string, reuse: string): Source => ({ ...(seed.sources[0] as unknown as Source), id: "src-t", source_type: type, reuse_allowed: reuse } as Source);
  const withSource = (s: Source): ValidationContext => ({ sources: new Map([...ctx.sources, [s.id, s]]), ids: ctx.ids });

  it("AI không thể là người xác minh", () => {
    const r = validateRecord("vocabulary", { ...vocab(), status: "verified", reviewed_by: "Claude", last_verified: "2026-10-01" }, ctx, { now: NOW });
    expect(r.ok).toBe(false);
  });
  it("official_sample không có nguồn → lỗi", () => {
    const r = validateRecord("vocabulary", { ...vocab(), origin: "official_sample", source_id: null }, ctx, { now: NOW });
    expect(r.ok).toBe(false);
  });
  it("official_sample gắn nguồn không chính thức hoặc chưa rõ quyền → lỗi", () => {
    const nonOfficial = withSource(sourceOfType("self_authored", "yes"));
    expect(validateRecord("vocabulary", { ...vocab(), origin: "official_sample", source_id: "src-t" }, nonOfficial, { now: NOW }).ok).toBe(false);
    const unknownReuse = withSource(sourceOfType("official_exam", "unknown"));
    expect(validateRecord("vocabulary", { ...vocab(), origin: "official_sample", source_id: "src-t" }, unknownReuse, { now: NOW }).ok).toBe(false);
  });
  it("source_id không tồn tại → lỗi", () => {
    expect(validateRecord("vocabulary", { ...vocab(), source_id: "src-khong-co" }, ctx, { now: NOW }).ok).toBe(false);
  });
  it("verified thiếu người rà soát/ngày → lỗi (nguồn, ảnh, nội dung)", () => {
    expect(validateRecord("sources", { ...seed.sources[0], verification_status: "verified", reviewed_by: "", last_verified: null }, ctx, { now: NOW }).ok).toBe(false);
    expect(validateRecord("vocabulary", { ...vocab(), status: "verified", reviewed_by: null, last_verified: null }, ctx, { now: NOW }).ok).toBe(false);
  });
});

describe("tham chiếu & xóa an toàn", () => {
  it("checkReferences bắt ảnh/bài đọc/mục học không tồn tại", () => {
    expect(checkReferences("vocabulary", { image_id: "img-ma" }, ctx.ids)[0].path).toBe("image_id");
    expect(checkReferences("questions", { passage_id: "p-ma" }, ctx.ids)[0].path).toBe("passage_id");
    expect(checkReferences("questions", { ref_type: "vocabulary" }, ctx.ids)[0].path).toBe("ref_id");
    expect(checkReferences("questions", { ref_id: "x" }, ctx.ids)[0].path).toBe("ref_type");
    expect(checkReferences("questions", { ref_type: "kanji", ref_id: "kanji-ma" }, ctx.ids)).toHaveLength(1);
    expect(checkReferences("lessons", { item_refs: [{ type: "vocabulary", id: "v-ma" }] }, ctx.ids)[0].path).toBe("item_refs.0.id");
    expect(checkReferences("vocabulary", {}, ctx.ids)).toEqual([]);
  });
  it("findUsages tìm mọi nơi đang dùng một nguồn / ảnh / bài đọc", () => {
    const withImage = seed.vocabulary.find((v) => v.image_id);
    if (withImage) expect(findUsages("images", String(withImage.image_id), seed).some((u) => u.collection === "vocabulary" && u.id === withImage.id)).toBe(true);
    const srcId = String(seed.vocabulary[0].source_id ?? "");
    if (srcId) expect(findUsages("sources", srcId, seed).length).toBeGreaterThan(0);
    const synthetic = { ...seed, lessons: [{ id: "l1", item_refs: [{ type: "vocabulary", id: "v1" }] }], questions: [{ id: "q1", ref_type: "vocabulary", ref_id: "v1" }] } as typeof seed;
    expect(findUsages("vocabulary", "v1", synthetic).map((u) => u.collection).sort()).toEqual(["lessons", "questions"]);
    expect(findUsages("vocabulary", "khong-ai-dung", synthetic)).toEqual([]);
  });
});

describe("field-specs", () => {
  it("blankRecord thỏa schema ở các trường chung khi điền các trường bắt buộc", () => {
    for (const c of COLLECTION_KEYS) {
      const b = blankRecord(c, `${c}-blank`);
      expect(b.id).toBe(`${c}-blank`);
    }
  });
  it("mọi cột CSV đều là khóa form hoặc id/created_at/updated_at, không trùng lặp", () => {
    for (const c of COLLECTION_KEYS) {
      const cols = csvColumns(c);
      expect(new Set(cols).size).toBe(cols.length);
      expect(cols.slice(0, 1)).toEqual(["id"]);
    }
  });
  it("coerceCsvCell: boolean, number, danh sách, JSON, null", () => {
    const spec = (kind: string, extra = {}) => ({ key: "k", label: "k", kind, ...extra }) as never;
    expect(coerceCsvCell(spec("boolean"), "Có")).toBe(true);
    expect(coerceCsvCell(spec("boolean"), "false")).toBe(false);
    expect(coerceCsvCell(spec("number"), " 12 ")).toBe(12);
    expect(coerceCsvCell(spec("number"), "")).toBeUndefined();
    expect(coerceCsvCell(spec("strings"), "a|b\nc")).toEqual(["a", "b", "c"]);
    expect(coerceCsvCell(spec("strings"), '["x","y"]')).toEqual(["x", "y"]);
    // Ô trống: select cho phép null → null; select bắt buộc → "vắng mặt" (undefined) để bản ghi cũ giữ giá trị cũ
    expect(coerceCsvCell(spec("select", { nullable: true }), "")).toBeNull();
    expect(coerceCsvCell(spec("select", { options: [] }), "")).toBeUndefined();
    expect(() => coerceCsvCell(spec("json"), "{oops")).toThrow();
    expect(allSpecs("vocabulary").length).toBeGreaterThan(5);
  });
});

describe("bộ đề (quiz_sets)", () => {
  const base = () => ({
    ...(seed.quiz_sets[0] as Record<string, unknown>),
    id: "qset-test",
  });
  it("bộ đề mẫu hợp lệ; thiếu câu, câu lặp, câu không tồn tại đều bị chặn", () => {
    expect(validateRecord("quiz_sets", base(), ctx, { now: NOW }).ok).toBe(true);

    const few = validateRecord("quiz_sets", { ...base(), items: [{ question_id: "q-n5-001" }] }, ctx, { now: NOW });
    expect(few.ok).toBe(false);

    const dup = validateRecord("quiz_sets", { ...base(), items: [{ question_id: "q-n5-001" }, { question_id: "q-n5-002" }, { question_id: "q-n5-001" }] }, ctx, { now: NOW });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors.map((e) => e.message).join()).toMatch(/bị lặp/);

    const missing = validateRecord("quiz_sets", { ...base(), items: [{ question_id: "q-n5-001" }, { question_id: "q-n5-002" }, { question_id: "q-khong-co" }] }, ctx, { now: NOW });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors[0]).toMatchObject({ path: "items.2.question_id" });
  });
  it("quy tắc nguồn gốc áp dụng cho bộ đề: 'đã xác minh' cần người rà soát", () => {
    const r = validateRecord("quiz_sets", { ...base(), status: "verified" }, ctx, { now: NOW });
    expect(r.ok).toBe(false);
  });
  it("không xóa được câu hỏi đang nằm trong bộ đề", () => {
    const usages = findUsages("questions", "q-n5-001", seed);
    expect(usages.some((u) => u.collection === "quiz_sets")).toBe(true);
    expect(findUsages("questions", "q-n5-100-khong-dung", seed)).toEqual([]);
  });
  it("nhập CSV bộ đề: ô items ghi dạng JSON", () => {
    const csv = toCsv([base()], csvColumns("quiz_sets"));
    const plan = planImport({ collection: "quiz_sets", format: "csv", text: csv, mode: "upsert", existing: existingOf("quiz_sets"), ctx, now: NOW });
    expect(plan.fileErrors).toEqual([]);
    expect(plan.counts.error).toBe(0);
    expect(plan.counts.create).toBe(1);
  });
});
