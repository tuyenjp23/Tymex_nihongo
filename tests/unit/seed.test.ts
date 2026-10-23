import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COLLECTION_SCHEMAS } from "@/lib/schemas";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import { validateRubyMarkup } from "@/lib/furigana";
import { checkProvenance } from "@/lib/provenance";
import type { Source } from "@/lib/schemas";

const seedDir = path.resolve(__dirname, "../../content/seed");
const load = (c: CollectionKey): Record<string, unknown>[] => JSON.parse(fs.readFileSync(path.join(seedDir, `${c}.json`), "utf8"));

describe("seed content", () => {
  for (const c of COLLECTION_KEYS) {
    it(`${c}: mọi bản ghi hợp lệ theo schema và ID không trùng`, () => {
      const rows = load(c);
      // Kho câu ví dụ trống trong seed (nạp bằng pipeline nhập); các collection khác phải có dữ liệu mẫu
      if (c !== "sentences") expect(rows.length).toBeGreaterThan(0);
      const ids = new Set<string>();
      for (const r of rows) {
        const res = COLLECTION_SCHEMAS[c].safeParse(r);
        if (!res.success) throw new Error(`${c}/${String(r.id)}: ${JSON.stringify(res.error.issues[0])}`);
        expect(ids.has(String(r.id))).toBe(false);
        ids.add(String(r.id));
      }
    });
  }

  it("tham chiếu chéo (source_id, image_id, passage_id, ref_id, item_refs) đều tồn tại", () => {
    const ids = Object.fromEntries(COLLECTION_KEYS.map((c) => [c, new Set(load(c).map((r) => String(r.id)))])) as Record<CollectionKey, Set<string>>;
    for (const c of COLLECTION_KEYS) {
      for (const r of load(c)) {
        if (r.source_id) expect(ids.sources.has(String(r.source_id)), `${c}/${r.id} source_id`).toBe(true);
        if (r.image_id) expect(ids.images.has(String(r.image_id)), `${c}/${r.id} image_id`).toBe(true);
        if (r.passage_id) expect(ids.passages.has(String(r.passage_id)), `${c}/${r.id} passage_id`).toBe(true);
        if (r.ref_id) {
          const col = r.ref_type === "vocabulary" ? "vocabulary" : r.ref_type === "kanji" ? "kanji" : "grammar";
          expect(ids[col].has(String(r.ref_id)), `${c}/${r.id} ref_id`).toBe(true);
        }
        if (Array.isArray(r.item_refs)) {
          for (const ref of r.item_refs as { type: string; id: string }[]) {
            const col = ({ vocabulary: "vocabulary", kanji: "kanji", grammar: "grammar", conversation: "conversations", passage: "passages" } as const)[ref.type as "vocabulary"];
            expect(ids[col].has(ref.id), `lesson ${r.id} -> ${ref.type}:${ref.id}`).toBe(true);
          }
        }
      }
    }
  });

  it("cú pháp chú âm hợp lệ trong mọi trường văn bản tiếng Nhật", () => {
    const bad: string[] = [];
    const walk = (v: unknown, where: string) => {
      if (typeof v === "string") {
        for (const e of validateRubyMarkup(v)) bad.push(`${where}: ${e} — "${v.slice(0, 40)}"`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
    };
    for (const c of ["vocabulary", "kanji", "grammar", "questions", "passages", "conversations", "lessons"] as const) {
      for (const r of load(c)) {
        const { source_note: _s, ...rest } = r as Record<string, unknown>;
        walk(rest, `${c}/${String(r.id)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("nội dung AI soạn KHÔNG được gắn nhãn 'mẫu chính thức' hay 'đã xác minh'", () => {
    for (const c of COLLECTION_KEYS.filter((k) => k !== "sources")) {
      for (const r of load(c)) {
        expect(r.origin ?? "ai_generated", `${c}/${r.id}`).not.toBe("official_sample");
        expect(["verified", "published"], `${c}/${r.id}`).not.toContain(r.status);
      }
    }
  });

  it("từ trừu tượng không bị gán hình minh họa duy nhất", () => {
    for (const r of load("vocabulary")) {
      if (r.topic === "abstract") expect(r.image_id, String(r.id)).toBeNull();
      if (r.image_id) expect(r.imageable).toBe(true);
    }
  });

  it("không bản ghi seed nào vi phạm quy tắc provenance phía server", () => {
    const sources = new Map((load("sources") as unknown as Source[]).map((s) => [s.id, s]));
    for (const c of COLLECTION_KEYS) for (const r of load(c)) expect(checkProvenance(c, r, sources), `${c}/${r.id}`).toEqual([]);
  });

  it("nguồn chính thức: đều có URL, ghi chú giấy phép, và chưa tự đánh dấu 'verified' khi chưa có người duyệt", () => {
    for (const s of load("sources") as unknown as Source[]) {
      expect(s.license_note.length).toBeGreaterThan(20);
      if (s.source_type !== "self_authored") expect(s.source_url).toMatch(/^https?:\/\//);
      if (s.verification_status === "verified" || s.verification_status === "published") expect(s.reviewed_by).toBeTruthy();
    }
  });

  it("file hình SVG tồn tại cho mọi image asset", () => {
    for (const r of load("images")) {
      const file = path.resolve(__dirname, "../../public", String(r.path).replace(/^\//, ""));
      expect(fs.existsSync(file), String(r.path)).toBe(true);
    }
  });
});
