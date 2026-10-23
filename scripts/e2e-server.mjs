// Khởi động app cho Playwright: dữ liệu admin ghi vào thư mục tạm (không đụng /data của bạn), có mật khẩu admin thử nghiệm.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = process.env.E2E_PORT ?? "3210";
// Gọi thẳng Next bằng node (không qua npx) để tín hiệu dừng đến đúng tiến trình, không để lại server mồ côi.
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-e2e-"));
const env = {
  ...process.env,
  NC_DATA_DIR: dataDir,
  ADMIN_PASSWORD: "e2e-password-123",
  SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghijklmnop",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (!fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
  console.log("[e2e] Chưa có bản build → chạy next build…");
  const r = spawnSync(process.execPath, [nextBin, "build"], { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`[e2e] Dữ liệu thử nghiệm: ${dataDir}`);

// Nạp bộ dữ liệu giả nhỏ qua đúng đường nhập thật (import:apply) để e2e kiểm tra bản ghi "đã nhập" hiển thị đúng ở trang người học và Admin.
if (process.env.E2E_IMPORT !== "0") {
  const tsx = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const fx = path.join(process.cwd(), "tests", "fixtures", "mini-dataset");
  const r = spawnSync(process.execPath, [tsx, "scripts/import.ts", "apply", "--group", "jlpt-n5", "--translations", path.join(fx, "translations-vi.jsonl"), "--yes"], {
    stdio: "inherit",
    env: { ...env, NC_IMPORT_DATASET: fx },
  });
  if (r.status !== 0) {
    console.error("[e2e] Nhập dữ liệu thử nghiệm thất bại");
    process.exit(r.status ?? 1);
  }
}
const child = spawn(process.execPath, [nextBin, "start", "-p", port], { stdio: "inherit", env });
const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
