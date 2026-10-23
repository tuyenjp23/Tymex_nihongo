// Tạo supabase/seed.sql từ content/seed/*.json để nạp dữ liệu mẫu vào Supabase mà KHÔNG cần khóa bí mật nào:
// chỉ việc dán file SQL vào Supabase → SQL Editor và bấm Run (chạy với quyền chủ database, bỏ qua RLS).
// Chạy lại an toàn: bản ghi đã có không bị ghi đè (on conflict do nothing).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TABLES = {
  sources: "lesson_sources",
  images: "image_assets",
  vocabulary: "vocabulary",
  kanji: "kanji",
  grammar: "grammar_points",
  sentences: "sentences",
  questions: "questions",
  quiz_sets: "quiz_sets",
  passages: "passages",
  conversations: "conversations",
  lessons: "lessons",
};

const TAG = "$ncseed$";

export function buildSeedSql(seedDir) {
  const out = ["-- Tạo tự động bởi `npm run seed:sql` — đừng sửa tay.", "begin;"];
  for (const [collection, table] of Object.entries(TABLES)) {
    const file = path.join(seedDir, `${collection}.json`);
    if (!fs.existsSync(file)) continue;
    const rows = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const r of rows) {
      const json = JSON.stringify(r);
      if (json.includes(TAG)) throw new Error(`Bản ghi ${collection}/${r.id} chứa chuỗi dành riêng ${TAG}`);
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(r.id)) throw new Error(`ID không hợp lệ: ${collection}/${r.id}`);
      out.push(
        `insert into public.${table} (id, data, created_at, updated_at) values ('${r.id}', ${TAG}${json}${TAG}::jsonb, '${r.created_at}', '${r.updated_at}') on conflict (id) do nothing;`,
      );
    }
  }
  out.push("commit;", "");
  return out.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sql = buildSeedSql(path.join(root, "content", "seed"));
  fs.mkdirSync(path.join(root, "supabase"), { recursive: true });
  fs.writeFileSync(path.join(root, "supabase", "seed.sql"), sql);
  console.log(`Đã ghi supabase/seed.sql (${sql.split("\n").length - 4} bản ghi).`);
}
