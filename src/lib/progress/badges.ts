import { computeStreak } from "../streak";
import { memoryStage } from "../srs";
import { studyDaysOf, type Progress } from "./model";

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  test: (p: Progress, today: string) => boolean;
}

const totalReviews = (p: Progress) => Object.values(p.days).reduce((s, d) => s + d.reviews, 0);
const countSeen = (p: Progress, prefix: string) => Object.keys(p.seen).filter((k) => k.startsWith(prefix)).length;

/**
 * Huy hiệu khen thưởng HÀNH VI học (đều đặn, ôn tập, hoàn thành) chứ không so sánh người với người.
 * Điều kiện tính từ dữ liệu tiến độ thực tế — không có huy hiệu "tặng không".
 */
export const BADGES: BadgeDef[] = [
  { id: "first-step", title: "Bước đầu tiên", description: "Hoàn thành hoạt động học đầu tiên.", icon: "sparkles", test: (p) => studyDaysOf(p).length >= 1 },
  { id: "streak-3", title: "Giữ nhịp 3 ngày", description: "Chuỗi học 3 ngày.", icon: "flame", test: (p, t) => computeStreak(studyDaysOf(p), t).longest >= 3 },
  { id: "streak-7", title: "Một tuần bền bỉ", description: "Chuỗi học 7 ngày.", icon: "flame", test: (p, t) => computeStreak(studyDaysOf(p), t).longest >= 7 },
  { id: "streak-30", title: "Thói quen 30 ngày", description: "Chuỗi học 30 ngày.", icon: "trophy", test: (p, t) => computeStreak(studyDaysOf(p), t).longest >= 30 },
  { id: "review-50", title: "Ôn 50 lượt", description: "Hoàn thành 50 lượt ôn tập.", icon: "repeat", test: (p) => totalReviews(p) >= 50 },
  { id: "review-300", title: "Ôn 300 lượt", description: "Hoàn thành 300 lượt ôn tập.", icon: "repeat", test: (p) => totalReviews(p) >= 300 },
  { id: "mastered-10", title: "10 mục thuộc vững", description: "10 mục có khoảng ôn từ 21 ngày trở lên.", icon: "brain", test: (p) => Object.values(p.srs).filter((s) => memoryStage(s) === "mastered").length >= 10 },
  { id: "quiz-first", title: "Làm bài đầu tiên", description: "Hoàn thành một bài luyện/kiểm tra.", icon: "target", test: (p) => p.quizzes.length >= 1 },
  { id: "quiz-perfect", title: "Trọn điểm", description: "Đúng hết một bài từ 5 câu trở lên.", icon: "trophy", test: (p) => p.quizzes.some((q) => q.total >= 5 && q.correct === q.total) },
  { id: "kanji-30", title: "Khám phá 30 Kanji", description: "Đã xem 30 chữ Kanji.", icon: "kanji", test: (p) => countSeen(p, "kanji:") >= 30 },
  { id: "vocab-50", title: "Khám phá 50 từ", description: "Đã xem 50 từ vựng.", icon: "book", test: (p) => countSeen(p, "vocabulary:") >= 50 },
  { id: "game-first", title: "Người chơi mới", description: "Chơi một ván Kanji Quest.", icon: "gamepad", test: (p) => Object.keys(p.games).length >= 1 },
  { id: "xp-500", title: "500 XP", description: "Tích lũy 500 XP.", icon: "sparkles", test: (p) => p.xp >= 500 },
  { id: "xp-2000", title: "2000 XP", description: "Tích lũy 2000 XP.", icon: "trophy", test: (p) => p.xp >= 2000 },
];

export function earnedBadgeIds(p: Progress, today: string): string[] {
  return BADGES.filter((b) => b.test(p, today)).map((b) => b.id);
}
