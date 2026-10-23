// Dựng content/seed/*.json từ các file nguồn gọn trong content/src/.
// Chạy: npm run build:seed
// Sau khi sinh, JSON trong content/seed/ là dữ liệu mẫu của app; bạn có thể sửa trực tiếp hoặc dùng /admin.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sources } from "./sources.mjs";
import { vocab as baseVocab, topicLabels } from "./vocab.mjs";
import { kanji as baseKanji } from "./kanji.mjs";
import { grammar as baseGrammar } from "./grammar.mjs";
import { passages, questions as baseQuestions } from "./questions.mjs";
import { extraVocab, extraKanji, extraGrammar, extraQuestions } from "./extra.mjs";
import { quizSets } from "./quiz-sets.mjs";
import { conversations } from "./conversations.mjs";
import { lessons } from "./lessons.mjs";
import { icons } from "./icons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(root, "content", "seed");
fs.mkdirSync(outDir, { recursive: true });

const T = "2026-10-22T00:00:00.000Z";
const prov = () => ({
  origin: "ai_generated",
  status: "ai_generated",
  hidden: false,
  source_id: "src-ai-seed",
  source_note: "AI (Claude) soạn ngày 2026-10-22 cho dữ liệu mẫu; chưa có giáo viên/người bản ngữ rà soát.",
  reviewed_by: null,
  last_verified: null,
  created_at: T,
  updated_at: T,
});

// Nội dung mở rộng (content/src/extra.mjs, soạn 2026-10-23) được NỐI vào cuối từng mảng gốc → ID/thứ tự của nội dung cũ không đổi.
const vocab = [...baseVocab, ...extraVocab];
const kanji = [...baseKanji, ...extraKanji];
const grammar = [...baseGrammar, ...extraGrammar];
const questions = [...baseQuestions, ...extraQuestions];
const T2 = "2026-10-23T00:00:00.000Z";
const EXTRA_NOTE = "AI (Claude) soạn ngày 2026-10-23 để mở rộng dữ liệu mẫu cấp N4–N1; chưa có giáo viên/người bản ngữ rà soát. Không phải đề/giáo trình chính thức.";
/** Bản ghi từ vị trí `from` trở đi là nội dung mở rộng: đóng dấu ngày/ghi chú nguồn đúng với lúc soạn. */
const stampExtra = (records, from) => records.map((r, i) => (i >= from ? { ...r, source_note: EXTRA_NOTE, created_at: T2, updated_at: T2 } : r));

const fail = (msg) => {
  throw new Error(`[build-seed] ${msg}`);
};
const dup = (arr, what) => {
  const s = new Set();
  for (const k of arr) {
    if (s.has(k)) fail(`Trùng ${what}: ${k}`);
    s.add(k);
  }
};

// ───────── Hình minh họa ─────────
const imageRecords = Object.entries(icons).map(([key, i]) => ({
  id: `img-${key}`,
  path: `/images/vocab/${key}.svg`,
  alt_vi: i.alt,
  description: `Hình minh họa SVG tự vẽ, minh họa cho: ${i.concepts.join(", ")}.`,
  kind: "illustration",
  concepts: i.concepts,
  source_name: "Tự vẽ cho Nihongo Compass (SVG, sinh bằng mã)",
  source_url: "",
  license_note: "Tự tạo cho dự án này, không sao chép từ nguồn ngoài. Chủ dự án quyết định giấy phép khi công bố.",
  attribution: "",
  status: "ai_generated",
  hidden: false,
  reviewed_by: null,
  last_verified: null,
  created_at: T,
  updated_at: T,
}));
const imgIds = new Set(imageRecords.map((i) => i.id));
const imgRef = (key) => {
  if (!key) return null;
  const id = `img-${key}`;
  if (!imgIds.has(id)) fail(`Không có hình ${id}`);
  return id;
};

// ───────── Từ vựng ─────────
dup(vocab.map((v) => v[0]), "key từ vựng");
const vocabRecords0 = vocab.map(([key, level, word, reading, meaning, pos, topic, exJa, exVi, img, note]) => {
  if (!topicLabels[topic]) fail(`Chủ đề lạ: ${topic} (${key})`);
  return {
    id: `v-${key}`,
    level,
    word,
    reading,
    meaning_vi: meaning,
    pos,
    topic,
    examples: [{ ja: exJa, vi: exVi }],
    image_id: imgRef(img),
    audio_url: null,
    imageable: !!img,
    tags: [],
    note: note ?? "",
    ...prov(),
  };
});

const vocabRecords = stampExtra(vocabRecords0, baseVocab.length);

// ───────── Kanji ─────────
dup(kanji.map((k) => k[0]), "key kanji");
const kanjiRecords0 = kanji.map(([key, level, char, hanViet, meaning, on, kun, note, compounds, ex, img]) => ({
  id: `k-${key}`,
  level,
  char,
  han_viet: hanViet,
  meaning_vi: meaning,
  onyomi: on,
  kunyomi: kun,
  reading_note: note,
  compounds: compounds.map(([word, reading, m]) => ({ word, reading, meaning_vi: m })),
  examples: ex ? [{ ja: ex[0], vi: ex[1] }] : [],
  image_id: imgRef(img),
  radical: null,
  tags: [],
  ...prov(),
}));

const kanjiRecords = stampExtra(kanjiRecords0, baseKanji.length);

// ───────── Ngữ pháp ─────────
dup(grammar.map((g) => g.key), "key ngữ pháp");
const grammarRecords0 = grammar.map((g) => ({
  id: `g-${g.key}`,
  level: g.level,
  title: g.title,
  structure: g.structure,
  meaning_vi: g.meaning_vi,
  formation: g.formation,
  usage: g.usage,
  examples: g.examples.map(([ja, vi]) => ({ ja, vi })),
  comparisons: g.comparisons,
  common_mistakes: g.common_mistakes,
  tags: [],
  ...prov(),
}));

const grammarRecords = stampExtra(grammarRecords0, baseGrammar.length);

// ───────── Bài đọc/nghe ─────────
dup(passages.map((p) => p.key), "key bài đọc/nghe");
const passageRecords = passages.map((p) => ({
  id: `p-${p.key}`,
  level: p.level,
  kind: p.kind,
  title: p.title,
  body: p.body,
  body_vi: p.body_vi,
  script: p.script,
  tags: [],
  ...prov(),
}));
const passageIds = new Set(passageRecords.map((p) => p.id));

// ───────── Câu hỏi ─────────
const byReading = new Map();
const byWord = new Map();
for (const v of vocab) {
  const [, , word, reading, meaning] = v;
  if (!byReading.has(reading)) byReading.set(reading, { word, meaning });
  byWord.set(word, { reading, meaning });
}
const refMap = {
  vocabulary: new Set(vocab.map((v) => `v-${v[0]}`)),
  kanji: new Set(kanji.map((k) => `k-${k[0]}`)),
  grammar: new Set(grammar.map((g) => `g-${g.key}`)),
};
const prefix = { vocabulary: "v-", kanji: "k-", grammar: "g-" };
const counters = {};
const questionRecords0 = questions.map(([level, skill, topic, stem, options, correct, explanation, optExp, difficulty, ref, passageKey]) => {
  counters[level] = (counters[level] ?? 0) + 1;
  const id = `q-${level.toLowerCase()}-${String(counters[level]).padStart(3, "0")}`;
  if (correct < 0 || correct >= options.length) fail(`${id}: chỉ số đáp án sai`);
  if (new Set(options).size !== options.length) fail(`${id}: phương án trùng`);
  let ref_type = null;
  let ref_id = null;
  if (ref) {
    const [t, k] = ref.split(":");
    ref_type = t;
    ref_id = `${prefix[t]}${k}`;
    if (!refMap[t]?.has(ref_id)) fail(`${id}: ref không tồn tại ${ref}`);
  }
  let passage_id = null;
  if (passageKey) {
    passage_id = `p-${passageKey}`;
    if (!passageIds.has(passage_id)) fail(`${id}: không có bài ${passage_id}`);
  }
  if (skill === "listening" && !passage_id) fail(`${id}: câu nghe thiếu bài nghe`);
  const auto = (t) => {
    // Giải thích đáp án nhiễu CHỈ khi có căn cứ trong dữ liệu từ vựng của chính app.
    if (/[{}]/.test(t)) return "";
    if (byReading.has(t) && skill !== "grammar") {
      const x = byReading.get(t);
      return `「${t}」là cách đọc của ${x.word} (${x.meaning}).`;
    }
    if (byWord.has(t)) {
      const x = byWord.get(t);
      return `${t}（${x.reading}）nghĩa là ${x.meaning}.`;
    }
    return "";
  };
  return {
    id,
    level,
    skill,
    topic,
    stem,
    options: options.map((text, i) => ({
      id: "abcdef"[i],
      text,
      explanation_vi: optExp ? optExp[i] ?? "" : auto(text),
    })),
    correct_option_id: "abcdef"[correct],
    explanation_vi: explanation,
    difficulty,
    tags: [],
    passage_id,
    ref_type,
    ref_id,
    ...prov(),
  };
});

const questionRecords = stampExtra(questionRecords0, baseQuestions.length);

// ───────── Bộ đề ─────────
dup(quizSets.map((s) => s.key), "key bộ đề");
const questionIds = new Set(questionRecords.map((q) => q.id));
const quizSetRecords = quizSets.map((s) => {
  if (s.questions.length < 3) fail(`Bộ đề ${s.key}: cần ít nhất 3 câu`);
  dup(s.questions, `câu trong bộ đề ${s.key}`);
  for (const q of s.questions) if (!questionIds.has(q)) fail(`Bộ đề ${s.key}: không có câu ${q}`);
  return {
    id: `qset-${s.key}`,
    title: s.title,
    description: s.description,
    level: s.level,
    kind: s.kind,
    shuffle: s.shuffle,
    order: s.order,
    items: s.questions.map((question_id) => ({ question_id })),
    tags: s.tags,
    ...prov(),
    source_note: "Bộ đề ghép từ các câu hỏi AI soạn trong dữ liệu mẫu. Chưa được người thật rà soát; không phải đề thi chính thức.",
    created_at: T2,
    updated_at: T2,
  };
});

// ───────── Hội thoại ─────────
dup(conversations.map((c) => c.key), "key hội thoại");
const conversationRecords = conversations.map((c) => {
  const { key, ...rest } = c;
  return { id: `c-${key}`, ...rest, tags: [], ...prov() };
});

// ───────── Bài học ─────────
const allRefs = {
  vocabulary: refMap.vocabulary,
  kanji: refMap.kanji,
  grammar: refMap.grammar,
  conversation: new Set(conversationRecords.map((c) => c.id)),
  passage: passageIds,
};
dup(lessons.map((l) => l.key), "key bài học");
const lessonRecords = lessons.map((l) => ({
  id: `l-${l.key}`,
  level: l.level,
  module: l.module,
  title: l.title,
  summary: l.summary,
  order: l.order,
  est_minutes: l.est,
  body: l.body,
  item_refs: l.refs.map(({ t, k }) => {
    const id = `${{ vocabulary: "v-", kanji: "k-", grammar: "g-", conversation: "c-", passage: "p-" }[t]}${k}`;
    if (!allRefs[t].has(id)) fail(`Bài ${l.key}: tham chiếu không tồn tại ${t}:${k}`);
    return { type: t, id };
  }),
  tags: [],
  ...prov(),
}));

const write = (name, data) => {
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  ${name}.json: ${data.length} bản ghi`);
};
console.log("Dựng seed vào content/seed/");
write("sources", sources);
write("images", imageRecords);
write("vocabulary", vocabRecords);
write("kanji", kanjiRecords);
write("grammar", grammarRecords);
write("sentences", []); // kho câu ví dụ: rỗng trong seed, được nạp bằng pipeline `npm run import:*`
write("questions", questionRecords);
write("quiz_sets", quizSetRecords);
write("passages", passageRecords);
write("conversations", conversationRecords);
write("lessons", lessonRecords);
console.log("Xong.");
