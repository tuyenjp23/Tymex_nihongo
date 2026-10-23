import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(__dirname, "../../..");

/** Giả lập phần của Supabase mà migration cần: schema auth, bảng auth.users, hàm auth.uid() và các role anon/authenticated. */
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
`;

export function migrationSql(): string {
  const dir = path.join(root, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
}

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(migrationSql());
  return db;
}

export type Who = { role: "anon" } | { role: "authenticated"; uid: string };

/** Chạy một câu lệnh dưới danh nghĩa anon / người dùng đã đăng nhập (RLS được áp dụng vì role không phải superuser). */
export async function as<T = Record<string, unknown>>(db: PGlite, who: Who, sql: string, params: unknown[] = []): Promise<{ rows: T[]; affectedRows?: number }> {
  await db.exec(`set role ${who.role}`);
  try {
    if (who.role === "authenticated") await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who.uid]);
    else await db.query("select set_config('request.jwt.claim.sub', '', false)");
    const r = await db.query<T>(sql, params);
    return { rows: r.rows, affectedRows: r.affectedRows };
  } finally {
    await db.exec("reset role");
  }
}

export async function addUser(db: PGlite, email: string, role: "learner" | "admin" = "learner"): Promise<string> {
  const r = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  const id = r.rows[0].id;
  if (role === "admin") await db.query("update public.profiles set role = 'admin' where id = $1", [id]);
  return id;
}

export const now = "2026-10-22T00:00:00.000Z";

export function vocab(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    level: "N5",
    word: "山",
    reading: "やま",
    meaning_vi: "núi",
    origin: "self_authored",
    status: "published",
    hidden: false,
    source_id: null,
    reviewed_by: "Tuyen",
    last_verified: "2026-10-22",
    created_at: now,
    updated_at: now,
    ...over,
  };
}
