import { describe, expect, it } from "vitest";
import { ANONYMOUS_ME, meInitial, shapeMe } from "@/lib/auth/me";

describe("shapeMe (dữ liệu góc tài khoản /api/me)", () => {
  it("không có gì → ẩn danh, không admin", () => {
    expect(shapeMe({})).toEqual(ANONYMOUS_ME);
    expect(shapeMe({ email: "  ", displayName: null })).toEqual(ANONYMOUS_ME);
  });

  it("có email → đã đăng nhập; thiếu tên thì lấy phần trước @", () => {
    const me = shapeMe({ email: "mai@example.com" });
    expect(me.signedIn).toBe(true);
    expect(me.displayName).toBe("mai");
    expect(me.isAdmin).toBe(false);
    expect(me.avatarUrl).toBeNull();
  });

  it("ưu tiên display_name của profile và giữ avatar", () => {
    const me = shapeMe({ email: "a@b.co", displayName: "  Mai Anh ", avatarUrl: "https://x/y.png", profileRole: "learner" });
    expect(me.displayName).toBe("Mai Anh");
    expect(me.avatarUrl).toBe("https://x/y.png");
    expect(me.isAdmin).toBe(false);
  });

  it("role admin trong profiles → isAdmin, các role khác thì không", () => {
    expect(shapeMe({ email: "a@b.co", profileRole: "admin" }).isAdmin).toBe(true);
    expect(shapeMe({ email: "a@b.co", profileRole: "learner" }).isAdmin).toBe(false);
    expect(shapeMe({ email: "a@b.co", profileRole: "Admin" }).isAdmin).toBe(false);
  });

  it("phiên admin local: isAdmin=true nhưng signedIn vẫn false (chế độ local không có tài khoản học viên)", () => {
    const me = shapeMe({ localAdmin: true });
    expect(me.isAdmin).toBe(true);
    expect(me.signedIn).toBe(false);
    expect(me.email).toBeNull();
  });
});

describe("meInitial", () => {
  it("lấy chữ cái đầu viết hoa từ tên, rồi email, cuối cùng là ?", () => {
    expect(meInitial({ displayName: "mai", email: "mai@example.com" })).toBe("M");
    expect(meInitial({ displayName: null, email: "tuan@example.com" })).toBe("T");
    expect(meInitial({ displayName: null, email: null })).toBe("?");
  });
});
