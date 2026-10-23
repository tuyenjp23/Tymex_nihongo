# Hướng dẫn nội dung & nguồn gốc

## Ba loại nguồn gốc
| Nhãn trong ứng dụng | Ý nghĩa | Điều kiện để lưu |
|---|---|---|
| Mẫu chính thức (dùng đúng quyền) | Trích/tham chiếu tài liệu chính thức mà quyền sử dụng lại đã được xác nhận | Phải gắn một nguồn thuộc loại **chính thức** (`official_exam`/`official_education`) và nguồn đó **không** ở trạng thái quyền "không" hoặc "chưa rõ" |
| Tự biên soạn | Do người biên soạn tự viết | Không có điều kiện thêm |
| AI tạo, chưa xác minh | Do AI soạn | Luôn hiện nhãn cảnh báo cho người học cho đến khi một người xác minh |

AI-made questions không bao giờ được hiển thị như đề chính thức.

## Năm trạng thái
`Bản nháp` → `AI soạn – chưa xác minh` → `Cần rà soát` → `Đã xác minh nội dung` → `Đã xuất bản`.

- **Bản nháp luôn ẩn** với người học.
- `Đã xác minh` và `Đã xuất bản` cần **người rà soát (người thật)** và **ngày xác minh**. Tên AI (Claude, GPT, Gemini…) bị từ chối.
- Mục có thể bị **ẩn** (hidden) mà không cần xóa.

## Quy trình rà soát gợi ý
1. `/admin/content/<loại>` → lọc theo trạng thái "AI soạn – chưa xác minh".
2. Mở từng mục, đối chiếu nghĩa, cách đọc, Kanji, ví dụ, đáp án câu hỏi.
3. Sửa nếu sai; điền "Người rà soát" = tên bạn, "Ngày xác minh" = hôm nay.
4. Đổi trạng thái sang "Đã xác minh" (nội bộ) hoặc "Đã xuất bản".
5. `/admin/audit` ghi lại ai đổi gì, lúc nào, giá trị trước/sau.

## Furigana trong văn bản
Viết `{漢字|かんじ}` để hiện chú âm trên chữ Hán, ví dụ `{山|やま}が{高|たか}い`. Admin cảnh báo khi cú pháp sai hoặc chú âm rỗng.

## Từ trừu tượng và hình minh họa
- Đánh dấu từ **không hình hóa được** (tự do, tình cảm, mặc dù…) bằng cách bỏ chọn "Có thể minh họa bằng hình". Từ đó không bao giờ xuất hiện trong trò chơi dựa vào hình.
- Hình phải có **mô tả thay thế** (alt), **nguồn** và **ghi chú giấy phép**.
- Không dùng ảnh bạn không có quyền sử dụng. Không tải ảnh từ website khi chưa đọc điều khoản của họ.

## Thêm hàng loạt bằng CSV/JSON
- Xuất loại nội dung hiện có để lấy đúng cột.
- Ô chứa danh sách đơn giản (chuỗi) có thể viết cách nhau bằng `|`; ô chứa cấu trúc phức tạp (ví dụ `examples`) viết dạng JSON.
- Ô bắt đầu bằng `=`, `+`, `@` (hoặc `-` không phải số) được thêm dấu `'` khi **xuất** để Excel không coi là công thức; dấu này được tự bỏ khi nhập lại.
- Luôn bấm "Chạy thử" trước; báo cáo cho từng dòng (thêm mới / cập nhật / lỗi). Tối đa 2000 dòng và 5 MB mỗi lần.
- Cột vắng mặt: bản ghi đã có giữ giá trị cũ; bản ghi mới dùng mặc định an toàn (tự biên soạn, bản nháp).

## Kiểm tra bằng dòng lệnh
```bash
npm run validate:content            # kiểm tra content/seed
npm run validate:content -- data    # kiểm tra các thay đổi Admin đã ghi trong data/
```
Lệnh thoát với mã khác 0 nếu có lỗi (dùng được trong CI).

## Đề JLPT
JLPT hiện **không công bố danh sách từ vựng/Kanji/ngữ pháp theo cấp**, nên nhãn cấp (N5–N1) của nội dung mẫu là ước lượng của người biên soạn. Điểm thi thử là tỉ lệ đúng thô, không quy đổi sang điểm JLPT. Cấu hình cấu trúc kỳ thi nằm ở `src/config/jlpt.ts` (đã đối chiếu với trang chính thức ngày 2026-10-22; cần kiểm tra lại định kỳ).

## Nội dung mẫu có sẵn được sinh từ đâu
`content/seed/*.json` và `supabase/seed.sql` là **file sinh ra**, không sửa tay:
- `content/src/{vocab,kanji,grammar,questions,conversations,lessons,sources,icons}.mjs`: nội dung N5 gốc.
- `content/src/extra.mjs`: nội dung bổ sung N4–N1 (từ, Kanji, ngữ pháp, câu hỏi). Mọi bản ghi vẫn là "AI tạo, chưa xác minh".
- `content/src/quiz-sets.mjs`: các bộ đề soạn sẵn (tham chiếu câu hỏi theo ID).
- Quy trình: sửa file nguồn → `npm run build:seed` → `npm run seed:sql` → `npm run validate:content` → `npm test`. CI cũng kiểm tra seed khớp với bộ sinh.
- Khóa (`key`) của từ, Kanji, ngữ pháp phải **duy nhất**; bộ sinh báo lỗi "Trùng key …" nếu trùng.
- Nếu bạn đã dùng Admin (thư mục `data/`), dữ liệu của bạn ghi đè seed theo ID; dựng lại seed không làm mất dữ liệu đó.

## Bộ đề (quiz_sets)
Admin → "Bộ đề": chọn cấp, loại (luyện tập/kiểm tra/thi thử), danh sách câu hỏi theo thứ tự, trộn hay không. Câu hỏi đang nằm trong một bộ đề không xóa được (ứng dụng báo nơi đang dùng).

## Khôi phục sao lưu
`/admin/import-export` → "Khôi phục từ file sao lưu": chạy thử trước; khi áp dụng thì ghi tất cả hoặc không ghi gì; chỉ thêm/cập nhật theo ID, không xóa mục nào.
