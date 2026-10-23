"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase trong trình duyệt: chỉ dùng khóa anon công khai. KHÔNG BAO GIỜ đưa service_role vào đây. */
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
