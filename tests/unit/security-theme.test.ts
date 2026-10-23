import { beforeEach, describe, expect, it } from "vitest";
import { contrastRatio, contrastWarnings, readableOn, themeToCss } from "@/lib/theme";
import { defaultTheme } from "@/config/theme";
import { ThemeSettingsSchema, SafeUrlSchema } from "@/lib/settings-schemas";
import { mergeNavigation, mergeDashboard } from "@/lib/settings-merge";
import {
  ADMIN_SESSION_SECONDS,
  checkLoginRate,
  clearLoginFailures,
  passwordsMatch,
  recordLoginFailure,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/auth/local-session";
import { defaultNavigation } from "@/config/navigation";
import { dashboardSectionDefs } from "@/config/dashboard";
import { sniffImage } from "@/lib/admin/upload";
import { validateProgressPayload, MAX_PROGRESS_BYTES } from "@/lib/progress/sync";
import { emptyProgress } from "@/lib/progress/model";

describe("theme & độ tương phản", () => {
  it("tỉ lệ tương phản chuẩn WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(contrastRatio("#000000", "#ffffff"), 8);
  });
  it("chọn màu chữ dễ đọc nhất trên nền", () => {
    expect(readableOn("#000000")).toBe("#ffffff");
    expect(readableOn("#ffffff")).toBe("#111827");
    expect(readableOn("#3b5bdb")).toBe("#ffffff");
  });
  it("theme mặc định đạt tương phản ≥ 4.5:1 ở cả hai chế độ (không cảnh báo)", () => {
    expect(contrastWarnings(defaultTheme)).toEqual([]);
  });
  it("cảnh báo khi chữ gần cùng màu nền", () => {
    const bad = { ...defaultTheme, colors: { ...defaultTheme.colors, light: { ...defaultTheme.colors.light, foreground: "#f4f3ee" } } };
    const w = contrastWarnings(bad);
    expect(w.some((x) => x.mode === "light" && x.pair.startsWith("Chữ"))).toBe(true);
  });
  it("themeToCss sinh biến CSS cho sáng/tối và cỡ chữ", () => {
    const css = themeToCss(defaultTheme);
    expect(css).toContain("--primary:#202b50");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("--radius:14px");
    expect(css).toContain("font-size:16px");
  });
  it("không thể chèn CSS tùy ý: dữ liệu hỏng bị loại và dùng mặc định", () => {
    const evil = { ...defaultTheme, colors: { ...defaultTheme.colors, light: { ...defaultTheme.colors.light, primary: "red;}body{display:none" } } };
    const css = themeToCss(evil);
    expect(css).not.toContain("display:none");
    expect(css).toContain("--primary:#202b50");
    expect(themeToCss(null)).toContain("--primary:#202b50");
    expect(themeToCss("<script>")).not.toContain("<script>");
  });
  it("schema từ chối màu sai, số ngoài khoảng, tên rỗng", () => {
    const bad = (patch: object) => ThemeSettingsSchema.safeParse({ ...defaultTheme, ...patch }).success;
    expect(bad({})).toBe(true);
    expect(bad({ radius: 99 })).toBe(false);
    expect(bad({ baseFontSize: 8 })).toBe(false);
    expect(bad({ appName: "  " })).toBe(false);
    expect(bad({ density: "huge" })).toBe(false);
    expect(bad({ colors: { ...defaultTheme.colors, dark: { ...defaultTheme.colors.dark, accent: "#12" } } })).toBe(false);
  });
  it("URL logo/favicon: chỉ / hoặc http(s); chặn javascript:, data:, //host", () => {
    for (const ok of ["/images/logo.png", "https://example.com/a.png", "http://localhost/x.png"]) expect(SafeUrlSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "//evil.com/x.png", "ftp://x", "logo.png"]) expect(SafeUrlSchema.safeParse(bad).success, bad).toBe(false);
  });
});

describe("gộp cấu hình admin với mặc định", () => {
  it("menu: giữ thứ tự/tên/bật-tắt của admin, bỏ mục không tồn tại, thêm mục mới, dashboard luôn bật", () => {
    const nav = mergeNavigation({
      items: [
        { id: "kanji", label: "Hán tự", enabled: true },
        { id: "dashboard", label: "Home", enabled: false },
        { id: "ghost", label: "Ma", enabled: true },
        { id: "kanji", label: "Trùng", enabled: false },
        { id: "grammar", label: "Ngữ pháp", enabled: false },
      ],
    });
    expect(nav[0]).toMatchObject({ id: "kanji", label: "Hán tự", enabled: true });
    expect(nav.find((n) => n.id === "dashboard")?.enabled).toBe(true);
    expect(nav.find((n) => n.id === "ghost")).toBeUndefined();
    expect(nav.filter((n) => n.id === "kanji")).toHaveLength(1);
    expect(nav.find((n) => n.id === "grammar")?.enabled).toBe(false);
    expect(new Set(nav.map((n) => n.id))).toEqual(new Set(defaultNavigation.map((n) => n.id)));
  });
  it("menu/dashboard không có ghi đè → mặc định", () => {
    expect(mergeNavigation(null).every((n) => n.enabled)).toBe(true);
    expect(mergeDashboard(null).map((s) => s.id)).toEqual(dashboardSectionDefs.map((s) => s.id));
  });
  it("dashboard: bỏ khối lạ, giữ thứ tự, bổ sung khối mới", () => {
    const d = mergeDashboard({ sections: [{ id: "streak", enabled: false }, { id: "nope", enabled: true }] });
    expect(d[0]).toEqual({ id: "streak", enabled: false });
    expect(d.find((s) => s.id === "nope")).toBeUndefined();
    expect(d).toHaveLength(dashboardSectionDefs.length);
  });
});

describe("phiên admin local", () => {
  const secret = "s".repeat(40);
  const NOW = 1_800_000_000_000;
  it("token hợp lệ được chấp nhận", async () => {
    expect(await verifyAdminToken(secret, await signAdminToken(secret, NOW), NOW + 1000)).toBe(true);
  });
  it("hết hạn, sai khóa, bị sửa, sai định dạng đều bị từ chối", async () => {
    const t = await signAdminToken(secret, NOW);
    expect(await verifyAdminToken(secret, t, NOW + ADMIN_SESSION_SECONDS * 1000 + 1)).toBe(false);
    expect(await verifyAdminToken("x".repeat(40), t, NOW)).toBe(false);
    const [p, exp, sig] = t.split(".");
    expect(await verifyAdminToken(secret, `${p}.${Number(exp) + 100000}.${sig}`, NOW)).toBe(false);
    expect(await verifyAdminToken(secret, `${p}.${exp}.${"0".repeat(64)}`, NOW)).toBe(false);
    expect(await verifyAdminToken(secret, `user.${exp}.${sig}`, NOW)).toBe(false);
    for (const junk of [undefined, "", "abc", "a.b.c", `${p}.${exp}.zz`, `${p}.NaN.${sig}`]) expect(await verifyAdminToken(secret, junk, NOW), String(junk)).toBe(false);
  });
  it("so sánh mật khẩu", async () => {
    expect(await passwordsMatch("abc123", "abc123")).toBe(true);
    expect(await passwordsMatch("abc123", "abc124")).toBe(false);
    expect(await passwordsMatch("", "x")).toBe(false);
    expect(await passwordsMatch("a", "a".repeat(1000))).toBe(false);
  });
  describe("giới hạn đăng nhập sai", () => {
    const key = "1.2.3.4";
    beforeEach(() => clearLoginFailures(key));
    it("khóa sau 6 lần sai, mở lại sau 15 phút, xóa khi đăng nhập đúng", () => {
      for (let i = 0; i < 5; i++) recordLoginFailure(key, NOW);
      expect(checkLoginRate(key, NOW).allowed).toBe(true);
      recordLoginFailure(key, NOW);
      const blocked = checkLoginRate(key, NOW + 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(800);
      expect(checkLoginRate(key, NOW + 16 * 60 * 1000).allowed).toBe(true);
      clearLoginFailures(key);
      expect(checkLoginRate(key, NOW + 1000).allowed).toBe(true);
    });
    it("mỗi địa chỉ đếm riêng", () => {
      for (let i = 0; i < 6; i++) recordLoginFailure(key, NOW);
      expect(checkLoginRate("9.9.9.9", NOW).allowed).toBe(true);
    });
  });
});

describe("tải ảnh: nhận dạng theo chữ ký file", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);
  it("nhận PNG/JPG/GIF/WebP", () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47))?.ext).toBe("png");
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(sniffImage(new TextEncoder().encode("GIF89a......."))?.ext).toBe("gif");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))?.ext).toBe("webp");
  });
  it("từ chối SVG, HTML, file rỗng, file đuôi ảnh nhưng nội dung khác", () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<html><body>"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(new TextEncoder().encode("MZ\x90\x00 executable"))).toBeNull();
  });
});

describe("kiểm tra dữ liệu tiến độ gửi lên máy chủ", () => {
  it("chấp nhận tiến độ hợp lệ", () => {
    expect(validateProgressPayload({ progress: emptyProgress() }).ok).toBe(true);
  });
  it("từ chối thiếu trường, sai cấu trúc, quá lớn", () => {
    expect(validateProgressPayload(null)).toMatchObject({ ok: false, status: 400 });
    expect(validateProgressPayload({})).toMatchObject({ ok: false, status: 400 });
    expect(validateProgressPayload({ progress: { v: 1, xp: "nhiều" } })).toMatchObject({ ok: false, status: 422 });
    expect(validateProgressPayload({ progress: { v: 999 } })).toMatchObject({ ok: false, status: 422 });
    expect(validateProgressPayload({ progress: { pad: "x".repeat(MAX_PROGRESS_BYTES + 10) } })).toMatchObject({ ok: false, status: 413 });
  });
});
