import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mulberry32 } from "@/lib/rng";
import { isCorrect, pickQuestions, shuffleOptions, xpForQuiz, MOCK_SKILL_ORDER, type QuizQuestion } from "@/lib/quiz";
import { buildReviewQueue, formatInterval, previewIntervals, type ReviewItem } from "@/lib/review";
import {
  addQuizResult, awardBadges, emptyProgress, itemKey, logStudy, markSeen, mergeProgress, parseItemKey, parseProgress, recordGameRound, recordWrongAnswers,
  reviewItem, setLessonStatus, unresolvedWrongIds, MAX_QUIZ_HISTORY, PROGRESS_VERSION, WRONG_RESOLVE_STREAK, type QuizResultRecord,
} from "@/lib/progress/model";
import { BADGES, earnedBadgeIds } from "@/lib/progress/badges";
import { gameReducer, initGame, pointsFor, answeredCount } from "@/lib/games/engine";
import { dailyFocusKeys } from "@/lib/games/focus";
import { buildDailyReview, buildImagePairs, buildKanjiToMeaning, buildListeningQuest, buildMemoryPairs, buildOddOneOut, buildPictureToKanji, buildReadingChallenge, buildReverseRecall, buildSpeedPool } from "@/lib/games/builders";
import { confusableText, pickDistractors } from "@/lib/games/distractors";
import type { GameItem, GameQuestion } from "@/lib/games/types";

const seedDir = path.resolve(__dirname, "../../content/seed");
const load = <T>(n: string) => JSON.parse(fs.readFileSync(path.join(seedDir, `${n}.json`), "utf8")) as T;
const TODAY = "2026-10-22";
const NOW = "2026-10-22T10:00:00.000Z";

/* ───── Quiz ───── */
const mkQ = (id: string, skill: QuizQuestion["skill"], correct = "a"): QuizQuestion => ({
  id, level: "N5", skill, topic: "t", stem: "s", options: [{ id: "a", text: "A", explanation_vi: "" }, { id: "b", text: "B", explanation_vi: "" }, { id: "c", text: "C", explanation_vi: "" }, { id: "d", text: "D", explanation_vi: "" }],
  correct_option_id: correct, explanation_vi: "", difficulty: 1, passage_id: null, ref_type: null, ref_id: null, status: "published",
});

describe("quiz", () => {
  it("isCorrect: bỏ trống không bao giờ đúng", () => {
    expect(isCorrect(mkQ("1", "grammar"), "a")).toBe(true);
    expect(isCorrect(mkQ("1", "grammar"), "b")).toBe(false);
    expect(isCorrect(mkQ("1", "grammar"), null)).toBe(false);
  });
  it("shuffleOptions giữ nguyên id/nội dung và đáp án đúng vẫn trỏ đúng phương án", () => {
    const q = mkQ("1", "grammar", "c");
    const s = shuffleOptions(q, mulberry32(7));
    expect(s.options.map((o) => o.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(s.options.find((o) => o.id === s.correct_option_id)!.text).toBe("C");
    expect(q.options.map((o) => o.id)).toEqual(["a", "b", "c", "d"]); // không sửa bản gốc
  });
  it("pickQuestions: không vượt số câu có, không lặp, mock theo thứ tự phần thi", () => {
    const skills = ["listening", "grammar", "vocabulary", "reading", "kanji"] as const;
    const pool = Array.from({ length: 30 }, (_, i) => mkQ(`q${i}`, skills[i % 5]));
    const many = pickQuestions(pool, { count: 100, kind: "practice", rng: mulberry32(1) });
    expect(many).toHaveLength(30);
    expect(new Set(many.map((q) => q.id)).size).toBe(30);
    const mock = pickQuestions(pool, { count: 20, kind: "mock", rng: mulberry32(2) });
    expect(mock).toHaveLength(20);
    const order = mock.map((q) => MOCK_SKILL_ORDER.indexOf(q.skill));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(pickQuestions(pool, { count: 0, kind: "test", rng: mulberry32(3) })).toHaveLength(1);
  });
  it("cùng seed → cùng kết quả (tái lập được)", () => {
    const pool = Array.from({ length: 20 }, (_, i) => mkQ(`q${i}`, "grammar"));
    const a = pickQuestions(pool, { count: 10, kind: "test", rng: mulberry32(42) }).map((q) => q.id);
    const b = pickQuestions(pool, { count: 10, kind: "test", rng: mulberry32(42) }).map((q) => q.id);
    expect(a).toEqual(b);
  });
  it("xpForQuiz", () => {
    expect(xpForQuiz("practice", 10)).toBe(30);
    expect(xpForQuiz("mock", 0)).toBe(0);
  });
  it("câu hỏi trong dữ liệu mẫu: đáp án đúng nằm trong phương án, phương án không trùng id", () => {
    const qs = load<{ id: string; options: { id: string; text: string }[]; correct_option_id: string }[]>("questions");
    for (const q of qs) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size, q.id).toBe(ids.length);
      expect(ids, q.id).toContain(q.correct_option_id);
      expect(new Set(q.options.map((o) => o.text)).size, q.id).toBe(q.options.length);
    }
  });
});

/* ───── Tiến độ ───── */
describe("progress model", () => {
  it("emptyProgress hợp lệ và parseProgress khứ hồi", () => {
    const p = emptyProgress(NOW);
    const r = parseProgress(JSON.parse(JSON.stringify(p)));
    expect(r.ok).toBe(true);
  });
  it("parseProgress từ chối dữ liệu hỏng/phiên bản mới mà không ném lỗi", () => {
    expect(parseProgress(null).ok).toBe(false);
    expect(parseProgress("x").ok).toBe(false);
    expect(parseProgress({}).ok).toBe(false);
    expect(parseProgress({ ...emptyProgress(NOW), v: PROGRESS_VERSION + 1 }).ok).toBe(false);
    const bad = { ...emptyProgress(NOW), xp: -5 };
    const r = parseProgress(bad);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/xp/);
    expect(parseProgress({ ...emptyProgress(NOW), days: { "22/10/2026": { minutes: 1, xp: 1, reviews: 1 } } }).ok).toBe(false);
  });
  it("itemKey / parseItemKey", () => {
    expect(parseItemKey(itemKey("kanji", "kanji-山"))).toEqual({ type: "kanji", id: "kanji-山" });
    expect(parseItemKey("vocabulary:a:b")).toEqual({ type: "vocabulary", id: "a:b" });
    expect(parseItemKey("zzz:1")).toBeNull();
    expect(parseItemKey("nocolon")).toBeNull();
  });
  it("các hàm không sửa state cũ (bất biến)", () => {
    const p = emptyProgress(NOW);
    const frozen = JSON.stringify(p);
    logStudy(p, TODAY, { minutes: 5, xp: 10, reviews: 2 }, NOW);
    markSeen(p, "vocabulary:a", TODAY, NOW);
    reviewItem(p, "vocabulary:a", 4, TODAY, NOW);
    expect(JSON.stringify(p)).toBe(frozen);
  });
  it("logStudy cộng dồn theo ngày, không nhận số âm, cộng XP tổng", () => {
    let p = emptyProgress(NOW);
    p = logStudy(p, TODAY, { minutes: 2.04, xp: 10, reviews: 1 }, NOW);
    p = logStudy(p, TODAY, { minutes: 3.06, xp: 5.4, reviews: 2 }, NOW);
    p = logStudy(p, TODAY, { minutes: -10, xp: -10, reviews: -10 }, NOW);
    expect(p.days[TODAY]).toEqual({ minutes: 5.1, xp: 15, reviews: 3 });
    expect(p.xp).toBe(15);
  });
  it("markSeen không ghi đè ngày xem đầu tiên", () => {
    let p = markSeen(emptyProgress(NOW), "kanji:a", "2026-10-01", NOW);
    p = markSeen(p, "kanji:a", TODAY, NOW);
    expect(p.seen["kanji:a"]).toBe("2026-10-01");
  });
  it("reviewItem tạo trạng thái SRS và đánh dấu đã xem; trả lời sai tăng lapses", () => {
    let p = reviewItem(emptyProgress(NOW), "vocabulary:a", 4, TODAY, NOW);
    expect(p.srs["vocabulary:a"].reps).toBe(1);
    expect(p.seen["vocabulary:a"]).toBe(TODAY);
    p = reviewItem(p, "vocabulary:a", 4, "2026-10-23", NOW);
    p = reviewItem(p, "vocabulary:a", 1, "2026-10-30", NOW);
    expect(p.srs["vocabulary:a"].lapses).toBe(1);
    expect(p.srs["vocabulary:a"].ease).toBeGreaterThanOrEqual(1.3);
  });
  it("setLessonStatus không hạ 'done' xuống 'started'", () => {
    let p = setLessonStatus(emptyProgress(NOW), "l1", "done", NOW);
    p = setLessonStatus(p, "l1", "started", "2026-10-23T00:00:00Z");
    expect(p.lessons.l1.status).toBe("done");
  });
  it("câu sai: sai tăng đếm, đúng liên tiếp đủ số lần thì khắc phục, sai lại thì làm lại từ đầu", () => {
    let p = recordWrongAnswers(emptyProgress(NOW), [{ questionId: "q1", correct: false }, { questionId: "q2", correct: true }], TODAY, NOW);
    expect(p.wrong.q2).toBeUndefined(); // đúng ngay từ đầu → không ghi nhận
    expect(unresolvedWrongIds(p)).toEqual(["q1"]);
    p = recordWrongAnswers(p, [{ questionId: "q1", correct: true }], TODAY, NOW);
    expect(p.wrong.q1.resolved).toBe(false);
    p = recordWrongAnswers(p, [{ questionId: "q1", correct: false }], TODAY, NOW);
    expect(p.wrong.q1).toMatchObject({ count: 2, correctStreak: 0, resolved: false });
    for (let i = 0; i < WRONG_RESOLVE_STREAK; i++) p = recordWrongAnswers(p, [{ questionId: "q1", correct: true }], TODAY, NOW);
    expect(p.wrong.q1.resolved).toBe(true);
    expect(unresolvedWrongIds(p)).toEqual([]);
  });
  it("addQuizResult: chống ghi trùng và giới hạn lịch sử", () => {
    const mk = (i: number): QuizResultRecord => ({ id: `r${i}`, at: NOW, date: TODAY, kind: "practice", level: "N5", skill: "all", total: 5, correct: 3, percent: 60, durationSec: 30, bySkill: {}, questionIds: [] });
    let p = addQuizResult(emptyProgress(NOW), mk(0), NOW);
    p = addQuizResult(p, mk(0), NOW);
    expect(p.quizzes).toHaveLength(1);
    for (let i = 1; i < MAX_QUIZ_HISTORY + 20; i++) p = addQuizResult(p, mk(i), NOW);
    expect(p.quizzes).toHaveLength(MAX_QUIZ_HISTORY);
    expect(p.quizzes[0].id).toBe(`r${MAX_QUIZ_HISTORY + 19}`);
  });
  it("recordGameRound giữ điểm cao nhất; awardBadges chỉ trao một lần", () => {
    let p = recordGameRound(emptyProgress(NOW), "m", { score: 50, correct: 4, answered: 5 }, NOW);
    p = recordGameRound(p, "m", { score: 30, correct: 2, answered: 5 }, NOW);
    expect(p.games.m).toMatchObject({ plays: 2, best: 50, totalCorrect: 6, totalAnswered: 10 });
    p = awardBadges(p, ["first-step"], "2026-10-01", NOW);
    p = awardBadges(p, ["first-step"], TODAY, NOW);
    expect(p.badges["first-step"]).toBe("2026-10-01");
  });
  it("huy hiệu: không có huy hiệu 'tặng không' trên tiến độ trống; điều kiện hoạt động", () => {
    expect(earnedBadgeIds(emptyProgress(NOW), TODAY)).toEqual([]);
    let p = logStudy(emptyProgress(NOW), TODAY, { minutes: 5, xp: 600, reviews: 60 }, NOW);
    const got = earnedBadgeIds(p, TODAY);
    expect(got).toEqual(expect.arrayContaining(["first-step", "xp-500", "review-50"]));
    expect(got).not.toContain("streak-7");
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    p = recordGameRound(p, "m", { score: 1, correct: 1, answered: 1 }, NOW);
    expect(earnedBadgeIds(p, TODAY)).toContain("game-first");
  });
});

describe("mergeProgress (đồng bộ nhiều thiết bị)", () => {
  const a0 = emptyProgress("2026-10-01T00:00:00Z");
  const b0 = emptyProgress("2026-10-02T00:00:00Z");
  it("không mất dữ liệu của bên nào và lấy hợp", () => {
    const a = reviewItem(markSeen(logStudy(a0, "2026-10-10", { minutes: 5, xp: 20, reviews: 3 }, NOW), "kanji:a", "2026-10-10", NOW), "vocabulary:x", 4, "2026-10-10", NOW);
    const b = reviewItem(logStudy(b0, "2026-10-11", { minutes: 7, xp: 30, reviews: 4 }, NOW), "vocabulary:y", 5, "2026-10-11", NOW);
    const m = mergeProgress(a, b);
    expect(Object.keys(m.srs).sort()).toEqual(["vocabulary:x", "vocabulary:y"]);
    expect(Object.keys(m.days).sort()).toEqual(["2026-10-10", "2026-10-11"]);
    expect(m.seen["kanji:a"]).toBe("2026-10-10");
    expect(m.xp).toBe(50);
    expect(parseProgress(m).ok).toBe(true);
  });
  it("giao hoán ở các trường dữ liệu và lũy đẳng (gộp lại với chính nó không đổi)", () => {
    const a = reviewItem(logStudy(a0, "2026-10-10", { minutes: 5, xp: 20, reviews: 3 }, "2026-10-10T00:00:00Z"), "vocabulary:x", 4, "2026-10-10", "2026-10-10T00:00:00Z");
    const b = reviewItem(logStudy(b0, "2026-10-10", { minutes: 9, xp: 10, reviews: 1 }, "2026-10-11T00:00:00Z"), "vocabulary:x", 5, "2026-10-11", "2026-10-11T00:00:00Z");
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(ab).toEqual(ba);
    expect(mergeProgress(ab, ab)).toEqual(ab);
    expect(ab.days["2026-10-10"]).toEqual({ minutes: 9, xp: 20, reviews: 3 }); // lấy max, không cộng đôi
    expect(ab.srs["vocabulary:x"].last_reviewed).toBe("2026-10-11");
  });
  it("bài kiểm tra hợp theo id; bài học 'done' thắng 'started'", () => {
    const q: QuizResultRecord = { id: "r1", at: NOW, date: TODAY, kind: "test", level: "N5", skill: "all", total: 1, correct: 1, percent: 100, durationSec: 1, bySkill: {}, questionIds: [] };
    const a = setLessonStatus(addQuizResult(a0, q, NOW), "l1", "started", "2026-10-02T00:00:00Z");
    const b = setLessonStatus(addQuizResult(b0, q, NOW), "l1", "done", "2026-10-01T00:00:00Z");
    const m = mergeProgress(a, b);
    expect(m.quizzes).toHaveLength(1);
    expect(m.lessons.l1.status).toBe("done");
  });
});

/* ───── Ôn tập SRS ───── */
describe("hàng đợi ôn tập", () => {
  const mk = (id: string, level: ReviewItem["level"] = "N5"): ReviewItem => ({ key: `vocabulary:${id}`, type: "vocabulary", level, front: id, reading: id, back: id, href: "/" });
  it("mục đến hạn trước (quá hạn lâu nhất đầu tiên), rồi mục đã xem, rồi mục chưa xem theo cấp N5→N1", () => {
    let p = emptyProgress(NOW);
    p = reviewItem(p, "vocabulary:old", 4, "2026-10-01", NOW); // đến hạn ~ 10-02
    p = reviewItem(p, "vocabulary:newer", 4, "2026-10-15", NOW); // đến hạn ~ 10-16
    p = reviewItem(p, "vocabulary:future", 5, TODAY, NOW); // chưa đến hạn
    p = markSeen(p, "vocabulary:seen", TODAY, NOW);
    const items = [mk("future"), mk("n2", "N2"), mk("seen"), mk("newer"), mk("n5"), mk("old")];
    const r = buildReviewQueue(items, p, TODAY, { newLimit: 10, maxDue: 10, rng: mulberry32(1) });
    expect(r.queue.map((i) => i.front)).toEqual(["old", "newer", "seen", "n5", "n2"]);
    expect(r.dueTotal).toBe(2);
  });
  it("giới hạn số mục mới / đến hạn; lọc theo cấp và loại", () => {
    let p = emptyProgress(NOW);
    for (const id of ["a", "b", "c"]) p = reviewItem(p, `vocabulary:${id}`, 4, "2026-09-01", NOW);
    const items = ["a", "b", "c", "d", "e", "f"].map((i) => mk(i));
    const r = buildReviewQueue(items, p, TODAY, { newLimit: 2, maxDue: 2, rng: mulberry32(1) });
    expect(r.dueUsed).toBe(2);
    expect(r.dueTotal).toBe(3);
    expect(r.newUsed).toBe(2);
    expect(buildReviewQueue([mk("a", "N4"), mk("b", "N5")], emptyProgress(NOW), TODAY, { level: "N4", newLimit: 5, maxDue: 5, rng: mulberry32(1) }).queue).toHaveLength(1);
    expect(buildReviewQueue(items, emptyProgress(NOW), TODAY, { types: ["kanji"], newLimit: 5, maxDue: 5, rng: mulberry32(1) }).queue).toHaveLength(0);
    expect(buildReviewQueue(items, emptyProgress(NOW), TODAY, { newLimit: 0, maxDue: 5, rng: mulberry32(1) }).queue).toHaveLength(0);
  });
  it("mục đã ôn nhưng chưa đến hạn không xuất hiện lại", () => {
    const p = reviewItem(emptyProgress(NOW), "vocabulary:a", 5, TODAY, NOW);
    expect(buildReviewQueue([mk("a")], p, TODAY, { newLimit: 5, maxDue: 5, rng: mulberry32(1) }).queue).toEqual([]);
  });
  it("previewIntervals tăng dần theo mức nhớ; formatInterval", () => {
    const iv = previewIntervals(undefined, TODAY);
    expect(iv.again).toBeLessThanOrEqual(iv.hard);
    expect(iv.hard).toBeLessThanOrEqual(iv.good);
    expect(iv.good).toBeLessThanOrEqual(iv.easy);
    expect(formatInterval(0)).toBe("1 ngày");
    expect(formatInterval(10)).toBe("10 ngày");
    expect(formatInterval(60)).toBe("2 tháng");
    expect(formatInterval(730)).toBe("2.0 năm");
  });
});

/* ───── Kanji Quest ───── */
interface SeedVocab { id: string; level: GameItem["level"]; topic: string; word: string; reading: string; meaning_vi: string; pos: string; image_id: string | null; imageable: boolean; examples: { ja: string; vi: string }[] }
interface SeedKanji { id: string; level: GameItem["level"]; char: string; onyomi: string[]; kunyomi: string[]; han_viet: string; meaning_vi: string; image_id: string | null; compounds: { word: string; reading: string; meaning_vi: string }[] }
interface SeedImage { id: string; path: string; alt_vi: string }
const images = new Map(load<SeedImage[]>("images").map((i) => [i.id, i]));
const items: GameItem[] = [
  ...load<SeedVocab[]>("vocabulary").map((v): GameItem => {
    const img = v.image_id ? images.get(v.image_id) : undefined;
    return { key: itemKey("vocabulary", v.id), type: "vocabulary", level: v.level, topic: v.topic, text: v.word, reading: v.reading, meaning: v.meaning_vi, pos: v.pos, imageUrl: img?.path, imageAlt: img?.alt_vi, imageable: v.imageable, example: v.examples[0] };
  }),
  ...load<SeedKanji[]>("kanji").map((k): GameItem => {
    const img = k.image_id ? images.get(k.image_id) : undefined;
    return { key: itemKey("kanji", k.id), type: "kanji", level: k.level, topic: "kanji", text: k.char, reading: [...k.onyomi, ...k.kunyomi].join("、"), meaning: `${k.han_viet} — ${k.meaning_vi}`, imageUrl: img?.path, imageAlt: img?.alt_vi, imageable: !!img, compounds: k.compounds.map((c) => ({ word: c.word, reading: c.reading, meaning: c.meaning_vi })) };
  }),
];

function checkQuestions(qs: GameQuestion[], label: string) {
  for (const q of qs) {
    const texts = q.options.map((o) => o.text);
    expect(new Set(texts).size, `${label}/${q.id} có đáp án trùng`).toBe(texts.length);
    expect(new Set(q.options.map((o) => o.id)).size, `${label}/${q.id}`).toBe(q.options.length);
    expect(q.options.some((o) => o.id === q.correctId), `${label}/${q.id} thiếu đáp án đúng`).toBe(true);
    expect(q.options.length, `${label}/${q.id}`).toBe(4);
    expect(q.explanation.length).toBeGreaterThan(0);
  }
  expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
}

describe("trình sinh câu hỏi Kanji Quest (trên dữ liệu mẫu thật)", () => {
  const o = { count: 15, tier: 1 as const };
  it("Kanji → nghĩa: có câu hỏi, đáp án đúng/duy nhất, mỗi mục tối đa một lần", () => {
    const qs = buildKanjiToMeaning(items, o, mulberry32(1));
    expect(qs.length).toBeGreaterThan(5);
    checkQuestions(qs, "k2m");
    expect(new Set(qs.map((q) => q.itemKey)).size).toBe(qs.length);
    for (const q of qs) {
      const item = items.find((i) => i.key === q.itemKey)!;
      expect(q.options.find((x) => x.id === q.correctId)!.text).toBe(item.meaning);
    }
  });
  it("Picture → Kanji: chỉ dùng mục có hình VÀ cụ thể; không bao giờ ra từ trừu tượng", () => {
    const qs = buildPictureToKanji(items, o, mulberry32(2));
    expect(qs.length).toBeGreaterThan(0);
    checkQuestions(qs, "p2k");
    for (const q of qs) {
      const item = items.find((i) => i.key === q.itemKey)!;
      expect(item.imageable).toBe(true);
      expect(item.imageUrl).toBeTruthy();
      expect(q.prompt.kind).toBe("image");
      // đáp án nhiễu cũng là từ cụ thể
      for (const opt of q.options) expect(items.find((i) => i.text === opt.text)?.imageable, opt.text).toBe(true);
    }
  });
  it("mục trừu tượng có hình cũng bị loại khỏi game dùng hình", () => {
    const abstract = items.filter((i) => !i.imageable);
    expect(abstract.length).toBeGreaterThan(0);
    const spoiled = items.map((i) => (i.imageable ? i : { ...i, imageUrl: "/fake.png" }));
    const qs = buildPictureToKanji(spoiled, { count: 100 }, mulberry32(3));
    for (const q of qs) expect(items.find((i) => i.key === q.itemKey)!.imageable).toBe(true);
    expect(buildImagePairs(spoiled, { count: 100 }, mulberry32(3)).every((p) => items.find((i) => i.key === p.itemKey)!.imageable)).toBe(true);
  });
  it("Reading Challenge: đáp án đúng là cách đọc thật của từ", () => {
    const qs = buildReadingChallenge(items, o, mulberry32(4));
    expect(qs.length).toBeGreaterThan(5);
    checkQuestions(qs, "read");
    const known = new Map<string, Set<string>>();
    for (const i of items) {
      if (i.type === "vocabulary") (known.get(i.text) ?? known.set(i.text, new Set()).get(i.text)!).add(i.reading);
      for (const c of i.compounds ?? []) (known.get(c.word) ?? known.set(c.word, new Set()).get(c.word)!).add(c.reading);
    }
    for (const q of qs) {
      if (q.prompt.kind !== "text") throw new Error("prompt phải là văn bản");
      expect(known.get(q.prompt.text)?.has(q.options.find((x) => x.id === q.correctId)!.text), q.prompt.text).toBe(true);
    }
  });
  it("lọc theo cấp/chủ đề; targetKeys chỉ hỏi các mục được chỉ định; không đủ nhiễu thì trả ít câu hơn thay vì bịa", () => {
    const n5 = buildKanjiToMeaning(items, { count: 50, levels: ["N5"] }, mulberry32(5));
    expect(n5.every((q) => q.level === "N5")).toBe(true);
    const target = items[0].key;
    const only = buildKanjiToMeaning(items, { count: 50, targetKeys: [target] }, mulberry32(5));
    expect(only.map((q) => q.itemKey)).toEqual([target]);
    expect(buildKanjiToMeaning(items.slice(0, 3), { count: 10 }, mulberry32(5))).toEqual([]);
    expect(buildKanjiToMeaning([], { count: 10 }, mulberry32(5))).toEqual([]);
  });
  it("cùng seed → cùng bộ câu hỏi", () => {
    const a = buildKanjiToMeaning(items, o, mulberry32(9)).map((q) => q.id + q.itemKey + q.options.map((x) => x.text).join());
    const b = buildKanjiToMeaning(items, o, mulberry32(9)).map((q) => q.id + q.itemKey + q.options.map((x) => x.text).join());
    expect(a).toEqual(b);
  });
  it("Speed pool, Daily Review, ghép cặp", () => {
    const speed = buildSpeedPool(items, { count: 10 }, mulberry32(6));
    expect(speed.length).toBeGreaterThan(0);
    checkQuestions(speed, "speed");
    const focus = items.slice(0, 8).map((i) => i.key);
    const daily = buildDailyReview(items, [...focus, "vocabulary:khong-ton-tai"], { count: 20 }, mulberry32(7));
    expect(daily.length).toBeGreaterThan(0);
    expect(daily.every((q) => focus.includes(q.itemKey))).toBe(true);
    checkQuestions(daily, "daily");
    const pairs = buildMemoryPairs(items, { count: 6 }, mulberry32(8));
    expect(pairs.length).toBeGreaterThan(0);
    expect(new Set(pairs.map((p) => (p.a as { text: string }).text)).size).toBe(pairs.length);
    expect(new Set(pairs.map((p) => p.b.text)).size).toBe(pairs.length);
  });
  it("tier 3 chọn đáp án nhiễu giống hơn tier 1 (cùng chủ đề)", () => {
    const vocab = items.filter((i) => i.type === "vocabulary");
    const target = vocab[0];
    const same = (tier: 1 | 3) => {
      let c = 0;
      for (let s = 0; s < 40; s++) c += pickDistractors(target, vocab, 3, mulberry32(s), tier, (i) => i.meaning).filter((d) => d.topic === target.topic).length;
      return c;
    };
    expect(same(3)).toBeGreaterThanOrEqual(same(1));
  });
  it("Listening Quest: prompt là audio (không lộ chữ), đáp án đúng là nghĩa thật của từ được phát", () => {
    const qs = buildListeningQuest(items, o, mulberry32(11));
    expect(qs.length).toBeGreaterThan(5);
    checkQuestions(qs, "listen");
    for (const q of qs) {
      const item = items.find((i) => i.key === q.itemKey)!;
      if (q.prompt.kind !== "audio") throw new Error("prompt phải là audio");
      expect(q.prompt.text).toBe(item.text); // chỉ để phát âm — component không hiển thị trước khi trả lời
      expect(q.ask).not.toContain(item.text);
      expect(q.options.find((x) => x.id === q.correctId)!.text).toBe(item.meaning);
      expect(q.explanation).toContain(item.text); // sau khi trả lời mới lộ từ + cách đọc trong giải thích
      expect(q.explanation).toContain(item.reading);
    }
  });
  it("Reverse Recall: prompt là nghĩa tiếng Việt, đáp án đúng là từ tiếng Nhật tương ứng", () => {
    const qs = buildReverseRecall(items, { ...o, tier: 3 as const }, mulberry32(12));
    expect(qs.length).toBeGreaterThan(5);
    checkQuestions(qs, "reverse");
    for (const q of qs) {
      const item = items.find((i) => i.key === q.itemKey)!;
      if (q.prompt.kind !== "text") throw new Error("prompt phải là văn bản");
      expect(q.prompt.text).toBe(item.meaning);
      expect(q.prompt.ja).toBe(false);
      expect(q.options.find((x) => x.id === q.correctId)!.text).toBe(item.text);
      expect(q.options.every((x) => x.ja)).toBe(true);
    }
  });
  it("Odd One Out: đúng 3 từ cùng chủ đề của câu hỏi + 1 từ lạc thuộc chủ đề khác (đáp án đúng)", () => {
    const qs = buildOddOneOut(items, { count: 10, tier: 2 as const }, mulberry32(13));
    expect(qs.length).toBeGreaterThan(0);
    checkQuestions(qs, "odd");
    for (const q of qs) {
      const outsider = items.find((i) => i.key === q.itemKey)!;
      expect(outsider.topic).not.toBe(q.topic);
      const correct = q.options.find((x) => x.id === q.correctId)!;
      expect(correct.text).toBe(outsider.text);
      const others = q.options.filter((x) => x.id !== q.correctId);
      expect(others).toHaveLength(3);
      for (const opt of others) {
        const src = items.find((i) => i.type === "vocabulary" && i.text === opt.text && i.topic === q.topic);
        expect(src, opt.text).toBeTruthy();
      }
      expect(q.explanation).toContain(outsider.meaning);
    }
    // pool chỉ có 1 chủ đề → không có từ lạc loài hợp lệ → không bịa câu
    const oneTopic = items.filter((i) => i.type === "vocabulary" && i.topic === "nature");
    expect(buildOddOneOut(oneTopic, { count: 5 }, mulberry32(13))).toEqual([]);
    expect(buildOddOneOut([], { count: 5 }, mulberry32(13))).toEqual([]);
  });
  it("confusableText: bằng nhau/chứa nhau/chung một nghĩa thì không dùng làm nhiễu", () => {
    expect(confusableText("núi", "Núi")).toBe(true);
    expect(confusableText("đi; đến", "đến")).toBe(true);
    expect(confusableText("núi", "sông")).toBe(false);
    expect(confusableText("", "x")).toBe(false);
  });
});

describe("động cơ trò chơi", () => {
  const qs = buildKanjiToMeaning(items, { count: 5 }, mulberry32(1));
  const wrongOf = (q: GameQuestion) => q.options.find((o) => o.id !== q.correctId)!.id;
  it("điểm: đúng ≥10, sai 0; thưởng tốc độ và combo có trần", () => {
    expect(pointsFor(false, 100, 0)).toBe(0);
    expect(pointsFor(true, 10000, 1)).toBe(10);
    expect(pointsFor(true, 1000, 1)).toBe(15);
    expect(pointsFor(true, 5000, 1)).toBe(12);
    expect(pointsFor(true, 1000, 99)).toBe(10 + 5 + 10);
  });
  it("chơi hết ván: đếm đúng, combo, kết thúc", () => {
    let s = initGame(qs);
    expect(s.status).toBe("playing");
    qs.forEach((q, i) => {
      s = gameReducer(s, { type: "answer", optionId: i === 2 ? wrongOf(q) : q.correctId, ms: 2000 });
      s = gameReducer(s, { type: "next" });
    });
    expect(s.status).toBe("finished");
    expect(s.correct).toBe(4);
    expect(s.maxCombo).toBe(2);
    expect(answeredCount(s)).toBe(5);
    expect(s.score).toBeGreaterThan(0);
  });
  it("chống bấm đúp, đáp án không thuộc câu hỏi, và sang câu khi chưa trả lời", () => {
    let s = initGame(qs);
    s = gameReducer(s, { type: "next" });
    expect(s.index).toBe(0);
    s = gameReducer(s, { type: "answer", optionId: "khong-co", ms: 1 });
    expect(answeredCount(s)).toBe(0);
    s = gameReducer(s, { type: "answer", optionId: qs[0].correctId, ms: 1000 });
    const once = s.score;
    s = gameReducer(s, { type: "answer", optionId: qs[0].correctId, ms: 1000 });
    expect(s.score).toBe(once);
    expect(s.correct).toBe(1);
  });
  it("ván không có câu hỏi kết thúc ngay; ván đã kết thúc không đổi", () => {
    expect(initGame([]).status).toBe("finished");
    const f = gameReducer(initGame(qs), { type: "finish" });
    expect(gameReducer(f, { type: "answer", optionId: qs[0].correctId, ms: 1 })).toBe(f);
  });
});

describe("Daily Review: mục cần chú ý", () => {
  it("thứ tự: đến hạn → câu sai chưa khắc phục → hay quên; không trùng, chỉ từ vựng/Kanji", () => {
    let p = emptyProgress(NOW);
    p = reviewItem(p, "vocabulary:due", 4, "2026-09-01", NOW);
    p = reviewItem(p, "vocabulary:fresh", 5, TODAY, NOW);
    p = reviewItem(p, "kanji:lapsed", 4, TODAY, NOW);
    p = reviewItem(p, "kanji:lapsed", 1, TODAY, NOW);
    p = reviewItem(p, "grammar:g1", 4, "2026-09-01", NOW);
    p = recordWrongAnswers(p, [{ questionId: "q1", correct: false }, { questionId: "q2", correct: false }], TODAY, NOW);
    const keys = dailyFocusKeys(p, TODAY, { q1: "vocabulary:fromquiz", q2: "grammar:g2" });
    expect(keys).toEqual(["vocabulary:due", "vocabulary:fromquiz", "kanji:lapsed"]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
