/**
 * Phiên admin cho chế độ LOCAL (chưa dùng Supabase): cookie ký HMAC-SHA256 bằng SESSION_SECRET.
 * Dùng Web Crypto nên chạy được cả trong proxy.ts lẫn Server Actions.
 * Đây là cơ chế đơn giản cho một máy cá nhân; production nên dùng Supabase Auth.
 */
export const ADMIN_COOKIE = "nc_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function getLocalAuthConfig(): { password: string; secret: string } | null {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  if (!password || secret.length < 32) return null;
  return { password, secret };
}

export async function signAdminToken(secret: string, nowMs = Date.now(), ttlSeconds = ADMIN_SESSION_SECONDS): Promise<string> {
  const exp = nowMs + ttlSeconds * 1000;
  const payload = `admin.${exp}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${toHex(sig)}`;
}

export async function verifyAdminToken(secret: string, token: string | undefined, nowMs = Date.now()): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < nowMs) return false;
  if (!/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const sigBytes = new Uint8Array(parts[2].match(/../g)!.map((h) => parseInt(h, 16)));
  // subtle.verify so sánh thời gian hằng định
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sigBytes, enc.encode(`admin.${exp}`));
}

/** So sánh mật khẩu theo thời gian hằng định (băm SHA-256 hai phía rồi so từng byte). */
export async function passwordsMatch(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* Giới hạn số lần đăng nhập sai (trong bộ nhớ tiến trình): 6 lần / 15 phút / địa chỉ */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;

export function checkLoginRate(key: string, nowMs = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const e = attempts.get(key);
  if (!e || e.resetAt < nowMs) return { allowed: true, retryAfterSec: 0 };
  return e.count >= MAX_ATTEMPTS ? { allowed: false, retryAfterSec: Math.ceil((e.resetAt - nowMs) / 1000) } : { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(key: string, nowMs = Date.now()): void {
  const e = attempts.get(key);
  if (!e || e.resetAt < nowMs) attempts.set(key, { count: 1, resetAt: nowMs + WINDOW_MS });
  else e.count++;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
