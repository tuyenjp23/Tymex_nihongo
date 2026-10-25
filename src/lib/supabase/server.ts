import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "../store/mode";

const NOT_CONFIGURED = "Supabase chưa được cấu hình (thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).";

/**
 * Client Supabase CÔNG KHAI phía server: chỉ khóa anon, KHÔNG đọc/ghi cookie phiên.
 * Dành cho đường ĐỌC dữ liệu hiển thị công khai (trang học viên qua lib/content + lib/settings).
 *
 * Vì không gọi `cookies()` của next/headers nên không ép route thành dynamic → ISR/CDN cache chạy được.
 * Bảo mật dựa vào RLS với vai "anon": chỉ đọc được nội dung công khai (policy `*_read_public`:
 * không nháp, không ẩn) và bảng app_settings (policy đọc `using (true)`) — đúng tập dữ liệu được phép hiển thị.
 * Mọi đường GHI và khu admin PHẢI dùng createSupabaseServerClient() (theo phiên) như cũ.
 */
export function createSupabasePublicClient(): SupabaseClient {
  const env = getSupabaseEnv();
  if (!env) throw new Error(NOT_CONFIGURED);
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Client Supabase phía server, chạy với PHIÊN CỦA NGƯỜI DÙNG (không dùng service-role) → Row Level Security luôn được áp dụng. */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error(NOT_CONFIGURED);
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Gọi từ Server Component (không ghi được cookie) → bỏ qua; proxy.ts sẽ làm mới phiên.
        }
      },
    },
  });
}
