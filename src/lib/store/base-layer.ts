import fs from "node:fs/promises";
import path from "node:path";
import type { CollectionKey } from "../types";
import type { CollectionTypes } from "../schemas";

/**
 * "Lớp nhập sẵn": các bản ghi nhập từ bộ dữ liệu mở (JMdict, KANJIDIC2, Tatoeba…) được xuất ra file JSON tĩnh trong content/imported
 * và đóng gói cùng mã nguồn. Lớp này CHỈ ĐỌC, nằm DƯỚI dữ liệu trong kho (FileStore/Supabase): bản ghi cùng ID trong kho luôn thắng
 * (đó là cách Admin "sửa" một bản ghi nhập sẵn). Nhờ vậy site công khai không phải đọc hàng chục nghìn dòng từ database ở mỗi lượt xem.
 */
export interface BaseLayer {
  list<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]>;
  get<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null>;
}

interface Loaded {
  mtimeMs: number;
  rows: { id: string }[];
  byId: Map<string, { id: string }>;
}

const cache = new Map<string, Loaded>();

async function load(file: string): Promise<Loaded | null> {
  try {
    const stat = await fs.stat(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === stat.mtimeMs) return hit;
    const parsed = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
    if (!Array.isArray(parsed)) throw new Error("không phải mảng JSON");
    const rows = parsed as { id: string }[];
    const loaded: Loaded = { mtimeMs: stat.mtimeMs, rows, byId: new Map(rows.map((r) => [r.id, r])) };
    cache.set(file, loaded);
    return loaded;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.error(`[BaseLayer] không đọc được ${file}, bỏ qua lớp nhập sẵn:`, e);
    return null;
  }
}

export function fileBaseLayer(dir: string): BaseLayer {
  const file = (c: CollectionKey) => path.join(dir, `${c}.json`);
  return {
    async list(c) {
      return ((await load(file(c)))?.rows ?? []) as CollectionTypes[typeof c][];
    },
    async get(c, id) {
      return ((await load(file(c)))?.byId.get(id) ?? null) as CollectionTypes[typeof c] | null;
    },
  };
}
