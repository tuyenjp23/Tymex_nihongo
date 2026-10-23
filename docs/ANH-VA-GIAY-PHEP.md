# Hình ảnh Nhật Bản: nguồn và giấy phép

## Tình trạng hiện tại (đọc trước)

- **Mã nguồn đã sẵn sàng dùng ảnh thật** (`next/image`, khai báo width/height, lazy-load, alt, lớp phủ tối giúp chữ đọc được, tự chuyển sang tranh dự phòng nếu ảnh lỗi).
- **File ảnh thật CHƯA có trong dự án.** Môi trường mà tôi làm việc chặn máy chủ `unsplash.com` (proxy trả 403), nên tôi không tải được ảnh và cũng **chưa nhìn tận mắt** bất kỳ ảnh nào. Tôi không dùng đường vòng nào để lách giới hạn đó.
- Vì vậy giao diện hiện dùng **tranh SVG tự vẽ** (`src/components/art/japan-art.tsx`: Phú Sĩ, torii, hoa anh đào, tháp chùa, lá đỏ, đèn lồng, tàu, văn phòng, phố, thư pháp). Tranh này do dự án tự tạo, không dính giấy phép bên thứ ba.
- Để có ảnh thật, chạy trên máy bạn một lệnh (mục 2). Ảnh được chọn dựa trên tiêu đề, thẻ và địa điểm ghi trên trang ảnh; **hãy xem lại bằng mắt** xem có hợp tông màu và có muốn giữ không.

## 1. Danh sách ảnh được chọn

Tất cả đều ghi trên trang ảnh của Unsplash là "Free to use under the Unsplash License" (kiểm tra ngày 2026-10-23). Giấy phép này cho dùng miễn phí, kể cả mục đích thương mại, không bắt buộc ghi công; dự án vẫn ghi công tác giả ở đây. Không được bán lại ảnh nguyên bản như ảnh độc lập, và không dùng để dựng một dịch vụ ảnh cạnh tranh. Hãy đọc lại điều khoản hiện hành tại <https://unsplash.com/license>.

| Vị trí (slot) | Dùng ở | Trang ảnh | Tác giả | Địa điểm theo trang ảnh |
|---|---|---|---|---|
| `hero-fuji` | Banner Dashboard, JLPT N1 | <https://unsplash.com/photos/n--CMLApjfI> | Manuel Cosentino | Chùa Chureito, Fujiyoshida (nhìn ra núi Phú Sĩ) |
| `sakura` | JLPT N5 | <https://unsplash.com/photos/8sOZJ8JF0S8> | Sora Sagano | Sông Meguro, Tokyo |
| `torii` | JLPT N4, Kanji Quest | <https://unsplash.com/photos/EJvGBYjrwEA> | David Emrich | Fushimi Inari, Kyoto |
| `kyoto` | JLPT N3, thẻ Kính ngữ | <https://unsplash.com/photos/SlIl9eZjWUc> | Roméo A. | Kyoto |
| `autumn` | JLPT N2 | <https://unsplash.com/photos/PMkQ7WVWqr0> | Svetlana Gumerova | Chùa Chureito, Fujiyoshida (mùa thu) |
| `station` | Thẻ chủ đề Nhà ga & đi lại | <https://unsplash.com/photos/wffp0K8sr7s> | Samantha Hendrata | Kyoto |
| `city` | Thẻ chủ đề Mua sắm | <https://unsplash.com/photos/alY6_OpdwRQ> | Jezael Melgoza | Shibuya, Tokyo |
| `izakaya` | Thẻ chủ đề Nhà hàng | <https://unsplash.com/photos/AVGywODVmro> | natsuki | Trang ảnh không ghi địa điểm (thẻ: japanese, izakaya, enoshima) |

Ghi chú:

- Chủ đề **Công sở**, **thư pháp**, **hiragana/katakana** chỉ dùng tranh vẽ: không tìm được ảnh phù hợp mà tôi kiểm chứng được địa điểm (một ảnh thư pháp ứng viên chụp ở Bắc Kinh nên bị loại).
- Nguồn dữ liệu đầy đủ (ID, đường dẫn tác giả, mô tả thay thế/alt) nằm ở `src/config/japan-photos.ts`.

## 2. Cách tải ảnh về (trên máy bạn)

```
npm run photos:fetch
```

Lệnh này:

- chỉ tải đúng 8 ảnh ở bảng trên, **lần lượt từng ảnh** (không tải hàng loạt), từ đường dẫn tải chính thức của từng trang ảnh;
- thu nhỏ về tối đa 2000 px cạnh dài, lưu JPEG vào `public/images/japan/`;
- ghi kích thước vào `src/config/japan-photos.generated.json` (để `next/image` giữ chỗ, không xô lệch bố cục);
- tùy chọn: `--only hero-fuji,sakura`, `--force` (tải lại), `--dry-run` (chỉ liệt kê).

Sau đó: xem lại ảnh trên trang chủ, `/jlpt`, `/conversation`, `/games`; hài lòng thì commit `public/images/japan/` và `src/config/japan-photos.generated.json` rồi push. Ảnh nào tải lỗi thì chỉ riêng ảnh đó quay về tranh vẽ.

Nếu muốn đổi ảnh: sửa ID trong `PHOTO_SOURCES`, chạy lại `npm run photos:fetch -- --force --only <slot>`, và cập nhật bảng ở file này.

## 3. Lưu ý khi triển khai

- Ảnh được phục vụ từ chính website (không nhúng link ngoài lúc chạy). Vercel có hạn mức tối ưu hóa ảnh theo gói; hãy xem trang giới hạn hiện hành của Vercel. Ảnh chỉ có 8 tấm nên mức dùng thấp.
- Ảnh phía dưới màn hình dùng lazy-load; ảnh banner đầu trang (Dashboard, chi tiết JLPT, Kanji Quest) dùng `priority`.
- Mọi ảnh trang trí có `alt` rỗng; ảnh có nghĩa có `alt` tiếng Việt mô tả nội dung.
