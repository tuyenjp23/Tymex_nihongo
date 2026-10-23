import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COLLECTION_KEYS, type CollectionKey } from "@/lib/types";
import type { Source } from "@/lib/schemas";
import type { IdSets, ValidationContext } from "@/lib/admin/validate";
import { parseBackup, planRestore } from "@/lib/admin/restore";
import { defaultTheme } from "@/config/theme";

const seedDir = path.resolve(__dirname, "../../content/seed");
const seed = Object.fromEntries(
  COLLECTION_KEYS.map((c) => [c, JSON.parse(fs.readFileSync(path.join(seedDir, `${c}.json`), "utf8")) as Record<string, unknown>[]]),
) as Record<CollectionKey, Record<string, unknown>[]>;

function ctxFrom(data: Partial<Record<CollectionKey, Record<string, unknown>[]>>): ValidationContext {
  const ids: IdSets = {};
  for (const c of COLLECTION_KEYS) ids[c] = new Set((data[c] ?? []).map((r) => String(r.id)));
  return { sources: new Map(((data.sources ?? []) as unknown as Source[]).map((s) => [s.id, s])), ids };
}
const existingOf = (data: Partial<Record<CollectionKey, Record<string, unknown>[]>>) =>
  Object.fromEntries(COLLECTION_KEYS.map((c) => [c, new Map((data[c] ?? []).map((r) => [String(r.id), r]))])) as Partial<Record<CollectionKey, Map<string, Record<string, unknown>>>>;
const NOW = "2026-10-22T00:00:00.000Z";

const backupOf = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ app: "nihongo-compass", format: 1, exported_at: NOW, collections: seed, settings: { theme: defaultTheme, navigation: null, dashboard: null, content: null, games: null }, ...over });

describe("parseBackup", () => {
  it("từ chối file không phải sao lưu của ứng dụng / sai phiên bản / không phải JSON", () => {
    expect(parseBackup("{bad").backup).toBeNull();
    expect(parseBackup("[]").backup).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "khac", format: 1, collections: {} })).errors[0]).toMatch(/không phải file sao lưu/);
    expect(parseBackup(JSON.stringify({ app: "nihongo-compass", format: 2, collections: {} })).errors[0]).toMatch(/format 1/);
    expect(parseBackup(JSON.stringify({ app: "nihongo-compass", format: 1 })).errors[0]).toMatch(/collections/);
  });
  it("báo loại nội dung/cấu hình lạ nhưng vẫn đọc phần còn lại", () => {
    const r = parseBackup(JSON.stringify({ app: "nihongo-compass", format: 1, collections: { vocabulary: [], la: [] }, settings: { zzz: 1 } }));
    expect(r.backup).not.toBeNull();
    expect(r.errors.join("|")).toMatch(/la/);
    expect(r.errors.join("|")).toMatch(/zzz/);
  });
});

describe("planRestore", () => {
  it("sao lưu toàn bộ dữ liệu mẫu khôi phục lại vào kho trống: mọi bản ghi hợp lệ và được 'thêm mới'", () => {
    const plan = planRestore({ text: backupOf(), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.fileErrors).toEqual([]);
    expect(plan.totals.error).toBe(0);
    expect(plan.ok).toBe(true);
    const total = COLLECTION_KEYS.reduce((a, c) => a + seed[c].length, 0);
    expect(plan.totals.create).toBe(total);
    expect(plan.totals.update).toBe(0);
    expect(plan.totals.settings).toBe(1); // chỉ theme có giá trị
    expect(plan.settings.find((s) => s.key === "navigation")?.status).toBe("skip_empty");
  });

  it("khôi phục lên kho đã có dữ liệu: tất cả là 'cập nhật'", () => {
    const plan = planRestore({ text: backupOf(), existing: existingOf(seed), ctx: ctxFrom(seed), now: NOW });
    expect(plan.ok).toBe(true);
    expect(plan.totals.create).toBe(0);
    expect(plan.totals.update).toBe(COLLECTION_KEYS.reduce((a, c) => a + seed[c].length, 0));
  });

  it("một bản ghi lỗi làm cả kế hoạch không áp dụng được (ok=false) và chỉ rõ bản ghi nào", () => {
    const bad = structuredClone(seed) as Record<string, Record<string, unknown>[]>;
    bad.vocabulary[0] = { ...bad.vocabulary[0], level: "N9" };
    const plan = planRestore({ text: backupOf({ collections: bad }), existing: existingOf(seed), ctx: ctxFrom(seed), now: NOW });
    expect(plan.ok).toBe(false);
    expect(plan.totals.error).toBe(1);
    const v = plan.collections.find((c) => c.collection === "vocabulary")!;
    expect(v.errorRows[0].id).toBe(String(seed.vocabulary[0].id));
  });

  it("liên kết hỏng bị bắt (từ vựng trỏ tới hình không có trong file lẫn kho)", () => {
    const data = structuredClone(seed) as Record<string, Record<string, unknown>[]>;
    const withImg = data.vocabulary.findIndex((v) => v.image_id);
    data.vocabulary[withImg] = { ...data.vocabulary[withImg], image_id: "img-khong-co" };
    const plan = planRestore({ text: backupOf({ collections: data }), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.ok).toBe(false);
    expect(plan.collections.find((c) => c.collection === "vocabulary")!.errorRows[0].errors.map((e) => e.message).join()).toMatch(/không tồn tại/);
  });

  it("bản ghi trong file tham chiếu được nhau (hình + từ vựng cùng file), nhưng nguồn lỗi không làm 'đã xác minh' bị lọt", () => {
    const data = structuredClone(seed) as Record<string, Record<string, unknown>[]>;
    // một nguồn bị hỏng → các bản ghi dùng nó không được hợp lệ ngầm
    const src = data.sources[0];
    data.sources[0] = { ...src, license: undefined, source_name: "" };
    const plan = planRestore({ text: backupOf({ collections: data }), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.ok).toBe(false);
  });

  it("cấu hình không hợp lệ bị báo lỗi", () => {
    const plan = planRestore({ text: backupOf({ settings: { theme: { primary: 5 } } }), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.settings.find((s) => s.key === "theme")?.status).toBe("error");
    expect(plan.ok).toBe(false);
  });

  it("cấu hình tham chiếu mục menu không tồn tại bị chặn (cùng quy tắc với lưu tay)", () => {
    const plan = planRestore({ text: backupOf({ settings: { navigation: { items: [{ id: "khong-co", label: "x", enabled: true }] } } }), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.settings.find((s) => s.key === "navigation")?.status).toBe("error");
  });

  it("file không có gì để ghi → ok=false", () => {
    const plan = planRestore({ text: JSON.stringify({ app: "nihongo-compass", format: 1, collections: {}, settings: {} }), existing: existingOf({}), ctx: ctxFrom({}), now: NOW });
    expect(plan.ok).toBe(false);
  });
});
