/**
 * MÔ HÌNH TIẾN ĐỘ HỌC — thuần hàm (không đụng trình duyệt) nên test được và dùng chung cho
 * localStorage (chế độ demo/khách) lẫn đồng bộ Supabase (khi đăng nhập).
 * Mọi hàm nhận state cũ → trả state mới (không sửa tại chỗ).
 */
import { z } from "zod";
import { newSrsState, sm2, type SrsState } from "../srs";
import { siteConfig } from "@/config/site";

export const PROGRESS_VERSION = siteConfig.progressSchemaVersion;
export const MAX_QUIZ_HISTORY = 100;
export const MAX_DAYS_KEPT = 800;

export type ItemType = "vocabulary" | "kanji" | "grammar";
export const itemKey = (type: ItemType, id: string) => `${type}:${id}`;
export function parseItemKey(key: string): { type: ItemType; id: string } | null {
  const i = key.indexOf(":");
  if (i < 1) return null;
  const type = key.slice(0, i);
  if (type !== "vocabulary" && type !== "kanji" && type !== "grammar") return null;
  return { type, id: key.slice(i + 1) };
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const SrsSchema = z.object({
  ease: z.number().min(1.3).max(5),
  interval: z.number().int().min(0).max(5000),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  due: dateStr,
  last_reviewed: dateStr.nullable(),
});
const DayLogSchema = z.object({ minutes: z.number().min(0), xp: z.number().min(0), reviews: z.number().min(0) });
const QuizSchema = z.object({
  id: z.string(),
  at: z.string(),
  date: dateStr,
  kind: z.enum(["practice", "test", "mock"]),
  level: z.string(),
  skill: z.string(),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  percent: z.number().min(0).max(100),
  durationSec: z.number().min(0),
  bySkill: z.record(z.string(), z.object({ total: z.number(), correct: z.number() })),
  questionIds: z.array(z.string()),
});
const WrongSchema = z.object({
  count: z.number().int().min(0),
  last: dateStr,
  correctStreak: z.number().int().min(0),
  resolved: z.boolean(),
});
const GameStatSchema = z.object({
  plays: z.number().int().min(0),
  best: z.number().min(0),
  lastAt: z.string(),
  totalCorrect: z.number().int().min(0),
  totalAnswered: z.number().int().min(0),
});

export const ProgressSchema = z.object({
  v: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  xp: z.number().min(0),
  days: z.record(dateStr, DayLogSchema),
  srs: z.record(z.string(), SrsSchema),
  /** Mức nhớ từng chữ kana (khóa = ký tự, ví dụ "あ", "ア"). Tách khỏi `srs` để không lẫn vào hàng đợi ôn từ vựng/Kanji. */
  kana: z.record(z.string(), SrsSchema).default({}),
  seen: z.record(z.string(), dateStr),
  lessons: z.record(z.string(), z.object({ status: z.enum(["started", "done"]), at: z.string() })),
  quizzes: z.array(QuizSchema),
  wrong: z.record(z.string(), WrongSchema),
  badges: z.record(z.string(), z.string()),
  games: z.record(z.string(), GameStatSchema),
  goals: z.object({ minutes: z.number().min(1).max(600), xp: z.number().min(10).max(5000) }),
});
export type Progress = z.infer<typeof ProgressSchema>;
export type QuizResultRecord = z.infer<typeof QuizSchema>;
export type WrongEntry = z.infer<typeof WrongSchema>;
export type GameStat = z.infer<typeof GameStatSchema>;
export type DayLog = z.infer<typeof DayLogSchema>;

export function emptyProgress(now: string = new Date().toISOString()): Progress {
  return {
    v: PROGRESS_VERSION,
    createdAt: now,
    updatedAt: now,
    xp: 0,
    days: {},
    srs: {},
    kana: {},
    seen: {},
    lessons: {},
    quizzes: [],
    wrong: {},
    badges: {},
    games: {},
    goals: { minutes: 15, xp: 100 },
  };
}

/**
 * Đọc dữ liệu thô (từ localStorage / JSON import) → Progress hợp lệ.
 * Dữ liệu hỏng KHÔNG làm app sập: trả về { ok:false } để giao diện báo cho người dùng và giữ bản gốc.
 */
export function parseProgress(raw: unknown): { ok: true; value: Progress } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object") return { ok: false, error: "Dữ liệu không phải đối tượng JSON" };
  const v = (raw as { v?: unknown }).v;
  if (typeof v !== "number") return { ok: false, error: "Thiếu số phiên bản (v)" };
  if (v > PROGRESS_VERSION) return { ok: false, error: `Dữ liệu từ phiên bản mới hơn (v${v}). Hãy cập nhật ứng dụng.` };
  // (Chỗ để viết hàm nâng cấp v1→v2 khi cấu trúc đổi.)
  const r = ProgressSchema.safeParse(raw);
  if (!r.success) {
    const first = r.error.issues[0];
    return { ok: false, error: `Dữ liệu tiến độ không hợp lệ tại "${first.path.join(".")}": ${first.message}` };
  }
  return { ok: true, value: r.data };
}

function touch(p: Progress, now: string): Progress {
  return { ...p, updatedAt: now };
}

/* ───────────── Ghi nhận học tập ───────────── */

export function logStudy(
  p: Progress,
  date: string,
  add: { minutes?: number; xp?: number; reviews?: number },
  now: string = new Date().toISOString(),
): Progress {
  const cur = p.days[date] ?? { minutes: 0, xp: 0, reviews: 0 };
  const next: DayLog = {
    minutes: round1(cur.minutes + Math.max(0, add.minutes ?? 0)),
    xp: cur.xp + Math.max(0, Math.round(add.xp ?? 0)),
    reviews: cur.reviews + Math.max(0, add.reviews ?? 0),
  };
  let days = { ...p.days, [date]: next };
  const keys = Object.keys(days);
  if (keys.length > MAX_DAYS_KEPT) {
    keys.sort();
    days = Object.fromEntries(keys.slice(keys.length - MAX_DAYS_KEPT).map((k) => [k, days[k]]));
  }
  return touch({ ...p, days, xp: p.xp + Math.max(0, Math.round(add.xp ?? 0)) }, now);
}

export function studyDaysOf(p: Progress): string[] {
  return Object.entries(p.days)
    .filter(([, d]) => d.minutes > 0 || d.reviews > 0 || d.xp > 0)
    .map(([k]) => k);
}

/** Đánh dấu đã xem một mục (để tính "đã học bao nhiêu %"). Không tạo lịch ôn. */
export function markSeen(p: Progress, key: string, today: string, now?: string): Progress {
  if (p.seen[key]) return p;
  return touch({ ...p, seen: { ...p.seen, [key]: today } }, now ?? new Date().toISOString());
}

/** Ghi kết quả ôn một mục bằng SM-2. Tạo trạng thái SRS nếu mục chưa có. */
export function reviewItem(p: Progress, key: string, quality: number, today: string, now?: string): Progress {
  const base: SrsState = p.srs[key] ?? newSrsState(today);
  const next = sm2(base, quality, today);
  return touch(
    { ...p, srs: { ...p.srs, [key]: next }, seen: p.seen[key] ? p.seen : { ...p.seen, [key]: today } },
    now ?? new Date().toISOString(),
  );
}

/** Ghi kết quả luyện một chữ kana bằng SM-2 (lưu riêng trong `kana`). */
export function reviewKana(p: Progress, char: string, quality: number, today: string, now?: string): Progress {
  const base: SrsState = p.kana[char] ?? newSrsState(today);
  return touch({ ...p, kana: { ...p.kana, [char]: sm2(base, quality, today) } }, now ?? new Date().toISOString());
}

export function setLessonStatus(p: Progress, lessonId: string, status: "started" | "done", now: string = new Date().toISOString()): Progress {
  const cur = p.lessons[lessonId];
  if (cur?.status === "done" && status === "started") return p; // không hạ trạng thái
  return touch({ ...p, lessons: { ...p.lessons, [lessonId]: { status, at: now } } }, now);
}

/* ───────────── Bài kiểm tra & câu sai ───────────── */

export const WRONG_RESOLVE_STREAK = 2; // đúng liên tiếp 2 lần → coi như đã khắc phục

export function recordWrongAnswers(
  p: Progress,
  results: { questionId: string; correct: boolean }[],
  today: string,
  now?: string,
): Progress {
  const wrong = { ...p.wrong };
  for (const r of results) {
    const cur = wrong[r.questionId];
    if (!r.correct) {
      wrong[r.questionId] = { count: (cur?.count ?? 0) + 1, last: today, correctStreak: 0, resolved: false };
    } else if (cur && !cur.resolved) {
      const streak = cur.correctStreak + 1;
      wrong[r.questionId] = { ...cur, last: today, correctStreak: streak, resolved: streak >= WRONG_RESOLVE_STREAK };
    }
  }
  return touch({ ...p, wrong }, now ?? new Date().toISOString());
}

export function addQuizResult(p: Progress, q: QuizResultRecord, now?: string): Progress {
  // Chống ghi trùng khi bấm nộp nhiều lần: cùng id thì bỏ qua.
  if (p.quizzes.some((x) => x.id === q.id)) return p;
  const quizzes = [q, ...p.quizzes].slice(0, MAX_QUIZ_HISTORY);
  return touch({ ...p, quizzes }, now ?? new Date().toISOString());
}

export function unresolvedWrongIds(p: Progress): string[] {
  return Object.entries(p.wrong)
    .filter(([, w]) => !w.resolved)
    .sort((a, b) => b[1].count - a[1].count || (a[1].last < b[1].last ? 1 : -1))
    .map(([id]) => id);
}

/* ───────────── Trò chơi & huy hiệu ───────────── */

export function recordGameRound(
  p: Progress,
  mode: string,
  r: { score: number; correct: number; answered: number },
  now: string = new Date().toISOString(),
): Progress {
  const cur = p.games[mode] ?? { plays: 0, best: 0, lastAt: now, totalCorrect: 0, totalAnswered: 0 };
  return touch(
    {
      ...p,
      games: {
        ...p.games,
        [mode]: {
          plays: cur.plays + 1,
          best: Math.max(cur.best, r.score),
          lastAt: now,
          totalCorrect: cur.totalCorrect + r.correct,
          totalAnswered: cur.totalAnswered + r.answered,
        },
      },
    },
    now,
  );
}

export function awardBadges(p: Progress, ids: string[], today: string, now?: string): Progress {
  const fresh = ids.filter((id) => !p.badges[id]);
  if (fresh.length === 0) return p;
  const badges = { ...p.badges };
  for (const id of fresh) badges[id] = today;
  return touch({ ...p, badges }, now ?? new Date().toISOString());
}

export function setGoals(p: Progress, goals: Progress["goals"], now?: string): Progress {
  return touch({ ...p, goals }, now ?? new Date().toISOString());
}

/* ───────────── Gộp hai bản tiến độ (đồng bộ nhiều thiết bị) ───────────── */

/**
 * Gộp không mất dữ liệu: lấy hợp của hai bản.
 *  - SRS: mục nào ôn gần đây hơn thì thắng (nếu bằng nhau lấy bản có nhiều reps hơn);
 *  - ngày học: lấy giá trị lớn hơn theo từng trường (tránh cộng đôi khi cùng thiết bị đồng bộ lại);
 *  - bài kiểm tra: hợp theo id;  câu sai: bản có `last` mới hơn thắng;  huy hiệu/ bài học: giữ cái sớm/đã xong.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const mergeSrsMap = (x: Progress["srs"], y: Progress["srs"]): Progress["srs"] => {
    const out: Progress["srs"] = { ...x };
    for (const [k, vb] of Object.entries(y)) {
      const va = out[k];
      if (!va) out[k] = vb;
      else {
        const la = va.last_reviewed ?? "";
        const lb = vb.last_reviewed ?? "";
        out[k] = lb > la ? vb : lb < la ? va : vb.reps > va.reps ? vb : va;
      }
    }
    return out;
  };
  const srs = mergeSrsMap(a.srs, b.srs);
  const kana = mergeSrsMap(a.kana ?? {}, b.kana ?? {});
  const days: Progress["days"] = { ...a.days };
  for (const [k, vb] of Object.entries(b.days)) {
    const va = days[k];
    days[k] = va
      ? { minutes: Math.max(va.minutes, vb.minutes), xp: Math.max(va.xp, vb.xp), reviews: Math.max(va.reviews, vb.reviews) }
      : vb;
  }
  const quizMap = new Map<string, QuizResultRecord>();
  for (const q of [...a.quizzes, ...b.quizzes]) if (!quizMap.has(q.id)) quizMap.set(q.id, q);
  const quizzes = [...quizMap.values()].sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, MAX_QUIZ_HISTORY);
  const wrong: Progress["wrong"] = { ...a.wrong };
  for (const [k, vb] of Object.entries(b.wrong)) {
    const va = wrong[k];
    wrong[k] = !va || vb.last > va.last ? vb : va;
  }
  const seen: Progress["seen"] = { ...a.seen };
  for (const [k, v] of Object.entries(b.seen)) if (!seen[k] || v < seen[k]) seen[k] = v;
  const badges: Progress["badges"] = { ...a.badges };
  for (const [k, v] of Object.entries(b.badges)) if (!badges[k] || v < badges[k]) badges[k] = v;
  const lessons: Progress["lessons"] = { ...a.lessons };
  for (const [k, vb] of Object.entries(b.lessons)) {
    const va = lessons[k];
    if (!va || (vb.status === "done" && va.status !== "done") || (vb.status === va.status && vb.at > va.at)) lessons[k] = vb;
  }
  const games: Progress["games"] = { ...a.games };
  for (const [k, vb] of Object.entries(b.games)) {
    const va = games[k];
    games[k] = !va ? vb : { ...(vb.lastAt > va.lastAt ? vb : va), best: Math.max(va.best, vb.best) };
  }
  const xp = Math.max(a.xp, b.xp, Object.values(days).reduce((s, d) => s + d.xp, 0));
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    v: PROGRESS_VERSION,
    createdAt: a.createdAt < b.createdAt ? a.createdAt : b.createdAt,
    updatedAt: newer.updatedAt,
    xp,
    days,
    srs,
    kana,
    seen,
    lessons,
    quizzes,
    wrong,
    badges,
    games,
    goals: newer.goals,
  };
}

/* ───────────── Thống kê dẫn xuất ───────────── */

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
