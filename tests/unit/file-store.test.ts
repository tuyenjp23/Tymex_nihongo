import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileStore } from "@/lib/store/file-store";
import { StoreError } from "@/lib/store/types";

const seedDir = path.resolve(__dirname, "../../content/seed");
const actor = { id: "t", label: "tester" };
let dataDir: string;
let store: FileStore;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-store-"));
  store = new FileStore(dataDir, seedDir);
});
afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const seedBytes = (name: string) => fs.readFileSync(path.join(seedDir, `${name}.json`), "utf8");

describe("FileStore", () => {
  it("đọc dữ liệu mẫu khi chưa có thay đổi", async () => {
    const list = await store.list("vocabulary");
    expect(list.length).toBe(JSON.parse(seedBytes("vocabulary")).length);
    expect(fs.existsSync(path.join(dataDir, "vocabulary.json"))).toBe(false);
  });

  it("sửa bản ghi: ghi vào thư mục data, KHÔNG đụng vào file mẫu, giữ created_at và đổi updated_at", async () => {
    const before = seedBytes("vocabulary");
    const first = (await store.list("vocabulary"))[0];
    const saved = await store.upsert("vocabulary", { ...first, meaning_vi: "nghĩa mới" }, actor);
    expect(saved.created_at).toBe(first.created_at);
    expect(saved.updated_at).not.toBe(first.updated_at);
    expect((await store.get("vocabulary", first.id))?.meaning_vi).toBe("nghĩa mới");
    expect(seedBytes("vocabulary")).toBe(before);
    expect((await store.list("vocabulary")).length).toBe(JSON.parse(before).length);
  });

  it("thêm mới làm tăng số bản ghi và ghi audit create/update", async () => {
    const n = (await store.list("vocabulary")).length;
    const first = (await store.list("vocabulary"))[0];
    await store.upsert("vocabulary", { ...first, id: "vocab-test-new" }, actor);
    await store.upsert("vocabulary", { ...first, id: "vocab-test-new", meaning_vi: "x" }, actor);
    expect((await store.list("vocabulary")).length).toBe(n + 1);
    const audit = await store.listAudit({ recordId: "vocab-test-new" });
    expect(audit.map((a) => a.action)).toEqual(["update", "create"]);
    expect(audit[0].actor).toBe("tester");
  });

  it("remove: xóa được, id không tồn tại báo not_found", async () => {
    const first = (await store.list("vocabulary"))[0];
    await store.remove("vocabulary", first.id, actor);
    expect(await store.get("vocabulary", first.id)).toBeNull();
    await expect(store.remove("vocabulary", "khong-co", actor)).rejects.toMatchObject({ code: "not_found" });
    await expect(store.remove("vocabulary", "khong-co", actor)).rejects.toBeInstanceOf(StoreError);
  });

  it("upsertMany thêm + cập nhật trong một lần ghi và ghi 1 dòng audit import", async () => {
    const list = await store.list("vocabulary");
    const n = list.length;
    const count = await store.upsertMany("vocabulary", [{ ...list[0], meaning_vi: "a" }, { ...list[0], id: "vocab-test-b" }], actor, "Nhập thử");
    expect(count).toBe(2);
    expect((await store.list("vocabulary")).length).toBe(n + 1);
    const audit = await store.listAudit({ collection: "vocabulary" });
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("import");
  });

  it("nhiều thao tác ghi đồng thời không làm mất bản ghi nào", async () => {
    const first = (await store.list("vocabulary"))[0];
    const n = (await store.list("vocabulary")).length;
    await Promise.all(Array.from({ length: 20 }, (_, i) => store.upsert("vocabulary", { ...first, id: `vocab-par-${i}` }, actor)));
    expect((await store.list("vocabulary")).length).toBe(n + 20);
    expect((await store.listAudit({ collection: "vocabulary", limit: 500 })).length).toBe(20);
  });

  it("file data bị hỏng: dùng dữ liệu mẫu thay vì sập, và vẫn ghi lại được", async () => {
    fs.writeFileSync(path.join(dataDir, "vocabulary.json"), "{ không phải json");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const list = await store.list("vocabulary");
    expect(list.length).toBe(JSON.parse(seedBytes("vocabulary")).length);
    expect(err).toHaveBeenCalled();
    await store.upsert("vocabulary", { ...list[0], meaning_vi: "ok" }, actor);
    expect((await store.get("vocabulary", list[0].id))?.meaning_vi).toBe("ok");
    err.mockRestore();
  });

  it("cài đặt: phiên bản tăng dần, lịch sử mới→cũ, khôi phục tạo phiên bản mới", async () => {
    expect(await store.getSetting("theme")).toBeNull();
    expect(await store.saveSetting("theme", { a: 1 }, actor)).toBe(1);
    expect(await store.saveSetting("theme", { a: 2 }, actor)).toBe(2);
    expect(await store.saveSetting("theme", { a: 3 }, actor)).toBe(3);
    expect((await store.getSetting("theme"))?.value).toEqual({ a: 3 });
    expect((await store.settingHistory("theme")).map((h) => h.version)).toEqual([3, 2, 1]);
    expect(await store.restoreSetting("theme", 1, actor)).toBe(4);
    expect((await store.getSetting("theme"))?.value).toEqual({ a: 1 });
    await expect(store.restoreSetting("theme", 99, actor)).rejects.toMatchObject({ code: "not_found" });
    // lịch sử của key khác độc lập
    expect(await store.settingHistory("navigation")).toEqual([]);
  });

  it("lịch sử cấu hình bị giới hạn 25 phiên bản", async () => {
    for (let i = 0; i < 40; i++) await store.saveSetting("games", { i }, actor);
    const h = await store.settingHistory("games");
    expect(h.length).toBeLessThanOrEqual(26);
    expect(h[0].version).toBe(40);
  });

  it("resetToSeed xóa thay đổi của một collection hoặc tất cả", async () => {
    const first = (await store.list("vocabulary"))[0];
    await store.upsert("vocabulary", { ...first, meaning_vi: "đổi" }, actor);
    await store.upsert("grammar", { ...(await store.list("grammar"))[0], id: "gr-test-new" }, actor);
    await store.saveSetting("theme", { a: 1 }, actor);
    await store.resetToSeed("vocabulary", actor);
    expect((await store.get("vocabulary", first.id))?.meaning_vi).toBe(first.meaning_vi);
    expect(await store.get("grammar", "gr-test-new")).not.toBeNull();
    await store.resetToSeed("all", actor);
    expect(await store.get("grammar", "gr-test-new")).toBeNull();
    expect(await store.getSetting("theme")).toBeNull();
    expect((await store.listAudit()).some((a) => a.action === "reset")).toBe(true);
  });

  it("không để lại file .tmp sau khi ghi", async () => {
    const first = (await store.list("vocabulary"))[0];
    await store.upsert("vocabulary", first, actor);
    expect(fs.readdirSync(dataDir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  describe("chống ghi đè khi hai người sửa cùng lúc", () => {
    it("lưu với updated_at cũ bị từ chối (conflict) và không ghi gì; lưu với updated_at mới nhất thì được", async () => {
      const first = (await store.list("vocabulary"))[0];
      // Hai người cùng mở bản `first`
      const a = await store.upsert("vocabulary", { ...first, meaning_vi: "của người A" }, actor, { expectedUpdatedAt: first.updated_at });
      await expect(store.upsert("vocabulary", { ...first, meaning_vi: "của người B" }, actor, { expectedUpdatedAt: first.updated_at })).rejects.toMatchObject({ code: "conflict" });
      expect((await store.get("vocabulary", first.id))?.meaning_vi).toBe("của người A");
      // B tải lại rồi lưu lại với updated_at mới → được
      const b = await store.upsert("vocabulary", { ...a, meaning_vi: "của người B" }, actor, { expectedUpdatedAt: a.updated_at });
      expect(b.meaning_vi).toBe("của người B");
    });

    it("hai lần lưu đồng thời cùng bản gốc: đúng một lần thành công", async () => {
      const first = (await store.list("vocabulary"))[0];
      const results = await Promise.allSettled([
        store.upsert("vocabulary", { ...first, meaning_vi: "1" }, actor, { expectedUpdatedAt: first.updated_at }),
        store.upsert("vocabulary", { ...first, meaning_vi: "2" }, actor, { expectedUpdatedAt: first.updated_at }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    });

    it("tạo mới (expected = null) khi ID đã có → conflict; bản ghi đã bị xóa → conflict; không truyền expected → không kiểm tra", async () => {
      const first = (await store.list("vocabulary"))[0];
      await expect(store.upsert("vocabulary", first, actor, { expectedUpdatedAt: null })).rejects.toMatchObject({ code: "conflict" });
      await store.upsert("vocabulary", { ...first, id: "vocab-tmp-x" }, actor, { expectedUpdatedAt: null });
      const tmp = (await store.get("vocabulary", "vocab-tmp-x"))!;
      await store.remove("vocabulary", "vocab-tmp-x", actor);
      await expect(store.upsert("vocabulary", tmp, actor, { expectedUpdatedAt: tmp.updated_at })).rejects.toMatchObject({ code: "conflict" });
      await expect(store.upsert("vocabulary", { ...first, meaning_vi: "không kiểm tra" }, actor)).resolves.toBeTruthy();
    });

    it("cấu hình: lưu với phiên bản cũ bị từ chối; 0 = chưa từng lưu", async () => {
      const v1 = await store.saveSetting("content", { showUnverified: true, defaultFurigana: true }, actor, { expectedVersion: 0 });
      expect(v1).toBe(1);
      await expect(store.saveSetting("content", { showUnverified: false, defaultFurigana: true }, actor, { expectedVersion: 0 })).rejects.toMatchObject({ code: "conflict" });
      expect((await store.getSetting("content"))?.version).toBe(1);
      await expect(store.saveSetting("content", { showUnverified: false, defaultFurigana: true }, actor, { expectedVersion: 1 })).resolves.toBe(2);
    });
  });
});
