import { expect, test } from "@playwright/test";
import { adminLogin } from "./helpers";

// Dữ liệu được nạp trước bởi scripts/e2e-server.mjs qua `import:apply` với bộ dữ liệu GIẢ tests/fixtures/mini-dataset
// (1 từ 図書館, 1 kanji 橋, 2 câu) — kiểm tra bản ghi "đã nhập" hiển thị đúng và trung thực.

test.describe("dữ liệu đã nhập — người học", () => {
  test("chi tiết từ: nghĩa Việt có nhãn dịch máy, nghĩa gốc, câu ví dụ có ghi công, nguồn", async ({ page }) => {
    await page.goto("/vocabulary/jm-1001");
    await expect(page.getByText("thư viện").first()).toBeVisible();
    await expect(page.getByText(/dịch máy/i).first()).toBeVisible();
    await expect(page.getByText("library").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Câu ví dụ \(2\)/ })).toBeVisible();
    await expect(page.getByText("図書館に行きます。").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Xem câu gốc/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Xem ghi công đầy đủ/ }).first()).toBeVisible();
  });

  test("kanji đã nhập hiển thị Hán Việt, nghĩa dịch máy và danh sách cấp theo nguồn cộng đồng", async ({ page }) => {
    await page.goto("/kanji/kj-6a4b");
    await expect(page.getByText("橋").first()).toBeVisible();
    await expect(page.getByText("KIỀU").first()).toBeVisible();
    await expect(page.getByText("cây cầu").first()).toBeVisible();
    await expect(page.getByText(/không phải danh sách chính thức của JLPT/)).toBeVisible();
  });

  test("tìm kiếm theo nghĩa tiếng Anh gốc và ra nhóm Câu ví dụ", async ({ page }) => {
    await page.goto("/search?q=library");
    await expect(page.getByRole("link", { name: /図書館/ }).first()).toBeVisible();
    await page.goto("/search?q=" + encodeURIComponent("大きい"));
    await expect(page.getByRole("heading", { name: /Câu ví dụ/ })).toBeVisible();
  });

  test("trang Nguồn dữ liệu có mục Ghi công dữ liệu với giấy phép và liên kết", async ({ page }) => {
    await page.goto("/sources");
    await expect(page.locator("#ghi-cong")).toBeVisible();
    await expect(page.locator("#ghi-cong")).toContainText(/JMdict|EDRDG/);
    await expect(page.locator("#ghi-cong")).toContainText(/Tatoeba/);
  });
});

test.describe("dữ liệu đã nhập — Admin", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("/admin/data-sources liệt kê nguồn đang dùng, nguồn bị chặn và báo cáo lần nhập", async ({ page }) => {
    await page.goto("/admin/data-sources");
    await expect(page.getByRole("heading", { level: 1, name: "Nguồn dữ liệu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Nguồn đang được dùng/ })).toBeVisible();
    await expect(page.getByText(/JMdict/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nguồn chưa có dữ liệu trong kho" }).or(page.getByText(/Nguồn chưa có dữ liệu trong kho/)).first()).toBeVisible();
    await expect(page.getByText("Các lần nhập gần đây")).toBeVisible();
    await expect(page.getByText("Đã ghi").first()).toBeVisible();
    await expect(page.getByText(/nhóm jlpt-n5/).last()).toBeVisible();
  });

  test("/admin/data-quality chạy kiểm tra và nêu bản dịch máy chưa kiểm tra", async ({ page }) => {
    await page.goto("/admin/data-quality");
    await expect(page.getByRole("heading", { level: 1, name: "Chất lượng dữ liệu" })).toBeVisible();
    await expect(page.getByText(/bản dịch máy chưa được người kiểm tra/i).first()).toBeVisible();
  });

  test("danh sách từ vựng lọc theo nguồn và theo 'nghĩa Việt là dịch máy'", async ({ page }) => {
    await page.goto("/admin/content/vocabulary?source=src-jmdict");
    await expect(page.getByText("図書館").first()).toBeVisible();
    await page.goto("/admin/content/vocabulary?vi=machine");
    await expect(page.getByText("図書館").first()).toBeVisible();
  });

  test("các trang quản lý dữ liệu nhập yêu cầu đăng nhập (không chỉ ẩn nút)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/admin/data-sources");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/data-quality");
    await expect(page).toHaveURL(/\/admin\/login/);
    await ctx.close();
  });
});
