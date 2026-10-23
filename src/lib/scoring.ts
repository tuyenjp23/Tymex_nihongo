import type { ExamSkill } from "@/config/jlpt";
import { JLPT_OFFICIAL } from "@/config/jlpt";
import type { Level } from "./types";

export interface AnswerRecord {
  questionId: string;
  skill: ExamSkill;
  /** null = bỏ trống / hết giờ */
  chosenOptionId: string | null;
  correct: boolean;
}

export interface QuizScore {
  correct: number;
  total: number;
  /** 0..1 */
  ratio: number;
  bySkill: Partial<Record<ExamSkill, { correct: number; total: number }>>;
  wrongIds: string[];
  unansweredIds: string[];
}

export function scoreAnswers(answers: AnswerRecord[]): QuizScore {
  const bySkill: QuizScore["bySkill"] = {};
  let correct = 0;
  const wrongIds: string[] = [];
  const unansweredIds: string[] = [];
  // Mỗi câu chỉ tính 1 lần (câu cuối cùng được ghi nhận) → chống cộng điểm kép.
  const last = new Map<string, AnswerRecord>();
  for (const a of answers) last.set(a.questionId, a);
  for (const a of last.values()) {
    const s = (bySkill[a.skill] ??= { correct: 0, total: 0 });
    s.total++;
    if (a.correct) {
      s.correct++;
      correct++;
    } else {
      wrongIds.push(a.questionId);
      if (a.chosenOptionId === null) unansweredIds.push(a.questionId);
    }
  }
  const total = last.size;
  return { correct, total, ratio: total === 0 ? 0 : correct / total, bySkill, wrongIds, unansweredIds };
}

export interface SectionResult {
  id: string;
  name: string;
  correct: number;
  total: number;
  /** null nếu chưa có câu hỏi thuộc phần này trong bài */
  ratio: number | null;
}

/**
 * Tổng kết theo các PHẦN CHẤM ĐIỂM chính thức của cấp (nhóm kỹ năng theo cấu trúc JLPT đã xác minh).
 * Chỉ trả TỈ LỆ ĐÚNG THÔ. Không quy đổi sang thang 0–180 hay kết luận đỗ/trượt vì không tái tạo được
 * cách quy đổi điểm của kỳ thi thật.
 */
export function summarizeBySection(level: Level, bySkill: QuizScore["bySkill"]): SectionResult[] {
  return JLPT_OFFICIAL[level].scoring.map((sec) => {
    let correct = 0;
    let total = 0;
    for (const sk of sec.skills) {
      const v = bySkill[sk];
      if (v) {
        correct += v.correct;
        total += v.total;
      }
    }
    return { id: sec.id, name: sec.name, correct, total, ratio: total === 0 ? null : correct / total };
  });
}

/** Thời gian thi thử rút gọn (giây): `secondsPerQuestion` × số câu, có sàn tối thiểu. */
export function mockTimeLimitSeconds(questionCount: number, secondsPerQuestion = 60): number {
  return Math.max(60, Math.round(questionCount * secondsPerQuestion));
}
