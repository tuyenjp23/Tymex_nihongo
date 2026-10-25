# BÁO CÁO RÀ SOÁT NỘI DUNG — Đợt 2026-10-25

> **Bản chất đợt rà soát:** rà soát KỸ THUẬT bằng AI (đối chiếu quy tắc/chuẩn công khai và tự kiểm tra chéo trong repo).
> Đây **không phải** xác minh bởi giáo viên hay người bản ngữ. Toàn bộ nội dung seed vẫn giữ nguyên trạng thái
> nguồn gốc `ai_generated` / nhãn **“AI soạn — chưa xác minh”**; báo cáo này không thay đổi `verification_status`/`provenance` của bất kỳ bản ghi nào.

## 1. Phạm vi đã rà

Chỉ dữ liệu **seed tự soạn** trong `content/src/*.mjs` và cấu hình kiến thức nền:

| Khu vực | Số lượng | File |
|---|---|---|
| Bảng kana + romaji | 46 âm cơ bản, dakuten/handakuten, 33 âm ghép yōon | `src/lib/kana.ts`, `src/lib/kana-table.ts` |
| Cấu trúc/thang điểm JLPT | N5–N1 | `src/config/jlpt.ts` |
| Ngữ pháp | 26 mẫu (13 gốc + 13 mở rộng) | `content/src/grammar.mjs`, `content/src/extra.mjs` |
| Câu hỏi + đoạn đọc/nghe | 81 câu hỏi, 4 đoạn | `content/src/questions.mjs`, `content/src/extra.mjs` |
| Bài học | 18 bài | `content/src/lessons.mjs` |
| Hội thoại | 14 hội thoại (kèm drills/roleplay/notes) | `content/src/conversations.mjs` |
| Từ vựng seed | ~130 mục | `content/src/vocab.mjs`, `content/src/extra.mjs` |
| Kanji seed | ~70 mục (âm Hán Việt, on/kun, từ ghép, ví dụ) | `content/src/kanji.mjs`, `content/src/extra.mjs` |

**Không** rà từng mục dữ liệu nhập khẩu số lượng lớn (JMdict/KANJIDIC2/Tatoeba và các bản dịch máy suy ra từ đó) — xem mục 4.

## 2. Nguồn chuẩn đã đối chiếu

- **JLPT chính thức** (jlpt.jp): trang cấu trúc phần thi/thời gian và trang kết quả (thang điểm, điểm liệt, điểm đỗ), đối chiếu lại ngày 2026-10-25.
- **Bảng gojuuon chuẩn**: 46 âm cơ bản, hàng/cột, dakuten/handakuten, yōon; romaji **Hepburn** chuẩn (し=shi, ち=chi, つ=tsu, ふ=fu, じ=ji, ぢ=ji, づ=zu, を=o khi là trợ từ…).
- **Từ điển mở có sẵn trong hệ sinh thái của repo** (JMdict/KANJIDIC2) làm tham chiếu chéo cho cách đọc/âm Hán Việt/on-kun của kanji và từ vựng seed.
- Kiến thức ngữ pháp JLPT phổ thông (cách chia, điều kiện dùng, lỗi thường gặp) — chỉ dùng **sự thật ngôn ngữ** để kiểm chứng, không sao chép văn bản của bất kỳ giáo trình/nguồn có bản quyền nào.

## 3. Kết quả và các lỗi đã sửa

### 3.1. Lỗi đã tìm thấy và ĐÃ SỬA (2 lỗi)

1. **`content/src/grammar.mjs` — mẫu 〜ざるを得ない (N1), phần `formation`:** câu hướng dẫn cách chia viết sai/sai nghĩa (“Ngăn ない của động từ…”). Đã sửa thành: *“Thể ない của động từ, bỏ ない + ざるを得ない”* (các ví dụ chia 行かざるを得ない／食べざるを得ない／せざるを得ない vốn đúng, giữ nguyên).
2. **`content/src/extra.mjs` — mẫu 〜ようになる (N3), ví dụ 2:** bản dịch tiếng Việt “Dạo này anh ấy đã dậy sớm hơn” chưa đúng nghĩa mẫu (thay đổi thói quen theo thời gian). Đã sửa thành: *“Dạo này anh ấy đã thành thói quen dậy sớm.”* (câu Nhật vốn đúng, giữ nguyên).

Sau khi sửa đã chạy `npm run build:seed`; `git diff` của `content/seed/` chỉ thay đổi đúng 2 chỗ trên trong `content/seed/grammar.json`.

### 3.2. Đã kiểm tra và KHÔNG phát hiện sai lệch

- **Kana (`src/lib/kana.ts`, `kana-table.ts`):** đủ 46 âm cơ bản đúng thứ tự hàng/cột (hàng わ gồm わ・を và ん ở hàng riêng), dakuten đủ 5 hàng g/z/d/b/p, yōon đủ 11 hàng × 3 = 33 âm; romaji Hepburn đúng ở các âm hay sai (し/ち/つ/ふ/じ/ぢ/づ), ghi chú đặc biệt （は→wa, へ→e, を→o khi làm trợ từ; ぢ/づ trùng âm じ/ず) đã có và đúng.
- **JLPT (`src/config/jlpt.ts`):** khớp trang chính thức ở mọi cấp — thời gian từng phần (N1: 110+55; N2: 105+50; N3: 30+70+40; N4: 25+55+35; N5: 20+40+30), thang điểm (N1–N3: 3 phần × 60, điểm liệt 19/phần; N4–N5: 120 điểm liệt 38 + nghe 60 điểm liệt 19), điểm đỗ tổng (N1 100, N2 90, N3 95, N4 90, N5 80). Mô tả năng lực từng cấp là diễn giải tiếng Việt bám sát bản tóm tắt chính thức.
- **Ngữ pháp (24/26 mẫu còn lại):** cấu trúc, cách chia (thể て/た/ない, ngoại lệ 行って, せざるを得ない…), nghĩa, ví dụ, furigana, bản dịch, mục so sánh và lỗi thường gặp đều đúng; không sửa.
- **Câu hỏi (81 câu):** kiểm tra thủ công từng đáp án đúng/nhiễu/giải thích **và** kiểm tra tự động (chỉ số đáp án trong khoảng, mọi `ref` trỏ tới bản ghi có thật, không trùng phương án, đáp án phần đọc/nghe khớp nội dung đoạn). Không phát hiện câu sai đáp án.
- **Bài học (18) và hội thoại (14):** câu Nhật tự nhiên, trợ từ và cách chia đúng, furigana đúng ngữ cảnh; phần kính ngữ đúng nguyên tắc uchi/soto khi nghe điện thoại/tiếp khách (gọi người trong công ty bằng họ trần với khách). Không phát hiện lỗi rõ ràng.
- **Từ vựng/Kanji seed:** cách đọc, nghĩa Việt, âm Hán Việt (theo âm phổ biến chuẩn), on/kun và từ ghép đã đối chiếu; kiểm tra chéo tự động mọi chú thích furigana `{漢字|よみ}` trong `content/src` với cách đọc đã biết của từ/từ ghép — 2 trường hợp tưởng như “lệch” hoá ra là cách đọc đúng theo ngữ cảnh （外す=はずす, 足りる=たりる), không phải lỗi.

## 4. Giới hạn còn lại (ghi trung thực)

- **Dữ liệu nhập khẩu số lượng lớn chưa được rà từng mục:** hàng nghìn từ vựng/kanji/câu ví dụ đến từ nguồn mở (JMdict/KANJIDIC2/Tatoeba) và lớp gợi ý cấp độ/chủ đề nằm **ngoài** phạm vi đợt này.
- **Một phần nghĩa tiếng Việt là dịch máy** (đã có cơ chế gắn cờ `machine_translated`/ghi chú trong ứng dụng) — chưa được người kiểm chứng.
- Rà soát này do AI thực hiện, dù đã đối chiếu chuẩn công khai và tự kiểm tra chéo, **vẫn có thể sót lỗi tinh vi** (sắc thái, mức tự nhiên của câu, furigana ở từ ghép hiếm).
- **Khuyến nghị bắt buộc trước khi công bố rộng rãi:** giáo viên tiếng Nhật/người bản ngữ duyệt cuối toàn bộ nội dung seed; chỉ sau bước đó mới cân nhắc gỡ nhãn “AI soạn — chưa xác minh”.

## 5. Phụ lục — thay đổi đi kèm đợt này (không thuộc rà soát nội dung)

Thêm 3 chế độ chơi vào Kanji Quest: **Listening Quest** （聞き取りクエスト, prompt dạng “audio” — chỉ phát âm, không hiện chữ trước khi trả lời), **Reverse Recall** （逆引きリコール, nghĩa Việt → chọn từ Nhật) và **Odd One Out** （仲間はずれ, tìm từ lạc chủ đề). Chi tiết kỹ thuật xem `git diff` các file `src/config/games.ts`, `src/lib/games/*`, `src/components/games/*`, `src/components/icons.tsx` và test mới trong `tests/unit/learning.test.ts`. Kiểm chứng: `build:seed` ✅, `typecheck` ✅, `npm test` 318/318 ✅, `npm run build` ✅ (kết quả tại thời điểm viết báo cáo).
