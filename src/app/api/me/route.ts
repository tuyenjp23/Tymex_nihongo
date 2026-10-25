import { cookies } from "next/headers";
import { getDataMode } from "@/lib/store/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, getLocalAuthConfig, verifyAdminToken } from "@/lib/auth/local-session";
import { ANONYMOUS_ME, shapeMe, type MeInfo } from "@/lib/auth/me";

// Thông tin phiên của CHÍNH người đang xem → luôn động, không cache.
export const dynamic = "force-dynamic";

/** Phiên admin local hợp lệ? (chỉ dùng ở chế độ chưa cấu hình Supabase — khớp checkAdmin trong lib/auth/admin.ts) */
async function hasLocalAdminSession(): Promise<boolean> {
  const cfg = getLocalAuthConfig();
  if (!cfg) return false;
  const store = await cookies();
  return verifyAdminToken(cfg.secret, store.get(ADMIN_COOKIE)?.value);
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

/**
 * GET /api/me — dữ liệu tối thiểu cho góc tài khoản (avatar/tên/menu) trên thanh điều hướng.
 * Chỉ trả 5 trường trong MeInfo; lỗi cấu hình/mạng → coi như chưa đăng nhập, KHÔNG trả 500
 * (góc tài khoản là thành phần trang trí điều hướng, không được làm hỏng trải nghiệm học).
 */
export async function GET() {
  let me: MeInfo = ANONYMOUS_ME;
  try {
    if (getDataMode() === "supabase") {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("id", data.user.id).maybeSingle();
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        me = shapeMe({
          email: data.user.email ?? null,
          displayName: profile?.display_name || metaString(meta, "display_name") || metaString(meta, "full_name") || metaString(meta, "name"),
          avatarUrl: metaString(meta, "avatar_url") || metaString(meta, "picture"),
          profileRole: profile?.role ?? null,
        });
      }
    } else {
      // Chế độ local chưa có tài khoản học viên: signedIn luôn false, chỉ có thể có phiên admin local.
      me = shapeMe({ localAdmin: await hasLocalAdminSession() });
    }
  } catch {
    me = ANONYMOUS_ME;
  }
  return Response.json(me, { headers: { "Cache-Control": "private, no-store" } });
}
