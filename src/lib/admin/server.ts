import "server-only";
import { headers } from "next/headers";
import { COLLECTION_KEYS, type CollectionKey } from "../types";
import { recordTitle, type Source } from "../schemas";
import type { ContentStore, Actor } from "../store/types";
import { checkAdmin } from "../auth/admin";
import type { IdSets, ValidationContext } from "./validate";

/** Nạp sổ nguồn + tập ID của mọi collection để kiểm tra nguồn gốc & liên kết. */
export async function loadValidationContext(store: ContentStore): Promise<ValidationContext> {
  const all = await Promise.all(COLLECTION_KEYS.map(async (c) => [c, await store.list(c)] as const));
  const ids: IdSets = {};
  for (const [c, list] of all) ids[c] = new Set((list as { id: string }[]).map((r) => r.id));
  const sources = new Map((all.find(([c]) => c === "sources")![1] as Source[]).map((s) => [s.id, s]));
  return { sources, ids };
}

export async function loadAllRecords(store: ContentStore): Promise<Partial<Record<CollectionKey, Record<string, unknown>[]>>> {
  const out: Partial<Record<CollectionKey, Record<string, unknown>[]>> = {};
  for (const c of COLLECTION_KEYS) out[c] = (await store.list(c)) as unknown as Record<string, unknown>[];
  return out;
}

/** Dùng trong Server Action: trả Actor nếu là admin, ngược lại null (UI hiển thị "phiên đã hết hạn"). */
export async function adminOrNull(): Promise<Actor | null> {
  const r = await checkAdmin();
  return r.ok ? r.actor : null;
}

/**
 * Chống CSRF cho Route Handler ghi dữ liệu: yêu cầu Origin (hoặc Referer) trùng host đang phục vụ.
 * Server Action của Next đã tự kiểm tra Origin; hàm này dành cho các API route tự viết.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false; // POST không có Origin/Referer → từ chối
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local").slice(0, 64);
}

export async function isHttps(): Promise<boolean> {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

/** Danh sách lựa chọn cho các ô chọn liên kết (nguồn, hình, bài đọc/nghe). */
export async function loadRefOptions(store: ContentStore) {
  const [sources, images, passages, questions] = await Promise.all([store.list("sources"), store.list("images"), store.list("passages"), store.list("questions")]);
  return {
    sources: sources.map((s) => ({ value: s.id, label: `${s.source_name} (${s.id})` })),
    images: images.map((i) => ({ value: i.id, label: `${i.alt_vi} (${i.id})` })),
    passages: passages.map((p) => ({ value: p.id, label: `${p.title} (${p.id})` })),
    questions: questions.map((q) => ({ value: q.id, label: `${q.level} · ${recordTitle("questions", q as unknown as Record<string, unknown>)} (${q.id})` })),
  };
}
