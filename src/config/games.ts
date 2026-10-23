import type { GamesSettings } from "@/lib/settings-schemas";

export type GameModeStatus = "available" | "planned";

export interface GameModeDef {
  id: string;
  title: string;
  titleJa: string;
  description: string;
  status: GameModeStatus;
  /** Cần hình minh họa để chơi */
  needsImage: boolean;
  icon: string;
}

/**
 * Registry chế độ chơi. Thêm chế độ mới = thêm một mục ở đây + một "bộ sinh câu hỏi" trong src/lib/games/builders.ts
 * (hoặc một component riêng như Memory Match) — KHÔNG phải sửa hệ thống dữ liệu/tiến độ.
 */
export const gameModeDefs: GameModeDef[] = [
  { id: "picture-to-kanji", title: "Picture to Kanji", titleJa: "絵から漢字", description: "Xem hình minh họa, chọn Kanji/từ tương ứng.", status: "available", needsImage: true, icon: "image" },
  { id: "kanji-to-meaning", title: "Kanji to Meaning", titleJa: "漢字の意味", description: "Thấy Kanji hoặc từ tiếng Nhật, chọn nghĩa tiếng Việt.", status: "available", needsImage: false, icon: "languages" },
  { id: "reading-challenge", title: "Reading Challenge", titleJa: "読み方チャレンジ", description: "Chọn cách đọc đúng, có câu ngữ cảnh để phân biệt.", status: "available", needsImage: false, icon: "reading" },
  { id: "daily-review", title: "Daily Review", titleJa: "デイリー復習", description: "Ôn câu sai, từ chưa thuộc, từ đến hạn và từ hay sai.", status: "available", needsImage: false, icon: "calendar" },
  { id: "speed-challenge", title: "Speed Challenge", titleJa: "スピードチャレンジ", description: "60 giây, có combo và tăng độ khó. Có thể tắt đồng hồ.", status: "available", needsImage: false, icon: "zap" },
  { id: "image-matching", title: "Image Matching", titleJa: "絵とことば", description: "Ghép hình minh họa với từ tiếng Nhật.", status: "available", needsImage: true, icon: "puzzle" },
  { id: "memory-match", title: "Memory Match", titleJa: "神経衰弱", description: "Lật thẻ tìm cặp: hình–nghĩa, Kanji–cách đọc, từ–bản dịch.", status: "available", needsImage: false, icon: "grid" },
  { id: "word-builder", title: "Word Builder", titleJa: "ことば作り", description: "Cho nghĩa tiếng Việt, ghép các mảnh kana thành cách đọc của từ. Có mảnh nhiễu và gợi ý.", status: "available", needsImage: false, icon: "blocks" },
];

export const defaultGamesSettings: GamesSettings = {
  enabledModes: gameModeDefs.filter((g) => g.status === "available").map((g) => g.id),
  levels: ["N5", "N4", "N3", "N2", "N1"],
  topics: [],
  questionsPerRound: 10,
  requireImageForPictureGames: true,
};
