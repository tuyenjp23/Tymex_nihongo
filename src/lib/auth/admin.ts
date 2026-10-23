import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataMode } from "../store/mode";
import { createSupabaseServerClient } from "../supabase/server";
import { ADMIN_COOKIE, getLocalAuthConfig, verifyAdminToken } from "./local-session";
import type { Actor } from "../store/types";

export type AdminCheck =
  | { ok: true; actor: Actor }
  | { ok: false; reason: "not_configured" | "not_logged_in" | "not_admin" };

/**
 * Kiểm tra quyền admin Ở PHÍA SERVER. Mọi trang /admin, Server Action và API admin PHẢI gọi hàm này —
 * không bao giờ chỉ dựa vào việc ẩn nút trên giao diện. (Ở chế độ Supabase, RLS trong database là lớp bảo vệ thứ hai.)
 */
export async function checkAdmin(): Promise<AdminCheck> {
  if (getDataMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, reason: "not_logged_in" };
    const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "admin") return { ok: false, reason: "not_admin" };
    return { ok: true, actor: { id: data.user.id, label: profile.display_name || data.user.email || data.user.id } };
  }
  const cfg = getLocalAuthConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  const store = await cookies();
  const valid = await verifyAdminToken(cfg.secret, store.get(ADMIN_COOKIE)?.value);
  return valid ? { ok: true, actor: { id: "local-admin", label: "Admin (local)" } } : { ok: false, reason: "not_logged_in" };
}

/** Dùng trong Server Component/Action của khu Admin: chưa đăng nhập → chuyển tới trang đăng nhập. */
export async function requireAdmin(): Promise<Actor> {
  const r = await checkAdmin();
  if (r.ok) return r.actor;
  redirect(`/admin/login${r.reason === "not_admin" ? "?error=not_admin" : ""}`);
}

/** Dùng trong Route Handler: trả về Response 401/403 thay vì redirect. */
export async function requireAdminApi(): Promise<{ actor: Actor } | { response: Response }> {
  const r = await checkAdmin();
  if (r.ok) return { actor: r.actor };
  const status = r.reason === "not_admin" ? 403 : 401;
  return { response: Response.json({ error: "Cần đăng nhập quản trị", reason: r.reason }, { status }) };
}
