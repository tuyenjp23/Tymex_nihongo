import { matchesQuery } from "./search";
import { LEVELS } from "./types";

/** Một dòng trong danh sách có tìm/lọc/phân trang phía server. */
export interface ListableRow {
  level: string;
  group?: string;
  /** Chuỗi tìm kiếm đã chuẩn hóa (buildSearchIndex) */
  index: string;
}

export interface ListQuery {
  q: string;
  level: string;
  group: string;
  page: number;
}

export const LIST_PAGE_SIZE = 48;
const MAX_Q = 100;

type Raw = string | string[] | undefined;
const one = (v: Raw): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/**
 * Đọc tham số URL (q, level, group, page) một cách an toàn: cắt độ dài, bỏ giá trị lạ.
 * `groups` (nếu có) là danh sách nhóm hợp lệ; nhóm lạ bị bỏ qua thay vì làm trang trống.
 */
export function parseListQuery(sp: { q?: Raw; level?: Raw; group?: Raw; page?: Raw }, groups?: string[]): ListQuery {
  const q = one(sp.q).slice(0, MAX_Q).trim();
  const lv = one(sp.level);
  const level = (LEVELS as readonly string[]).includes(lv) ? lv : "";
  const g = one(sp.group);
  const group = groups ? (groups.includes(g) ? g : "") : "";
  const n = Number.parseInt(one(sp.page), 10);
  const page = Number.isFinite(n) && n >= 1 ? Math.min(n, 100000) : 1;
  return { q, level, group, page };
}

export function filterRows<T extends ListableRow>(rows: T[], query: Pick<ListQuery, "q" | "level" | "group">): T[] {
  const { q, level, group } = query;
  if (!q && !level && !group) return rows;
  return rows.filter((r) => (!level || r.level === level) && (!group || r.group === group) && matchesQuery(r.index, q));
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
  from: number;
  to: number;
}

/** Cắt một trang. Trang vượt quá số trang → kẹp về trang cuối (không bao giờ trả trang trống nếu còn dữ liệu). */
export function paginate<T>(rows: T[], page: number, size = LIST_PAGE_SIZE): PageResult<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  const items = rows.slice(start, start + size);
  return { items, page: p, pages, total, from: total === 0 ? 0 : start + 1, to: start + items.length };
}

/** Dựng query string giữ nguyên bộ lọc, đổi trang. Giá trị rỗng/mặc định bị bỏ để URL gọn. */
export function listHref(base: string, query: Partial<ListQuery>, over: Partial<ListQuery> = {}): string {
  const m = { ...query, ...over };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.level) p.set("level", m.level);
  if (m.group) p.set("group", m.group);
  if (m.page && m.page > 1) p.set("page", String(m.page));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** Danh sách số trang rút gọn quanh trang hiện tại: 1 … 4 5 [6] 7 8 … 40 (null = dấu "…"). */
export function pageWindow(page: number, pages: number, radius = 2): (number | null)[] {
  const out: (number | null)[] = [];
  let last = 0;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= radius) {
      if (i - last > 1) out.push(null);
      out.push(i);
      last = i;
    }
  }
  return out;
}
