import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// store/index.ts và supabase/server.ts đều import "server-only" — trong môi trường test node thay bằng module rỗng.
vi.mock("server-only", () => ({}));

// Bắt mọi lần gọi cookies() của next/headers: đây là tín hiệu "đường đọc đã đụng cookie phiên"
// (chính là nguyên nhân ép route sang dynamic, làm ISR/CDN cache không chạy được trên production).
const { cookiesSpy } = vi.hoisted(() => ({
  cookiesSpy: vi.fn(async () => ({ getAll: () => [] as never[], set: () => {} })),
}));
vi.mock("next/headers", () => ({ cookies: cookiesSpy }));

import { getPublicStore, getStore } from "@/lib/store";
import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;
const saved = new Map<string, string | undefined>();

function setSupabaseEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
function clearSupabaseEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved.set(k, process.env[k]);
  cookiesSpy.mockClear();
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved.get(k);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("getPublicStore / getStore — chọn client theo chế độ dữ liệu", () => {
  it("chế độ local (chưa cấu hình Supabase): cả hai đều là FileStore, không đụng cookie", async () => {
    clearSupabaseEnv();
    expect((await getPublicStore()).mode).toBe("local");
    expect((await getStore()).mode).toBe("local");
    expect(cookiesSpy).not.toHaveBeenCalled();
  });

  it("chế độ Supabase: getStore() theo phiên → CÓ gọi cookies() (đường admin/ghi, giữ nguyên)", async () => {
    setSupabaseEnv();
    expect((await getStore()).mode).toBe("supabase");
    expect(cookiesSpy).toHaveBeenCalled();
  });

  it("chế độ Supabase: getPublicStore() KHÔNG gọi cookies() → trang học viên giữ được ISR", async () => {
    setSupabaseEnv();
    const store = await getPublicStore();
    expect(store.mode).toBe("supabase");
    expect(cookiesSpy).not.toHaveBeenCalled();
  });
});

describe("createSupabasePublicClient / createSupabaseServerClient", () => {
  it("client công khai không đọc cookie; client theo phiên thì có", async () => {
    setSupabaseEnv();
    const pub = createSupabasePublicClient();
    expect(typeof pub.from).toBe("function");
    expect(cookiesSpy).not.toHaveBeenCalled();

    await createSupabaseServerClient();
    expect(cookiesSpy).toHaveBeenCalled();
  });

  it("client công khai báo lỗi rõ ràng khi chưa cấu hình Supabase", () => {
    clearSupabaseEnv();
    expect(() => createSupabasePublicClient()).toThrow(/chưa được cấu hình/);
  });
});
