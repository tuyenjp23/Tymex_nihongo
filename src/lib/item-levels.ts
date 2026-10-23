import { LEVELS, type Level } from "./types";
import { itemKey, type ItemType } from "./progress/model";

/** Bảng "mã mục → cấp" dạng gọn: { vocabulary: { N5: [id, …], … }, kanji: …, grammar: … } */
export type ItemLevelGroups = Record<ItemType, Record<Level, string[]>>;

const empty = (): Record<Level, string[]> => ({ N5: [], N4: [], N3: [], N2: [], N1: [] });

export function buildItemLevelGroups(src: Record<ItemType, { id: string; level: string }[]>): ItemLevelGroups {
  const out: ItemLevelGroups = { vocabulary: empty(), kanji: empty(), grammar: empty() };
  for (const type of Object.keys(out) as ItemType[]) {
    for (const r of src[type] ?? []) if ((LEVELS as readonly string[]).includes(r.level)) out[type][r.level as Level].push(r.id);
  }
  return out;
}

export function countByLevel(g: ItemLevelGroups): Record<Level, number> {
  const t = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 } as Record<Level, number>;
  for (const type of Object.keys(g) as ItemType[]) for (const l of LEVELS) t[l] += g[type][l].length;
  return t;
}

/** Trải bảng gọn thành Map khóa tiến độ → cấp (chạy ở trình duyệt, đúng một lần). */
export function flattenItemLevels(g: ItemLevelGroups): Map<string, Level> {
  const m = new Map<string, Level>();
  for (const type of Object.keys(g) as ItemType[]) for (const l of LEVELS) for (const id of g[type][l] ?? []) m.set(itemKey(type, id), l);
  return m;
}
