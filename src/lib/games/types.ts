import type { Level } from "../types";

/** Mục (từ vựng hoặc Kanji) ở dạng gọn, dùng chung cho mọi trò chơi. */
export interface GameItem {
  key: string; // itemKey("vocabulary" | "kanji", id)
  type: "vocabulary" | "kanji";
  level: Level;
  topic: string; // chủ đề từ vựng; Kanji dùng "kanji"
  text: string; // từ hoặc chữ Kanji
  reading: string; // cách đọc (kana)
  meaning: string; // nghĩa tiếng Việt
  /** Nghĩa tiếng Việt là bản dịch máy chưa kiểm tra → phần giải thích sau mỗi câu có ghi chú */
  unverifiedMeaning?: boolean;
  pos?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Từ cụ thể, hình hóa được. Từ trừu tượng = false và KHÔNG được dùng trong game dựa vào hình. */
  imageable: boolean;
  example?: { ja: string; vi: string };
  compounds?: { word: string; reading: string; meaning: string }[];
}

export type GamePrompt =
  | { kind: "image"; src: string; alt: string }
  | { kind: "text"; text: string; ja: boolean; sub?: string; context?: { ja: string; vi: string; target: string } };

export interface GameOption {
  id: string;
  text: string;
  ja: boolean;
}

export interface GameQuestion {
  id: string;
  mode: string;
  itemKey: string;
  level: Level;
  topic: string;
  /** Câu dẫn bằng tiếng Việt: "Đây là từ nào?" */
  ask: string;
  prompt: GamePrompt;
  options: GameOption[];
  correctId: string;
  /** Giải thích sau khi trả lời */
  explanation: string;
  /** 1 = dễ (đáp án nhiễu khác chủ đề), 3 = khó (đáp án nhiễu gần giống) */
  tier: 1 | 2 | 3;
}

export interface BuildOptions {
  count: number;
  levels?: Level[];
  topics?: string[];
  tier?: 1 | 2 | 3;
  requireImage?: boolean;
  /** Chỉ tạo câu hỏi cho các mục này (đáp án nhiễu vẫn lấy từ toàn bộ pool) */
  targetKeys?: string[];
}
