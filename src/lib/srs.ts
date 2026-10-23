import { addDays, daysBetween } from "./dates";

/**
 * ÔN TẬP LẶP LẠI NGẮT QUÃNG — biến thể SM-2 (SuperMemo-2).
 *
 * Mỗi mục (từ/Kanji) có: ease (độ dễ, ≥1.3, mặc định 2.5), interval (số ngày đến lần ôn kế),
 * reps (số lần đúng liên tiếp), lapses (số lần quên).
 *
 * Chất lượng trả lời q (0–5):
 *   q < 3  → quên: reps=0, interval=1 ngày, ease giảm 0.2, lapses+1.
 *   q ≥ 3  → nhớ: reps+1; interval = 1 ngày (lần 1), 6 ngày (lần 2), sau đó round(interval × ease);
 *            ease += 0.1 − (5−q)(0.08 + (5−q)·0.02).
 *
 * Trò chơi trắc nghiệm chỉ cho tối đa q=4 (có 25% đoán mò); chỉ nút "Dễ" của flashcard mới cho q=5.
 * ĐIỂM XP (thưởng vui) KHÔNG ảnh hưởng lịch ôn; lịch ôn chỉ phụ thuộc đúng/sai và tốc độ.
 */
export interface SrsState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  /** Ngày đến hạn ôn (YYYY-MM-DD) */
  due: string;
  last_reviewed: string | null;
}

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
export const MASTERED_INTERVAL_DAYS = 21;

export function newSrsState(today: string): SrsState {
  return { ease: DEFAULT_EASE, interval: 0, reps: 0, lapses: 0, due: today, last_reviewed: null };
}

export function sm2(state: SrsState, quality: number, today: string): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  if (q < 3) {
    return {
      ease: Math.max(MIN_EASE, round2(state.ease - 0.2)),
      interval: 1,
      reps: 0,
      lapses: state.lapses + 1,
      due: addDays(today, 1),
      last_reviewed: today,
    };
  }
  const reps = state.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.max(1, Math.round(state.interval * state.ease));
  const ease = Math.max(MIN_EASE, round2(state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));
  return { ease, interval, reps, lapses: state.lapses, due: addDays(today, interval), last_reviewed: today };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Chất lượng SM-2 từ một câu trả lời trắc nghiệm. */
export function qualityFromChoice(correct: boolean, elapsedMs: number): number {
  if (!correct) return 1;
  return elapsedMs <= 5000 ? 4 : 3;
}

/** Chất lượng SM-2 từ nút flashcard. */
export const FLASHCARD_QUALITY = { again: 1, hard: 3, good: 4, easy: 5 } as const;

export type MemoryStage = "new" | "learning" | "review" | "mastered";

/** Mức ghi nhớ thực tế (tách khỏi điểm số): dựa trên khoảng cách ôn đã đạt. */
export function memoryStage(state: SrsState | undefined | null): MemoryStage {
  if (!state || state.reps === 0 && state.lapses === 0 && !state.last_reviewed) return "new";
  if (state.interval >= MASTERED_INTERVAL_DAYS) return "mastered";
  if (state.interval >= 7) return "review";
  return "learning";
}

export function isDue(state: SrsState | undefined | null, today: string): boolean {
  if (!state || !state.last_reviewed) return false;
  return daysBetween(state.due, today) >= 0;
}

export const MEMORY_STAGE_LABELS: Record<MemoryStage, string> = {
  new: "Chưa học",
  learning: "Đang học",
  review: "Đang củng cố",
  mastered: "Đã thuộc vững",
};
