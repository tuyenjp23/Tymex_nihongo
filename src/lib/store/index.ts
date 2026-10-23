import "server-only";
import path from "node:path";
import { getDataMode } from "./mode";
import { FileStore } from "./file-store";
import { SupabaseStore } from "./supabase-store";
import type { ContentStore } from "./types";
import { createSupabaseServerClient } from "../supabase/server";

declare global {
  var __ncFileStore: FileStore | undefined;
}

/** Thư mục chứa dữ liệu Admin ở chế độ local (JSON + ảnh tải lên). */
export function getDataDir(): string {
  return process.env.NC_DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

function fileStore(): FileStore {
  // Giữ một instance duy nhất qua các lần hot-reload ở chế độ dev.
  globalThis.__ncFileStore ??= new FileStore(
    getDataDir(),
    process.env.NC_SEED_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "content", "seed"),
  );
  return globalThis.__ncFileStore;
}

/** Lấy store theo chế độ hiện tại. Với Supabase, store gắn với phiên người dùng của request đang xử lý. */
export async function getStore(): Promise<ContentStore> {
  if (getDataMode() === "supabase") return new SupabaseStore(await createSupabaseServerClient());
  return fileStore();
}

export type { ContentStore } from "./types";
export { StoreError } from "./types";
