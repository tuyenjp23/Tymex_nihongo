import { siteConfig } from "@/config/site";

/** Ngày "hôm nay" dạng YYYY-MM-DD theo múi giờ cấu hình (mặc định Asia/Tokyo). */
export function todayString(now: Date = new Date(), timeZone: string = siteConfig.timeZone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const d = new Date(toUtcMs(date) + n * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Số ngày từ a đến b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86400000);
}

export function formatDateVi(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** Ngày giờ theo múi giờ của site, ví dụ "22/10/2026 14:05". */
export function formatDateTimeVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", { timeZone: siteConfig.timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
