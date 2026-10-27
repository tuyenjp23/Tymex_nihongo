/**
 * Dữ liệu TỐI THIỂU cho "góc tài khoản" trên thanh điều hướng (avatar/tên ở góc trái trên).
 * File này THUẦN (không import server-only, không đọc cookie/env) để:
 *  - API /api/me dùng các hàm shaping ở đây rồi trả JSON cho client;
 *  - component client import type trực tiếp;
 *  - unit test kiểm được logic mà không cần Supabase/cookie.
 * Tuyệt đối không mở rộng thêm trường nhạy cảm (id nội bộ, metadata thô…) — UI chỉ cần 5 trường này.
 */
export interface MeInfo {
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export const ANONYMOUS_ME: MeInfo = { signedIn: false, email: null, displayName: null, avatarUrl: null, isAdmin: false };

function clean(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export interface MeShapeInput {
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** role trong bảng profiles (chế độ Supabase). */
  profileRole?: string | null;
  /** Phiên admin local (cookie HMAC) hợp lệ — chỉ áp dụng khi chưa cấu hình Supabase, khớp checkAdmin(). */
  localAdmin?: boolean;
}

/**
 * Chuẩn hoá dữ liệu thô thành MeInfo:
 *  - signedIn suy từ việc có email người dùng Supabase hay không (chế độ local không có tài khoản học viên → luôn false).
 *  - displayName trống thì lấy phần trước @ của email (giống cách trigger handle_new_user đặt tên mặc định).
 *  - isAdmin: role "admin" trong profiles, hoặc phiên admin local hợp lệ.
 */
export function shapeMe(input: MeShapeInput): MeInfo {
  const email = clean(input.email);
  return {
    signedIn: email !== null,
    email,
    displayName: clean(input.displayName) ?? (email ? email.split("@")[0] : null),
    avatarUrl: clean(input.avatarUrl),
    isAdmin: input.localAdmin === true || input.profileRole === "admin",
  };
}

/** Chữ cái đầu để vẽ avatar dự phòng (vòng tròn gradient) khi không có ảnh. */
export function meInitial(me: Pick<MeInfo, "displayName" | "email">): string {
  const s = clean(me.displayName) ?? clean(me.email);
  return s ? s.charAt(0).toUpperCase() : "?";
}
