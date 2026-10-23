import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "../store/mode";

/** Client Supabase phía server, chạy với PHIÊN CỦA NGƯỜI DÙNG (không dùng service-role) → Row Level Security luôn được áp dụng. */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase chưa được cấu hình (thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
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
