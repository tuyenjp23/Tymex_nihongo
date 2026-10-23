import { shuffle, type Rng } from "../rng";
import type { BuildOptions, GameItem } from "./types";
import { filterPool } from "./builders";

/**
 * WORD BUILDER — ghép các mảnh kana thành CÁCH ĐỌC của một từ khi biết nghĩa tiếng Việt.
 * Toàn bộ logic ở đây là hàm thuần (kiểm thử được); màn chơi nằm ở src/components/games/word-builder-game.tsx.
 * Chỉ dùng từ vựng THẬT trong dữ liệu; không bịa từ. Từ có cách đọc không phải kana thuần bị bỏ qua.
 */

const SMALL = new Set([..."ゃゅょゎぁぃぅぇぉャュョヮァィゥェォ"]);
const KANA_ONLY = /^[ぁ-ゖァ-ヺー]+$/;

/** Tách chuỗi kana thành các "mảnh": chữ ghép (きゃ, ティ) là một mảnh; っ/ッ và ー là mảnh riêng. */
export function tokenizeKana(s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    if (SMALL.has(ch) && out.length > 0) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export const WB_MIN_TOKENS = 2;
export const WB_MAX_TOKENS = 6;

export interface WbTile {
  id: string;
  text: string;
  /** Mảnh gây nhiễu (không thuộc đáp án) */
  decoy: boolean;
}

export interface WbPuzzle {
  id: string;
  itemKey: string;
  level: GameItem["level"];
  topic: string;
  /** Từ viết bình thường (có thể có Kanji) — chỉ hiện SAU khi giải xong */
  word: string;
  meaning: string;
  pos?: string;
  reading: string;
  /** Đáp án đúng, theo thứ tự */
  answer: string[];
  tiles: WbTile[];
  example?: { ja: string; vi: string };
}

/** Mục dùng được: từ vựng có cách đọc là kana thuần, 2–6 mảnh. */
export function wordBuilderEligible(items: GameItem[]): GameItem[] {
  return items.filter((i) => {
    if (i.type !== "vocabulary" || !KANA_ONLY.test(i.reading)) return false;
    const n = tokenizeKana(i.reading).length;
    return n >= WB_MIN_TOKENS && n <= WB_MAX_TOKENS;
  });
}

const DECOY_FALLBACK_HIRA = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわを"];
const DECOY_FALLBACK_KATA = [..."アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲ"];

const isKata = (s: string) => /[ァ-ヺ]/.test(s);

/** Mảnh nhiễu cùng bảng chữ với đáp án, KHÔNG trùng bất kỳ mảnh nào của đáp án (nên không thể làm đúng bằng mảnh nhiễu). */
function pickDecoys(answer: string[], others: string[][], n: number, rng: Rng): string[] {
  const used = new Set(answer);
  const kata = isKata(answer.join(""));
  const pool = new Set<string>();
  for (const toks of others) for (const t of toks) if (!used.has(t) && isKata(t) === kata && t !== "っ" && t !== "ッ" && t !== "ー") pool.add(t);
  const fallback = (kata ? DECOY_FALLBACK_KATA : DECOY_FALLBACK_HIRA).filter((t) => !used.has(t));
  const picked: string[] = [];
  for (const t of shuffle([...pool], rng)) {
    if (picked.length >= n) break;
    picked.push(t);
  }
  for (const t of shuffle(fallback, rng)) {
    if (picked.length >= n) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return picked;
}

export function buildWordBuilder(items: GameItem[], o: Pick<BuildOptions, "count" | "levels" | "topics" | "targetKeys">, rng: Rng): WbPuzzle[] {
  const pool = wordBuilderEligible(filterPool(items, o)).filter((i) => !o.targetKeys || o.targetKeys.includes(i.key));
  const allTokens = wordBuilderEligible(items).map((i) => tokenizeKana(i.reading));
  const out: WbPuzzle[] = [];
  for (const t of shuffle(pool, rng)) {
    if (out.length >= o.count) break;
    const answer = tokenizeKana(t.reading);
    // 1 mảnh nhiễu cho từ ngắn (≤3 mảnh), 2 mảnh cho từ dài hơn
    const decoys = pickDecoys(answer, allTokens, answer.length <= 3 ? 1 : 2, rng);
    const tiles: WbTile[] = shuffle(
      [...answer.map((text) => ({ text, decoy: false })), ...decoys.map((text) => ({ text, decoy: true }))],
      rng,
    ).map((x, i) => ({ id: `t${i}`, ...x }));
    out.push({
      id: `word-builder-${out.length}`,
      itemKey: t.key,
      level: t.level,
      topic: t.topic,
      word: t.text,
      meaning: t.meaning,
      pos: t.pos,
      reading: t.reading,
      answer,
      tiles,
      example: t.example,
    });
  }
  return out;
}

/** Đúng khi dãy mảnh đã đặt trùng đáp án (so theo chữ — hai mảnh cùng chữ dùng thay nhau được). */
export function checkArrangement(p: WbPuzzle, placedTileIds: string[]): boolean {
  if (placedTileIds.length !== p.answer.length) return false;
  const byId = new Map(p.tiles.map((t) => [t.id, t.text]));
  return placedTileIds.every((id, i) => byId.get(id) === p.answer[i]);
}

/**
 * Gợi ý: giữ lại phần ĐÚNG ở đầu dãy đã đặt, bỏ phần còn lại, rồi đặt thêm đúng một mảnh kế tiếp.
 * Trả về dãy mảnh mới (id), hoặc null nếu đã đủ.
 */
export function applyHint(p: WbPuzzle, placedTileIds: string[]): string[] | null {
  if (placedTileIds.length >= p.answer.length && checkArrangement(p, placedTileIds)) return null;
  const byId = new Map(p.tiles.map((t) => [t.id, t.text]));
  const keep: string[] = [];
  for (let i = 0; i < placedTileIds.length; i++) {
    if (byId.get(placedTileIds[i]) === p.answer[i]) keep.push(placedTileIds[i]);
    else break;
  }
  const want = p.answer[keep.length];
  const next = p.tiles.find((t) => t.text === want && !keep.includes(t.id));
  return next ? [...keep, next.id] : keep;
}

export interface WbResult {
  wrong: number;
  hints: number;
  revealed: boolean;
}

/** Điểm một từ: 10, trừ 3/lần kiểm tra sai và 2/lần gợi ý; xem đáp án = 0. */
export function wbScore(r: WbResult): number {
  if (r.revealed) return 0;
  return Math.max(0, 10 - r.wrong * 3 - r.hints * 2);
}

/** Chất lượng SM-2 (0–5): sạch = 4, 1 lỗi/gợi ý = 3, nhiều hơn = 2, xem đáp án = 1. Gợi ý luôn làm giảm chất lượng. */
export function wbQuality(r: WbResult): number {
  if (r.revealed) return 1;
  const n = r.wrong + r.hints;
  return n === 0 ? 4 : n === 1 ? 3 : 2;
}
