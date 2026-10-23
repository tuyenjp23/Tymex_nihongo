import { shuffle, type Rng } from "../rng";
import { normalizeForSearch } from "../kana";
import type { GameItem } from "./types";

/** Hai chuỗi nghĩa có thể bị coi là "gần như cùng nghĩa" (bằng nhau hoặc chứa nhau) → không dùng làm đáp án nhiễu. */
export function confusableText(a: string, b: string): boolean {
  const x = normalizeForSearch(a);
  const y = normalizeForSearch(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const split = (s: string) => s.split(/[;,/、]/).map((t) => t.trim()).filter(Boolean);
  const xs = split(x);
  const ys = split(y);
  return xs.some((p) => ys.includes(p)) || x.includes(y) || y.includes(x);
}

function similarityScore(target: GameItem, other: GameItem): number {
  let s = 0;
  if (other.topic === target.topic) s += 3;
  if (other.level === target.level) s += 1;
  if (other.pos && other.pos === target.pos) s += 2;
  if (other.type === target.type) s += 1;
  const dl = Math.abs(other.text.length - target.text.length);
  s += dl === 0 ? 1 : 0;
  return s;
}

/**
 * Chọn `n` mục làm đáp án nhiễu cho `target`.
 *  tier 1: ngẫu nhiên (dễ); tier 2: ưu tiên mục tương tự; tier 3: chọn các mục tương tự nhất (khó).
 *  `valueOf` lấy giá trị hiển thị của mục (nghĩa / cách đọc / từ) để loại các giá trị trùng hoặc quá giống đáp án đúng.
 */
export function pickDistractors(
  target: GameItem,
  pool: GameItem[],
  n: number,
  rng: Rng,
  tier: 1 | 2 | 3,
  valueOf: (i: GameItem) => string,
  conflicts: (a: string, b: string) => boolean = confusableText,
): GameItem[] {
  const correctValue = valueOf(target);
  const candidates = pool.filter((p) => p.key !== target.key && valueOf(p) && !conflicts(valueOf(p), correctValue));
  let ordered: GameItem[];
  if (tier === 1) ordered = shuffle(candidates, rng);
  else {
    const scored = shuffle(candidates, rng).map((c) => ({ c, s: similarityScore(target, c) }));
    scored.sort((a, b) => b.s - a.s);
    ordered = tier === 2 ? scored.slice(0, Math.max(n * 3, 8)).map((x) => x.c) : scored.map((x) => x.c);
    if (tier === 2) ordered = shuffle(ordered, rng);
  }
  const out: GameItem[] = [];
  for (const c of ordered) {
    if (out.length >= n) break;
    if (out.some((o) => conflicts(valueOf(o), valueOf(c)))) continue; // không để hai đáp án nhiễu giống nhau
    out.push(c);
  }
  return out;
}
