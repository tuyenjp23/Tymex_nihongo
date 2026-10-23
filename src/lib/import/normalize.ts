import { LEVELS, type Level } from "../types";
import { hashOf } from "./hash";
import { posSummary } from "../pos";

/**
 * Chuẩn hóa dữ liệu thô từ bộ "Japanese Language Data" (JMdict, KANJIDIC2, Tatoeba qua jmdict-simplified)
 * thành bản ghi đúng schema của Nihongo Compass. Toàn bộ là hàm thuần (không đọc file, không ghi gì) nên test được.
 *
 * Nguyên tắc:
 *  - Mỗi mục JMdict là MỘT bản ghi riêng (id jm-<seq>) — không gộp các mục chỉ vì cùng cách viết.
 *  - Nhiều nghĩa / nhiều cách đọc được giữ nguyên (senses, alt_forms, alt_readings).
 *  - Chỉ nhận mục có cấp JLPT theo danh sách cộng đồng (Waller); không đoán cấp độ.
 *  - Nghĩa tiếng Việt KHÔNG được tự bịa: để trống (vi_kind = missing) cho tới khi có bản dịch được gắn nhãn dịch máy.
 */

export const SRC = {
  dataset: "src-jld",
  jmdict: "src-jmdict",
  kanjidic: "src-kanjidic2",
  tatoeba: "src-tatoeba",
  waller: "src-waller-jlpt",
} as const;

export const LICENSE_JMDICT = "CC BY-SA 4.0 + EDRDG Licence";
export const LICENSE_TATOEBA = "CC BY 2.0 FR";

export type SkipReason =
  | "no_level"
  | "no_writing"
  | "no_senses"
  | "no_meaning"
  | "bad_text"
  | "too_short"
  | "too_long"
  | "no_translation"
  | "no_linked_word"
  | "sensitive_content"
  | "suspicious_text"
  | "duplicate_text"
  | "exists_in_seed_same_word"
  | "exists_manual_record"
  | "edited_by_admin"
  | "reviewed_by_human"
  | "unchanged"
  | "source_not_allowed";

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  no_level: "Không có cấp JLPT từ nguồn đáng tin → không nhập (không đoán cấp độ)",
  no_writing: "Không có cách viết dùng được",
  no_senses: "Không có nghĩa nào",
  no_meaning: "Không có nghĩa nào để hiển thị",
  bad_text: "Câu không chứa chữ Nhật",
  too_short: "Câu quá ngắn",
  too_long: "Câu quá dài",
  no_translation: "Câu không có bản dịch",
  no_linked_word: "Không còn từ nào trong kho để gắn câu này vào",
  sensitive_content: "Nội dung nhạy cảm (tục tĩu/khiêu dâm) — không nhập tự động",
  suspicious_text: "Câu nghi ngờ chất lượng thấp (URL, ngoặc lệch, ký tự lỗi, quá nhiều chữ Latin…)",
  duplicate_text: "Trùng nội dung với câu khác",
  exists_in_seed_same_word: "Đã có từ cùng chữ + cách đọc trong kho (giữ nguyên bản có sẵn)",
  exists_manual_record: "Đã có bản ghi cùng ID do người soạn tạo (không đụng tới)",
  edited_by_admin: "Quản trị viên đã sửa tay sau khi nhập (không ghi đè)",
  reviewed_by_human: "Đã được rà soát (đã xác minh/đang cần rà soát) → không tự cập nhật",
  unchanged: "Không có thay đổi so với lần nhập trước",
  source_not_allowed: "Nguồn chưa được phép nhập (giấy phép chưa rõ/bị chặn)",
};

export type Skip = { skip: SkipReason; detail?: string };
export const isSkip = (x: unknown): x is Skip => !!x && typeof x === "object" && "skip" in (x as object);

/* ───────────── Ngữ cảnh ───────────── */

export interface NormalizeCtx {
  runId: string;
  /** Thời điểm ISO dùng làm created_at/updated_at/imported_at (truyền vào để test ổn định) */
  now: string;
  /** Chuỗi phiên bản bộ dữ liệu, ví dụ "jld-0.9.0/jmdict-simplified-3.6.2/2026-04-06" */
  datasetVersion: string;
}

const provenance = (now: string) => ({
  hidden: false,
  reviewed_by: null,
  last_verified: null,
  created_at: now,
  updated_at: now,
});

function importMeta(source_id: string, external_id: string, license: string, ctx: NormalizeCtx, contentHash: string) {
  return {
    source_id,
    external_id,
    dataset_version: ctx.datasetVersion.slice(0, 80),
    imported_at: ctx.now,
    run_id: ctx.runId,
    license,
    content_hash: contentHash,
    base_hash: "", // điền sau khi bản ghi đã qua Zod (xem plan.ts)
  };
}

/* ───────────── Văn bản ───────────── */

export function kataToHira(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

/** Khóa để so khớp "cùng từ": chữ (NFKC) + cách đọc (đổi katakana → hiragana, bỏ khoảng trắng). */
export function wordKey(word: string, reading: string): string {
  return `${word.normalize("NFKC").trim()}|${kataToHira(reading.normalize("NFKC")).replace(/\s+/g, "")}`;
}

/** Chuẩn hóa câu để phát hiện trùng: NFKC, bỏ khoảng trắng và dấu câu. */
export function sentenceDedupeKey(ja: string): string {
  return ja
    .normalize("NFKC")
    .replace(/[\s　.,!?;:'"“”‘’「」『』（）()、。，．！？・…~〜\-—―]/g, "")
    .toLowerCase();
}

const JA_CHAR = /[ぁ-ゖァ-ヺ一-鿿㐀-䶿]/;
const LEVEL_SET = new Set<string>(LEVELS);
const asLevel = (v: unknown): Level | null => (typeof v === "string" && LEVEL_SET.has(v) ? (v as Level) : null);

/* Từ loại (JMdict → tiếng Việt): dùng chung với giao diện, xem lib/pos.ts */
export { posLabel, posSummary } from "../pos";

/* ───────────── Lọc nội dung nhạy cảm (heuristic cơ bản, KHÔNG thay thế việc rà soát) ───────────── */

const SENSITIVE_MISC = new Set(["vulg", "sens"]);
const SEXUAL_GLOSS = /\b(genitals?|private parts|penis|vagina|vulva|testicles?|nipples?|masturbat\w*|prostitut\w*|intercourse|porn\w*)\b/i;
const SENSITIVE_EN = /\b(fuck\w*|shit\w*|bitch\w*|cunt|dick|cock|pussy|rape[ds]?|raping|porn\w*|whore|slut|nigg\w+|penis|vagina|masturbat\w*|orgasm|nude)\b/i;
const SENSITIVE_JA = /(セックス|レイプ|強姦|ちんこ|ちんぽ|まんこ|オナニー|売春|エロ)/;

/** Nghĩa có thẻ tục tĩu/nhạy cảm của JMdict, hoặc nghĩa uyển ngữ/khẩu ngữ chỉ bộ phận kín… → không nhập tự động. */
export function senseIsSensitive(s: { misc?: string[]; gloss?: { text: string }[] }): boolean {
  const misc = s.misc ?? [];
  if (misc.some((m) => SENSITIVE_MISC.has(m))) return true;
  if (misc.some((m) => m === "euph" || m === "col" || m === "sl" || m === "derog") && (s.gloss ?? []).some((g) => SEXUAL_GLOSS.test(g.text))) return true;
  return false;
}

/* ───────────── Từ vựng (JMdict) ───────────── */

interface RawKanjiForm { common?: boolean; text: string; tags?: string[] }
interface RawKanaForm { common?: boolean; text: string; tags?: string[]; appliesToKanji?: string[] }
interface RawGloss { lang: string; text: string }
interface RawExample { sentence_id?: string; japanese?: string; english?: string; word_form?: string }
interface RawSense {
  partOfSpeech?: string[];
  appliesToKanji?: string[];
  appliesToKana?: string[];
  field?: string[];
  misc?: string[];
  info?: string[];
  languageSource?: { lang?: string; text?: string | null; wasei?: boolean }[];
  gloss?: RawGloss[];
  examples?: RawExample[];
}
export interface RawWord {
  id: string;
  kanji?: RawKanjiForm[];
  kana?: RawKanaForm[];
  sense?: RawSense[];
  jlpt_waller?: string | null;
}

/** Thẻ JMdict: rK/rk = hiếm, sK/sk = chỉ để tìm kiếm, oK/ok = cổ, iK/ik = bất quy tắc; io/ateji không dùng làm cách viết chính. */
const AVOID_KANJI = new Set(["rK", "sK", "oK", "iK", "ik", "io", "ateji"]);
const AVOID_KANA = new Set(["rk", "sk", "ok", "ik", "gikun"]);
const SEARCH_ONLY = new Set(["sK", "sk"]);

const LANG_2: Record<string, string> = { eng: "en", ger: "de", fre: "fr", rus: "ru", spa: "es", dut: "nl", hun: "hu", slv: "sl", swe: "sv", por: "pt", ita: "it", kor: "ko", chi: "zh", vie: "vi" };
const lang2 = (l: string) => LANG_2[l] ?? l.slice(0, 8);

const uniq = <T,>(a: T[]) => [...new Set(a)];
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export interface WordSentenceLink {
  sentenceId: string;
  japanese: string;
  english: string;
}

export interface WordCandidate {
  record: Record<string, unknown>;
  /** Số nghĩa bị lọc vì nhạy cảm */
  droppedSenses: number;
  /** Các câu ví dụ do biên tập viên JMdict gắn với từ này (đã lọc theo nghĩa áp dụng cho cách viết được chọn) */
  sentenceLinks: WordSentenceLink[];
}

export function normalizeWord(raw: RawWord, ctx: NormalizeCtx): WordCandidate | Skip {
  const level = asLevel(raw.jlpt_waller);
  if (!level) return { skip: "no_level" };
  const seq = String(raw.id ?? "").trim();
  if (!/^\d+$/.test(seq)) return { skip: "no_writing", detail: "ID JMdict không hợp lệ" };

  const kanjiForms = raw.kanji ?? [];
  const kanaForms = raw.kana ?? [];
  const withGloss = (raw.sense ?? []).filter((s) => (s.gloss ?? []).some((g) => g.text?.trim()));
  const allSenses = withGloss.filter((s) => !senseIsSensitive(s));
  const droppedSenses = withGloss.length - allSenses.length;
  if (withGloss.length > 0 && allSenses.length === 0) return { skip: "sensitive_content" };
  if (allSenses.length === 0) return { skip: "no_senses" };

  // Từ thường viết bằng kana (misc "uk") ở mọi nghĩa → lấy kana làm cách viết chính, giữ chữ Hán ở alt_forms.
  const usuallyKana = allSenses.every((s) => (s.misc ?? []).includes("uk"));
  const goodKanji = kanjiForms.filter((k) => !(k.tags ?? []).some((t) => AVOID_KANJI.has(t)));
  const goodKana = kanaForms.filter((k) => !(k.tags ?? []).some((t) => AVOID_KANA.has(t)));
  const kanaPool = goodKana.length > 0 ? goodKana : kanaForms.filter((k) => !(k.tags ?? []).some((t) => SEARCH_ONLY.has(t)));

  let word: string | undefined;
  let reading: string | undefined;
  if (goodKanji.length > 0 && !usuallyKana) {
    word = goodKanji[0].text;
    const applicable = (kanaPool.length ? kanaPool : kanaForms).filter((k) => !k.appliesToKanji || k.appliesToKanji.includes("*") || k.appliesToKanji.includes(word!));
    reading = (applicable[0] ?? kanaPool[0] ?? kanaForms[0])?.text;
  } else {
    const k = kanaPool.find((x) => x.common) ?? kanaPool[0] ?? kanaForms[0];
    word = k?.text;
    reading = k?.text;
  }
  if (!word || !reading) return { skip: "no_writing" };
  const wordIsKanjiForm = kanjiForms.some((k) => k.text === word);

  // Chỉ giữ các nghĩa áp dụng cho cách viết + cách đọc được chọn; nếu rỗng thì giữ tất cả (không mất dữ liệu).
  const applies = (s: RawSense) => {
    const aK = s.appliesToKanji ?? ["*"];
    const aN = s.appliesToKana ?? ["*"];
    const kanjiOk = !wordIsKanjiForm || aK.includes("*") || aK.includes(word!);
    const kanaOk = aN.includes("*") || aN.includes(reading!);
    return kanjiOk && kanaOk;
  };
  const filtered = allSenses.filter(applies);
  const senses = (filtered.length > 0 ? filtered : allSenses).slice(0, 40);

  const outSenses = senses.map((s) => {
    const glosses = uniq((s.gloss ?? []).filter((g) => g.text?.trim()).map((g) => `${lang2(g.lang)}\u0000${clip(g.text.trim(), 500)}`))
      .slice(0, 30)
      .map((x) => {
        const [lang, text] = x.split("\u0000");
        return { lang, text };
      });
    return {
      pos: uniq(s.partOfSpeech ?? []).slice(0, 12),
      glosses,
      gloss_vi: "",
      misc: uniq(s.misc ?? []).slice(0, 20),
      fields: uniq(s.field ?? []).slice(0, 10),
      info: (s.info ?? []).map((t) => clip(t, 300)).slice(0, 10),
      lang_source: (s.languageSource ?? []).slice(0, 6).map((l) => ({ lang: clip(l.lang ?? "und", 8) || "und", text: clip(l.text ?? "", 200), wasei: l.wasei === true })),
    };
  });

  const altForms = uniq(kanjiForms.filter((k) => !(k.tags ?? []).some((t) => SEARCH_ONLY.has(t))).map((k) => k.text))
    .filter((t) => t !== word)
    .map((t) => clip(t, 100))
    .slice(0, 30);
  const altReadings = uniq(
    (wordIsKanjiForm ? kanaForms.filter((k) => !k.appliesToKanji || k.appliesToKanji.includes("*") || k.appliesToKanji.includes(word!)) : kanaForms)
      .filter((k) => !(k.tags ?? []).some((t) => SEARCH_ONLY.has(t)))
      .map((k) => k.text),
  )
    .filter((t) => t !== reading && t !== word)
    .map((t) => clip(t, 100))
    .slice(0, 30);

  const posTags = uniq(outSenses.flatMap((s) => s.pos));
  const common = [...kanjiForms, ...kanaForms].some((f) => f.common === true);

  const links = new Map<string, WordSentenceLink>();
  for (const s of senses)
    for (const e of s.examples ?? []) {
      if (e.sentence_id && e.japanese && !links.has(e.sentence_id)) links.set(e.sentence_id, { sentenceId: e.sentence_id, japanese: e.japanese, english: e.english ?? "" });
    }

  const derived = { word, reading, alt_forms: altForms, alt_readings: altReadings, senses: outSenses, pos: posSummary(posTags), level, meaning_vi: "", vi_kind: "missing" };
  const record: Record<string, unknown> = {
    id: `jm-${seq}`,
    level,
    word: clip(word, 2000),
    reading: clip(reading, 200),
    meaning_vi: "",
    vi_kind: "missing",
    alt_forms: altForms,
    alt_readings: altReadings,
    senses: outSenses,
    level_source: SRC.waller,
    import: importMeta(SRC.jmdict, seq, LICENSE_JMDICT, ctx, hashOf(derived)),
    pos: posSummary(posTags),
    topic: "uncategorized",
    examples: [],
    image_id: null,
    audio_url: null,
    imageable: false,
    tags: common ? ["common"] : [],
    note: "",
    origin: "imported_dataset",
    status: "imported",
    source_id: SRC.jmdict,
    source_note: `Nhập từ JMdict (EDRDG), mục ${seq}, qua bộ Japanese Language Data. Cấp ${level} theo danh sách JLPT cộng đồng của Waller (không phải danh sách chính thức). Nghĩa gốc tiếng Anh; chưa có người rà soát.`,
    ...provenance(ctx.now),
  };
  return { record, droppedSenses, sentenceLinks: [...links.values()] };
}

/* ───────────── Kanji (KANJIDIC2) ───────────── */

export interface RawKanji {
  character: string;
  unicode: string;
  stroke_count?: number | null;
  grade?: number | null;
  jlpt_waller?: string | null;
  meanings?: { en?: string[] };
  readings?: { on?: string[]; kun?: string[] };
  readings_cjk?: { vietnamese?: string[] };
}

export function normalizeKanji(raw: RawKanji, ctx: NormalizeCtx): { record: Record<string, unknown> } | Skip {
  const level = asLevel(raw.jlpt_waller);
  if (!level) return { skip: "no_level" };
  const char = (raw.character ?? "").trim();
  const hex = String(raw.unicode ?? "").toLowerCase();
  if (!char || !/^[0-9a-f]{4,6}$/.test(hex)) return { skip: "no_writing", detail: "Thiếu ký tự hoặc mã Unicode" };

  const meaningsEn = uniq((raw.meanings?.en ?? []).map((m) => clip(m.trim(), 120)).filter(Boolean)).slice(0, 30);
  if (meaningsEn.length === 0) return { skip: "no_meaning" };

  // Âm Hán–Việt: KANJIDIC2 có trường reading kiểu "vietnam" — dùng nguyên văn, viết hoa theo quy ước của app.
  const hanViet = clip(
    uniq((raw.readings_cjk?.vietnamese ?? []).map((v) => v.trim().toLocaleUpperCase("vi")).filter(Boolean)).join(", "),
    60,
  );
  const on = uniq(raw.readings?.on ?? []).map((x) => clip(x, 40)).slice(0, 10);
  const kun = uniq(raw.readings?.kun ?? []).map((x) => clip(x, 40)).slice(0, 12);
  const grade = Number.isInteger(raw.grade) && raw.grade! >= 1 && raw.grade! <= 10 ? raw.grade! : null;
  const strokes = Number.isInteger(raw.stroke_count) && raw.stroke_count! >= 1 && raw.stroke_count! <= 64 ? raw.stroke_count! : null;

  const derived = { char, han_viet: hanViet, meanings_en: meaningsEn, onyomi: on, kunyomi: kun, grade, stroke_count: strokes, level, meaning_vi: "", vi_kind: "missing" };
  const record: Record<string, unknown> = {
    id: `kj-${hex}`,
    level,
    char,
    han_viet: hanViet,
    meaning_vi: "",
    vi_kind: "missing",
    meanings_en: meaningsEn,
    grade,
    stroke_count: strokes,
    level_source: SRC.waller,
    import: importMeta(SRC.kanjidic, hex, LICENSE_JMDICT, ctx, hashOf(derived)),
    onyomi: on,
    kunyomi: kun,
    reading_note: "",
    compounds: [],
    examples: [],
    image_id: null,
    radical: null,
    tags: [],
    origin: "imported_dataset",
    status: "imported",
    source_id: SRC.kanjidic,
    source_note: `Nhập từ KANJIDIC2 (EDRDG), U+${hex.toUpperCase()}, qua bộ Japanese Language Data. Cấp ${level} theo danh sách JLPT cộng đồng của Waller (không phải danh sách chính thức). Nghĩa gốc tiếng Anh; chưa có người rà soát.`,
    ...provenance(ctx.now),
  };
  return { record };
}

/* ───────────── Câu ví dụ (Tatoeba) ───────────── */

export interface RawSentence {
  id: string;
  japanese: string;
  english?: string | null;
}

export const SENTENCE_LIMITS = { jaMin: 4, jaMax: 80, enMin: 3, enMax: 300 };

/** Đánh giá chất lượng một câu. Trả về lý do loại, hoặc null nếu đạt. */
export function sentenceProblem(ja: string, en: string): SkipReason | null {
  const j = ja.trim();
  const e = en.trim();
  if (SENSITIVE_JA.test(j) || SENSITIVE_EN.test(e)) return "sensitive_content";
  if (!JA_CHAR.test(j)) return "bad_text";
  if (!e) return "no_translation";
  if ([...j].length < SENTENCE_LIMITS.jaMin) return "too_short";
  if ([...j].length > SENTENCE_LIMITS.jaMax || e.length > SENTENCE_LIMITS.enMax) return "too_long";
  if (e.length < SENTENCE_LIMITS.enMin) return "too_short";
  if (/https?:|www\.|@|�|<[a-z/][^>]*>/i.test(j + " " + e)) return "suspicious_text";
  // ngoặc lệch
  const count = (s: string, c: string) => s.split(c).length - 1;
  for (const [a, b] of [["「", "」"], ["（", "）"], ["(", ")"], ["『", "』"]] as const) {
    if (count(j, a) !== count(j, b)) return "suspicious_text";
  }
  // gần như toàn chữ Latin/số → không phải câu tiếng Nhật học được
  const letters = [...j].filter((c) => /[A-Za-z0-9]/.test(c)).length;
  if (letters / [...j].length > 0.4) return "suspicious_text";
  if (j.normalize("NFKC") === e.normalize("NFKC")) return "suspicious_text";
  return null;
}

export function normalizeSentence(raw: RawSentence, ctx: NormalizeCtx): { record: Record<string, unknown> } | Skip {
  const idMatch = /^tatoeba-(\d+)$/.exec(String(raw.id ?? ""));
  if (!idMatch) return { skip: "bad_text", detail: `ID câu không hợp lệ: ${String(raw.id)}` };
  const n = idMatch[1];
  const ja = String(raw.japanese ?? "").trim();
  const en = String(raw.english ?? "").trim();
  const problem = sentenceProblem(ja, en);
  if (problem) return { skip: problem };

  const derived = { ja, en };
  const record: Record<string, unknown> = {
    id: raw.id,
    ja,
    translations: [{ lang: "en", text: en, kind: "source" }],
    word_refs: [],
    level: null,
    level_source: null,
    attribution: `Tatoeba #${n}, CC BY 2.0 FR (một số câu CC0). Tác giả: xem trang gốc.`,
    source_url: `https://tatoeba.org/en/sentences/show/${n}`,
    license: LICENSE_TATOEBA,
    tags: [],
    import: importMeta(SRC.tatoeba, n, LICENSE_TATOEBA, ctx, hashOf(derived)),
    origin: "imported_dataset",
    status: "imported",
    source_id: SRC.tatoeba,
    source_note: "Câu do cộng đồng Tatoeba đóng góp, được biên tập viên JMdict chọn để minh họa từ; bản dịch tiếng Anh theo nguồn. Chưa có người rà soát cho người học Việt.",
    ...provenance(ctx.now),
  };
  return { record };
}
