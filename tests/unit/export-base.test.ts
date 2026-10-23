import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BASE_COLLECTIONS, ExportError, buildBaseExport, type BaseCollection } from "@/lib/import/export-base";
import { vocabIndex, kanjiIndex } from "@/lib/memo-index";
import type { Kanji, Vocabulary } from "@/lib/schemas";

const seedDir = path.resolve(__dirname, "../../content/seed");
const readSeed = (c: string) => JSON.parse(fs.readFileSync(path.join(seedDir, `${c}.json`), "utf8")) as Record<string, unknown>[];
const empty = () => ({ vocabulary: [], kanji: [], sentences: [] }) as Record<BaseCollection, never[]>;
const noSeed = () => ({ vocabulary: new Set<string>(), kanji: new Set<string>(), sentences: new Set<string>() });

const imp = (extra: Record<string, unknown> = {}) => ({ ...readSeed("vocabulary")[0], id: "jm-1", level: "N5", status: "imported", origin: "imported_dataset", import: { source_id: "src-jmdict", external_id: "1", dataset_version: "v1", imported_at: "2026-01-01T00:00:00.000Z", run_id: "run-1", license: "x", content_hash: "h", base_hash: "b" }, ...extra });

describe("buildBaseExport", () => {
  it("chỉ lấy bản ghi có dấu vết nhập; bỏ bản mẫu; đếm theo cấp/trạng thái", () => {
    const seedRec = readSeed("vocabulary")[0];
    const recs = { ...empty(), vocabulary: [seedRec, imp(), imp({ id: "jm-2", level: "N3" })] as never[] };
    const out = buildBaseExport(recs, noSeed(), new Date("2026-02-02T00:00:00Z"));
    expect(out.data.vocabulary.map((r) => r.id)).toEqual(["jm-1", "jm-2"]);
    expect(out.manifest.counts).toEqual({ vocabulary: 2, kanji: 0, sentences: 0 });
    expect(out.manifest.by_level.vocabulary).toEqual({ N5: 1, N3: 1 });
    expect(out.manifest.by_status.vocabulary).toEqual({ imported: 2 });
    expect(out.manifest.run_ids).toEqual(["run-1"]);
    expect(out.manifest.dataset_versions).toEqual(["v1"]);
    expect(out.manifest.generated_at).toBe("2026-02-02T00:00:00.000Z");
  });
  it("từ chối ID trùng với dữ liệu mẫu hoặc trùng nhau, và bản ghi sai schema", () => {
    const recs = { ...empty(), vocabulary: [imp()] as never[] };
    expect(() => buildBaseExport(recs, { ...noSeed(), vocabulary: new Set(["jm-1"]) })).toThrow(ExportError);
    expect(() => buildBaseExport({ ...empty(), vocabulary: [imp(), imp()] as never[] }, noSeed())).toThrow(/trùng/);
    expect(() => buildBaseExport({ ...empty(), vocabulary: [imp({ level: "N9" })] as never[] }, noSeed())).toThrow(/schema/);
  });
  it("cảnh báo khi có bản ghi đã được người xác minh", () => {
    const out = buildBaseExport({ ...empty(), vocabulary: [imp({ reviewed_by: "Cô A", status: "verified", last_verified: "2026-01-01" })] as never[] }, noSeed());
    expect(out.manifest.warnings.join(" ")).toMatch(/đóng băng/);
  });
  it("danh sách collection xuất đúng 3 loại", () => {
    expect([...BASE_COLLECTIONS]).toEqual(["vocabulary", "kanji", "sentences"]);
  });
});

describe("memo-index", () => {
  it("cùng một đối tượng → cùng chuỗi (tính một lần); tìm được bằng romaji/tiếng Anh", () => {
    const v = { ...readSeed("vocabulary")[0], word: "山", reading: "やま", meaning_vi: "núi", meanings_en: ["mountain"] } as unknown as Vocabulary;
    const a = vocabIndex(v);
    expect(vocabIndex(v)).toBe(a);
    expect(a).toContain("yama");
    expect(a).toContain("nui");
    const k = readSeed("kanji")[0] as unknown as Kanji;
    expect(kanjiIndex(k)).toContain(k.char);
  });
});
