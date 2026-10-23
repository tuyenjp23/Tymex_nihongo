"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataMode } from "@/lib/store/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  checkLoginRate,
  clearLoginFailures,
  getLocalAuthConfig,
  passwordsMatch,
  recordLoginFailure,
  signAdminToken,
} from "@/lib/auth/local-session";
import { clientKey, isHttps } from "@/lib/admin/server";

export interface LoginState {
  error?: string;
}

/** Chỉ cho phép quay lại đường dẫn nội bộ trong /admin (chống open-redirect). */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\/admin(\/[A-Za-z0-9_\-/.?=&%]*)?$/.test(v) && !v.startsWith("//") ? v : "/admin";
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const key = await clientKey();
  const rate = checkLoginRate(key);
  if (!rate.allowed) return { error: `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(rate.retryAfterSec / 60)} phút.` };

  const next = safeNext(form.get("next"));
  const password = String(form.get("password") ?? "");

  if (getDataMode() === "supabase") {
    const email = String(form.get("email") ?? "").trim();
    if (!email || !password) return { error: "Nhập email và mật khẩu." };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      recordLoginFailure(key);
      return { error: "Email hoặc mật khẩu không đúng." };
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return { error: "Tài khoản này không có quyền quản trị." };
    }
    clearLoginFailures(key);
    redirect(next);
  }

  const cfg = getLocalAuthConfig();
  // Luôn chạy so sánh để thời gian phản hồi không tiết lộ việc đã cấu hình hay chưa
  const ok = await passwordsMatch(password, cfg?.password ?? "\u0000not-configured");
  if (!cfg) return { error: "Chưa cấu hình ADMIN_PASSWORD và SESSION_SECRET (≥ 32 ký tự). Chạy `npm run setup` rồi khởi động lại." };
  if (!ok) {
    recordLoginFailure(key);
    return { error: "Mật khẩu không đúng." };
  }
  clearLoginFailures(key);
  const store = await cookies();
  store.set(ADMIN_COOKIE, await signAdminToken(cfg.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: await isHttps(),
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  if (getDataMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    (await cookies()).delete(ADMIN_COOKIE);
  }
  redirect("/admin/login");
}
