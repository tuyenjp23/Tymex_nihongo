import type { ExamSkill } from "@/config/jlpt";
import { shuffle, type Rng } from "./rng";
import type { Level } from "./types";

export type QuizKind = "practice" | "test" | "mock";

export interface QuizOption {
  id: string;
  text: string;
  explanation_vi: string;
}

/** Dạng gọn của Question được gửi xuống trình duyệt (không có trường provenance dư thừa). */
export interface QuizQuestion {
  id: string;
  level: Level;
  skill: ExamSkill;
  topic: string;
  stem: string;
  options: QuizOption[];
  correct_option_id: string;
  explanation_vi: string;
  difficulty: number;
  passage_id: string | null;
  ref_type: "vocabulary" | "kanji" | "grammar" | null;
  ref_id: string | null;
  status: string;
}

export interface QuizPassage {
  id: string;
  kind: "reading" | "listening";
  title: string;
  body: string;
  body_vi: string;
  script: { speaker: string; text: string; vi: string }[];
}

/** Thứ tự phần thi mô phỏng cấu trúc JLPT: kiến thức ngôn ngữ → đọc hiểu → nghe hiểu. */
export const MOCK_SKILL_ORDER: ExamSkill[] = ["vocabulary", "kanji", "grammar", "reading", "listening"];

export function isCorrect(q: Pick<QuizQuestion, "correct_option_id">, chosenOptionId: string | null): boolean {
  return chosenOptionId !== null && chosenOptionId === q.correct_option_id;
}

/** Xáo thứ tự phương án để đáp án đúng không luôn ở cùng một vị trí. ID phương án giữ nguyên. */
export function shuffleOptions(q: QuizQuestion, rng: Rng): QuizQuestion {
  return { ...q, options: shuffle(q.options, rng) };
}

/**
 * Chọn câu hỏi cho một lượt làm bài.
 *  - practice/test: xáo trộn toàn bộ.
 *  - mock: giữ thứ tự theo phần thi (từ vựng → Kanji → ngữ pháp → đọc → nghe), xáo trong từng phần.
 * Không trả quá số câu hiện có (không lặp câu để "đủ số").
 */
export function pickQuestions(pool: QuizQuestion[], opts: { count: number; kind: QuizKind; rng: Rng }): QuizQuestion[] {
  const count = Math.max(1, Math.min(opts.count, pool.length));
  if (opts.kind !== "mock") return shuffle(pool, opts.rng).slice(0, count);
  const picked = shuffle(pool, opts.rng).slice(0, count);
  return MOCK_SKILL_ORDER.flatMap((s) => picked.filter((q) => q.skill === s));
}

export const QUIZ_KIND_LABELS: Record<QuizKind, string> = {
  practice: "Luyện tập",
  test: "Bài kiểm tra",
  mock: "Thi thử",
};

export function xpForQuiz(kind: QuizKind, correct: number): number {
  const per = kind === "practice" ? 3 : kind === "test" ? 5 : 6;
  return correct * per;
}
