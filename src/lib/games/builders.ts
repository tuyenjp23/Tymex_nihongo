import { shuffle, type Rng } from "../rng";
import { pickDistractors } from "./distractors";
import type { BuildOptions, GameItem, GameOption, GameQuestion } from "./types";

/**
 * BỘ SINH CÂU HỎI cho từng chế độ. Mỗi hàm thuần: (danh sách mục, tùy chọn, rng) → danh sách câu hỏi.
 * Thêm chế độ chơi mới = viết thêm một builder ở đây + một mục trong src/config/games.ts + (nếu cần) một màn chơi riêng.
 * Không builder nào được bịa nội dung: tất cả lấy từ dữ liệu mục thật; câu nào không đủ đáp án nhiễu hợp lệ thì bị bỏ qua.
 */

export function filterPool(items: GameItem[], o: Pick<BuildOptions, "levels" | "topics">): GameItem[] {
  return items.filter((i) => (!o.levels || o.levels.length === 0 || o.levels.includes(i.level)) && (!o.topics || o.topics.length === 0 || o.topics.includes(i.topic)));
}

const isTarget = (o: Pick<BuildOptions, "targetKeys">, key: string) => !o.targetKeys || o.targetKeys.includes(key.split("#")[0]);

function assemble(
  mode: string,
  qid: string,
  target: GameItem,
  ask: string,
  prompt: GameQuestion["prompt"],
  correctText: string,
  distractors: string[],
  ja: boolean,
  explanation: string,
  tier: 1 | 2 | 3,
  rng: Rng,
): GameQuestion {
  const options: GameOption[] = shuffle([correctText, ...distractors], rng).map((text, i) => ({ id: `o${i}`, text, ja }));
  const correctId = options.find((o) => o.text === correctText)!.id;
  const note = target.unverifiedMeaning ? " (Lưu ý: nghĩa tiếng Việt này do máy dịch, chưa được người kiểm tra.)" : "";
  return { id: qid, mode, itemKey: target.key, level: target.level, topic: target.topic, ask, prompt, options, correctId, explanation: explanation + note, tier };
}

/** Picture to Kanji: xem HÌNH (không có chữ) → chọn từ/Kanji đúng. Chỉ dùng mục cụ thể có hình. */
export function buildPictureToKanji(items: GameItem[], o: BuildOptions, rng: Rng, mode = "picture-to-kanji"): GameQuestion[] {
  const pool = filterPool(items, o);
  const withImage = pool.filter((i) => i.imageUrl && i.imageable);
  const wordPool = pool.filter((i) => i.imageable); // đáp án nhiễu cũng là từ cụ thể → tránh nhiễu "trừu tượng" lộ liễu
  const out: GameQuestion[] = [];
  for (const t of shuffle(withImage.filter((i) => isTarget(o, i.key)), rng)) {
    if (out.length >= o.count) break;
    const d = pickDistractors(t, wordPool, 3, rng, o.tier ?? 1, (i) => i.text, (a, b) => a === b);
    if (d.length < 3) continue;
    out.push(
      assemble(mode, `${mode}-${out.length}`, t, "Hình này là từ nào?", { kind: "image", src: t.imageUrl!, alt: t.imageAlt ?? "" }, t.text, d.map((x) => x.text), true,
        `${t.text}（${t.reading}）= ${t.meaning}.`, o.tier ?? 1, rng),
    );
  }
  return out;
}

/** Kanji to Meaning: thấy chữ/từ tiếng Nhật → chọn nghĩa tiếng Việt. */
export function buildKanjiToMeaning(items: GameItem[], o: BuildOptions, rng: Rng, mode = "kanji-to-meaning"): GameQuestion[] {
  const pool = filterPool(items, o);
  const out: GameQuestion[] = [];
  for (const t of shuffle(pool.filter((i) => isTarget(o, i.key)), rng)) {
    if (out.length >= o.count) break;
    const d = pickDistractors(t, pool, 3, rng, o.tier ?? 1, (i) => i.meaning);
    if (d.length < 3) continue;
    out.push(
      assemble(mode, `${mode}-${out.length}`, t, "Nghĩa của từ này là gì?", { kind: "text", text: t.text, ja: true, sub: undefined }, t.meaning, d.map((x) => x.meaning), false,
        `${t.text}（${t.reading}）nghĩa là ${t.meaning}.`, o.tier ?? 1, rng),
    );
  }
  return out;
}

/**
 * Reading Challenge: chọn cách đọc đúng.
 *  - Từ vựng có chữ Hán: hỏi cách đọc của từ, kèm câu ví dụ làm ngữ cảnh (nếu có).
 *  - Kanji: hỏi cách đọc của một TỪ GHÉP có trong dữ liệu (đáp án nhiễu là cách đọc của từ ghép khác).
 */
export function buildReadingChallenge(items: GameItem[], o: BuildOptions, rng: Rng, mode = "reading-challenge"): GameQuestion[] {
  const pool = filterPool(items, o);
  type Cand = { item: GameItem; word: string; reading: string; meaning: string; context?: GameItem["example"] };
  const cands: Cand[] = [];
  for (const i of pool) {
    if (i.type === "vocabulary" && i.text !== i.reading && /[一-鿿]/.test(i.text)) cands.push({ item: i, word: i.text, reading: i.reading, meaning: i.meaning, context: i.example });
    if (i.type === "kanji") for (const c of i.compounds ?? []) if (c.word !== c.reading) cands.push({ item: i, word: c.word, reading: c.reading, meaning: c.meaning });
  }
  const readingPool: GameItem[] = cands.map((c, idx) => ({ ...c.item, key: `${c.item.key}#${idx}`, text: c.word, reading: c.reading, meaning: c.meaning }));
  const out: GameQuestion[] = [];
  for (const { x, i } of shuffle(cands.map((x, i) => ({ x, i })).filter(({ x }) => isTarget(o, x.item.key)), rng)) {
    if (out.length >= o.count) break;
    const target = readingPool[i];
    const d = pickDistractors(target, readingPool, 3, rng, o.tier ?? 1, (g) => g.reading, (a, b) => a === b);
    if (d.length < 3) continue;
    const ctx = x.context ? { ja: x.context.ja, vi: x.context.vi, target: x.word } : undefined;
    out.push({
      ...assemble(mode, `${mode}-${out.length}`, x.item, "Chọn cách đọc đúng", { kind: "text", text: x.word, ja: true, sub: x.meaning, context: ctx }, x.reading, d.map((g) => g.reading), true,
        `${x.word} đọc là ${x.reading} (${x.meaning}).`, o.tier ?? 1, rng),
    });
  }
  return out;
}

/** Daily Review: ôn các mục "cần chú ý" (đến hạn, hay sai, câu sai chưa khắc phục) bằng nhiều dạng câu hỏi trộn lẫn. */
export function buildDailyReview(items: GameItem[], focusKeys: string[], o: BuildOptions, rng: Rng): GameQuestion[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const focus = shuffle(focusKeys, rng).map((k) => byKey.get(k)).filter((x): x is GameItem => !!x).slice(0, o.count);
  const out: GameQuestion[] = [];
  for (const t of focus) {
    const formats: ("meaning" | "reading" | "picture")[] = ["meaning"];
    if (t.imageUrl && t.imageable) formats.push("picture");
    if (t.type === "vocabulary" && t.text !== t.reading && /[\u4e00-\u9fff]/.test(t.text)) formats.push("reading");
    const f = formats[Math.floor(rng() * formats.length)];
    const single: BuildOptions = { ...o, count: 1, levels: undefined, topics: undefined, targetKeys: [t.key] };
    let q: GameQuestion | undefined;
    if (f === "picture") q = buildPictureToKanji(items, single, rng, "daily-review")[0];
    else if (f === "reading") q = buildReadingChallenge(items, single, rng, "daily-review")[0];
    q ??= buildKanjiToMeaning(items, single, rng, "daily-review")[0];
    if (q) out.push({ ...q, id: `daily-review-${out.length}` });
  }
  return out;
}

/** Speed Challenge: trộn Kanji→nghĩa và Reading, độ khó tăng dần theo `tier`. */
export function buildSpeedPool(items: GameItem[], o: BuildOptions, rng: Rng): GameQuestion[] {
  const half = Math.ceil(o.count / 2);
  const a = buildKanjiToMeaning(items, { ...o, count: half }, rng, "speed-challenge");
  const b = buildReadingChallenge(items, { ...o, count: half }, rng, "speed-challenge");
  return shuffle([...a, ...b], rng).map((q, i) => ({ ...q, id: `speed-challenge-${i}` }));
}

/* ───────────── Bảng ghép (Image Matching / Memory Match) ───────────── */

export interface MatchPair {
  id: string;
  itemKey: string;
  a: { kind: "image"; src: string; alt: string } | { kind: "text"; text: string; ja: boolean };
  b: { kind: "text"; text: string; ja: boolean };
}

/** Image Matching: ghép HÌNH với TỪ (chỉ mục cụ thể có hình). */
export function buildImagePairs(items: GameItem[], o: BuildOptions, rng: Rng): MatchPair[] {
  const pool = filterPool(items, o).filter((i) => i.imageUrl && i.imageable);
  const seen = new Set<string>();
  const out: MatchPair[] = [];
  for (const t of shuffle(pool, rng)) {
    if (out.length >= o.count) break;
    if (seen.has(t.text)) continue;
    seen.add(t.text);
    out.push({ id: `p${out.length}`, itemKey: t.key, a: { kind: "image", src: t.imageUrl!, alt: t.imageAlt ?? "" }, b: { kind: "text", text: t.text, ja: true } });
  }
  return out;
}

/** Memory Match: cặp Kanji–cách đọc, từ–nghĩa. Bỏ cặp có mặt hai trùng nhau để không bị mơ hồ. */
export function buildMemoryPairs(items: GameItem[], o: BuildOptions, rng: Rng): MatchPair[] {
  const pool = filterPool(items, o);
  const out: MatchPair[] = [];
  const usedA = new Set<string>();
  const usedB = new Set<string>();
  for (const t of shuffle(pool, rng)) {
    if (out.length >= o.count) break;
    const useReading = t.type === "kanji" || rng() < 0.5;
    const a = t.text;
    const b = useReading ? (t.reading.split(/[、,]/)[0] ?? t.reading) : t.meaning;
    if (!b || a === b || usedA.has(a) || usedB.has(b)) continue;
    usedA.add(a);
    usedB.add(b);
    out.push({ id: `m${out.length}`, itemKey: t.key, a: { kind: "text", text: a, ja: true }, b: { kind: "text", text: b, ja: useReading } });
  }
  return out;
}
