// Cài đặt lần đầu: tạo file .env.local với mật khẩu admin và khóa phiên NGẪU NHIÊN, an toàn.
// Chạy: npm run setup        (không ghi đè file đã có)
//       npm run setup -- --force   (tạo lại; file cũ được lưu thành .env.local.bak)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const force = process.argv.includes("--force");

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  console.error(`✗ Cần Node.js 20.9 trở lên (máy bạn đang dùng ${process.versions.node}). Tải bản LTS tại https://nodejs.org`);
  process.exit(1);
}

fs.mkdirSync(path.join(root, "data"), { recursive: true });

if (fs.existsSync(envPath) && !force) {
  console.log("✓ Đã có .env.local — giữ nguyên (muốn tạo lại thì chạy: npm run setup -- --force).");
  console.log("  Mở file đó để xem mật khẩu admin. Khởi động ứng dụng: npm run dev");
  process.exit(0);
}

// Mật khẩu dễ gõ (bỏ ký tự dễ nhầm 0/O, 1/l/I) nhưng đủ dài và ngẫu nhiên
const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = Array.from(crypto.randomBytes(16), (b) => alphabet[b % alphabet.length]).join("");
const secret = crypto.randomBytes(48).toString("base64url");

const template = fs.existsSync(path.join(root, ".env.example")) ? fs.readFileSync(path.join(root, ".env.example"), "utf8") : "";
let body = template
  .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`)
  .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`);
if (!/^ADMIN_PASSWORD=/m.test(body)) body += `\nADMIN_PASSWORD=${password}\nSESSION_SECRET=${secret}\n`;

if (fs.existsSync(envPath)) fs.copyFileSync(envPath, `${envPath}.bak`);
fs.writeFileSync(envPath, body, { mode: 0o600 });

console.log("✓ Đã tạo .env.local");
console.log("");
console.log("  Đăng nhập khu quản trị:  http://localhost:3000/admin");
console.log(`  Mật khẩu admin (cũng nằm trong .env.local):  ${password}`);
console.log("");
console.log("  Lưu ý: KHÔNG gửi file .env.local cho ai và KHÔNG đưa lên GitHub (đã được .gitignore chặn).");
console.log("  Tiếp theo:  npm run dev");
