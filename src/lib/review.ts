import { isDue, newSrsState, sm2, FLASHCARD_QUALITY } from "./srs";
import { shuffle, type Rng } from "./rng";
import type { Progress, ItemType } from "./progress/model";
import { daysBetween } from "./dates";
import type { Level } from "./types";

export interface ReviewItem {
  key: string;
  type: ItemType;
  level: Level;
  /** Mặt trước tiếng Nhật (có thể chứa chú âm) */
  front: string;
  reading: string;
  back: string;
  detail?: string;
  imageUrl?: string;
  imageAlt?: string;
  href: string;
}

export interface QueueOptions {
  level?: Level | "";
  types?: ItemType[];
  /** Số mục mới tối đa mỗi phiên */
  newLimit: number;
  /** Số mục đến hạn tối đa mỗi phiên */
  maxDue: number;
  rng: Rng;
}

export interface QueueResult {
  queue: ReviewItem[];
  dueTotal: number;
  dueUsed: number;
  newUsed: number;
}

const LEVEL_RANK: Record<Level, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

/**
 * Hàng đợi ôn tập:
 *  1) mục ĐẾN HẠN (SM-2) — quá hạn lâu nhất trước;
 *  2) mục MỚI: ưu tiên mục đã xem nhưng chưa ôn lần nào, sau đó mục chưa xem theo thứ tự cấp N5→N1.
 * Các mục "mới" được xáo nhẹ để không học theo thứ tự cố định nhàm chán.
 */
export function buildReviewQueue(items: ReviewItem[], p: Progress, today: string, opts: QueueOptions): QueueResult {
  const pool = items.filter((i) => (!opts.level || i.level === opts.level) && (!opts.types || opts.types.includes(i.type)));
  const due = pool
    .filter((i) => isDue(p.srs[i.key], today))
    .sort((a, b) => daysBetween(p.srs[b.key].due, today) - daysBetween(p.srs[a.key].due, today));
  const fresh = pool.filter((i) => !p.srs[i.key]?.last_reviewed);
  const seenFresh = shuffle(fresh.filter((i) => p.seen[i.key]), opts.rng);
  const unseenFresh = fresh.filter((i) => !p.seen[i.key]).sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  const dueUsed = due.slice(0, opts.maxDue);
  const newItems = [...seenFresh, ...unseenFresh].slice(0, Math.max(0, opts.newLimit));
  return { queue: [...dueUsed, ...newItems], dueTotal: due.length, dueUsed: dueUsed.length, newUsed: newItems.length };
}

export function previewIntervals(state: Progress["srs"][string] | undefined, today: string) {
  const base = state ?? newSrsState(today);
  const days = (q: number) => daysBetween(today, sm2(base, q, today).due);
  return { again: days(FLASHCARD_QUALITY.again), hard: days(FLASHCARD_QUALITY.hard), good: days(FLASHCARD_QUALITY.good), easy: days(FLASHCARD_QUALITY.easy) };
}

export function formatInterval(days: number): string {
  if (days <= 1) return "1 ngày";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(days / 365).toFixed(1)} năm`;
}
