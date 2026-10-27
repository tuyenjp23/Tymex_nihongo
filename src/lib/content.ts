import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublicStore } from "./store";
import { getContentSettings, isModuleEnabled } from "./settings";
import type { CollectionKey } from "./types";
import type { CollectionTypes, Source, ImageAsset } from "./schemas";

export function isVisibleToLearners(r: { hidden?: boolean; status?: string }, showUnverified: boolean): boolean {
  if (r.hidden) return false;
  if (r.status === "draft") return false;
  if (!showUnverified && r.status !== "verified" && r.status !== "published") return false;
  return true;
}

// Đọc qua store CÔNG KHAI (không cookie phiên) để trang học viên giữ được ISR/CDN cache.
// RLS đã chặn sẵn bản nháp/bản ẩn với vai anon; bộ lọc isVisibleToLearners bên dưới áp thêm
// quy tắc hiển thị trong ứng dụng (vd tắt nội dung chưa xác minh) như trước.
const listCached = cache(async (c: CollectionKey) => (await getPublicStore()).list(c));

/**
 * Nội dung người học được phép thấy:
 *  - luôn ẩn bản nháp và mục bị "ẩn";
 *  - nếu admin tắt "hiển thị nội dung chưa xác minh" thì chỉ còn mục Đã xác minh/Đã xuất bản.
 * (Nguồn học liệu và hình minh họa luôn hiển thị trừ khi bị ẩn, để truy xuất nguồn.)
 */
export async function getVisible<K extends CollectionKey>(c: K): Promise<CollectionTypes[K][]> {
  const [all, settings] = await Promise.all([listCached(c), getContentSettings()]);
  const list = all as CollectionTypes[K][];
  if (c === "sources" || c === "images") return list.filter((r) => !(r as unknown as { hidden?: boolean }).hidden);
  return list.filter((r) => isVisibleToLearners(r as unknown as { hidden?: boolean; status?: string }, settings.showUnverified));
}

export async function getVisibleById<K extends CollectionKey>(c: K, id: string): Promise<CollectionTypes[K] | null> {
  return (await getVisible(c)).find((r) => r.id === id) ?? null;
}

export async function getSourcesMap(): Promise<Map<string, Source>> {
  const list = await listCached("sources");
  return new Map((list as Source[]).map((s) => [s.id, s]));
}

export async function getImagesMap(): Promise<Map<string, ImageAsset>> {
  const list = await getVisible("images");
  return new Map(list.map((i) => [i.id, i]));
}

/** Gọi đầu mỗi trang module: nếu admin đã tắt module → 404. */
export async function ensureModule(navId: string): Promise<void> {
  if (!(await isModuleEnabled(navId))) notFound();
}
