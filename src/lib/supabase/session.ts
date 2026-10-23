import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "../store/mode";

/** Làm mới phiên đăng nhập Supabase trong proxy.ts (Next 16) để cookie luôn còn hạn. */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response;
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // getUser() xác thực với máy chủ Auth (an toàn hơn getSession()).
  await supabase.auth.getUser();
  return response;
}
