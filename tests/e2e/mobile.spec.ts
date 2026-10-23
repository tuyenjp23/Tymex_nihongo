import { expect, test } from "@playwright/test";

test("điện thoại: thanh dưới hiển thị, không tràn ngang, menu mở được", async ({ page }) => {
  for (const path of ["/", "/vocabulary", "/jlpt/N5", "/games", "/progress", "/conversation"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `tràn ngang ở ${path}`).toBeLessThanOrEqual(1);
  }
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Điều hướng nhanh" })).toBeVisible();
  await page.getByRole("button", { name: "Thêm" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Nguồn học liệu" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nguồn học liệu");
});

test("điện thoại: làm một câu trắc nghiệm bằng cảm ứng", async ({ page }) => {
  await page.goto("/quiz?level=N5&skill=grammar&kind=practice");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await page.getByRole("list", { name: "Phương án trả lời" }).getByRole("button").first().tap();
  await expect(page.getByRole("status").filter({ hasText: /Chính xác|Chưa đúng/ })).toBeVisible();
});
