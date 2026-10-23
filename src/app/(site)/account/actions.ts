"use server";

import { redirect } from "next/navigation";
import { getDataMode } from "@/lib/store/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkLoginRate, recordLoginFailure, clearLoginFailures } from "@/lib/auth/local-session";
import { clientKey } from "@/lib/admin/server";

export interface AuthState {
  error?: string;
  info?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(_p: AuthState, form: FormData): Promise<AuthState> {
  if (getDataMode() !== "supabase") return { error: "Đăng nhập chỉ có ở chế độ Supabase." };
  const key = `learner:${await clientKey()}`;
  const rate = checkLoginRate(key);
  if (!rate.allowed) return { error: `Thử sai quá nhiều lần. Thử lại sau ${Math.ceil(rate.retryAfterSec / 60)} phút.` };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(email) || !password) return { error: "Nhập email hợp lệ và mật khẩu." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    recordLoginFailure(key);
    return { error: "Email hoặc mật khẩu không đúng." };
  }
  clearLoginFailures(key);
  redirect("/account");
}

export async function signUpAction(_p: AuthState, form: FormData): Promise<AuthState> {
  if (getDataMode() !== "supabase") return { error: "Đăng ký chỉ có ở chế độ Supabase." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(email)) return { error: "Email không hợp lệ." };
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: "Không đăng ký được: " + error.message };
  // Nếu dự án bật xác nhận email thì chưa có phiên → báo người dùng kiểm tra email
  if (!data.session) return { info: "Đã gửi email xác nhận (nếu dự án Supabase bật xác nhận email). Xác nhận xong hãy đăng nhập." };
  redirect("/account");
}

export async function signOutAction(): Promise<void> {
  if (getDataMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/account");
}
