import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb } from "./helpers";
// @ts-expect-error — script .mjs không có khai báo kiểu
import { buildSeedSql, TABLES } from "../../../scripts/seed-sql.mjs";
import { promotedColumns } from "@/lib/store/promoted";

const seedDir = path.resolve(__dirname, "../../../content/seed");
let db: PGlite;

beforeAll(async () => {
  db = await freshDb();
  await db.exec(buildSeedSql(seedDir));
});
afterAll(async () => {
  await db.close();
});

describe("seed.sql", () => {
  it("nạp đủ số bản ghi của từng collection và vượt qua các trigger bảo vệ", async () => {
    for (const [collection, table] of Object.entries(TABLES) as [string, string][]) {
      const rows = JSON.parse(fs.readFileSync(path.join(seedDir, `${collection}.json`), "utf8")) as unknown[];
      const r = await db.query<{ n: number }>(`select count(*)::int n from public.${table}`);
      expect(r.rows[0].n, collection).toBe(rows.length);
    }
  });
  it("chạy lại lần hai không nhân đôi dữ liệu", async () => {
    await db.exec(buildSeedSql(seedDir));
    const r = await db.query<{ n: number }>("select count(*)::int n from public.vocabulary");
    expect(r.rows[0].n).toBe(JSON.parse(fs.readFileSync(path.join(seedDir, "vocabulary.json"), "utf8")).length);
  });
  it("cột level/status/hidden/origin/source_id do trigger sinh ra khớp với hàm promotedColumns của ứng dụng", async () => {
    for (const [collection, table] of Object.entries(TABLES) as [string, string][]) {
      const rows = JSON.parse(fs.readFileSync(path.join(seedDir, `${collection}.json`), "utf8")) as { id: string }[];
      const db_ = await db.query<Record<string, unknown> & { id: string }>(`select id, level, status, hidden, origin, source_id from public.${table}`);
      const byId = new Map(db_.rows.map((r) => [r.id, r]));
      for (const rec of rows) {
        const want = promotedColumns(rec as never);
        const got = byId.get(rec.id)!;
        expect({ level: got.level, status: got.status, hidden: got.hidden, origin: got.origin, source_id: got.source_id }, `${collection}/${rec.id}`).toEqual(want);
      }
    }
  });
  it("khách đọc được nội dung mẫu (đã AI soạn, hiển thị kèm cảnh báo) qua RLS", async () => {
    const r = await as<{ n: number }>(db, { role: "anon" }, "select count(*)::int n from public.vocabulary");
    expect(r.rows[0].n).toBeGreaterThan(50);
  });
});
