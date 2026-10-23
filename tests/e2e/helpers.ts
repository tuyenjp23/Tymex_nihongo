import type { Page } from "@playwright/test";

export const PROGRESS_KEY = "nc.progress.v1";

export async function readProgress(page: Page) {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, PROGRESS_KEY);
}

export const ADMIN_PASSWORD = "e2e-password-123";

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Mật khẩu").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/admin");
}
