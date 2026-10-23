import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { canonicalJson, hashOf, recordBaseHash } from "@/lib/import/hash";
import { StreamFormatError, streamDataset, readMetadata } from "@/lib/import/stream-json";
import {
  isSkip,
  kataToHira,
  normalizeKanji,
  normalizeSentence,
  normalizeWord,
  posSummary,
  sentenceDedupeKey,
  sentenceProblem,
  wordKey,
  type RawWord,
} from "@/lib/import/normalize";
import { applyTranslation, loadTranslations, parseTranslationLine } from "@/lib/import/translations";
import { decideMerge } from "@/lib/import/merge";
import { GROUPS, inspectDataset, planImport, resolveGroup, sourceGate, type ExistingData } from "@/lib/import/plan";
import { rollbackRun, runImport } from "@/lib/import/run";
import { runQualityChecks } from "@/lib/import/quality";
import type { Source } from "@/lib/schemas";

const SEED_DIR = path.join(process.cwd(), "content", "seed");
const readSeed = (c: string) => JSON.parse(fs.readFileSync(path.join(SEED_DIR, `${c}.json`), "utf8")) as Record<string, unknown>[];
const ctx = { runId: "r1", now: "2026-10-23T00:00:00.000Z", datasetVersion: "jld-test/1/2026-01-01" };

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nc-import-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/* ───────────── Dữ liệu mẫu nhỏ có cấu trúc giống bộ Japanese Language Data ───────────── */

const word = (id: string, over: Partial<RawWord> & { gloss?: string; misc?: string[]; examples?: unknown[]; level?: string | null; pos?: string[] }): RawWord => ({
  id,
  kanji: over.kanji,
  kana: over.kana ?? [],
  sense: over.sense ?? [
    {
      partOfSpeech: over.pos ?? ["n"],
      appliesToKanji: ["*"],
      appliesToKana: ["*"],
      misc: over.misc ?? [],
      field: [],
      info: [],
      languageSource: [],
      gloss: [{ lang: "eng", text: over.gloss ?? "thing" }],
      examples: (over.examples ?? []) as never,
    },
  ],
  jlpt_waller: over.level === undefined ? "N5" : over.level,
});

const ex = (n: number, ja: string, en: string) => ({ source: "tatoeba", sentence_id: `tatoeba-${n}`, japanese: ja, english: en });

function fixtureWords(): RawWord[] {
  return [
    word("1001", { kanji: [{ text: "図書館", common: true, tags: [] }], kana: [{ text: "としょかん", appliesToKanji: ["*"], tags: [] }], gloss: "library", examples: [ex(1, "図書館に行きます。", "I go to the library."), ex(2, "図書館はとても大きいです。", "The library is very big.")] }),
    word("1002", { kanji: [{ text: "橋", tags: [] }], kana: [{ text: "はし", appliesToKanji: ["*"], tags: [] }], gloss: "bridge", examples: [ex(3, "図書館に、行きます", "I go to the library!")] }),
    word("1003", { kanji: [{ text: "箸", tags: [] }], kana: [{ text: "はし", appliesToKanji: ["*"], tags: [] }], gloss: "chopsticks" }),
    // hai mục khác nhau, cùng chữ + cách đọc → phải giữ riêng
    word("1005", { kanji: [{ text: "上", tags: [] }], kana: [{ text: "うえ", appliesToKanji: ["*"], tags: [] }], gloss: "above" }),
    word("1006", { kanji: [{ text: "上", tags: [] }], kana: [{ text: "うえ", appliesToKanji: ["*"], tags: [] }], gloss: "top" }),
    // thường viết bằng kana (uk) + chữ Hán hiếm
    word("1007", { kanji: [{ text: "彼処", tags: ["rK"] }], kana: [{ text: "あそこ", appliesToKanji: ["*"], tags: [] }, { text: "あすこ", appliesToKanji: ["*"], tags: [] }], gloss: "over there", misc: ["uk"], examples: [ex(7, "詳しくは http://example.com を見て。", "See http://example.com")] }),
    word("1008", { kanji: [{ text: "経験", tags: [] }], kana: [{ text: "けいけん", appliesToKanji: ["*"], tags: [] }], gloss: "experience", level: "N4" }),
    word("1009", { kanji: [{ text: "稀", tags: [] }], kana: [{ text: "まれ", appliesToKanji: ["*"], tags: [] }], gloss: "rare", level: null }),
    word("1010", { kana: [{ text: "ほげ", appliesToKanji: [] }], gloss: "something crude", misc: ["vulg"] }),
    // trùng với từ có sẵn trong bản mẫu (山 / やま)
    word("1011", { kanji: [{ text: "山", tags: [] }], kana: [{ text: "やま", appliesToKanji: ["*"], tags: [] }], gloss: "mountain", examples: [ex(6, "山に登ります。", "I climb the mountain.")] }),
  ];
}

const KANJI = [
  { character: "橋", unicode: "6a4b", stroke_count: 16, grade: 3, jlpt_waller: "N5", meanings: { en: ["bridge", "span"] }, readings: { on: ["キョウ"], kun: ["はし"] }, readings_cjk: { vietnamese: ["Kiều"] } },
  { character: "山", unicode: "5c71", stroke_count: 3, grade: 1, jlpt_waller: "N5", meanings: { en: ["mountain"] }, readings: { on: ["サン"], kun: ["やま"] }, readings_cjk: { vietnamese: ["Sơn"] } },
  { character: "龠", unicode: "9fa0", stroke_count: 17, grade: null, jlpt_waller: null, meanings: { en: ["flute"] }, readings: { on: ["ヤク"], kun: [] }, readings_cjk: { vietnamese: [] } },
];

const SENTENCES = [
  { id: "tatoeba-1", japanese: "図書館に行きます。", english: "I go to the library." },
  { id: "tatoeba-2", japanese: "図書館はとても大きいです。", english: "The library is very big." },
  { id: "tatoeba-3", japanese: "図書館に、行きます", english: "I go to the library!" }, // trùng với #1 sau khi bỏ dấu câu
  { id: "tatoeba-6", japanese: "山に登ります。", english: "I climb the mountain." },
  { id: "tatoeba-7", japanese: "詳しくは http://example.com を見て。", english: "See http://example.com" },
];

function writeDataset(dir: string, over: { license?: string; words?: RawWord[]; sentenceLicense?: string } = {}) {
  fs.mkdirSync(path.join(dir, "data", "core"), { recursive: true });
  fs.mkdirSync(path.join(dir, "data", "corpus"), { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ project: "japanese-language-data", version: "0.9.0", generated: "2026-04-14", license: over.license ?? "CC-BY-SA 4.0" }));
  const meta = (license: string, count: number) => ({ source: "test", license, source_version: "3.6.2", upstream_dict_date: "2026-04-06", count });
  fs.writeFileSync(path.join(dir, "data", "core", "words.json"), JSON.stringify({ metadata: meta("CC-BY-SA 4.0 (EDRDG License)", 0), words: over.words ?? fixtureWords() }));
  fs.writeFileSync(path.join(dir, "data", "core", "kanji.json"), JSON.stringify({ metadata: meta("CC-BY-SA 4.0 (EDRDG License)", KANJI.length), kanji: KANJI }));
  fs.writeFileSync(path.join(dir, "data", "corpus", "sentences.json"), JSON.stringify({ metadata: meta(over.sentenceLicense ?? "CC-BY 2.0 FR (sentence text)", SENTENCES.length), sentences: SENTENCES }));
}

function existingFromSeed(over: Partial<ExistingData> = {}): ExistingData {
  return { vocabulary: readSeed("vocabulary"), kanji: readSeed("kanji"), sentences: [], sources: readSeed("sources"), seedSources: readSeed("sources"), ...over };
}

const baseOpts = (dir: string, extra: Record<string, unknown> = {}) => ({
  datasetDir: dir,
  group: GROUPS["jlpt-n5"],
  kinds: ["vocabulary", "kanji", "sentences"] as ("vocabulary" | "kanji" | "sentences")[],
  runId: "run-1",
  now: "2026-10-23T01:00:00.000Z",
  ...extra,
});

/* ───────────── stream-json ───────────── */

describe("đọc file lớn theo dòng chảy", () => {
  it("trả từng phần tử đúng dù chuỗi chứa ngoặc, dấu \\\" và ký tự nhiều byte, với bộ đệm rất nhỏ", async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `日本語 {"x": [${i}]} \\ "q" ]}`, nested: { a: [1, 2, { b: "}" }] } }));
    const f = path.join(tmp, "a.json");
    fs.writeFileSync(f, JSON.stringify({ metadata: { count: 50, notes: ["a", "b"] }, things: items }, null, 2));
    const got: unknown[] = [];
    let meta: unknown;
    for await (const ev of streamDataset(f, "things", { highWaterMark: 7 })) {
      if (ev.kind === "item") got.push(ev.value);
      else if (ev.key === "metadata") meta = ev.value;
    }
    expect(got).toEqual(items);
    expect(meta).toEqual({ count: 50, notes: ["a", "b"] });
  });

  it("readMetadata chỉ lấy metadata; file cụt hoặc sai dạng bị từ chối rõ ràng", async () => {
    const f = path.join(tmp, "b.json");
    fs.writeFileSync(f, JSON.stringify({ metadata: { license: "X" }, words: [{ a: 1 }] }));
    expect(await readMetadata(f, "words")).toEqual({ license: "X" });
    const cut = path.join(tmp, "cut.json");
    fs.writeFileSync(cut, '{"metadata":{},"words":[{"a":1},{"a":');
    await expect((async () => { for await (const _ of streamDataset(cut, "words")) void _; })()).rejects.toBeInstanceOf(StreamFormatError);
    const prim = path.join(tmp, "prim.json");
    fs.writeFileSync(prim, '{"metadata":{},"words":[1,2,3]}');
    await expect((async () => { for await (const _ of streamDataset(prim, "words")) void _; })()).rejects.toBeInstanceOf(StreamFormatError);
    const none = path.join(tmp, "none.json");
    fs.writeFileSync(none, '{"metadata":{}}');
    await expect((async () => { for await (const _ of streamDataset(none, "words")) void _; })()).rejects.toThrow(/Không thấy mảng/);
  });
});

describe("băm nội dung", () => {
  it("không phụ thuộc thứ tự khóa; băm bản ghi bỏ qua import và thời gian", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
    expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
    const a = { id: "x", w: "y", import: { base_hash: "1" }, updated_at: "t1", created_at: "t0" };
    const b = { id: "x", w: "y", import: { base_hash: "2" }, updated_at: "t9", created_at: "t0" };
    expect(recordBaseHash(a)).toBe(recordBaseHash(b));
    expect(recordBaseHash({ ...a, w: "z" })).not.toBe(recordBaseHash(a));
  });
});

/* ───────────── Chuẩn hóa ───────────── */

describe("chuẩn hóa từ vựng JMdict", () => {
  it("chọn chữ Hán thường dùng làm cách viết chính, giữ nghĩa gốc tiếng Anh, KHÔNG bịa nghĩa tiếng Việt", () => {
    const r = normalizeWord(fixtureWords()[0], ctx);
    if (isSkip(r)) throw new Error("không được bỏ qua");
    expect(r.record).toMatchObject({ id: "jm-1001", word: "図書館", reading: "としょかん", level: "N5", level_source: "src-waller-jlpt", meaning_vi: "", vi_kind: "missing", status: "imported", origin: "imported_dataset", source_id: "src-jmdict", pos: "danh từ" });
    expect((r.record.senses as { glosses: { lang: string; text: string }[] }[])[0].glosses[0]).toEqual({ lang: "en", text: "library" });
    expect(r.sentenceLinks.map((l) => l.sentenceId)).toEqual(["tatoeba-1", "tatoeba-2"]);
  });

  it("từ thường viết bằng kana (uk) lấy kana làm chính và vẫn giữ chữ Hán hiếm ở alt_forms", () => {
    const r = normalizeWord(fixtureWords()[5], ctx);
    if (isSkip(r)) throw new Error("không được bỏ qua");
    expect(r.record.word).toBe("あそこ");
    expect(r.record.alt_forms).toEqual(["彼処"]);
    expect(r.record.alt_readings).toEqual(["あすこ"]);
  });

  it("bỏ mục không có cấp JLPT từ nguồn đáng tin (không đoán cấp), và nghĩa thô tục không được nhập", () => {
    expect(normalizeWord(fixtureWords()[7], ctx)).toEqual({ skip: "no_level" });
    expect(normalizeWord(fixtureWords()[8], ctx)).toEqual({ skip: "sensitive_content" });
  });

  it("giữ nhiều nghĩa trong một mục và chỉ bỏ nghĩa nhạy cảm; nghĩa bị lọc được đếm", () => {
    const w = word("2000", {
      kanji: [{ text: "x", tags: [] }],
      kana: [{ text: "あ", appliesToKanji: ["*"] }],
      sense: [
        { partOfSpeech: ["n"], gloss: [{ lang: "eng", text: "there" }], misc: ["uk"] },
        { partOfSpeech: ["n"], gloss: [{ lang: "eng", text: "genitals" }, { lang: "eng", text: "private parts" }], misc: ["col", "euph"] },
        { partOfSpeech: ["n"], gloss: [{ lang: "eng", text: "that far" }], misc: ["uk"] },
      ],
    });
    const r = normalizeWord(w, ctx);
    if (isSkip(r)) throw new Error("không được bỏ qua");
    expect((r.record.senses as unknown[]).length).toBe(2);
    expect(r.droppedSenses).toBe(1);
  });

  it("từ loại được dịch sang tiếng Việt và gộp gọn", () => {
    expect(posSummary(["v5r", "vt", "n"])).toBe("động từ nhóm 1 / tha động từ / danh từ");
    expect(posSummary([])).toBe("chưa phân loại");
  });
});

describe("chuẩn hóa Kanji và câu ví dụ", () => {
  it("Kanji: âm Hán–Việt lấy từ KANJIDIC2, nghĩa tiếng Anh giữ nguyên, không có cấp thì bỏ qua", () => {
    const r = normalizeKanji(KANJI[0], ctx);
    if (isSkip(r)) throw new Error("không được bỏ qua");
    expect(r.record).toMatchObject({ id: "kj-6a4b", char: "橋", han_viet: "KIỀU", meanings_en: ["bridge", "span"], onyomi: ["キョウ"], grade: 3, stroke_count: 16, vi_kind: "missing", meaning_vi: "" });
    expect(normalizeKanji(KANJI[2], ctx)).toEqual({ skip: "no_level" });
  });

  it("Câu: ghi công + liên kết nguồn từng câu, KHÔNG gán cấp độ, bản dịch tiếng Anh gắn nhãn của nguồn", () => {
    const r = normalizeSentence(SENTENCES[0], ctx);
    if (isSkip(r)) throw new Error("không được bỏ qua");
    expect(r.record).toMatchObject({ id: "tatoeba-1", level: null, level_source: null, source_url: "https://tatoeba.org/en/sentences/show/1", license: "CC BY 2.0 FR", status: "imported" });
    expect(r.record.attribution).toMatch(/Tatoeba #1/);
    expect(r.record.translations).toEqual([{ lang: "en", text: "I go to the library.", kind: "source" }]);
  });

  it("loại câu hỏng/kém chất lượng", () => {
    expect(sentenceProblem("hello world", "xin chào")).toBe("bad_text");
    expect(sentenceProblem("図書館に行く。", "")).toBe("no_translation");
    expect(sentenceProblem("あ", "a b c")).toBe("too_short");
    expect(sentenceProblem("あ".repeat(100), "long")).toBe("too_long");
    expect(sentenceProblem("詳しくは http://x.com を見て", "see")).toBe("suspicious_text");
    expect(sentenceProblem("「図書館に行く。", "I go to school")).toBe("suspicious_text");
    expect(sentenceProblem("ABC123 図書館 XYZ 456", "ok text")).toBe("suspicious_text");
    expect(sentenceProblem("これはレイプです。", "This is a thing")).toBe("sensitive_content");
    expect(sentenceProblem("図書館に行きます。", "I go to the library.")).toBeNull();
  });

  it("khóa so khớp: bỏ dấu câu/khoảng trắng; katakana ↔ hiragana ở cách đọc", () => {
    expect(sentenceDedupeKey("図書館に、行きます")).toBe(sentenceDedupeKey("図書館に 行きます。"));
    expect(kataToHira("ガッコウ")).toBe("がっこう");
    expect(wordKey("山", "ヤマ")).toBe(wordKey("山", "やま"));
  });
});

/* ───────────── Bản dịch ───────────── */

describe("bản dịch tiếng Việt đi kèm", () => {
  it("đọc JSONL, bỏ qua dòng chưa điền, báo lỗi dòng hỏng, và luôn gắn nhãn dịch máy", async () => {
    const f = path.join(tmp, "tr.jsonl");
    fs.writeFileSync(
      f,
      [
        '# chú thích',
        JSON.stringify({ collection: "vocabulary", id: "jm-1001", vi: "trường học", by: "AI (test)" }),
        JSON.stringify({ collection: "vocabulary", id: "jm-1002", vi: "" }),
        "{không phải json",
        JSON.stringify({ collection: "foo", id: "x", vi: "y" }),
        JSON.stringify({ collection: "vocabulary", id: "jm-1001", vi: "trường" }),
      ].join("\n"),
    );
    const t = await loadTranslations(f);
    expect(t.map.get("vocabulary/jm-1001")?.vi).toBe("trường");
    expect(t.pending).toBe(1);
    expect(t.errors.length).toBe(2);
    expect(t.duplicates).toBe(1);
    expect(parseTranslationLine('{"collection":"kanji","id":"kj-1","vi":"x"}')).toMatchObject({ collection: "kanji" });

    const r = normalizeWord(fixtureWords()[0], ctx);
    if (isSkip(r)) throw new Error("x");
    const out = applyTranslation("vocabulary", r.record, { vi: "trường học", by: "AI (test)" });
    expect(out).toMatchObject({ meaning_vi: "trường học", vi_kind: "machine_translated", status: "machine_translated" });
    expect(String(out.source_note)).toMatch(/dịch máy\/AI/);
    const s = normalizeSentence(SENTENCES[0], ctx);
    if (isSkip(s)) throw new Error("x");
    const so = applyTranslation("sentences", s.record, { vi: "Tôi đi học.", by: "AI" });
    expect((so.translations as { lang: string; kind: string }[]).map((x) => `${x.lang}:${x.kind}`)).toEqual(["en:source", "vi:machine_translated"]);
    expect(so.status).toBe("machine_translated");
  });
});

/* ───────────── Chính sách gộp ───────────── */

describe("chính sách gộp khi nhập lại", () => {
  const mk = (over: Record<string, unknown> = {}) => {
    const w = normalizeWord(fixtureWords()[0], ctx);
    if (isSkip(w)) throw new Error("x");
    const rec = { ...w.record, ...over } as Record<string, unknown>;
    (rec.import as Record<string, unknown>).base_hash = recordBaseHash(rec);
    return rec;
  };

  it("chưa có → tạo; bản ghi do người soạn tạo (không có import) → không đụng tới", () => {
    expect(decideMerge(undefined, mk())).toEqual({ action: "create" });
    expect(decideMerge({ id: "jm-1001", import: null, word: "x" }, mk())).toMatchObject({ action: "skip", reason: "exists_manual_record" });
  });

  it("nguồn không đổi → bỏ qua; nguồn đổi nhưng chưa ai sửa → cập nhật", () => {
    const stored = mk();
    expect(decideMerge(stored, mk())).toMatchObject({ action: "skip", reason: "unchanged" });
    const newer = mk();
    (newer.import as Record<string, unknown>).content_hash = "khac";
    expect(decideMerge(stored, newer).action).toBe("update");
  });

  it("quản trị viên đã sửa tay → không ghi đè dù nguồn đổi; đã rà soát → không tự cập nhật", () => {
    const stored = mk();
    const edited = { ...stored, note: "ghi chú của tôi" };
    const newer = mk();
    (newer.import as Record<string, unknown>).content_hash = "khac";
    expect(decideMerge(edited, newer)).toMatchObject({ action: "skip", reason: "edited_by_admin" });
    const reviewed = mk({ status: "needs_review" });
    expect(decideMerge(reviewed, newer)).toMatchObject({ action: "skip", reason: "reviewed_by_human" });
  });

  it("khi cập nhật không làm mất bản dịch tiếng Việt đã có", () => {
    const stored = mk({ meaning_vi: "trường học", vi_kind: "machine_translated", status: "machine_translated" });
    const newer = mk();
    (newer.import as Record<string, unknown>).content_hash = "khac";
    const d = decideMerge(stored, newer);
    if (d.action !== "update") throw new Error("phải cập nhật");
    expect(d.record).toMatchObject({ meaning_vi: "trường học", vi_kind: "machine_translated", status: "machine_translated" });
  });
});

/* ───────────── Kiểm tra bộ dữ liệu & nguồn ───────────── */

describe("kiểm tra giấy phép/phiên bản trước khi nhập", () => {
  it("bộ dữ liệu hợp lệ: đọc được phiên bản và giấy phép", async () => {
    writeDataset(tmp);
    const info = await inspectDataset(tmp, { registered: new Map(readSeed("sources").map((s) => [String(s.id), s as unknown as Source])) });
    expect(info.problems).toEqual([]);
    expect(info.manifestVersion).toBe("0.9.0");
    expect(info.datasetVersion).toBe("jld-0.9.0/jmdict-simplified-3.6.2/2026-04-06");
    expect(info.files.words.count).toBe(0);
  });

  it("giấy phép khác CC-BY-SA 4.0 hoặc thiếu manifest → chặn, không lập kế hoạch nhập", async () => {
    writeDataset(tmp, { license: "All rights reserved" });
    const info = await inspectDataset(tmp);
    expect(info.problems.join(" ")).toMatch(/không phải CC-BY-SA 4\.0/);
    const plan = await planImport(baseOpts(tmp), existingFromSeed());
    expect(plan.collections.vocabulary.refused).toMatch(/CC-BY-SA/);
    expect(plan.collections.vocabulary.creates).toEqual([]);
    const empty = await inspectDataset(path.join(tmp, "khong-co"));
    expect(empty.problems.join(" ")).toMatch(/manifest\.json/);
  });

  it("nguồn bị chặn / chưa có chính sách 'được phép' → từ chối; nguồn không đăng ký → từ chối", () => {
    const sources = new Map(readSeed("sources").map((s) => [String(s.id), s as unknown as Source]));
    expect(sourceGate("vocabulary", sources)).toBeNull();
    sources.set("src-jmdict", { ...sources.get("src-jmdict")!, import_policy: "blocked" });
    expect(sourceGate("vocabulary", sources)).toMatch(/chưa được đánh dấu/);
    sources.set("src-tatoeba", { ...sources.get("src-tatoeba")!, reuse_allowed: "unknown" });
    expect(sourceGate("sentences", sources)).toMatch(/chưa xác nhận được quyền/);
    sources.delete("src-kanjidic2");
    expect(sourceGate("kanji", sources)).toMatch(/chưa có trong sổ nguồn/);
  });

  it("các nguồn đã kiểm tra là không được phép (JLPT chính thức, JPF, IRODORI, Marugoto, Erin) đều bị chặn trong bản mẫu", () => {
    const blocked = readSeed("sources").filter((s) => s.import_policy === "blocked").map((s) => s.id);
    expect(blocked).toEqual(expect.arrayContaining(["src-jlpt-official", "src-jpf", "src-irodori", "src-marugoto", "src-erin"]));
  });

  it("nhóm nhập theo từng cấp JLPT", () => {
    expect(Object.keys(GROUPS)).toEqual(["jlpt-n5", "jlpt-n4", "jlpt-n3", "jlpt-n2", "jlpt-n1"]);
    expect(resolveGroup("JLPT-N4")?.levels).toEqual(["N4"]);
    expect(resolveGroup("khong-co")).toBeNull();
  });
});

/* ───────────── Kế hoạch (dry-run) ───────────── */

describe("lập kế hoạch nhập (dry-run)", () => {
  it("đếm đúng thêm/bỏ qua/lỗi; không gộp từ chỉ vì cùng chữ + cách đọc; nhận ra từ đã có trong bản mẫu", async () => {
    writeDataset(tmp);
    const plan = await planImport(baseOpts(tmp), existingFromSeed());
    const v = plan.collections.vocabulary;
    const created = v.creates.map((r) => r.id);
    expect(created).toEqual(expect.arrayContaining(["jm-1001", "jm-1002", "jm-1003", "jm-1005", "jm-1006", "jm-1007"]));
    expect(created).not.toContain("jm-1008"); // N4 → ngoài nhóm
    expect(created).not.toContain("jm-1009"); // không có cấp → không đoán
    expect(v.outOfScope).toMatchObject({ N4: 1, "(không có cấp)": 1 });
    expect(v.skips.find((s) => s.id === "jm-1010")?.reason).toBe("sensitive_content");
    expect(v.skips.find((s) => s.id === "jm-1011")).toMatchObject({ reason: "exists_in_seed_same_word", detail: "v-yama" });
    expect(plan.homographs).toBe(1);
    expect(v.errors).toEqual([]);
    expect(plan.sourcesToAdd).toEqual([]);
  });

  it("câu ví dụ: loại URL, loại câu trùng nội dung, gắn vào từ có sẵn của bản mẫu, mọi câu có nguồn + ghi công", async () => {
    writeDataset(tmp);
    const plan = await planImport(baseOpts(tmp), existingFromSeed());
    const s = plan.collections.sentences;
    const ids = s.creates.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["tatoeba-1", "tatoeba-2", "tatoeba-6"]));
    expect(s.skips.find((x) => x.id === "tatoeba-3")?.reason).toBe("duplicate_text");
    expect(s.skips.find((x) => x.id === "tatoeba-7")?.reason).toBe("suspicious_text");
    const yama = s.creates.find((r) => r.id === "tatoeba-6")!;
    expect(yama.word_refs).toEqual(["v-yama"]); // liên kết sang từ có sẵn, không tạo từ trùng
    // câu #1 được từ 図書館 (jm-1001) và 橋 (bị loại trùng → gộp tham chiếu) cùng trỏ tới
    expect((s.creates.find((r) => r.id === "tatoeba-1")!.word_refs as string[]).sort()).toEqual(["jm-1001", "jm-1002"]);
    for (const r of s.creates) {
      expect(r.level).toBeNull();
      expect(String(r.attribution)).toMatch(/Tatoeba #/);
      expect(r.source_id).toBe("src-tatoeba");
    }
  });

  it("Kanji: bỏ qua Kanji đã có bản ghi tự soạn; kanji không có cấp không được nhập", async () => {
    writeDataset(tmp);
    const plan = await planImport(baseOpts(tmp), existingFromSeed());
    const k = plan.collections.kanji;
    expect(k.creates.map((r) => r.id)).toEqual(["kj-6a4b"]);
    expect(k.skips.map((s) => [s.id, s.reason])).toEqual([["kj-5c71", "exists_in_seed_same_word"]]);
    expect(k.outOfScope["(không có cấp)"]).toBe(1);
  });

  it("--limit giới hạn số mục thuộc nhóm; --kinds chỉ nhập loại được chọn", async () => {
    writeDataset(tmp);
    const p1 = await planImport(baseOpts(tmp, { limit: 2, kinds: ["vocabulary"] }), existingFromSeed());
    expect(p1.collections.vocabulary.considered).toBe(2);
    expect(p1.collections.vocabulary.stoppedEarly).toBe(true);
    expect(p1.collections.kanji.creates).toEqual([]);
    expect(p1.collections.sentences.creates).toEqual([]);
  });

  it("nguồn bị chặn → loại bản ghi đó không được lập kế hoạch nhập", async () => {
    writeDataset(tmp);
    const sources = readSeed("sources").map((s) => (s.id === "src-tatoeba" ? { ...s, import_policy: "blocked" } : s));
    const plan = await planImport(baseOpts(tmp), existingFromSeed({ sources }));
    expect(plan.collections.sentences.refused).toMatch(/Tatoeba/);
    expect(plan.collections.sentences.creates).toEqual([]);
    expect(plan.collections.vocabulary.creates.length).toBeGreaterThan(0);
  });

  it("bản dịch kèm theo được áp dụng và gắn nhãn dịch máy; mục không có bản dịch giữ nguyên 'chưa có tiếng Việt'", async () => {
    writeDataset(tmp);
    const f = path.join(tmp, "tr.jsonl");
    fs.writeFileSync(f, JSON.stringify({ collection: "vocabulary", id: "jm-1001", vi: "trường học", by: "AI (test)" }) + "\n");
    const tr = await loadTranslations(f);
    const plan = await planImport(baseOpts(tmp, { translations: tr }), existingFromSeed());
    const school = plan.collections.vocabulary.creates.find((r) => r.id === "jm-1001")!;
    expect(school).toMatchObject({ meaning_vi: "trường học", vi_kind: "machine_translated", status: "machine_translated" });
    const bridge = plan.collections.vocabulary.creates.find((r) => r.id === "jm-1002")!;
    expect(bridge).toMatchObject({ meaning_vi: "", vi_kind: "missing", status: "imported" });
    expect(plan.translations.applied).toBe(1);
  });
});

/* ───────────── Chạy thật trên FileStore ───────────── */

describe("chạy nhập: dry-run, ghi thật, nhập lại, bảo vệ sửa tay, hoàn tác", () => {
  let dataDir: string;
  let dsDir: string;
  let store: FileStore;
  const opts = (extra: Record<string, unknown> = {}) => ({
    datasetDir: dsDir,
    group: GROUPS["jlpt-n5"],
    kinds: ["vocabulary", "kanji", "sentences"] as ("vocabulary" | "kanji" | "sentences")[],
    dataDir,
    seedDir: SEED_DIR,
    dryRun: false,
    ...extra,
  });

  beforeEach(() => {
    dataDir = path.join(tmp, "data");
    dsDir = path.join(tmp, "ds");
    fs.mkdirSync(dataDir, { recursive: true });
    writeDataset(dsDir);
    store = new FileStore(dataDir, SEED_DIR);
  });

  it("dry-run không ghi bất kỳ file nội dung nào", async () => {
    const before = fs.readdirSync(dataDir);
    const res = await runImport(opts({ dryRun: true, runId: "dry" }), store);
    expect(res.report.mode).toBe("dry-run");
    expect(res.report.counts.vocabulary.created).toBeGreaterThan(0);
    const after = fs.readdirSync(dataDir).filter((n) => n !== "import");
    expect(after).toEqual(before);
    expect(fs.existsSync(res.reportFiles.md)).toBe(true);
  });

  it("ghi thật: sao lưu trước, ghi theo lô, đọc lại kiểm tra, cập nhật lịch sử nguồn, giữ nguyên dữ liệu có sẵn", async () => {
    // dữ liệu có sẵn do Admin sửa trước đó (phải còn nguyên)
    const vocabBefore = await store.list("vocabulary");
    const seedCount = vocabBefore.length;
    await store.upsert("vocabulary", { ...vocabBefore[0], note: "ghi chú quản trị viên" }, { id: "t", label: "test" });
    const res = await runImport(opts({ runId: "r-apply", batchSize: 2 }), store);

    const v = await store.list("vocabulary");
    expect(v.length).toBe(seedCount + res.report.counts.vocabulary.created);
    expect(v.find((r) => r.id === vocabBefore[0].id)?.note).toBe("ghi chú quản trị viên");
    expect(res.report.written.vocabulary).toMatchObject({ verified: res.report.counts.vocabulary.created, mismatched: [] });
    expect(res.report.written.vocabulary!.batches).toBeGreaterThan(1);
    // bản sao lưu chứa bản trước khi nhập
    const backup = JSON.parse(fs.readFileSync(path.join(dataDir, "import", "backups", "r-apply", "vocabulary.json"), "utf8")) as unknown[];
    expect(backup.length).toBe(seedCount);
    // sổ nguồn có lịch sử + ngày lấy
    const src = (await store.list("sources")).find((s) => s.id === "src-jmdict")!;
    expect(src.update_history.at(-1)).toMatchObject({ run_id: "r-apply", group: "jlpt-n5", version: "jld-0.9.0/jmdict-simplified-3.6.2/2026-04-06" });
    expect(src.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // khóa được nhả, báo cáo có nhắc nghĩa vụ ghi công
    expect(fs.existsSync(path.join(dataDir, "import", ".lock"))).toBe(false);
    expect(fs.readFileSync(res.reportFiles.md, "utf8")).toMatch(/Ghi công/);
    // dữ liệu sau khi nhập qua được bộ kiểm tra đầy đủ
    const q = runQualityChecks({ sources: await store.list("sources"), images: await store.list("images"), vocabulary: await store.list("vocabulary"), kanji: await store.list("kanji"), sentences: await store.list("sentences") } as never, { publicDir: path.join(process.cwd(), "public") });
    expect(q.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("nhập lại cùng dữ liệu: không thêm/cập nhật gì (idempotent)", async () => {
    await runImport(opts({ runId: "r1" }), store);
    const countAfterFirst = (await store.list("vocabulary")).length;
    const res2 = await runImport(opts({ runId: "r2" }), store);
    expect(res2.report.counts.vocabulary).toMatchObject({ created: 0, updated: 0 });
    expect(res2.report.counts.kanji).toMatchObject({ created: 0, updated: 0 });
    expect(res2.report.counts.sentences).toMatchObject({ created: 0, updated: 0 });
    expect((await store.list("vocabulary")).length).toBe(countAfterFirst);
  });

  it("không bao giờ ghi đè bản sửa tay: Admin sửa → nguồn đổi → vẫn giữ bản của Admin; chưa sửa → được cập nhật", async () => {
    await runImport(opts({ runId: "r1" }), store);
    const school = (await store.get("vocabulary", "jm-1001"))!;
    const bridge = (await store.get("vocabulary", "jm-1002"))!;
    await store.upsert("vocabulary", { ...school, meaning_vi: "trường (đã sửa)", vi_kind: "authored", status: "needs_review" } as never, { id: "a", label: "admin" });

    // nguồn cập nhật: đổi nghĩa tiếng Anh của cả hai mục
    const words = fixtureWords().map((w) => (w.id === "1001" || w.id === "1002" ? { ...w, sense: [{ ...w.sense![0], gloss: [{ lang: "eng", text: "NEW MEANING" }] }] } : w));
    writeDataset(dsDir, { words });
    const res = await runImport(opts({ runId: "r2" }), store);

    expect((await store.get("vocabulary", "jm-1001"))!.meaning_vi).toBe("trường (đã sửa)");
    expect(res.plan.collections.vocabulary.skips.find((s) => s.id === "jm-1001")?.reason).toMatch(/edited_by_admin|reviewed_by_human/);
    const bridgeNow = (await store.get("vocabulary", "jm-1002"))!;
    expect(bridgeNow.senses[0].glosses[0].text).toBe("NEW MEANING");
    expect(bridgeNow.created_at).toBe(bridge.created_at);
    expect(res.report.counts.vocabulary.updated).toBe(1);
  });

  it("dữ liệu có sẵn (bản mẫu) không bị xóa hay đổi; từ trùng được giữ nguyên bản cũ", async () => {
    const seed = readSeed("vocabulary");
    await runImport(opts({ runId: "r1" }), store);
    const now = await store.list("vocabulary");
    for (const s of seed) expect(now.find((r) => r.id === s.id)).toMatchObject({ word: s.word, meaning_vi: s.meaning_vi, origin: s.origin });
    expect(now.filter((r) => r.word === "山" && r.reading === "やま")).toHaveLength(1);
  });

  it("hoàn tác: xóa bản ghi do lần nhập tạo (chưa sửa), giữ lại bản đã sửa tay; chạy thử không đổi gì", async () => {
    await runImport(opts({ runId: "r1" }), store);
    const total = (await store.list("vocabulary")).length;
    const school = (await store.get("vocabulary", "jm-1001"))!;
    await store.upsert("vocabulary", { ...school, note: "đã sửa" } as never, { id: "a", label: "admin" });

    const dry = await rollbackRun("r1", dataDir, store, true);
    expect(dry.removed.length).toBeGreaterThan(0);
    expect((await store.list("vocabulary")).length).toBe(total);

    const res = await rollbackRun("r1", dataDir, store, false);
    expect(res.kept.some((k) => k.id === "jm-1001" && /sửa tay/.test(k.reason))).toBe(true);
    const left = await store.list("vocabulary");
    expect(left.find((r) => r.id === "jm-1001")).toBeTruthy();
    expect(left.find((r) => r.id === "jm-1002")).toBeFalsy();
    expect((await store.list("sentences")).every((s) => (s.word_refs as string[]).every((id) => left.some((v) => v.id === id)))).toBe(true);
  });

  it("đang có lần nhập khác chạy (khóa tồn tại) → từ chối ghi", async () => {
    fs.mkdirSync(path.join(dataDir, "import"), { recursive: true });
    fs.writeFileSync(path.join(dataDir, "import", ".lock"), "{}");
    await expect(runImport(opts({ runId: "x" }), store)).rejects.toThrow(/lần nhập khác/);
    expect(fs.existsSync(path.join(dataDir, "vocabulary.json"))).toBe(false);
  });
});

/* ───────────── Kiểm tra chất lượng ───────────── */

describe("kiểm tra chất lượng dữ liệu", () => {
  it("phát hiện thiếu nguồn/giấy phép, dịch máy chưa duyệt, câu trùng, cấp độ không có nguồn, file ảnh không tồn tại", () => {
    const base = { sources: readSeed("sources"), images: [{ id: "img-x", path: "/images/khong-co.svg", alt_vi: "x", description: "", kind: "icon", concepts: [], source_name: "s", source_url: "", license_note: "l", attribution: "", status: "ai_generated", hidden: false, reviewed_by: null, last_verified: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }] as Record<string, unknown>[] };
    const v = normalizeWord(fixtureWords()[0], ctx);
    if (isSkip(v)) throw new Error("x");
    const good = { ...v.record, import: { ...(v.record.import as object), base_hash: "" } };
    const noSource = { ...good, id: "jm-9001", source_id: "src-khong-co" };
    const noLevelSource = { ...good, id: "jm-9002", level_source: null };
    const mt = { ...good, id: "jm-9003", meaning_vi: "x", vi_kind: "machine_translated", status: "machine_translated" };
    const noLicense = { ...good, id: "jm-9004", import: { ...(good.import as object), license: "" } };
    const s1 = normalizeSentence(SENTENCES[0], ctx);
    const s2 = normalizeSentence({ ...SENTENCES[0], id: "tatoeba-100" }, ctx);
    if (isSkip(s1) || isSkip(s2)) throw new Error("x");
    const rep = runQualityChecks(
      { ...base, vocabulary: [good, noSource, noLevelSource, mt, noLicense], kanji: [], sentences: [{ ...s1.record, word_refs: [] }, { ...s2.record, word_refs: [] }] } as never,
      { publicDir: path.join(process.cwd(), "public"), validate: false },
    );
    const has = (code: string, id: string) => rep.issues.some((i) => i.code === code && i.id === id);
    expect(has("missing_source", "jm-9001")).toBe(true);
    expect(has("level_without_source", "jm-9002")).toBe(true);
    expect(has("machine_translation_unreviewed", "jm-9003")).toBe(true);
    expect(has("missing_license", "jm-9004")).toBe(true);
    expect(has("duplicate_sentence", "tatoeba-1")).toBe(true);
    expect(has("media_unreachable", "img-x")).toBe(true);
    expect(has("missing_vietnamese", "jm-1001")).toBe(true);
    expect(rep.summary.errors).toBeGreaterThan(0);
  });

  it("kho mẫu hiện tại của app không có lỗi", () => {
    const data = { sources: readSeed("sources"), images: readSeed("images"), vocabulary: readSeed("vocabulary"), kanji: readSeed("kanji"), sentences: [] };
    const rep = runQualityChecks(data as never, { publicDir: path.join(process.cwd(), "public") });
    expect(rep.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});
