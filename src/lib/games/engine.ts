import type { GameQuestion } from "./types";

export interface AnswerResult {
  optionId: string;
  correct: boolean;
  ms: number;
  points: number;
}

export interface GameState {
  questions: GameQuestion[];
  index: number;
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  answers: Record<string, AnswerResult>;
  status: "playing" | "finished";
}

export type GameAction =
  | { type: "answer"; optionId: string; ms: number }
  | { type: "next" }
  | { type: "finish" };

export function initGame(questions: GameQuestion[]): GameState {
  return { questions, index: 0, score: 0, combo: 0, maxCombo: 0, correct: 0, answers: {}, status: questions.length === 0 ? "finished" : "playing" };
}

/**
 * Điểm một câu đúng = 10 + thưởng tốc độ (≤3s: +5, ≤6s: +2) + thưởng combo (mỗi câu liên tiếp thứ n≥2 cộng 2, tối đa +10).
 * Sai = 0 điểm và mất combo. Điểm/XP chỉ là phần thưởng vui — KHÔNG quyết định lịch ôn (lịch ôn chỉ dùng đúng/sai và tốc độ qua SM-2).
 */
export function pointsFor(correct: boolean, ms: number, comboAfter: number): number {
  if (!correct) return 0;
  const speed = ms <= 3000 ? 5 : ms <= 6000 ? 2 : 0;
  const combo = Math.min(Math.max(comboAfter - 1, 0), 5) * 2;
  return 10 + speed + combo;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.status === "finished") return state;
  const q = state.questions[state.index];
  switch (action.type) {
    case "answer": {
      if (!q || state.answers[q.id]) return state; // mỗi câu chỉ tính một lần (chống bấm đúp)
      if (!q.options.some((o) => o.id === action.optionId)) return state;
      const correct = action.optionId === q.correctId;
      const combo = correct ? state.combo + 1 : 0;
      const points = pointsFor(correct, action.ms, combo);
      return {
        ...state,
        score: state.score + points,
        combo,
        maxCombo: Math.max(state.maxCombo, combo),
        correct: state.correct + (correct ? 1 : 0),
        answers: { ...state.answers, [q.id]: { optionId: action.optionId, correct, ms: action.ms, points } },
      };
    }
    case "next": {
      if (!q || !state.answers[q.id]) return state; // phải trả lời trước khi sang câu kế
      if (state.index + 1 >= state.questions.length) return { ...state, status: "finished" };
      return { ...state, index: state.index + 1 };
    }
    case "finish":
      return { ...state, status: "finished" };
  }
}

export function answeredCount(state: GameState): number {
  return Object.keys(state.answers).length;
}
