/**
 * Tải các ảnh Nhật Bản ĐÃ CHỌN SẴN (src/config/japan-photos.ts, ảnh giấy phép tự do trên Wikimedia Commons) về public/images/japan.
 * Chạy trên máy bạn khi cần tải lại/đổi ảnh:   npm run photos:fetch
 *
 * - Chỉ tải đúng danh sách trong PHOTO_SOURCES (8 ảnh), tuần tự, có nghỉ giữa các lần — không tải hàng loạt.
 * - Mỗi ảnh tải theo `downloadUrl` của chính nó (bản thu nhỏ 1920 px trên thumb.wikimedia.org), rồi thu về tối đa 2000 px, JPEG ~q78
 *   (cần thư viện `sharp`, có sẵn cùng Next.js) để trang tải nhanh.
 * - Ghi kích thước vào src/config/japan-photos.generated.json (giao diện dùng để đặt width/height, tránh xô lệch bố cục).
 * - Không ghi đè ảnh đã có, trừ khi thêm --force.
 * - Nguồn, tác giả và giấy phép của từng ảnh: docs/ANH-VA-GIAY-PHEP.md. Khi đổi ảnh phải chọn ảnh giấy phép tự do
 *   (CC0, Public Domain, CC BY, CC BY-SA) và cập nhật PHOTO_SOURCES + tài liệu đó.
 *
 * Tùy chọn: --only hero-fuji,torii   --force   --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { PHOTO_SOURCES, type PhotoFile, type PhotoSlot } from "../src/config/japan-photos";

const root = process.cwd();
const outDir = path.join(root, "public", "images", "japan");
const genFile = path.join(root, "src", "config", "japan-photos.generated.json");
const MAX_BYTES = 40 * 1024 * 1024;

const args = process.argv.slice(2);
const force = args.includes("--force");
const dry = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7) ?? (args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined);
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadSharp() {
  try {
    const m = await import("sharp");
    return (m.default ?? m) as typeof import("sharp");
  } catch {
    return null;
  }
}

async function main() {
  const known = new Set<string>(PHOTO_SOURCES.map((p) => p.slot));
  if (only) for (const s of only) if (!known.has(s)) throw new Error(`Không có ảnh "${s}". Các ảnh có sẵn: ${[...known].join(", ")}`);
  const list = PHOTO_SOURCES.filter((p) => !only || only.has(p.slot));
  const current: Partial<Record<PhotoSlot, PhotoFile>> = fs.existsSync(genFile) ? JSON.parse(fs.readFileSync(genFile, "utf8")) : {};
  const sharp = await loadSharp();
  if (!sharp && !dry) throw new Error('Thiếu thư viện "sharp" để thu nhỏ ảnh. Chạy: npm install sharp   (thường đã có sẵn cùng Next.js)');
  fs.mkdirSync(outDir, { recursive: true });

  let ok = 0;
  let failed = 0;
  for (const p of list) {
    const target = path.join(outDir, `${p.slot}.jpg`);
    if (!force && current[p.slot] && fs.existsSync(target)) {
      console.log(`• ${p.slot}: đã có, bỏ qua (dùng --force để tải lại)`);
      continue;
    }
    const url = p.downloadUrl;
    console.log(`↓ ${p.slot}: ${p.photographer} (${p.license}) — ${p.pageUrl}`);
    if (dry) continue;
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "nihongo-compass-photo-fetch/1.0 (one-off, 8 images)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`Không phải ảnh (content-type: ${type || "trống"})`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error(`Ảnh quá lớn (${Math.round(buf.length / 1048576)} MB)`);
      const img = sharp!(buf).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 78, progressive: true, mozjpeg: true });
      const { data, info } = await img.toBuffer({ resolveWithObject: true });
      fs.writeFileSync(target, data);
      current[p.slot] = { file: `/images/japan/${p.slot}.jpg`, width: info.width, height: info.height };
      fs.writeFileSync(genFile, JSON.stringify(current, null, 2) + "\n");
      console.log(`  ✓ ${info.width}×${info.height}, ${Math.round(data.length / 1024)} KB`);
      ok++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${p.slot}: ${(e as Error).message}`);
    }
    await sleep(1500);
  }
  console.log(`\nXong: ${ok} ảnh mới, ${failed} lỗi. Ảnh lỗi/chưa tải sẽ tự dùng tranh minh họa SVG.`);
  console.log("Giấy phép & ghi công: docs/ANH-VA-GIAY-PHEP.md. Hãy commit public/images/japan và src/config/japan-photos.generated.json.");
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\n✗ ${(e as Error).message}`);
  process.exit(1);
});
