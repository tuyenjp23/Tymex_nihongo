import { expect, test } from "@playwright/test";
import { adminLogin, readProgress } from "./helpers";

// Server e2e trỏ NC_IMPORTED_DIR vào tests/fixtures/imported: 2 từ (あそこ jm-1000320, 何 jm-2846738), 1 Kanji (一 kj-4e00), 3 câu — bản trích THẬT
// từ lớp "dữ liệu nhập sẵn". Các test dưới đây kiểm tra lớp đó hiển thị đúng, phân trang đúng và Admin xử lý đúng.

test.describe("dữ liệu nhập sẵn — người học", () => {
  test("từ nhập sẵn tìm được bằng tiếng Anh, hiện nhãn EN và trang chi tiết nói rõ chưa có tiếng Việt", async ({ page }) => {
    await page.goto("/vocabulary?q=yonder");
    const card = page.getByRole("link", { name: /あそこ/ }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText("EN:");
    await card.click();
    await expect(page.getByText("chưa có tiếng Việt").first()).toBeVisible();
    await expect(page.getByText("there").first()).toBeVisible();
  });

  test("Kanji nhập sẵn mở được; lọc theo cấp qua URL", async ({ page }) => {
    await page.goto("/kanji?level=N5&q=" + encodeURIComponent("一"));
    await expect(page.locator('main a[href="/kanji/kj-4e00"]')).toBeVisible();
    await page.goto("/kanji/kj-4e00");
    await expect(page.getByText("一").first()).toBeVisible();
  });

  test("phân trang phía server: trang 2 có mục khác trang 1, có điều hướng, trang vượt quá bị kẹp", async ({ page }) => {
    await page.goto("/vocabulary");
    await expect(page.getByText(/^Mục 1–48 \/ \d+/)).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Phân trang" });
    await expect(nav).toBeVisible();
    const first = () => page.locator('main a[href^="/vocabulary/"]').first().getAttribute("href");
    const first1 = await first();
    await nav.getByRole("link", { name: "Sau →" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/^Mục 49–96 \/ \d+/)).toBeVisible();
    expect(await first()).not.toBe(first1);
    await page.goto("/vocabulary?page=9999");
    await expect(page.getByText(/^Mục \d+–\d+ \/ \d+/)).toBeVisible();
    // tham số lạ không làm hỏng trang
    await page.goto("/vocabulary?level=N9&page=abc&group=<script>");
    await expect(page.getByRole("heading", { level: 1, name: "Từ vựng" })).toBeVisible();
  });

  test("Trang chủ và JLPT tính 'đã xem' qua /api/item-levels (không nhúng danh sách vào trang)", async ({ page, request }) => {
    const res = await request.get("/api/item-levels");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toMatch(/max-age/);
    const body = await res.json();
    expect(body.vocabulary.N5).toContain("jm-1000320");
    await page.goto("/vocabulary/jm-1000320"); // mở một từ → đánh dấu đã xem
    await expect.poll(async () => Object.keys((await readProgress(page))?.seen ?? {})).toContain("vocabulary:jm-1000320");
    await page.goto("/jlpt");
    await expect(page.getByText(/^[1-9]\d*\/\d+$/).first()).toBeVisible();
  });

  test("tìm kiếm chung ra cả mục nhập sẵn", async ({ page }) => {
    await page.goto("/search?q=yonder");
    await expect(page.getByRole("link", { name: /あそこ/ }).first()).toBeVisible();
  });
});

test.describe("dữ liệu nhập sẵn — Admin", () => {
  test("sửa một mục nhập sẵn tạo bản ghi riêng trong kho; ẩn rồi người học không thấy; không xóa được mục chỉ có ở lớp nhập sẵn", async ({ page }) => {
    await adminLogin(page);
    // hiện trong danh sách Admin
    await page.goto("/admin/content/vocabulary?q=jm-1000320");
    await expect(page.getByText("あそこ").first()).toBeVisible();

    // thêm nghĩa tiếng Việt cho mục nhập sẵn
    await page.goto("/admin/content/vocabulary/jm-1000320");
    await page.getByLabel(/^Nghĩa tiếng Việt/).first().fill("ở đằng kia (e2e)");
    await page.getByLabel("Loại phần tiếng Việt").selectOption({ label: "Tiếng Việt do người/AI biên soạn" });
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu").first()).toBeVisible();
    await page.goto("/vocabulary?q=" + encodeURIComponent("đằng kia (e2e)"));
    await expect(page.getByRole("link", { name: /あそこ/ }).first()).toBeVisible();

    // ẩn → người học không thấy
    await page.goto("/admin/content/vocabulary/jm-1000320");
    await page.getByRole("switch", { name: /Ẩn \(người học không thấy\)/ }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu").first()).toBeVisible();
    await page.goto("/vocabulary?q=yonder");
    await expect(page.getByText("Không tìm thấy mục nào")).toBeVisible();

    // Kanji chỉ có ở lớp nhập sẵn: Xóa bị từ chối kèm hướng dẫn dùng "Ẩn"
    await page.goto("/admin/content/kanji/kj-4e00");
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page.getByText(/dữ liệu nhập sẵn/).first()).toBeVisible();
    await page.goto("/kanji/kj-4e00");
    await expect(page.getByText("一").first()).toBeVisible();
  });

  test("sao lưu toàn bộ chỉ chứa phần trong kho, không nhân bản dữ liệu nhập sẵn", async ({ page }) => {
    await adminLogin(page);
    const res = await page.request.get("/api/admin/export?collection=all&format=json");
    expect(res.status()).toBe(200);
    const b = await res.json();
    expect(b.excludes_imported_base).toBe(true);
    expect((b.collections.sentences as unknown[]).length).toBeLessThan(10); // câu nhập sẵn (3) không nằm trong sao lưu; chỉ còn câu của mini-dataset
    expect((b.collections.vocabulary as { id: string }[]).some((r) => r.id === "jm-2846738")).toBe(false);
  });
});
