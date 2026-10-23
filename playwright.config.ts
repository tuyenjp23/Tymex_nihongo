import { defineConfig } from "@playwright/test";
import fs from "node:fs";

// Trên máy bạn: chạy `npx playwright install chromium` một lần là đủ. Trong môi trường CI/sandbox có sẵn Chromium
// thì đặt PW_CHROMIUM_PATH (hoặc dùng đường dẫn mặc định bên dưới nếu tồn tại).
const exe = process.env.PW_CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const PORT = Number(process.env.E2E_PORT ?? 3210);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { executablePath: exe, args: ["--no-sandbox", "--disable-background-networking", "--proxy-bypass-list=*"] },
    // Chặn service worker khi test: nếu không, SW tự tải ảnh (bỏ qua page.route) và làm các test mô phỏng lỗi mạng sai lệch.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${PORT}`,
    // Mặc định luôn tự khởi động server mới để không test nhầm bản cũ; đặt E2E_REUSE=1 nếu muốn dùng server đang chạy ở E2E_PORT.
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 180_000,
    env: { E2E_PORT: String(PORT) },
  },
});
