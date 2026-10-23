import type { Level } from "@/lib/types";

/**
 * CẤU TRÚC BÀI THI JLPT CHÍNH THỨC — đối chiếu ngày 2026-10-22 với trang chính thức:
 *  - Thời gian từng phần: https://www.jlpt.jp/e/guideline/testsections.html
 *  - Phần chấm điểm, điểm đỗ:  https://www.jlpt.jp/e/guideline/results.html
 *  - Mô tả năng lực:          https://www.jlpt.jp/e/about/levelsummary.html
 * Trang chính thức lưu ý thời gian có thể thay đổi → khi dùng cho mục đích quan trọng hãy kiểm tra lại.
 *
 * KHÔNG có số lượng câu hỏi ở đây vì chưa xác minh được từ nguồn chính thức — không tự bịa.
 */
export const JLPT_OFFICIAL_VERIFIED_ON = "2026-10-22";

export const JLPT_OFFICIAL_URLS = {
  home: "https://www.jlpt.jp/e/",
  sections: "https://www.jlpt.jp/e/guideline/testsections.html",
  results: "https://www.jlpt.jp/e/guideline/results.html",
  summary: "https://www.jlpt.jp/e/about/levelsummary.html",
  samples: "https://www.jlpt.jp/e/samples/forlearners.html",
  policy: "https://www.jlpt.jp/e/policy.html",
} as const;

export type ExamSkill = "vocabulary" | "kanji" | "grammar" | "reading" | "listening";

export interface OfficialExamSection {
  id: string;
  name: string;
  nameJa: string;
  minutes: number;
  skills: ExamSkill[];
}

export interface OfficialScoringSection {
  id: string;
  name: string;
  skills: ExamSkill[];
  maxScore: number;
  /** Điểm liệt: dưới mức này là trượt dù tổng điểm đủ. */
  sectionalPass: number;
}

export interface OfficialLevelExam {
  sections: OfficialExamSection[];
  scoring: OfficialScoringSection[];
  totalMax: number;
  totalPass: number;
  /** Mô tả năng lực (diễn giải tiếng Việt từ trang chính thức, không phải bản dịch chính thức). */
  summaryVi: { reading: string; listening: string };
}

const LK = "Kiến thức ngôn ngữ (từ vựng・chữ Hán・ngữ pháp)";

export const JLPT_OFFICIAL: Record<Level, OfficialLevelExam> = {
  N1: {
    sections: [
      { id: "lk-reading", name: `${LK}・Đọc hiểu`, nameJa: "言語知識（文字・語彙・文法）・読解", minutes: 110, skills: ["vocabulary", "kanji", "grammar", "reading"] },
      { id: "listening", name: "Nghe hiểu", nameJa: "聴解", minutes: 55, skills: ["listening"] },
    ],
    scoring: [
      { id: "lk", name: LK, skills: ["vocabulary", "kanji", "grammar"], maxScore: 60, sectionalPass: 19 },
      { id: "reading", name: "Đọc hiểu", skills: ["reading"], maxScore: 60, sectionalPass: 19 },
      { id: "listening", name: "Nghe hiểu", skills: ["listening"], maxScore: 60, sectionalPass: 19 },
    ],
    totalMax: 180,
    totalPass: 100,
    summaryVi: {
      reading: "Đọc được văn bản có tính logic phức tạp hoặc trừu tượng về nhiều chủ đề; nắm cấu trúc, nội dung bài bình luận/phê bình và ý đồ người viết.",
      listening: "Nghe hiểu hội thoại mạch lạc, tin tức, bài giảng ở tốc độ tự nhiên trong nhiều bối cảnh.",
    },
  },
  N2: {
    sections: [
      { id: "lk-reading", name: `${LK}・Đọc hiểu`, nameJa: "言語知識（文字・語彙・文法）・読解", minutes: 105, skills: ["vocabulary", "kanji", "grammar", "reading"] },
      { id: "listening", name: "Nghe hiểu", nameJa: "聴解", minutes: 50, skills: ["listening"] },
    ],
    scoring: [
      { id: "lk", name: LK, skills: ["vocabulary", "kanji", "grammar"], maxScore: 60, sectionalPass: 19 },
      { id: "reading", name: "Đọc hiểu", skills: ["reading"], maxScore: 60, sectionalPass: 19 },
      { id: "listening", name: "Nghe hiểu", skills: ["listening"], maxScore: 60, sectionalPass: 19 },
    ],
    totalMax: 180,
    totalPass: 90,
    summaryVi: {
      reading: "Đọc hiểu tài liệu viết rõ ràng về nhiều chủ đề: báo, tạp chí, bình luận đơn giản; nắm ý đồ người viết với chủ đề thông thường.",
      listening: "Nghe hiểu hội thoại và tin tức ở tốc độ gần tự nhiên trong tình huống đời sống; nắm quan hệ giữa người nói và ý chính.",
    },
  },
  N3: {
    sections: [
      { id: "vocab", name: "Kiến thức ngôn ngữ (từ vựng)", nameJa: "言語知識（文字・語彙）", minutes: 30, skills: ["vocabulary", "kanji"] },
      { id: "grammar-reading", name: "Kiến thức ngôn ngữ (ngữ pháp)・Đọc hiểu", nameJa: "言語知識（文法）・読解", minutes: 70, skills: ["grammar", "reading"] },
      { id: "listening", name: "Nghe hiểu", nameJa: "聴解", minutes: 40, skills: ["listening"] },
    ],
    scoring: [
      { id: "lk", name: LK, skills: ["vocabulary", "kanji", "grammar"], maxScore: 60, sectionalPass: 19 },
      { id: "reading", name: "Đọc hiểu", skills: ["reading"], maxScore: 60, sectionalPass: 19 },
      { id: "listening", name: "Nghe hiểu", skills: ["listening"], maxScore: 60, sectionalPass: 19 },
    ],
    totalMax: 180,
    totalPass: 95,
    summaryVi: {
      reading: "Đọc hiểu tài liệu có nội dung cụ thể về chủ đề đời sống; nắm tiêu đề báo và, khi được diễn đạt lại, ý chính của văn bản hơi khó.",
      listening: "Nghe hiểu hội thoại mạch lạc trong tình huống đời sống ở tốc độ gần tự nhiên; nắm quan hệ giữa những người liên quan.",
    },
  },
  N4: {
    sections: [
      { id: "vocab", name: "Kiến thức ngôn ngữ (từ vựng)", nameJa: "言語知識（文字・語彙）", minutes: 25, skills: ["vocabulary", "kanji"] },
      { id: "grammar-reading", name: "Kiến thức ngôn ngữ (ngữ pháp)・Đọc hiểu", nameJa: "言語知識（文法）・読解", minutes: 55, skills: ["grammar", "reading"] },
      { id: "listening", name: "Nghe hiểu", nameJa: "聴解", minutes: 35, skills: ["listening"] },
    ],
    scoring: [
      { id: "lk-reading", name: `${LK}・Đọc hiểu`, skills: ["vocabulary", "kanji", "grammar", "reading"], maxScore: 120, sectionalPass: 38 },
      { id: "listening", name: "Nghe hiểu", skills: ["listening"], maxScore: 60, sectionalPass: 19 },
    ],
    totalMax: 180,
    totalPass: 90,
    summaryVi: {
      reading: "Đọc hiểu đoạn văn về chủ đề quen thuộc hằng ngày, viết bằng từ vựng và Kanji cơ bản.",
      listening: "Nghe hiểu hội thoại thường gặp trong đời sống nếu được nói chậm.",
    },
  },
  N5: {
    sections: [
      { id: "vocab", name: "Kiến thức ngôn ngữ (từ vựng)", nameJa: "言語知識（文字・語彙）", minutes: 20, skills: ["vocabulary", "kanji"] },
      { id: "grammar-reading", name: "Kiến thức ngôn ngữ (ngữ pháp)・Đọc hiểu", nameJa: "言語知識（文法）・読解", minutes: 40, skills: ["grammar", "reading"] },
      { id: "listening", name: "Nghe hiểu", nameJa: "聴解", minutes: 30, skills: ["listening"] },
    ],
    scoring: [
      { id: "lk-reading", name: `${LK}・Đọc hiểu`, skills: ["vocabulary", "kanji", "grammar", "reading"], maxScore: 120, sectionalPass: 38 },
      { id: "listening", name: "Nghe hiểu", skills: ["listening"], maxScore: 60, sectionalPass: 19 },
    ],
    totalMax: 180,
    totalPass: 80,
    summaryVi: {
      reading: "Đọc được các cách diễn đạt và câu thông dụng viết bằng Hiragana, Katakana và Kanji cơ bản.",
      listening: "Nghe hiểu hội thoại ngắn, nói chậm về chủ đề thường gặp trong đời sống và lớp học; nhận ra thông tin cần thiết.",
    },
  },
};

export const SKILL_LABELS: Record<ExamSkill, string> = {
  vocabulary: "Từ vựng",
  kanji: "Chữ Hán",
  grammar: "Ngữ pháp",
  reading: "Đọc hiểu",
  listening: "Nghe hiểu",
};

export const LEVELS_ORDER: Level[] = ["N5", "N4", "N3", "N2", "N1"];
