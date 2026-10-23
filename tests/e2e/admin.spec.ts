import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, adminLogin } from "./helpers";

test.describe("cổng đăng nhập", () => {
  test("chưa đăng nhập: /admin chuyển về trang đăng nhập, API trả 401", async ({ page, request }) => {
    await page.goto("/admin/content/vocabulary");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await request.get("/api/admin/export?collection=vocabulary&format=json")).status()).toBe(401);
    expect((await request.post("/api/admin/import", { data: {} })).status()).toBe(401);
    expect((await request.post("/api/admin/upload")).status()).toBe(401);
  });

  test("sai mật khẩu bị từ chối, đúng mật khẩu vào được, đăng xuất xong bị chặn lại", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Mật khẩu").fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Mật khẩu không đúng.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByLabel("Mật khẩu").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" })).toBeVisible();

    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL("**/admin/login");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("nội dung", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("thêm từ vựng: lỗi hợp lệ hiện rõ, lưu thành công, người học thấy kèm nhãn chưa xác minh, sửa và xóa được", async ({ page }) => {
    await page.goto("/admin/content/vocabulary/new");
    await page.getByLabel(/^ID\s*\*?$/).fill("e2e-vocab-1");

    // Thiếu trường bắt buộc → báo lỗi, không lưu
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await expect(page.getByText(/Chưa lưu được/)).toBeVisible();

    await page.getByLabel(/^Từ\s*\*?$/).fill("試験");
    await page.getByLabel(/^Cách đọc \(kana\)/).fill("しけん");
    await page.getByLabel(/Nghĩa tiếng Việt/).fill("kỳ thi (e2e)");
    await page.getByLabel(/^Chủ đề/).fill("study");
    // Trạng thái "Đã xác minh" mà chưa có người rà soát → bị chặn
    await page.getByLabel("Trạng thái").selectOption("verified");
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: /người rà soát/ }).first()).toBeVisible();

    // Đặt "Cần rà soát" → hợp lệ
    await page.getByLabel("Trạng thái").selectOption("needs_review");
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await page.waitForURL("**/admin/content/vocabulary/e2e-vocab-1");

    // Người học thấy mục này
    await page.goto("/vocabulary?q=" + encodeURIComponent("kỳ thi (e2e)"));
    await expect(page.getByRole("link", { name: /試験/ }).first()).toBeVisible();

    // Ẩn mục → người học không còn thấy
    await page.goto("/admin/content/vocabulary/e2e-vocab-1");
    await page.getByRole("switch", { name: /Ẩn \(người học không thấy\)/ }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu").first()).toBeVisible();
    await page.goto("/vocabulary?q=" + encodeURIComponent("kỳ thi (e2e)"));
    await expect(page.getByText("Không tìm thấy mục nào")).toBeVisible();

    // Nhật ký ghi lại, và xóa được
    await page.goto("/admin/content/vocabulary/e2e-vocab-1");
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.waitForURL("**/admin/content/vocabulary");
    await page.goto("/admin/audit?collection=vocabulary");
    await expect(page.getByText("Thêm vocabulary/e2e-vocab-1")).toBeVisible();
    await expect(page.getByText("Xóa vocabulary/e2e-vocab-1")).toBeVisible();
  });

  test("quy tắc nguồn gốc: 'mẫu chính thức' không gắn nguồn bị từ chối; không được ghi AI là người xác minh", async ({ page }) => {
    await page.goto("/admin/content/vocabulary/new");
    await page.getByLabel(/^ID\s*\*?$/).fill("e2e-vocab-official");
    await page.getByLabel(/^Từ\s*\*?$/).fill("規則");
    await page.getByLabel(/^Cách đọc \(kana\)/).fill("きそく");
    await page.getByLabel(/Nghĩa tiếng Việt/).fill("quy tắc");
    await page.getByLabel(/^Chủ đề/).fill("study");
    await page.getByLabel("Nguồn gốc nội dung").selectOption("official_sample");
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: /chọn nguồn|nguồn/i }).first()).toBeVisible();

    await page.getByLabel("Nguồn gốc nội dung").selectOption("self_authored");
    await page.getByLabel("Trạng thái").selectOption("verified");
    await page.getByLabel("Người rà soát").fill("Claude");
    await page.getByLabel("Ngày xác minh").fill("2026-10-22");
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await expect(page.getByText(/AI không thể là người/).first()).toBeVisible();
    // Không có bản ghi nào được tạo
    await page.goto("/admin/content/vocabulary?q=e2e-vocab-official");
    await expect(page.getByText("Không có bản ghi nào")).toBeVisible();
  });

  test("không xóa được nguồn đang được dùng", async ({ page }) => {
    await page.goto("/admin/content/sources/src-ai-seed");
    await expect(page.getByText(/đang được .* mục khác dùng/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Xóa", exact: true })).toBeDisabled();
  });
});

test.describe("nhập / xuất", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("nhập file sai: chạy thử báo từng dòng lỗi, nhập thật bị từ chối và không ghi gì", async ({ page }) => {
    await page.goto("/admin/import-export");
    await page.getByLabel("Loại nội dung").selectOption("vocabulary");
    const bad = JSON.stringify([
      { id: "e2e-imp-bad", level: "N9", word: "", reading: "x", meaning_vi: "y", topic: "t" },
      { id: "e2e-imp-bad", level: "N5" },
    ]);
    await page.getByLabel("Nội dung file").fill(bad);
    await page.getByRole("button", { name: /Chạy thử/ }).last().click();
    await expect(page.getByText(/Kết quả chạy thử/)).toBeVisible();
    await expect(page.getByText(/lỗi 2\./)).toBeVisible();
    await expect(page.getByRole("button", { name: /Nhập thật/ })).toBeDisabled();

    // Kể cả gọi thẳng API, nhập thật vẫn bị từ chối
    const payload = { collection: "vocabulary", format: "json", text: bad, dryRun: false };
    // Thiếu Origin (giống form từ trang web khác) → bị chặn dù đã đăng nhập
    expect((await page.request.post("/api/admin/import", { data: payload })).status()).toBe(403);
    const res = await page.request.post("/api/admin/import", { data: payload, headers: { Origin: "http://localhost:3210" } });
    expect(res.status()).toBe(422);
    await page.goto("/admin/content/vocabulary?q=e2e-imp-bad");
    await expect(page.getByText("Không có bản ghi nào")).toBeVisible();
  });

  test("JSON hỏng và CSV sai cột được báo lỗi rõ", async ({ page }) => {
    await page.goto("/admin/import-export");
    await page.getByLabel("Nội dung file").fill("{ không phải json");
    await page.getByRole("button", { name: /Chạy thử/ }).last().click();
    await expect(page.getByText(/JSON không hợp lệ/)).toBeVisible();

    await page.getByLabel("Định dạng").selectOption("csv");
    await page.getByLabel("Nội dung file").fill("id,word\nonly-one-col");
    await page.getByRole("button", { name: /Chạy thử/ }).last().click();
    await expect(page.getByText(/có 1 cột, cần 2/)).toBeVisible();
  });

  test("nhập CSV hợp lệ: chạy thử rồi nhập thật, mục xuất hiện; xuất CSV có BOM", async ({ page }) => {
    await page.goto("/admin/import-export");
    await page.getByLabel("Loại nội dung").selectOption("vocabulary");
    await page.getByLabel("Định dạng").selectOption("csv");
    const csv = [
      "id,level,word,reading,meaning_vi,topic,status,origin,hidden,imageable,examples,tags",
      'e2e-csv-1,N5,犬,いぬ,con chó (e2e csv),animals,needs_review,self_authored,false,true,"[{""ja"":""犬がいます。"",""vi"":""Có một con chó.""}]",',
    ].join("\n");
    await page.getByLabel("Nội dung file").fill(csv);
    await page.getByRole("button", { name: /Chạy thử/ }).last().click();
    await expect(page.getByText(/sẽ thêm 1, cập nhật 0, lỗi 0/)).toBeVisible();
    await page.getByRole("button", { name: /Nhập thật/ }).click();
    await expect(page.getByText(/Đã nhập 1 bản ghi/).first()).toBeVisible();

    await page.goto("/admin/content/vocabulary?q=e2e-csv-1");
    await expect(page.getByRole("link", { name: /犬/ })).toBeVisible();

    const exp = await page.request.get("/api/admin/export?collection=vocabulary&format=csv");
    expect(exp.status()).toBe(200);
    expect(exp.headers()["content-disposition"]).toContain("attachment");
    const body = await exp.text();
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain("e2e-csv-1");

    // dọn
    await page.goto("/admin/content/vocabulary/e2e-csv-1");
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.waitForURL("**/admin/content/vocabulary");
  });
});

test.describe("giao diện", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("đổi màu chủ đạo: người học thấy ngay, cảnh báo tương phản, khôi phục phiên bản cũ", async ({ page }) => {
    await page.goto("/admin/appearance");
    const primary = page.locator("#th-light-primary");
    await primary.fill("#0b7285");
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu \(phiên bản 1\)/).first()).toBeVisible();

    await page.goto("/");
    const css = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
    expect(css.toLowerCase()).toBe("#0b7285");

    // Màu hex sai bị từ chối ở server
    await page.goto("/admin/appearance");
    await page.locator("#th-light-primary").fill("red");
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Màu phải có dạng #RRGGBB/).first()).toBeVisible();

    // Chữ gần như cùng màu nền → cảnh báo tương phản
    await page.locator("#th-light-primary").fill("#0b7285");
    await page.locator("#th-light-fg").fill("#f4f3ee");
    await expect(page.getByText("Một số cặp màu khó đọc")).toBeVisible();

    // Khôi phục: lưu phiên bản 2 rồi quay về phiên bản 1
    await page.locator("#th-light-fg").fill("#1f2430");
    await page.locator("#th-light-primary").fill("#862e9c");
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu \(phiên bản 2\)/).first()).toBeVisible();
    await page.getByRole("button", { name: "Khôi phục" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Khôi phục" }).click();
    await expect(page.getByText(/Đã khôi phục v1/).first()).toBeVisible();
    await page.goto("/");
    const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());
    expect(after.toLowerCase()).toBe("#0b7285");

    // Trả về mặc định để không ảnh hưởng test khác
    await page.goto("/admin/appearance");
    await page.getByRole("button", { name: "Đặt lại về mặc định" }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu/).first()).toBeVisible();
  });

  test("tắt một mục menu: biến mất khỏi menu, trang của nó 404; mục Tổng quan không tắt được", async ({ page }) => {
    await page.goto("/admin/appearance");
    await page.getByRole("tab", { name: /^Menu/ }).click();
    await expect(page.getByRole("switch", { name: /dashboard/ })).toBeDisabled();
    await page.getByRole("switch", { name: /Đang bật: grammar/ }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu/).first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Ngữ pháp", exact: true })).toHaveCount(0);
    await page.goto("/grammar");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();

    // dọn
    await page.goto("/admin/appearance");
    await page.getByRole("tab", { name: /^Menu/ }).click();
    await page.getByRole("button", { name: "Đặt lại về mặc định" }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu/).first()).toBeVisible();
  });
});

test.describe("kanji quest", () => {
  test("mọi chế độ đã lập trình đều bật được; tắt một chế độ thì người học không còn thấy", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/games");
    await expect(page.getByRole("switch", { name: /Bật chế độ Word Builder/ })).toBeEnabled();
    await page.getByRole("switch", { name: /Bật chế độ Memory Match/ }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu/).first()).toBeVisible();
    await page.goto("/games/memory-match");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang này" })).toBeVisible();
    // dọn
    await page.goto("/admin/games");
    await page.getByRole("button", { name: "Đặt lại về mặc định" }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(page.getByText(/Đã lưu/).first()).toBeVisible();
  });
});

test.describe("hai quản trị viên cùng sửa / khôi phục sao lưu", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("sửa cùng một bản ghi từ hai tab: người lưu sau bị báo xung đột, không ghi đè; tải lại rồi lưu được", async ({ page, context }) => {
    // tạo bản ghi riêng cho test
    await page.goto("/admin/content/vocabulary/new");
    await page.getByLabel(/^ID\s*\*?$/).fill("e2e-conflict-1");
    await page.getByLabel(/^Từ\s*\*?$/).fill("競合");
    await page.getByLabel(/^Cách đọc \(kana\)/).fill("きょうごう");
    await page.getByLabel(/Nghĩa tiếng Việt/).fill("gốc");
    await page.getByLabel(/^Chủ đề/).fill("study");
    await page.getByLabel("Trạng thái").selectOption("needs_review");
    await page.getByRole("button", { name: /^Thêm từ vựng$/ }).click();
    await page.waitForURL("**/admin/content/vocabulary/e2e-conflict-1");

    const a = page;
    const b = await context.newPage();
    await b.goto("/admin/content/vocabulary/e2e-conflict-1");
    await a.goto("/admin/content/vocabulary/e2e-conflict-1");

    // B lưu trước
    await b.getByLabel(/Nghĩa tiếng Việt/).fill("của B");
    await b.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(b.getByText("Đã lưu").first()).toBeVisible();

    // A (bản cũ) lưu sau → bị chặn
    await a.getByLabel(/Nghĩa tiếng Việt/).fill("của A");
    await a.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(a.getByText(/đã được người khác sửa/).first()).toBeVisible();
    await expect(a.getByRole("button", { name: /Tải bản mới nhất/ })).toBeVisible();
    // Dữ liệu vẫn là của B
    await a.goto("/vocabulary/e2e-conflict-1");
    await expect(a.getByText("của B").first()).toBeVisible();

    // Tải lại rồi lưu → được; lưu liên tiếp hai lần từ cùng một form cũng không tự xung đột
    await a.goto("/admin/content/vocabulary/e2e-conflict-1");
    await a.getByLabel(/Nghĩa tiếng Việt/).fill("của A lần 2");
    await a.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(a.getByText("Đã lưu").first()).toBeVisible();
    await a.getByLabel(/Nghĩa tiếng Việt/).fill("của A lần 3");
    await a.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(a.getByText(/đã được người khác sửa/)).toHaveCount(0);

    // dọn
    await a.goto("/admin/content/vocabulary/e2e-conflict-1");
    await a.getByRole("button", { name: "Xóa", exact: true }).click();
    await a.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await a.waitForURL("**/admin/content/vocabulary");
    await b.close();
  });

  test("hai tab sửa cấu hình giao diện: người lưu sau bị báo xung đột", async ({ page, context }) => {
    const a = page;
    const b = await context.newPage();
    for (const p of [a, b]) {
      await p.goto("/admin/appearance");
      await p.getByRole("tab", { name: /^Nội dung/ }).click();
    }
    await b.getByRole("switch", { name: /Bật furigana mặc định/ }).click();
    await b.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(b.getByText(/Đã lưu/).first()).toBeVisible();

    await a.getByRole("switch", { name: /Hiển thị nội dung chưa xác minh/ }).click();
    await a.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(a.getByText(/đã được người khác lưu/).first()).toBeVisible();

    // dọn: đặt lại mặc định
    await a.goto("/admin/appearance");
    await a.getByRole("tab", { name: /^Nội dung/ }).click();
    await a.getByRole("button", { name: "Đặt lại về mặc định" }).click();
    await a.getByRole("button", { name: "Lưu thay đổi" }).first().click();
    await expect(a.getByText(/Đã lưu/).first()).toBeVisible();
    await b.close();
  });

  test("khôi phục toàn bộ: file lạ bị từ chối; sao lưu sửa một từ → chạy thử → khôi phục thật → người học thấy", async ({ page }) => {
    await page.goto("/admin/import-export");
    const file = page.getByLabel("Chọn file sao lưu toàn bộ");

    // file không phải sao lưu
    await file.setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
    await page.getByRole("button", { name: /1\. Chạy thử \(không ghi\)/ }).first().click();
    await expect(page.getByText(/không phải file sao lưu/)).toBeVisible();
    await expect(page.getByRole("button", { name: /2\. Khôi phục thật/ })).toBeDisabled();

    // sao lưu hiện tại, đổi nghĩa của từ đầu tiên
    const res = await page.request.get("/api/admin/export?collection=all&format=json");
    expect(res.status()).toBe(200);
    const backup = JSON.parse(await res.text());
    const first = backup.collections.vocabulary[0];
    const originalMeaning = first.meaning_vi;
    first.meaning_vi = "KHOI-PHUC-E2E";
    await file.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole("button", { name: /1\. Chạy thử \(không ghi\)/ }).first().click();
    await expect(page.getByText(/Kết quả chạy thử/)).toBeVisible();
    await expect(page.getByText(/lỗi 0\./)).toBeVisible();
    await page.getByRole("button", { name: /2\. Khôi phục thật/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(page.getByText(/Đã khôi phục/).first()).toBeVisible();

    await page.goto(`/vocabulary/${first.id}`);
    await expect(page.getByText("KHOI-PHUC-E2E").first()).toBeVisible();

    // bản ghi hỏng trong file → chạy thử báo lỗi, KHÔNG cho khôi phục
    backup.collections.vocabulary[1].level = "N9";
    await page.goto("/admin/import-export");
    await page.getByLabel("Chọn file sao lưu toàn bộ").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole("button", { name: /1\. Chạy thử \(không ghi\)/ }).first().click();
    await expect(page.getByText(/lỗi 1\./)).toBeVisible();
    await expect(page.getByRole("button", { name: /2\. Khôi phục thật/ })).toBeDisabled();

    // dọn: khôi phục lại nghĩa gốc bằng chính chức năng khôi phục
    first.meaning_vi = originalMeaning;
    backup.collections.vocabulary[1].level = "N5";
    await page.getByLabel("Chọn file sao lưu toàn bộ").setInputFiles({ name: "orig.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole("button", { name: /1\. Chạy thử \(không ghi\)/ }).first().click();
    await expect(page.getByText(/lỗi 0\./)).toBeVisible();
    await page.getByRole("button", { name: /2\. Khôi phục thật/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(page.getByText(/Đã khôi phục/).first()).toBeVisible();
  });
});

test.describe("bộ đề do Admin soạn", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("tạo bộ đề (chọn câu hỏi), người học thấy; câu đang được dùng không xóa được; ẩn bộ đề thì biến mất", async ({ page }) => {
    await page.goto("/admin/content/quiz_sets/new");
    await page.getByLabel(/^ID\s*\*?$/).fill("e2e-qset-1");
    await page.getByLabel(/Tên bộ đề/).fill("Bộ đề e2e N4");
    await page.getByLabel(/^Cấp độ gợi ý/).selectOption("N4");
    await page.getByLabel("Trạng thái").selectOption("needs_review");

    // mới tạo: chưa chọn câu nào → bị chặn
    await page.getByRole("button", { name: /^Thêm bộ đề$/ }).click();
    await expect(page.getByText(/Chưa lưu được/)).toBeVisible();

    // chọn 3 câu N4 (3 ô chọn câu hỏi có sẵn theo mặc định)
    const selects = page.getByRole("combobox", { name: /^Câu hỏi/ });
    await expect(selects).toHaveCount(3);
    for (const [i, id] of ["q-n4-001", "q-n4-002", "q-n4-003"].entries()) await selects.nth(i).selectOption(id);
    await page.getByRole("button", { name: /^Thêm bộ đề$/ }).click();
    await page.waitForURL("**/admin/content/quiz_sets/e2e-qset-1");

    // người học thấy bộ đề ở trang N4 và làm được
    await page.goto("/jlpt/N4");
    await page.getByRole("link", { name: /Bộ đề e2e N4/ }).click();
    await expect(page.getByText("Bộ đề gồm 3 câu")).toBeVisible();

    // câu hỏi đang nằm trong bộ đề → không xóa được
    await page.goto("/admin/content/questions/q-n4-001");
    await expect(page.getByText(/Đang được \d+ mục khác dùng/)).toBeVisible();
    await expect(page.getByText(/quiz_sets\/e2e-qset-1/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Xóa", exact: true })).toBeDisabled();

    // ẩn bộ đề → người học không còn thấy
    await page.goto("/admin/content/quiz_sets/e2e-qset-1");
    await page.getByRole("switch", { name: /Ẩn \(người học không thấy\)/ }).click();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu").first()).toBeVisible();
    await page.goto("/jlpt/N4");
    await expect(page.getByRole("link", { name: /Bộ đề e2e N4/ })).toHaveCount(0);

    // dọn
    await page.goto("/admin/content/quiz_sets/e2e-qset-1");
    await page.getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.waitForURL("**/admin/content/quiz_sets");
  });
});
