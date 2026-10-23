/**
 * Kiểm tra toàn bộ nội dung học liệu — chạy: `npm run validate:content` (mặc định kiểm tra content/seed)
 * hoặc `npm run validate:content -- <thư-mục-chứa-các-file-json>` (ví dụ thư mục `data/` của Admin).
 *
 * Dùng đúng bộ quy tắc như Admin: cấu trúc (Zod) + nguồn gốc (AI không được là người xác minh, "mẫu chính thức" phải có nguồn chính thức)
 * + liên kết giữa các bản ghi (nguồn, hình, bài đọc, mục học) + file ảnh có thật trong public/.
 * Thoát với mã 1 nếu có lỗi (dùng được trong CI).
 */
import fs from "node:fs";
import path from "node:path";
import { COLLECTION_KEYS, type CollectionKey } from "../src/lib/types";
import type { Source } from "../src/lib/schemas";
import { validateRecord, type IdSets } from "../src/lib/admin/validate";

const root = process.cwd();
const seedDir = path.join(root, "content", "seed");
const dir = path.resolve(process.argv[2] ?? seedDir);

if (!fs.existsSync(dir)) {
  console.error(`Không thấy thư mục: ${dir}`);
  process.exit(2);
}

const data = {} as Record<CollectionKey, Record<string, unknown>[]>;
let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.error(`  ✗ ${msg}`);
};

for (const c of COLLECTION_KEYS) {
  // Thư mục dữ liệu của Admin chỉ chứa collection đã bị sửa → thiếu file thì lấy bản mẫu
  const file = [path.join(dir, `${c}.json`), path.join(seedDir, `${c}.json`)].find((f) => fs.existsSync(f));
  if (!file) {
    data[c] = [];
    continue;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("không phải mảng");
    data[c] = parsed;
  } catch (e) {
    data[c] = [];
    fail(`${path.relative(root, file)}: không đọc được (${(e as Error).message})`);
  }
}

const ids: IdSets = {};
for (const c of COLLECTION_KEYS) {
  const seen = new Set<string>();
  for (const r of data[c]) {
    const id = String(r.id);
    if (seen.has(id)) fail(`${c}/${id}: ID bị trùng`);
    seen.add(id);
  }
  ids[c] = seen;
}
const ctx = { sources: new Map((data.sources as unknown as Source[]).map((s) => [s.id, s])), ids };

console.log(`Kiểm tra nội dung trong: ${path.relative(root, dir) || "."}\n`);
const stats: Record<string, string> = {};
for (const c of COLLECTION_KEYS) {
  let bad = 0;
  for (const r of data[c]) {
    const res = validateRecord(c, r, ctx);
    if (!res.ok) {
      bad++;
      fail(`${c}/${String(r.id)}: ${res.errors.map((e) => `${e.path || "(chung)"} — ${e.message}`).join("; ")}`);
    }
  }
  stats[c] = `${data[c].length} bản ghi${bad ? `, ${bad} lỗi` : ""}`;
}

// Tệp ảnh phải tồn tại (đường dẫn công khai /images/... → public/images/...)
for (const img of data.images as unknown as { id: string; path: string }[]) {
  if (typeof img.path === "string" && img.path.startsWith("/")) {
    const f = path.join(root, "public", img.path.replace(/^\/+/, ""));
    if (!f.startsWith(path.join(root, "public")) || !fs.existsSync(f)) {
      // ảnh admin tải lên nằm ở /api/uploads/... (thư mục data) — chỉ kiểm tra ảnh tĩnh
      if (!img.path.startsWith("/api/uploads/")) fail(`images/${img.id}: không thấy file ${img.path} trong public/`);
    }
  }
}

console.table(stats);
if (problems > 0) {
  console.error(`\n✗ Có ${problems} vấn đề cần sửa.`);
  process.exit(1);
}
console.log("✓ Nội dung hợp lệ.");
