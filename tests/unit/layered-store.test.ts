import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { LayeredStore } from "@/lib/store/layered-store";
import { fileBaseLayer } from "@/lib/store/base-layer";
import { StoreError } from "@/lib/store/types";
import type { Vocabulary } from "@/lib/schemas";

const seedDir = path.resolve(__dirname, "../../content/seed");
const actor = { id: "t", label: "tester" };
let tmp: string;
let dataDir: string;
let baseDir: string;
let inner: FileStore;
let store: LayeredStore;
let tpl: Vocabulary;

const baseRec = (id: string, extra: Partial<Vocabulary> = {}): Vocabulary => ({ ...tpl, id, word: id, reading: id, meaning_vi: "", status: "imported", origin: "imported_dataset", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z", ...extra });

function writeBase(rows: Vocabulary[]) {
  fs.writeFileSync(path.join(baseDir, "vocabulary.json"), JSON.stringify(rows));
}

beforeEach(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nc-layer-"));
  dataDir = path.join(tmp, "data");
  baseDir = path.join(tmp, "imported");
  fs.mkdirSync(baseDir);
  inner = new FileStore(dataDir, seedDir);
  tpl = (await inner.list("vocabulary"))[0];
  writeBase([baseRec("jm-1"), baseRec("jm-2")]);
  store = new LayeredStore(inner, fileBaseLayer(baseDir));
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("LayeredStore (lớp nhập sẵn + kho)", () => {
  it("list = kho + bản nhập sẵn; get tìm được cả hai", async () => {
    const seedN = (await inner.list("vocabulary")).length;
    const all = await store.list("vocabulary");
    expect(all.length).toBe(seedN + 2);
    expect((await store.get("vocabulary", "jm-1"))?.id).toBe("jm-1");
    expect(await store.get("vocabulary", "khong-co")).toBeNull();
  });

  it("thiếu thư mục/ file lớp nhập sẵn → chỉ còn dữ liệu của kho (không lỗi)", async () => {
    const s = new LayeredStore(inner, fileBaseLayer(path.join(tmp, "khong-ton-tai")));
    expect((await s.list("vocabulary")).length).toBe((await inner.list("vocabulary")).length);
  });

  it("file nhập sẵn hỏng → bỏ qua lớp này, không làm sập trang", async () => {
    fs.writeFileSync(path.join(baseDir, "kanji.json"), "{không phải json");
    const errs: unknown[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => void errs.push(a);
    try {
      expect((await store.list("kanji")).length).toBe((await inner.list("kanji")).length);
    } finally {
      console.error = orig;
    }
    expect(errs.length).toBeGreaterThan(0);
  });

  it("sửa bản nhập sẵn → tạo bản ghi cùng ID trong kho và bản trong kho thắng; không đổi file nhập sẵn", async () => {
    const before = fs.readFileSync(path.join(baseDir, "vocabulary.json"), "utf8");
    const seedN = (await inner.list("vocabulary")).length;
    const rec = (await store.get("vocabulary", "jm-1"))!;
    const saved = await store.upsert("vocabulary", { ...rec, meaning_vi: "nghĩa đã sửa" }, actor, { expectedUpdatedAt: rec.updated_at });
    expect(saved.meaning_vi).toBe("nghĩa đã sửa");
    expect((await store.get("vocabulary", "jm-1"))?.meaning_vi).toBe("nghĩa đã sửa");
    expect((await store.list("vocabulary")).length).toBe(seedN + 2); // kho cũ + jm-1 (bản ghi đè, không nhân đôi) + jm-2
    expect((await store.list("vocabulary")).filter((r) => r.id === "jm-1").length).toBe(1);
    expect(fs.readFileSync(path.join(baseDir, "vocabulary.json"), "utf8")).toBe(before);
    expect((await inner.get("vocabulary", "jm-1"))?.meaning_vi).toBe("nghĩa đã sửa");
  });

  it("sửa bản nhập sẵn với updated_at cũ → xung đột, không ghi gì", async () => {
    const rec = (await store.get("vocabulary", "jm-2"))!;
    await expect(store.upsert("vocabulary", { ...rec, meaning_vi: "x" }, actor, { expectedUpdatedAt: "1999-01-01T00:00:00.000Z" })).rejects.toMatchObject({ code: "conflict" });
    expect(await inner.get("vocabulary", "jm-2")).toBeNull();
  });

  it("không xóa được bản ghi chỉ có ở lớp nhập sẵn (phải dùng Ẩn); xóa bản đã ghi đè thì quay về bản nhập sẵn", async () => {
    await expect(store.remove("vocabulary", "jm-1", actor)).rejects.toBeInstanceOf(StoreError);
    await expect(store.remove("vocabulary", "jm-1", actor)).rejects.toMatchObject({ code: "forbidden" });
    const rec = (await store.get("vocabulary", "jm-1"))!;
    await store.upsert("vocabulary", { ...rec, meaning_vi: "sửa" }, actor);
    await store.remove("vocabulary", "jm-1", actor);
    expect((await store.get("vocabulary", "jm-1"))?.meaning_vi).toBe("");
  });

  it("ẩn bản nhập sẵn bằng upsert (hidden=true) giữ được và không cần xóa", async () => {
    const rec = (await store.get("vocabulary", "jm-2"))!;
    await store.upsert("vocabulary", { ...rec, hidden: true }, actor);
    expect((await store.get("vocabulary", "jm-2"))?.hidden).toBe(true);
  });

  it("thêm bản ghi mới (ID chưa có ở đâu) và xóa bản ghi của kho vẫn như cũ", async () => {
    await store.upsert("vocabulary", { ...tpl, id: "vocab-moi" }, actor, { expectedUpdatedAt: null });
    expect((await store.get("vocabulary", "vocab-moi"))?.id).toBe("vocab-moi");
    await store.remove("vocabulary", "vocab-moi", actor);
    expect(await store.get("vocabulary", "vocab-moi")).toBeNull();
  });

  it("listOwn không gồm bản nhập sẵn", async () => {
    const own = await store.listOwn("vocabulary");
    expect(own.some((r) => r.id === "jm-1")).toBe(false);
    expect(own.length).toBe((await inner.list("vocabulary")).length);
  });

  it("cấu hình và nhật ký đi thẳng vào kho", async () => {
    expect(await store.getSetting("theme")).toEqual(await inner.getSetting("theme"));
    expect(store.mode).toBe("local");
  });
});
