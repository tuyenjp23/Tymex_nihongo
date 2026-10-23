import { NextResponse, type NextRequest } from "next/server";
import { getDataMode } from "@/lib/store/mode";
import { updateSupabaseSession } from "@/lib/supabase/session";
import { ADMIN_COOKIE, getLocalAuthConfig, verifyAdminToken } from "@/lib/auth/local-session";

/**
 * proxy.ts (tên mới của middleware.ts trong Next 16). Chạy trước mỗi request:
 *  1) Supabase: làm mới phiên đăng nhập.
 *  2) Local: chặn /admin* và /api/admin* khi chưa có cookie admin hợp lệ (trừ trang đăng nhập).
 * ĐÂY CHỈ LÀ LỚP CHẶN SỚM. Quyền thật được kiểm tra lại ở server (checkAdmin) trong mọi trang/action/API admin.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (getDataMode() === "supabase") return updateSupabaseSession(request);

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminArea && pathname !== "/admin/login") {
    const cfg = getLocalAuthConfig();
    const ok = cfg ? await verifyAdminToken(cfg.secret, request.cookies.get(ADMIN_COOKIE)?.value) : false;
    if (!ok) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Cần đăng nhập quản trị" }, { status: 401 });
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|images/|sw.js|manifest.webmanifest).*)"],
};
