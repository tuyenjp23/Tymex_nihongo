import { z } from "zod";
import {
  CONVERSATION_CATEGORIES,
  LESSON_MODULES,
  LEVELS,
  ORIGINS,
  SKILLS,
  STATUSES,
  type CollectionKey,
} from "./types";

/* ───────────── Thành phần dùng chung ───────────── */

export const LevelSchema = z.enum(LEVELS);
export const StatusSchema = z.enum(STATUSES);
export const OriginSchema = z.enum(ORIGINS);
export const SkillSchema = z.enum(SKILLS);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");
const isoDateTime = z.string().min(10, "Thiếu thời gian");
const slug = z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i, "ID chỉ gồm chữ, số, - và _");

/** Văn bản tiếng Nhật có thể chứa chú âm dạng {漢字|かんじ} */
const ja = z.string().min(1, "Không được để trống").max(2000);
const vi = z.string().min(1, "Không được để trống").max(4000);

export const ExampleSchema = z.object({ ja, vi });

/** Trường provenance dùng chung cho mọi bản ghi học liệu. */
const provenanceShape = {
  origin: OriginSchema,
  status: StatusSchema,
  hidden: z.boolean(),
  source_id: z.string().nullable(),
  source_note: z.string().max(1000),
  reviewed_by: z.string().max(120).nullable(),
  last_verified: isoDate.nullable(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
};

type ProvenanceLike = {
  status: string;
  reviewed_by: string | null;
  last_verified: string | null;
  origin: string;
  source_id: string | null;
};

/**
 * Quy tắc chất lượng: trạng thái "verified"/"published" phải có người rà soát + ngày xác minh.
 * Mẫu chính thức phải trỏ tới một nguồn. (Việc nguồn đó có thực sự là chính thức được kiểm tra thêm ở server — xem lib/provenance.ts)
 */
function provenanceRules<T extends ProvenanceLike>(val: T, ctx: z.RefinementCtx) {
  if ((val.status === "verified" || val.status === "published") && (!val.reviewed_by?.trim() || !val.last_verified)) {
    ctx.addIssue({
      code: "custom",
      path: ["reviewed_by"],
      message: 'Trạng thái "Đã xác minh/Đã xuất bản" cần có người rà soát và ngày xác minh',
    });
  }
  if (val.origin === "official_sample" && !val.source_id) {
    ctx.addIssue({ code: "custom", path: ["source_id"], message: "Mẫu chính thức phải chọn nguồn" });
  }
}

/* ───────────── Thông tin nhập dữ liệu (pipeline) ───────────── */

/** Dấu vết nhập dữ liệu: bản ghi này đến từ đâu, phiên bản nào, giấy phép gì, và đã bị chỉnh tay sau khi nhập chưa (so base_hash). */
export const ImportMetaSchema = z.object({
  source_id: z.string().min(1).max(80),
  /** ID của bản ghi ở nguồn gốc (ví dụ JMdict sequence, ký tự kanji, ID câu Tatoeba) */
  external_id: z.string().min(1).max(120),
  dataset_version: z.string().max(80),
  imported_at: isoDateTime,
  run_id: z.string().max(80),
  license: z.string().max(200),
  /** Băm nội dung chuẩn hóa từ nguồn — đổi khi nguồn cập nhật */
  content_hash: z.string().max(80),
  /** Băm các trường nhập được, tại thời điểm nhập — lệch với băm hiện tại nghĩa là quản trị viên đã sửa tay */
  base_hash: z.string().max(80),
});
export type ImportMeta = z.infer<typeof ImportMetaSchema>;

/** Loại phần nghĩa tiếng Việt: tự biên soạn, dịch máy từ tiếng Anh (chưa kiểm tra) hay chưa có. */
export const VI_KINDS = ["authored", "machine_translated", "missing"] as const;
export const VI_KIND_LABELS: Record<(typeof VI_KINDS)[number], string> = {
  authored: "Tiếng Việt do người/AI biên soạn",
  machine_translated: "Tiếng Việt dịch máy từ tiếng Anh (chưa kiểm tra)",
  missing: "Chưa có tiếng Việt",
};

type ViKindLike = { meaning_vi: string; vi_kind: (typeof VI_KINDS)[number]; status: string };

/** Quy tắc nhất quán giữa nghĩa tiếng Việt, loại bản dịch và trạng thái (dùng cho từ vựng, kanji). */
function viKindRules(v: ViKindLike, ctx: z.RefinementCtx) {
  const has = v.meaning_vi.trim().length > 0;
  if (!has && v.vi_kind !== "missing")
    ctx.addIssue({ code: "custom", path: ["meaning_vi"], message: 'Chưa có nghĩa tiếng Việt: hãy nhập nghĩa hoặc đặt loại bản dịch là "Chưa có tiếng Việt"' });
  if (has && v.vi_kind === "missing")
    ctx.addIssue({ code: "custom", path: ["vi_kind"], message: 'Đã có nghĩa tiếng Việt thì loại bản dịch không thể là "Chưa có tiếng Việt"' });
  if (v.status === "machine_translated" && v.vi_kind !== "machine_translated")
    ctx.addIssue({ code: "custom", path: ["status"], message: 'Trạng thái "Dịch máy" chỉ dùng khi phần tiếng Việt là bản dịch máy' });
  if (v.vi_kind === "machine_translated" && v.status === "imported")
    ctx.addIssue({ code: "custom", path: ["status"], message: 'Bản có dịch máy phải ở trạng thái "Dịch máy – chưa kiểm tra" (không phải "Đã nhập")' });
}

export const GlossSchema = z.object({ lang: z.string().min(2).max(8), text: z.string().min(1).max(500) });
/** Một nghĩa của từ (JMdict tách nhiều nghĩa trong một mục). Nghĩa gốc giữ nguyên ngôn ngữ nguồn trong `glosses`. */
export const SenseSchema = z.object({
  /** Mã từ loại gốc của nguồn (ví dụ "n", "v5k", "adj-i") */
  pos: z.array(z.string().min(1).max(40)).max(12).default([]),
  glosses: z.array(GlossSchema).min(1).max(30),
  /** Nghĩa tiếng Việt cho riêng nghĩa này (tùy chọn, thường để trống) */
  gloss_vi: z.string().max(1000).default(""),
  misc: z.array(z.string().max(40)).max(20).default([]),
  fields: z.array(z.string().max(40)).max(10).default([]),
  info: z.array(z.string().max(300)).max(10).default([]),
  lang_source: z.array(z.object({ lang: z.string().max(8), text: z.string().max(200), wasei: z.boolean().default(false) })).max(6).default([]),
});
export type Sense = z.infer<typeof SenseSchema>;

/* ───────────── Nguồn học liệu ───────────── */

export const SOURCE_TYPES = [
  "official_exam",
  "official_education",
  "dictionary",
  "open_dataset",
  "grammar_reference",
  "self_authored",
  "other",
] as const;

export const SOURCE_TYPE_LABELS: Record<(typeof SOURCE_TYPES)[number], string> = {
  official_exam: "Kỳ thi chính thức",
  official_education: "Tổ chức giáo dục chính thức",
  dictionary: "Từ điển",
  open_dataset: "Bộ dữ liệu mở",
  grammar_reference: "Tài liệu ngữ pháp",
  self_authored: "Tự biên soạn",
  other: "Khác",
};

/** Chính sách nhập dữ liệu từ nguồn này: chỉ "allowed" mới được pipeline nhập; "blocked" = đã kiểm tra, không có quyền hoặc điều khoản không cho phép. */
export const IMPORT_POLICIES = ["not_applicable", "allowed", "blocked"] as const;
export const IMPORT_POLICY_LABELS: Record<(typeof IMPORT_POLICIES)[number], string> = {
  not_applicable: "Không dùng cho nhập tự động",
  allowed: "Được phép nhập (đã kiểm tra giấy phép)",
  blocked: "CHẶN nhập (chưa có quyền / chưa rõ)",
};

export const SourceUpdateSchema = z.object({
  at: isoDateTime,
  version: z.string().max(80),
  group: z.string().max(80),
  run_id: z.string().max(80),
  summary: z.string().max(400),
});

export const SourceSchema = z.object({
  id: slug,
  source_name: z.string().min(1).max(200),
  source_url: z.string().max(600).refine((v) => v === "" || /^https?:\/\//i.test(v), "URL phải bắt đầu bằng http(s)://"),
  source_type: z.enum(SOURCE_TYPES),
  publisher: z.string().max(200),
  purpose: z.string().max(1000),
  level_scope: z.string().max(200),
  license_note: z.string().min(1, "Bắt buộc ghi chú giấy phép/điều khoản").max(2000),
  verification_status: StatusSchema,
  reviewed_by: z.string().max(120).nullable(),
  last_verified: isoDate.nullable(),
  /** Quyền sử dụng nội dung của nguồn: dùng để cảnh báo trong Admin. */
  reuse_allowed: z.enum(["no", "personal_only", "conditional", "unknown", "own"]),
  notes: z.string().max(2000),
  /** Phiên bản dữ liệu đã dùng (ví dụ "3.6.2+20260406") */
  version: z.string().max(120).default(""),
  /** Ngày tải/nhập dữ liệu nguồn lần gần nhất */
  retrieved_at: isoDate.nullable().default(null),
  license_name: z.string().max(200).default(""),
  license_url: z.string().max(600).default(""),
  /** Nội dung của nguồn được phép dùng vào việc gì (theo điều khoản đã đọc) */
  allowed_use: z.string().max(1500).default(""),
  attribution_required: z.boolean().default(false),
  /** Câu ghi công cần hiển thị cho người học */
  attribution_text: z.string().max(1500).default(""),
  import_policy: z.enum(IMPORT_POLICIES).default("not_applicable"),
  update_history: z.array(SourceUpdateSchema).max(300).default([]),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});
export type Source = z.infer<typeof SourceSchema>;

/* ───────────── Hình minh họa (registry) ───────────── */

export const ImageAssetSchema = z.object({
  id: slug,
  path: z
    .string()
    .min(1)
    .max(600)
    .refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "Đường dẫn phải bắt đầu bằng / hoặc http(s)://"),
  alt_vi: z.string().min(1, "Cần mô tả thay thế (alt)").max(300),
  description: z.string().max(1000),
  kind: z.enum(["illustration", "icon", "scene"]),
  /** Từ/khái niệm mà hình này minh họa phù hợp */
  concepts: z.array(z.string().max(80)).max(30),
  source_name: z.string().min(1).max(200),
  source_url: z.string().max(600).refine((v) => v === "" || /^https?:\/\//i.test(v), "URL phải bắt đầu bằng http(s)://"),
  license_note: z.string().min(1).max(1000),
  attribution: z.string().max(500),
  status: StatusSchema,
  hidden: z.boolean(),
  reviewed_by: z.string().max(120).nullable(),
  last_verified: isoDate.nullable(),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;

/* ───────────── Từ vựng ───────────── */

export const VocabularySchema = z
  .object({
    id: slug,
    level: LevelSchema,
    word: ja,
    reading: z.string().min(1).max(200),
    /** Nghĩa tiếng Việt. Có thể để trống (khi đó vi_kind = "missing") với từ nhập từ nguồn chỉ có tiếng Anh. */
    meaning_vi: z.string().max(4000),
    vi_kind: z.enum(VI_KINDS).default("authored"),
    /** Các cách viết/cách đọc khác của cùng một mục từ (không gộp các mục từ khác nhau) */
    alt_forms: z.array(z.string().min(1).max(100)).max(30).default([]),
    alt_readings: z.array(z.string().min(1).max(100)).max(30).default([]),
    /** Danh sách nghĩa gốc theo ngôn ngữ nguồn (thường tiếng Anh) */
    senses: z.array(SenseSchema).max(40).default([]),
    /** Nguồn của cấp JLPT (ID trong sổ nguồn). Để trống = cấp do người biên soạn tự đặt. */
    level_source: z.string().max(80).nullable().default(null),
    import: ImportMetaSchema.nullable().default(null),
    pos: z.string().max(60),
    topic: z.string().min(1).max(60),
    examples: z.array(ExampleSchema).max(10),
    image_id: z.string().nullable(),
    audio_url: z.string().max(600).nullable(),
    /** Từ cụ thể, hình hóa được. Từ trừu tượng (経験, 責任, 約束…) phải để false. */
    imageable: z.boolean(),
    tags: z.array(z.string().max(40)).max(20),
    note: z.string().max(1000),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    viKindRules(v, ctx);
    if (!v.meaning_vi.trim() && v.senses.length === 0)
      ctx.addIssue({ code: "custom", path: ["senses"], message: "Cần nghĩa tiếng Việt hoặc ít nhất một nghĩa gốc" });
    if (v.image_id && !v.imageable) {
      ctx.addIssue({
        code: "custom",
        path: ["image_id"],
        message: "Từ trừu tượng không gán một hình duy nhất — bỏ hình hoặc đánh dấu 'hình hóa được' nếu thật sự phù hợp",
      });
    }
  });
export type Vocabulary = z.infer<typeof VocabularySchema>;

/* ───────────── Kanji ───────────── */

export const KanjiSchema = z
  .object({
    id: slug,
    level: LevelSchema,
    char: z.string().min(1).max(4),
    han_viet: z.string().max(60),
    meaning_vi: z.string().max(4000),
    vi_kind: z.enum(VI_KINDS).default("authored"),
    /** Nghĩa gốc tiếng Anh (KANJIDIC2) */
    meanings_en: z.array(z.string().min(1).max(120)).max(30).default([]),
    grade: z.number().int().min(1).max(10).nullable().default(null),
    stroke_count: z.number().int().min(1).max(64).nullable().default(null),
    level_source: z.string().max(80).nullable().default(null),
    import: ImportMetaSchema.nullable().default(null),
    onyomi: z.array(z.string().max(40)).max(10),
    kunyomi: z.array(z.string().max(40)).max(12),
    reading_note: z.string().max(600),
    compounds: z.array(z.object({ word: ja, reading: z.string().min(1), meaning_vi: vi })).max(20),
    examples: z.array(ExampleSchema).max(10),
    image_id: z.string().nullable(),
    /** Chỉ điền khi đã đối chiếu nguồn tin cậy. */
    radical: z.string().max(40).nullable(),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    viKindRules(v, ctx);
    if (!v.meaning_vi.trim() && v.meanings_en.length === 0)
      ctx.addIssue({ code: "custom", path: ["meanings_en"], message: "Cần nghĩa tiếng Việt hoặc ít nhất một nghĩa gốc" });
  });
export type Kanji = z.infer<typeof KanjiSchema>;

/* ───────────── Ngữ pháp ───────────── */

export const GrammarSchema = z
  .object({
    id: slug,
    level: LevelSchema,
    title: ja,
    structure: z.string().min(1).max(500),
    meaning_vi: vi,
    formation: z.string().max(2000),
    usage: z.string().max(2000),
    examples: z.array(ExampleSchema).min(1).max(12),
    comparisons: z.array(z.object({ target: z.string().min(1).max(200), note_vi: vi })).max(10),
    common_mistakes: z.array(z.string().min(1).max(1000)).max(10),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => provenanceRules(v, ctx));
export type Grammar = z.infer<typeof GrammarSchema>;

/* ───────────── Câu ví dụ (kho riêng, dùng chung cho mọi module) ───────────── */

export const SENTENCE_TRANSLATION_KINDS = ["source", "machine_translated", "authored"] as const;
export const SENTENCE_TRANSLATION_KIND_LABELS: Record<(typeof SENTENCE_TRANSLATION_KINDS)[number], string> = {
  source: "Bản dịch của nguồn",
  machine_translated: "Dịch máy (chưa kiểm tra)",
  authored: "Do người biên soạn dịch",
};

export const SentenceSchema = z
  .object({
    id: slug,
    ja,
    translations: z
      .array(
        z.object({
          lang: z.string().min(2, "Thiếu mã ngôn ngữ").max(8),
          text: z.string().min(1, "Không được để trống").max(1000),
          kind: z.enum(SENTENCE_TRANSLATION_KINDS),
        }),
      )
      .min(1, "Cần ít nhất một bản dịch")
      .max(6),
    /** ID các từ vựng (collection vocabulary) có trong câu — chỉ điền khi xác định được */
    word_refs: z.array(z.string().min(1).max(80)).max(40).default([]),
    /** Cấp độ chỉ được đặt khi có căn cứ (level_source) */
    level: LevelSchema.nullable().default(null),
    level_source: z.string().max(80).nullable().default(null),
    /** Câu ghi công cho riêng câu này (tác giả/ID ở nguồn) */
    attribution: z.string().max(600).default(""),
    source_url: z.string().max(600).default("").refine((u) => u === "" || /^https?:\/\//i.test(u), "URL phải bắt đầu bằng http(s)://"),
    license: z.string().max(200).default(""),
    tags: z.array(z.string().max(40)).max(20).default([]),
    import: ImportMetaSchema.nullable().default(null),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    if (!/[぀-ヿ一-鿿]/.test(v.ja)) ctx.addIssue({ code: "custom", path: ["ja"], message: "Câu tiếng Nhật phải chứa chữ Nhật (kana hoặc kanji)" });
    if (v.level && !v.level_source) ctx.addIssue({ code: "custom", path: ["level_source"], message: "Chỉ đặt cấp độ khi có căn cứ — hãy ghi nguồn của cấp độ" });
    const hasMt = v.translations.some((t) => t.kind === "machine_translated");
    if (v.status === "machine_translated" && !hasMt)
      ctx.addIssue({ code: "custom", path: ["status"], message: 'Trạng thái "Dịch máy" chỉ dùng khi có bản dịch máy' });
    if (hasMt && v.status === "imported")
      ctx.addIssue({ code: "custom", path: ["status"], message: 'Bản có dịch máy phải ở trạng thái "Dịch máy – chưa kiểm tra"' });
    const langs = v.translations.map((t) => `${t.lang}:${t.kind}`);
    if (new Set(langs).size !== langs.length) ctx.addIssue({ code: "custom", path: ["translations"], message: "Có hai bản dịch trùng ngôn ngữ và loại" });
  });
export type Sentence = z.infer<typeof SentenceSchema>;

/* ───────────── Bài đọc / nghe ───────────── */

export const PassageSchema = z
  .object({
    id: slug,
    level: LevelSchema,
    kind: z.enum(["reading", "listening"]),
    title: z.string().min(1).max(200),
    /** Bài đọc: nội dung (có thể chứa chú âm). Bài nghe: để trống. */
    body: z.string().max(8000),
    body_vi: z.string().max(8000),
    /** Bài nghe: kịch bản (dùng để đọc bằng giọng tổng hợp của trình duyệt & làm transcript). */
    script: z.array(z.object({ speaker: z.string().min(1).max(60), text: ja, vi })).max(40),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    if (v.kind === "reading" && !v.body.trim()) ctx.addIssue({ code: "custom", path: ["body"], message: "Bài đọc cần nội dung" });
    if (v.kind === "listening" && v.script.length === 0)
      ctx.addIssue({ code: "custom", path: ["script"], message: "Bài nghe cần kịch bản" });
  });
export type Passage = z.infer<typeof PassageSchema>;

/* ───────────── Câu hỏi & đáp án ───────────── */

export const AnswerOptionSchema = z.object({
  id: z.string().min(1).max(20),
  text: z.string().min(1, "Không được để trống").max(500),
  /** Giải thích vì sao phương án này đúng/sai (chỉ khi có căn cứ). */
  explanation_vi: z.string().max(1000),
});

export const QuestionSchema = z
  .object({
    id: slug,
    level: LevelSchema,
    skill: SkillSchema,
    topic: z.string().min(1).max(60),
    stem: ja,
    options: z.array(AnswerOptionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
    explanation_vi: vi,
    difficulty: z.number().int().min(1).max(3),
    tags: z.array(z.string().max(40)).max(20),
    passage_id: z.string().nullable(),
    ref_type: z.enum(["vocabulary", "kanji", "grammar"]).nullable(),
    ref_id: z.string().nullable(),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    const ids = v.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["options"], message: "ID phương án bị trùng" });
    if (!ids.includes(v.correct_option_id))
      ctx.addIssue({ code: "custom", path: ["correct_option_id"], message: "Đáp án đúng phải là một trong các phương án" });
    const texts = v.options.map((o) => o.text.trim());
    if (new Set(texts).size !== texts.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Có hai phương án giống nhau" });
    if (v.skill === "listening" && !v.passage_id)
      ctx.addIssue({ code: "custom", path: ["passage_id"], message: "Câu hỏi nghe cần gắn bài nghe" });
  });
export type Question = z.infer<typeof QuestionSchema>;

/* ───────────── Hội thoại ───────────── */

export const POLITENESS = ["casual", "polite", "keigo", "mixed"] as const;
export const POLITENESS_LABELS: Record<(typeof POLITENESS)[number], string> = {
  casual: "Thân mật (普通体)",
  polite: "Lịch sự (です・ます)",
  keigo: "Kính ngữ (敬語)",
  mixed: "Hỗn hợp theo vai",
};

export const ConversationSchema = z
  .object({
    id: slug,
    category: z.enum(CONVERSATION_CATEGORIES),
    /** Cấp độ gợi ý (độ khó ngôn ngữ), không phải cấp "đạt chuẩn" JLPT. */
    level_hint: LevelSchema,
    title: z.string().min(1).max(200),
    context: vi,
    goal: vi,
    characters: z.array(z.object({ name: z.string().min(1).max(60), role: z.string().min(1).max(120) })).min(1).max(6),
    politeness: z.enum(POLITENESS),
    lines: z.array(z.object({ speaker: z.string().min(1).max(60), ja, vi })).min(2).max(60),
    vocab_notes: z.array(z.object({ term: z.string().min(1), reading: z.string(), meaning_vi: vi })).max(30),
    grammar_notes: z.array(z.object({ pattern: z.string().min(1), note_vi: vi })).max(20),
    alternatives: z.array(z.object({ ja, vi, nuance_vi: z.string().max(1000) })).max(12),
    other_situations: z.array(z.object({ situation_vi: vi, ja, vi })).max(12),
    /** Luyện phản xạ: thấy tiếng Việt → nói câu tiếng Nhật phù hợp */
    drills: z.array(z.object({ prompt_vi: vi, model_ja: ja, hint_vi: z.string().max(500) })).max(12),
    /** Nhánh hội thoại định sẵn: người học chọn câu đáp, nhận phản hồi, rồi sang lượt kế. */
    roleplay: z
      .array(
        z.object({
          id: z.string().min(1).max(30),
          npc_ja: ja,
          npc_vi: vi,
          options: z
            .array(
              z.object({
                ja,
                vi,
                fit: z.enum(["best", "ok", "poor"]),
                feedback_vi: vi,
                next: z.string().max(30).nullable(),
              }),
            )
            .min(2)
            .max(5),
        }),
      )
      .max(12),
    references: z.array(z.object({ title: z.string().min(1), url: z.string().max(600) })).max(10),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    const turnIds = new Set(v.roleplay.map((t) => t.id));
    if (turnIds.size !== v.roleplay.length) ctx.addIssue({ code: "custom", path: ["roleplay"], message: "ID lượt hội thoại bị trùng" });
    v.roleplay.forEach((t, ti) =>
      t.options.forEach((o, oi) => {
        if (o.next && !turnIds.has(o.next))
          ctx.addIssue({ code: "custom", path: ["roleplay", ti, "options", oi, "next"], message: `Không có lượt "${o.next}"` });
      }),
    );
  });
export type Conversation = z.infer<typeof ConversationSchema>;

/* ───────────── Bài học ───────────── */

export const LessonSchema = z
  .object({
    id: slug,
    level: LevelSchema,
    module: z.enum(LESSON_MODULES),
    title: z.string().min(1).max(200),
    summary: z.string().max(600),
    order: z.number().int().min(0).max(10000),
    est_minutes: z.number().int().min(1).max(240),
    /** Nội dung dạng đoạn văn; ngăn cách đoạn bằng dòng trống; hỗ trợ **đậm** và chú âm {漢字|かんじ}. */
    body: z.string().max(10000),
    item_refs: z
      .array(z.object({ type: z.enum(["vocabulary", "kanji", "grammar", "conversation", "passage"]), id: z.string().min(1) }))
      .max(100),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => provenanceRules(v, ctx));
export type Lesson = z.infer<typeof LessonSchema>;

/* ───────────── Bộ đề (do Admin soạn từ các câu hỏi có sẵn) ───────────── */

export const QUIZ_SET_KINDS = ["practice", "test", "mock"] as const;
export const QUIZ_SET_KIND_LABELS: Record<(typeof QUIZ_SET_KINDS)[number], string> = {
  practice: "Luyện tập (có phản hồi ngay)",
  test: "Kiểm tra (xem kết quả cuối bài)",
  mock: "Thi thử (có đồng hồ)",
};

export const QuizSetSchema = z
  .object({
    id: slug,
    title: z.string().min(1, "Không được để trống").max(200),
    description: z.string().max(1000),
    /** Cấp độ gợi ý của bộ đề (để xếp vào trang JLPT của cấp đó); không phải cấp "đạt chuẩn" JLPT. */
    level: LevelSchema,
    kind: z.enum(QUIZ_SET_KINDS),
    /** Xáo thứ tự câu mỗi lần làm. Tắt = giữ đúng thứ tự Admin sắp xếp. */
    shuffle: z.boolean(),
    order: z.number().int().min(0).max(10000),
    /** Danh sách câu hỏi theo thứ tự; mỗi câu chỉ xuất hiện một lần. */
    items: z.array(z.object({ question_id: z.string().min(1, "Chọn câu hỏi") })).min(3, "Bộ đề cần ít nhất 3 câu").max(100),
    tags: z.array(z.string().max(40)).max(20),
    ...provenanceShape,
  })
  .superRefine((v, ctx) => {
    provenanceRules(v, ctx);
    const seen = new Set<string>();
    v.items.forEach((it, i) => {
      if (seen.has(it.question_id)) ctx.addIssue({ code: "custom", path: ["items", i, "question_id"], message: `Câu "${it.question_id}" bị lặp trong bộ đề` });
      seen.add(it.question_id);
    });
  });
export type QuizSet = z.infer<typeof QuizSetSchema>;

/* ───────────── Registry ───────────── */

export type AnyRecord = { id: string; created_at: string; updated_at: string };

export const COLLECTION_SCHEMAS = {
  sources: SourceSchema,
  images: ImageAssetSchema,
  vocabulary: VocabularySchema,
  kanji: KanjiSchema,
  grammar: GrammarSchema,
  sentences: SentenceSchema,
  questions: QuestionSchema,
  quiz_sets: QuizSetSchema,
  passages: PassageSchema,
  conversations: ConversationSchema,
  lessons: LessonSchema,
} as const satisfies Record<CollectionKey, z.ZodType>;

export interface CollectionTypes {
  sources: Source;
  images: ImageAsset;
  vocabulary: Vocabulary;
  kanji: Kanji;
  grammar: Grammar;
  sentences: Sentence;
  questions: Question;
  quiz_sets: QuizSet;
  passages: Passage;
  conversations: Conversation;
  lessons: Lesson;
}

export const COLLECTION_LABELS: Record<CollectionKey, { singular: string; plural: string }> = {
  sources: { singular: "Nguồn học liệu", plural: "Nguồn học liệu" },
  images: { singular: "Hình minh họa", plural: "Hình minh họa" },
  vocabulary: { singular: "Từ vựng", plural: "Từ vựng" },
  kanji: { singular: "Kanji", plural: "Kanji" },
  grammar: { singular: "Điểm ngữ pháp", plural: "Ngữ pháp" },
  sentences: { singular: "Câu ví dụ", plural: "Câu ví dụ" },
  questions: { singular: "Câu hỏi", plural: "Câu hỏi & đáp án" },
  quiz_sets: { singular: "Bộ đề", plural: "Bộ đề" },
  passages: { singular: "Bài đọc/nghe", plural: "Bài đọc & nghe" },
  conversations: { singular: "Hội thoại", plural: "Hội thoại" },
  lessons: { singular: "Bài học", plural: "Bài học" },
};

/** Tiêu đề hiển thị của một bản ghi (dùng trong Admin, tìm kiếm, lịch sử). */
export function recordTitle(collection: CollectionKey, r: Record<string, unknown>): string {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  switch (collection) {
    case "sources":
      return s("source_name");
    case "images":
      return s("alt_vi") || s("id");
    case "vocabulary":
      return `${s("word")}（${s("reading")}）`;
    case "kanji":
      return `${s("char")} — ${s("han_viet")}`;
    case "grammar":
      return s("title");
    case "sentences":
      return s("ja").replace(/\{([^|}]+)\|[^}]*\}/g, "$1").slice(0, 80);
    case "questions":
      return s("stem").replace(/\{([^|}]+)\|[^}]*\}/g, "$1").slice(0, 80);
    default:
      return s("title") || s("id");
  }
}

export function levelOfRecord(r: Record<string, unknown>): string | null {
  return (r.level as string) ?? (r.level_hint as string) ?? null;
}
