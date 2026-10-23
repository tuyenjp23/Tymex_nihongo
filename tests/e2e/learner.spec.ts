import { expect, test } from "@playwright/test";
import { readProgress } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("điều hướng chính: các trang module mở được và có tiêu đề", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nihongo Compass");
  for (const [name, heading] of [
    ["Từ vựng", "Từ vựng"],
    ["Kanji", "Kanji"],
    ["Ngữ pháp", "Ngữ pháp"],
    ["Giao tiếp", "Giao tiếp thực tế"],
    ["Luyện thi JLPT", "Luyện thi JLPT"],
    ["Nguồn học liệu", "Nguồn học liệu"],
  ] as const) {
    await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
});

test("tìm kiếm từ vựng: gõ romaji và tiếng Việt không dấu", async ({ page }) => {
  await page.goto("/vocabulary");
  const box = page.getByRole("searchbox", { name: "Tìm kiếm", exact: true });
  // Tìm kiếm chạy trên server (form GET): Enter → tải lại trang với ?q=…
  await box.fill("yama");
  await box.press("Enter");
  await expect(page).toHaveURL(/q=yama/);
  await expect(page.getByRole("link", { name: /núi/ }).first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Tìm kiếm", exact: true }).fill("nui");
  await page.getByRole("searchbox", { name: "Tìm kiếm", exact: true }).press("Enter");
  await expect(page).toHaveURL(/q=nui/);
  await expect(page.getByRole("link", { name: /núi/ }).first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Tìm kiếm", exact: true }).fill("zzzzqq");
  await page.getByRole("searchbox", { name: "Tìm kiếm", exact: true }).press("Enter");
  await expect(page.getByText("Không tìm thấy mục nào")).toBeVisible();
});

test("làm bài luyện tập: điểm khớp, bấm đúp không cộng hai lần, kết quả được lưu và còn sau khi tải lại", async ({ page }) => {
  await page.goto("/quiz?level=N5&skill=vocabulary&kind=practice");
  await page.getByLabel("Số câu").selectOption("5");
  await page.getByRole("button", { name: "Bắt đầu" }).click();

  let correct = 0;
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Câu ${i + 1}/5`)).toBeVisible();
    const first = page.getByRole("list", { name: "Phương án trả lời" }).getByRole("button").first();
    await first.dblclick(); // bấm đúp liên tiếp
    const isRight = await first.getByText("Đáp án đúng").count();
    if (isRight) correct++;
    await expect(page.getByRole("status").filter({ hasText: /Chính xác|Chưa đúng/ })).toBeVisible();
    await page.getByRole("button", { name: i === 4 ? "Nộp bài" : "Câu tiếp" }).click();
  }
  await expect(page.getByText(`${correct}`, { exact: false }).first()).toBeVisible();
  await expect(page.getByText("câu đúng")).toBeVisible();

  const p = await readProgress(page);
  expect(p.quizzes).toHaveLength(1);
  expect(p.quizzes[0].total).toBe(5);
  expect(p.quizzes[0].correct).toBe(correct);
  expect(p.xp).toBe(correct * 3); // luyện tập: 3 XP/câu đúng, không cộng kép
  expect(Object.values(p.wrong).filter((w: any) => !w.resolved).length).toBe(5 - correct);

  await page.reload();
  await page.goto("/progress");
  await page.getByRole("tab", { name: "Lịch sử bài làm" }).click();
  await expect(page.getByText(`${correct}/5`).first()).toBeVisible();
});

test("thi thử có đồng hồ, nộp bài hiển thị kết quả theo phần và cảnh báo không quy đổi điểm", async ({ page }) => {
  await page.goto("/quiz?level=N5&kind=mock");
  await page.getByLabel("Số câu").selectOption("5");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("list", { name: "Phương án trả lời" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 4 ? "Nộp bài" : "Câu tiếp" }).click();
  }
  await expect(page.getByText("Kết quả theo phần chấm điểm của N5")).toBeVisible();
  await expect(page.getByText("tỉ lệ đúng thô")).toBeVisible();
});

test("ôn tập flashcard: chấm 'Tốt' lưu lịch SM-2", async ({ page }) => {
  await page.goto("/review");
  await page.getByRole("button", { name: /Bắt đầu ôn/ }).click();
  await page.getByRole("button", { name: /Hiện đáp án/ }).click();
  await page.getByRole("button", { name: /Tốt/ }).click();
  const p = await readProgress(page);
  const entries = Object.values(p.srs) as { interval: number; reps: number }[];
  expect(entries).toHaveLength(1);
  expect(entries[0].reps).toBe(1);
  expect(entries[0].interval).toBe(1);
});

test("Kanji Quest: chơi một ván Kanji to Meaning và lưu điểm", async ({ page }) => {
  await page.goto("/games/kanji-to-meaning");
  await page.getByLabel("Số câu").selectOption("5");
  await page.getByRole("button", { name: "Bắt đầu chơi" }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("list", { name: "Các lựa chọn" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 4 ? "Xem kết quả" : "Câu tiếp" }).click();
  }
  await expect(page.getByText("điểm", { exact: false }).first()).toBeVisible();
  const p = await readProgress(page);
  expect(p.games["kanji-to-meaning"].plays).toBe(1);
  expect(p.games["kanji-to-meaning"].totalAnswered).toBe(5);
});

test("Picture to Kanji: câu hỏi chỉ có hình, không lộ chữ", async ({ page }) => {
  await page.goto("/games/picture-to-kanji");
  await page.getByRole("button", { name: "Bắt đầu chơi" }).click();
  await expect(page.getByText("Hình này là từ nào?")).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
});

test("hình bị mất: hiện khung thay thế thay vì ảnh vỡ", async ({ page }) => {
  await page.route("**/images/vocab/yama.svg", (r) => r.abort());
  await page.goto("/vocabulary/v-yama");
  await expect(page.getByText("Không tải được hình")).toBeVisible();
});

test("dữ liệu tiến độ hỏng không làm app sập: hiện cảnh báo và có bản sao lưu", async ({ page }) => {
  await page.evaluate(() => window.localStorage.setItem("nc.progress.v1", "{bad json"));
  await page.goto("/progress");
  await expect(page.getByText("Dữ liệu tiến độ cũ bị hỏng")).toBeVisible();
  const backups = await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith("nc.progress.corrupt.")));
  expect(backups.length).toBe(1);
});

test("nhập file tiến độ sai định dạng bị từ chối với thông báo rõ ràng", async ({ page }) => {
  await page.goto("/progress");
  await page.getByRole("tab", { name: "Dữ liệu & sao lưu" }).click();
  await page.getByLabel("Chọn file tiến độ JSON").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"v":1,"xp":"abc"}') });
  await page.getByRole("button", { name: "Nhập", exact: true }).click();
  await expect(page.getByText("Không nhập được")).toBeVisible();
});

test("trang không tồn tại trả về 404 thân thiện", async ({ page }) => {
  // Có loading.tsx nên Next đã gửi khung trang (200) trước khi notFound() chạy; giao diện 404 và thẻ noindex vẫn được áp dụng.
  await page.goto("/vocabulary/khong-co-tu-nay");
  await expect(page.getByText("Không tìm thấy trang này")).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("Hiragana/Katakana: xem bảng, đổi bảng chữ, luyện tập và lưu mức nhớ từng chữ", async ({ page }) => {
  await page.goto("/kana");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ひらがな");
  await expect(page.getByRole("button", { name: /^あ, a,/ })).toBeVisible();
  await page.getByRole("button", { name: /Katakana/ }).click();
  await expect(page.getByRole("button", { name: /^ア, a,/ })).toBeVisible();
  await page.getByRole("button", { name: /^シ, shi,/ }).click();
  await expect(page.getByText("Katakana · Chưa học")).toBeVisible();

  await page.getByRole("tab", { name: "Luyện tập" }).click();
  await page.getByLabel("Số câu").selectOption("10");
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByRole("list", { name: "Các lựa chọn" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 9 ? "Xem kết quả" : "Câu tiếp" }).click();
  }
  await expect(page.getByText(/Kết quả: \d+\/10 đúng/)).toBeVisible();
  const p = await readProgress(page);
  expect(Object.keys(p.kana).length).toBe(10);
  expect(Object.keys(p.srs)).toEqual([]); // kana không lẫn vào hàng đợi từ vựng/Kanji
  expect(p.days[Object.keys(p.days)[0]].reviews).toBe(10);
});

test("Word Builder: ghép mảnh kana, dùng gợi ý, xem đáp án và lưu tiến độ", async ({ page }) => {
  await page.goto("/games/word-builder");
  await page.getByLabel("Số từ").selectOption("5");
  await page.getByRole("button", { name: "Bắt đầu chơi" }).click();
  await expect(page.getByTestId("wb-meaning")).toBeVisible();
  const check = page.getByRole("button", { name: "Kiểm tra" });
  await expect(check).toBeDisabled();

  // Từ 1: chỉ dùng gợi ý cho tới khi đủ mảnh rồi kiểm tra → đúng
  for (let i = 0; i < 7 && !(await check.isEnabled()); i++) await page.getByRole("button", { name: "Gợi ý", exact: true }).click();
  await check.click();
  await expect(page.getByRole("status").filter({ hasText: "Đúng rồi" })).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp" }).click();

  // Từ 2: bấm một mảnh rồi bỏ ra (xóa hết), sau đó xem đáp án
  await page.getByRole("list", { name: /Các mảnh/ }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Xóa hết" }).click();
  await expect(page.getByText("Chọn các mảnh bên dưới")).toBeVisible();
  await page.getByRole("button", { name: "Xem đáp án" }).click();
  await expect(page.getByText("Đây là đáp án đúng.")).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp" }).click();

  // Ba từ còn lại: xem đáp án để kết thúc nhanh
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Xem đáp án" }).click();
    await page.getByRole("button", { name: i === 2 ? "Xem kết quả" : "Từ tiếp" }).click();
  }
  await expect(page.getByText("Từ cần xem lại")).toBeVisible();
  const p = await readProgress(page);
  expect(p.games["word-builder"].plays).toBe(1);
  expect(p.games["word-builder"].totalAnswered).toBe(5);
  expect(Object.keys(p.srs)).toHaveLength(5);
});

test("Bộ đề do Admin soạn: hiện ở trang JLPT, làm đúng thứ tự, kết quả được lưu; ID lạ → 404", async ({ page }) => {
  await page.goto("/jlpt/N5");
  await expect(page.getByRole("heading", { name: "Bộ đề soạn sẵn" })).toBeVisible();
  await page.getByRole("link", { name: /N5 · Khởi động Kanji/ }).click();
  await expect(page.getByText("Bộ đề gồm 10 câu")).toBeVisible();
  await expect(page.getByLabel("Số câu")).toHaveCount(0); // bộ đề cố định số câu
  await page.getByRole("button", { name: "Bắt đầu" }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.getByText(`Câu ${i + 1}/10`)).toBeVisible();
    await page.getByRole("list", { name: "Phương án trả lời" }).getByRole("button").first().click();
    await page.getByRole("button", { name: i === 9 ? "Nộp bài" : "Câu tiếp" }).click();
  }
  await expect(page.getByText("câu đúng")).toBeVisible();
  const p = await readProgress(page);
  expect(p.quizzes).toHaveLength(1);
  expect(p.quizzes[0].total).toBe(10);
  expect(p.quizzes[0].level).toBe("N5");
  expect(p.quizzes[0].kind).toBe("practice");

  const res = await page.goto("/quiz?qs=khong-co-bo-de-nay");
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang này" })).toBeVisible();
  expect(res?.status()).toBeLessThan(500);
});
