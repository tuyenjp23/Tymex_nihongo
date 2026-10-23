import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, as, freshDb, migrationSql, vocab } from "./helpers";

let db: PGlite;
let admin: string;
let learnerA: string;
let learnerB: string;

const ins = (who: Parameters<typeof as>[1], rec: Record<string, unknown>) =>
  as(db, who, "insert into public.vocabulary (id, data) values ($1, $2::jsonb)", [rec.id as string, JSON.stringify(rec)]);

beforeAll(async () => {
  db = await freshDb();
  admin = await addUser(db, "admin@example.com", "admin");
  learnerA = await addUser(db, "a@example.com");
  learnerB = await addUser(db, "b@example.com");
  // dữ liệu nền (chủ database bỏ qua RLS)
  for (const [id, over] of [
    ["pub", {}],
    ["draft", { status: "draft", reviewed_by: null, last_verified: null }],
    ["hid", { hidden: true }],
    ["ai", { status: "ai_generated", origin: "ai_generated", reviewed_by: null, last_verified: null }],
  ] as const) {
    const rec = vocab(id, over);
    await db.query("insert into public.vocabulary (id, data) values ($1, $2::jsonb)", [id, JSON.stringify(rec)]);
  }
});
afterAll(async () => {
  await db.close();
});

describe("migration", () => {
  it("chạy lại lần hai vẫn không lỗi (idempotent)", async () => {
    await expect(db.exec(migrationSql())).resolves.not.toThrow();
  });
  it("mọi bảng trong schema public đều bật RLS", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'",
    );
    expect(r.rows.length).toBeGreaterThanOrEqual(14);
    expect(r.rows.filter((x) => !x.relrowsecurity)).toEqual([]);
  });
  it("người dùng mới tự có hồ sơ vai trò learner", async () => {
    const r = await db.query<{ role: string }>("select role from public.profiles where id = $1", [learnerA]);
    expect(r.rows[0].role).toBe("learner");
  });
});

describe("khách (anon)", () => {
  it("chỉ đọc được nội dung công khai, không thấy nháp và nội dung ẩn", async () => {
    const r = await as<{ id: string }>(db, { role: "anon" }, "select id from public.vocabulary order by id");
    expect(r.rows.map((x) => x.id)).toEqual(["ai", "pub"]);
  });
  it("không ghi được gì", async () => {
    await expect(ins({ role: "anon" }, vocab("x1"))).rejects.toThrow(/permission denied/i);
    await expect(as(db, { role: "anon" }, "update public.vocabulary set hidden = true")).rejects.toThrow(/permission denied/i);
    await expect(as(db, { role: "anon" }, "delete from public.vocabulary")).rejects.toThrow(/permission denied/i);
  });
  it("không đọc được nhật ký, lịch sử cấu hình, hồ sơ, tiến độ", async () => {
    for (const t of ["audit_logs", "settings_history", "profiles", "user_progress"]) {
      await expect(as(db, { role: "anon" }, `select * from public.${t}`)).rejects.toThrow(/permission denied/i);
    }
  });
  it("đọc được cấu hình giao diện nhưng không sửa được", async () => {
    await db.query(`insert into public.app_settings (key, value) values ('theme', '{"appName":"X"}')`);
    const r = await as(db, { role: "anon" }, "select key from public.app_settings");
    expect(r.rows).toHaveLength(1);
    await expect(as(db, { role: "anon" }, "update public.app_settings set value='{}'")).rejects.toThrow(/permission denied/i);
  });
});

describe("người học đã đăng nhập (không phải admin)", () => {
  const A = () => ({ role: "authenticated" as const, uid: learnerA });
  it("không thêm/sửa/xóa được nội dung", async () => {
    await expect(ins(A(), vocab("x2"))).rejects.toThrow(/row-level security/i);
    const u = await as(db, A(), "update public.vocabulary set data = data where id = 'pub'");
    expect(u.affectedRows).toBe(0);
    const d = await as(db, A(), "delete from public.vocabulary where id = 'pub'");
    expect(d.affectedRows).toBe(0);
    const still = await db.query("select 1 from public.vocabulary where id = 'pub'");
    expect(still.rows).toHaveLength(1);
  });
  it("vẫn không thấy nháp/ẩn", async () => {
    const r = await as<{ id: string }>(db, A(), "select id from public.vocabulary order by id");
    expect(r.rows.map((x) => x.id)).toEqual(["ai", "pub"]);
  });
  it("không tự nâng quyền lên admin, không đọc hồ sơ người khác", async () => {
    const u = await as(db, A(), "update public.profiles set role = 'admin' where id = $1", [learnerA]);
    expect(u.affectedRows).toBe(0);
    const role = await db.query<{ role: string }>("select role from public.profiles where id = $1", [learnerA]);
    expect(role.rows[0].role).toBe("learner");
    const seen = await as<{ id: string }>(db, A(), "select id from public.profiles");
    expect(seen.rows.map((x) => x.id)).toEqual([learnerA]);
    await expect(as(db, A(), "insert into public.profiles (id, role) values (gen_random_uuid(), 'admin')")).rejects.toThrow(/permission denied/i);
  });
  it("không ghi được cấu hình hay nhật ký, không đọc được nhật ký", async () => {
    await expect(as(db, A(), "update public.app_settings set value='{}'")).resolves.toMatchObject({ affectedRows: 0 });
    await expect(as(db, A(), "insert into public.app_settings (key, value) values ('games','{}')")).rejects.toThrow(/row-level security/i);
    await expect(
      as(db, A(), "insert into public.audit_logs (actor_id, action, collection) values ($1, 'create', 'vocabulary')", [learnerA]),
    ).rejects.toThrow(/row-level security/i);
    const r = await as(db, A(), "select * from public.audit_logs");
    expect(r.rows).toHaveLength(0);
  });
});

describe("admin", () => {
  const AD = () => ({ role: "authenticated" as const, uid: admin });
  it("thấy cả nháp và nội dung ẩn", async () => {
    const r = await as<{ id: string }>(db, AD(), "select id from public.vocabulary order by id");
    expect(r.rows.map((x) => x.id)).toEqual(["ai", "draft", "hid", "pub"]);
  });
  it("thêm, sửa, xóa được; cột status/level/hidden luôn khớp với data (không thể lệch)", async () => {
    await ins(AD(), vocab("n1", { status: "needs_review", level: "N3", hidden: true, reviewed_by: null, last_verified: null }));
    // thử "nói dối" bằng cột riêng: trigger phải ghi đè theo data
    await as(db, AD(), "update public.vocabulary set status = 'published', hidden = false, level = 'N1' where id = 'n1'");
    const r = await db.query<{ status: string; level: string; hidden: boolean }>("select status, level, hidden from public.vocabulary where id = 'n1'");
    expect(r.rows[0]).toEqual({ status: "needs_review", level: "N3", hidden: true });
    const d = await as(db, AD(), "delete from public.vocabulary where id = 'n1'");
    expect(d.affectedRows).toBe(1);
  });
  it("trigger chặn dữ liệu sai ngay cả khi ghi trực tiếp qua API", async () => {
    await expect(ins(AD(), vocab("bad1", { reviewed_by: null }))).rejects.toThrow(/reviewed_by/);
    await expect(ins(AD(), vocab("bad2", { reviewed_by: "  " }))).rejects.toThrow(/reviewed_by/);
    await expect(ins(AD(), vocab("bad3", { origin: "official_sample", source_id: null }))).rejects.toThrow(/official_sample/);
    await expect(ins(AD(), vocab("bad4", { origin: "magic" }))).rejects.toThrow(/origin/);
    await expect(ins(AD(), vocab("bad5", { status: "ok" }))).rejects.toThrow(/Trạng thái/);
    await expect(
      as(db, AD(), "insert into public.vocabulary (id, data) values ('bad6', $1::jsonb)", [JSON.stringify(vocab("khac-id"))]),
    ).rejects.toThrow(/không khớp/);
    await expect(as(db, AD(), "insert into public.vocabulary (id, data) values ('bad7', '[]'::jsonb)")).rejects.toThrow();
    await expect(as(db, AD(), "insert into public.vocabulary (id, data) values ('bad id!', '{}'::jsonb)")).rejects.toThrow();
    await expect(ins(AD(), vocab("bad8", { level: "N9" }))).rejects.toThrow();
  });
  it("nguồn (verification_status) cũng bị kiểm tra như nhau", async () => {
    const src = (over: Record<string, unknown>) => ({ id: "s1", source_name: "X", verification_status: "verified", reviewed_by: null, last_verified: null, ...over });
    await expect(
      as(db, AD(), "insert into public.lesson_sources (id, data) values ('s1', $1::jsonb)", [JSON.stringify(src({}))]),
    ).rejects.toThrow(/reviewed_by/);
    await as(db, AD(), "insert into public.lesson_sources (id, data) values ('s1', $1::jsonb)", [JSON.stringify(src({ reviewed_by: "Tuyen", last_verified: "2026-10-22" }))]);
    const r = await db.query<{ status: string }>("select status from public.lesson_sources where id='s1'");
    expect(r.rows[0].status).toBe("verified");
  });
  it("nhật ký: ghi được dưới tên mình, không giả mạo người khác, không sửa/xóa được", async () => {
    await as(db, AD(), "insert into public.audit_logs (actor_id, actor_label, action, collection, summary) values ($1,'Admin','create','vocabulary','x')", [admin]);
    await expect(
      as(db, AD(), "insert into public.audit_logs (actor_id, action, collection) values ($1,'create','vocabulary')", [learnerA]),
    ).rejects.toThrow(/row-level security/i);
    await expect(as(db, AD(), "update public.audit_logs set summary='sửa'")).rejects.toThrow(/permission denied/i);
    await expect(as(db, AD(), "delete from public.audit_logs")).rejects.toThrow(/permission denied/i);
    const r = await as(db, AD(), "select * from public.audit_logs");
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
  });
  it("cấu hình: ghi được, khóa lạ bị từ chối; lịch sử phiên bản chỉ admin đọc", async () => {
    await as(db, AD(), `insert into public.app_settings (key, value, version) values ('games', '{"a":1}', 1) on conflict (key) do update set value = excluded.value, version = excluded.version`);
    await expect(as(db, AD(), `insert into public.app_settings (key, value) values ('hack', '{}')`)).rejects.toThrow(/check/i);
    await as(db, AD(), "insert into public.settings_history (key, version, value, saved_by_label) values ('games', 1, '{}', 'Admin')");
    await expect(as(db, AD(), "insert into public.settings_history (key, version, value) values ('games', 1, '{}')")).rejects.toThrow(/unique|duplicate/i);
    expect((await as(db, AD(), "select 1 from public.settings_history")).rows).toHaveLength(1);
    await expect(as(db, { role: "authenticated", uid: learnerA }, "select 1 from public.settings_history")).resolves.toMatchObject({ rows: [] });
  });
  it("lịch sử cấu hình tự dọn: mỗi nhóm giữ tối đa 25 phiên bản mới nhất, không ảnh hưởng nhóm khác", async () => {
    for (let v = 1; v <= 30; v++) await as(db, AD(), "insert into public.settings_history (key, version, value) values ('theme', $1, '{}')", [v]);
    await as(db, AD(), "insert into public.settings_history (key, version, value) values ('content', 1, '{}')");
    const theme = await as<{ version: number }>(db, AD(), "select version from public.settings_history where key = 'theme' order by version");
    expect(theme.rows).toHaveLength(25);
    expect(theme.rows[0].version).toBe(6);
    expect(theme.rows[24].version).toBe(30);
    expect((await as(db, AD(), "select 1 from public.settings_history where key = 'content'")).rows).toHaveLength(1);
    // admin vẫn KHÔNG tự xóa lịch sử được qua API
    await expect(as(db, AD(), "delete from public.settings_history")).rejects.toThrow(/permission denied/i);
  });
  it("cấp quyền admin cho người khác được; người học thì không", async () => {
    const u = await as(db, AD(), "update public.profiles set role = 'admin' where id = $1", [learnerB]);
    expect(u.affectedRows).toBe(1);
    await db.query("update public.profiles set role = 'learner' where id = $1", [learnerB]);
  });
});

describe("tiến độ học (user_progress)", () => {
  const A = () => ({ role: "authenticated" as const, uid: learnerA });
  const B = () => ({ role: "authenticated" as const, uid: learnerB });
  const AD = () => ({ role: "authenticated" as const, uid: admin });
  it("mỗi người chỉ thấy và sửa dòng của mình; admin cũng không đọc được", async () => {
    await as(db, A(), "insert into public.user_progress (user_id, data) values ($1, '{\"xp\":10}')", [learnerA]);
    expect((await as(db, B(), "select * from public.user_progress")).rows).toHaveLength(0);
    expect((await as(db, AD(), "select * from public.user_progress")).rows).toHaveLength(0);
    await expect(as(db, B(), "insert into public.user_progress (user_id, data) values ($1, '{}')", [learnerA])).rejects.toThrow(/row-level security/i);
    expect((await as(db, B(), "update public.user_progress set data = '{\"xp\":999}'")).affectedRows).toBe(0);
    expect((await as(db, B(), "delete from public.user_progress")).affectedRows).toBe(0);
    const own = await as<{ data: { xp: number } }>(db, A(), "select data from public.user_progress");
    expect(own.rows[0].data.xp).toBe(10);
    expect((await as(db, A(), "update public.user_progress set data = '{\"xp\":20}'")).affectedRows).toBe(1);
  });
  it("từ chối dữ liệu không phải đối tượng JSON hoặc quá lớn", async () => {
    await expect(as(db, B(), "insert into public.user_progress (user_id, data) values ($1, '[]')", [learnerB])).rejects.toThrow(/check/i);
    const big = JSON.stringify({ pad: "x".repeat(2_200_000) });
    await expect(as(db, B(), "insert into public.user_progress (user_id, data) values ($1, $2::jsonb)", [learnerB, big])).rejects.toThrow(/check/i);
  });
  it("xóa tài khoản thì tiến độ bị xóa theo", async () => {
    const id = await addUser(db, "gone@example.com");
    await db.query("insert into public.user_progress (user_id, data) values ($1, '{}')", [id]);
    await db.query("delete from auth.users where id = $1", [id]);
    expect((await db.query("select 1 from public.user_progress where user_id = $1", [id])).rows).toHaveLength(0);
  });
});

describe("bộ đề (quiz_sets)", () => {
  const set = (id: string, over: Record<string, unknown> = {}) => ({
    id, title: "Bộ đề thử", description: "", level: "N5", kind: "practice", shuffle: true, order: 0,
    items: [{ question_id: "q1" }, { question_id: "q2" }, { question_id: "q3" }], tags: [],
    origin: "self_authored", status: "needs_review", hidden: false, source_id: null, source_note: "", reviewed_by: null, last_verified: null,
    created_at: "2026-10-22T00:00:00.000Z", updated_at: "2026-10-22T00:00:00.000Z", ...over,
  });
  const insSet = (who: Parameters<typeof as>[1], rec: Record<string, unknown>) =>
    as(db, who, "insert into public.quiz_sets (id, data) values ($1, $2::jsonb)", [rec.id as string, JSON.stringify(rec)]);

  it("admin tạo được; trigger tự suy ra level/status; học viên và khách không ghi được", async () => {
    await insSet({ role: "authenticated", uid: admin }, set("qs-pub"));
    await insSet({ role: "authenticated", uid: admin }, set("qs-draft", { status: "draft" }));
    await insSet({ role: "authenticated", uid: admin }, set("qs-hidden", { hidden: true }));
    const r = await db.query<{ level: string; status: string }>("select level, status from public.quiz_sets where id = 'qs-pub'");
    expect(r.rows[0]).toEqual({ level: "N5", status: "needs_review" });
    await expect(insSet({ role: "authenticated", uid: learnerA }, set("qs-x"))).rejects.toThrow(/row-level security|permission denied/i);
    await expect(insSet({ role: "anon" }, set("qs-y"))).rejects.toThrow(/permission denied/i);
    await expect(as(db, { role: "authenticated", uid: learnerA }, "delete from public.quiz_sets")).resolves.toMatchObject({ affectedRows: 0 });
  });

  it("người học chỉ thấy bộ đề công khai (không nháp, không ẩn); admin thấy tất cả", async () => {
    const anon = await as<{ id: string }>(db, { role: "anon" }, "select id from public.quiz_sets order by id");
    expect(anon.rows.map((x) => x.id)).toEqual(["qs-pub"]);
    const ad = await as<{ id: string }>(db, { role: "authenticated", uid: admin }, "select id from public.quiz_sets order by id");
    expect(ad.rows.map((x) => x.id)).toEqual(["qs-draft", "qs-hidden", "qs-pub"]);
  });

  it("trigger chặn 'đã xác minh' thiếu người rà soát khi ghi thẳng qua API", async () => {
    await expect(insSet({ role: "authenticated", uid: admin }, set("qs-bad", { status: "verified" }))).rejects.toThrow(/reviewed_by/);
  });
});

describe("câu ví dụ (sentences) và trạng thái nhập dữ liệu", () => {
  const sent = (id: string, over: Record<string, unknown> = {}) => ({
    id, ja: "犬がいます。", translations: [{ lang: "en", text: "There is a dog.", kind: "source" }], word_refs: [], level: null, level_source: null,
    attribution: "Tatoeba", source_url: "https://tatoeba.org/en/sentences/show/1", license: "CC-BY-2.0-FR", tags: [], import: null,
    origin: "imported_dataset", status: "imported", hidden: false, source_id: "src-tatoeba", source_note: "", reviewed_by: null, last_verified: null,
    created_at: "2026-10-23T00:00:00.000Z", updated_at: "2026-10-23T00:00:00.000Z", ...over,
  });
  const insSent = (who: Parameters<typeof as>[1], rec: Record<string, unknown>) =>
    as(db, who, "insert into public.sentences (id, data) values ($1, $2::jsonb)", [rec.id as string, JSON.stringify(rec)]);

  it("admin ghi được câu ở trạng thái imported; level để trống (null) vẫn hợp lệ; trigger suy ra cột", async () => {
    await insSent({ role: "authenticated", uid: admin }, sent("s-pub"));
    await insSent({ role: "authenticated", uid: admin }, sent("s-mt", { status: "machine_translated" }));
    await insSent({ role: "authenticated", uid: admin }, sent("s-draft", { status: "draft" }));
    const r = await db.query<{ level: string | null; status: string; origin: string; source_id: string }>("select level, status, origin, source_id from public.sentences where id = 's-pub'");
    expect(r.rows[0]).toEqual({ level: null, status: "imported", origin: "imported_dataset", source_id: "src-tatoeba" });
  });
  it("nội dung nhập từ bộ dữ liệu bắt buộc có source_id", async () => {
    await expect(insSent({ role: "authenticated", uid: admin }, sent("s-nosrc", { source_id: null }))).rejects.toThrow(/source_id/);
  });
  it("trạng thái lạ bị chặn; verified vẫn cần người rà soát", async () => {
    await expect(insSent({ role: "authenticated", uid: admin }, sent("s-bad", { status: "auto_verified" }))).rejects.toThrow(/Trạng thái không hợp lệ|check/);
    await expect(insSent({ role: "authenticated", uid: admin }, sent("s-ver", { status: "verified" }))).rejects.toThrow(/reviewed_by/);
  });
  it("khách chỉ đọc được câu công khai (không nháp); học viên và khách không ghi được", async () => {
    const anon = await as<{ id: string }>(db, { role: "anon" }, "select id from public.sentences order by id");
    expect(anon.rows.map((x) => x.id)).toEqual(["s-mt", "s-pub"]);
    await expect(insSent({ role: "authenticated", uid: learnerA }, sent("s-l"))).rejects.toThrow(/row-level security|permission denied/i);
    await expect(insSent({ role: "anon" }, sent("s-a"))).rejects.toThrow(/permission denied/i);
  });
  it("bảng cũ (vocabulary) nhận được trạng thái imported/machine_translated sau migration", async () => {
    await ins({ role: "authenticated", uid: admin }, vocab("v-imp", { status: "imported", origin: "imported_dataset", source_id: "src-jld", reviewed_by: null, last_verified: null }));
    await ins({ role: "authenticated", uid: admin }, vocab("v-mt", { status: "machine_translated", origin: "imported_dataset", source_id: "src-jld", reviewed_by: null, last_verified: null }));
    const r = await db.query<{ status: string }>("select status from public.vocabulary where id in ('v-imp','v-mt') order by id");
    expect(r.rows.map((x) => x.status)).toEqual(["imported", "machine_translated"]);
  });
});
