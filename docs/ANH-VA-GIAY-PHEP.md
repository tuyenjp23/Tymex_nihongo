# Hình ảnh Nhật Bản: nguồn và giấy phép

## Tình trạng hiện tại (đọc trước)

- **Ảnh thật ĐÃ có trong dự án** (từ ngày 2026-10-25): đủ 8 ảnh ở `public/images/japan/`, kích thước khai báo trong `src/config/japan-photos.generated.json`. Giao diện ưu tiên ảnh thật (`next/image`, width/height, lazy-load, alt, lớp phủ tối giúp chữ đọc được) và tự chuyển sang tranh SVG dự phòng (`src/components/art/japan-art.tsx`) nếu ảnh lỗi.
- **Nguồn ảnh: Wikimedia Commons**, chỉ lấy ảnh giấy phép tự do — CC0, Public Domain, CC BY, CC BY-SA. Giấy phép của từng ảnh được đọc từ metadata (LicenseShortName/LicenseUrl) trên trang File: của ảnh ngày 2026-10-25; ảnh dính điều khoản NC/ND hoặc giấy phép không rõ đều bị loại. Từng ảnh đã được mở xem để xác nhận đúng địa điểm/chủ đề như `alt` mô tả, rõ nét, không watermark.
- Chủ dự án đã duyệt chủ trương lấy ảnh từ web; dự án chọn nguồn giấy phép tự do và ghi công đầy đủ (bảng dưới) để việc sử dụng an toàn pháp lý. Một số giấy phép (CC BY, CC BY-SA) bắt buộc ghi tên tác giả và liên kết giấy phép khi dùng lại — bảng dưới là nơi ghi công chính thức của dự án.
- **Ghi chú về đợt chọn ảnh trước:** ban đầu dự án chọn 8 ảnh trên Unsplash, nhưng lần thử tải ngày 2026-10-25 máy chủ Unsplash trả HTTP 401 cho cả 8 ảnh trong môi trường làm việc, nên toàn bộ danh sách đã được thay bằng ảnh Wikimedia Commons tương đương về chủ đề. Danh sách Unsplash cũ không còn dùng ở đâu trong mã nguồn.

## 1. Danh sách ảnh đang dùng

Tất cả lấy từ Wikimedia Commons. "Trang ảnh" là trang File: trên Commons (nơi kiểm chứng giấy phép và tác giả).

| Vị trí (slot) | Dùng ở | Trang ảnh | Tác giả | Giấy phép | Địa điểm |
|---|---|---|---|---|---|
| `hero-fuji` | Banner Dashboard, JLPT N1 | [File:Chureito Pagoda, Fujiyoshida (34256262385).jpg](https://commons.wikimedia.org/wiki/File:Chureito_Pagoda,_Fujiyoshida_(34256262385).jpg) | [Olivier Bruchez](https://www.flickr.com/people/73293249@N00) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | Chùa Chureito (công viên Arakurayama Sengen), Fujiyoshida |
| `sakura` | JLPT N5 | [File:Lake Biwa Canal (5767175848).jpg](https://commons.wikimedia.org/wiki/File:Lake_Biwa_Canal_(5767175848).jpg) | [KimonBerlin](https://www.flickr.com/people/81943113@N00) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | Kênh đào hồ Biwa (Biwako Sosui), Kyoto |
| `torii` | JLPT N4, Kanji Quest | [File:Double torii path at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg](https://commons.wikimedia.org/wiki/File:Double_torii_path_at_Fushimi_Inari_Taisha_Shrine,_Kyoto,_Japan.jpg) | [Basile Morin](https://commons.wikimedia.org/wiki/User:Basile_Morin) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Đền Fushimi Inari Taisha, Kyoto |
| `kyoto` | JLPT N3, thẻ Kính ngữ | [File:Yasaka-dori early morning with street lanterns and the Tower of Yasaka (Hokan-ji Temple), Kyoto, Japan.jpg](https://commons.wikimedia.org/wiki/File:Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_(Hokan-ji_Temple),_Kyoto,_Japan.jpg) | [Basile Morin](https://commons.wikimedia.org/wiki/User:Basile_Morin) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Phố Yasaka (Yasaka-dōri), Higashiyama, Kyoto |
| `autumn` | JLPT N2 | [File:Eikando, Kyoto - Eikando7373.jpg](https://commons.wikimedia.org/wiki/File:Eikando,_Kyoto_-_Eikando7373.jpg) | [lumoplank](https://www.flickr.com/people/199350666@N08) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | Chùa Eikan-dō (Zenrin-ji), Kyoto |
| `station` | Thẻ chủ đề Nhà ga & đi lại | [File:Platform at Mishima Station, with arriving Tōkaidō Shinkansen train, Mishima, 2016.jpg](https://commons.wikimedia.org/wiki/File:Platform_at_Mishima_Station,_with_arriving_T%C5%8Dkaid%C5%8D_Shinkansen_train,_Mishima,_2016.jpg) | [DimiTalen](https://commons.wikimedia.org/wiki/User:DimiTalen) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | Ga Mishima, Shizuoka |
| `city` | Thẻ chủ đề Mua sắm | [File:Tokyo Shibuya Scramble Crossing 2018-10-09.jpg](https://commons.wikimedia.org/wiki/File:Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg) | [Benh LIEU SONG](https://commons.wikimedia.org/wiki/User:Benh) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | Ngã tư Shibuya, Tokyo |
| `izakaya` | Thẻ chủ đề Nhà hàng | [File:2024-10-20 Omoide-Yokochō, Shinjuku.jpg](https://commons.wikimedia.org/wiki/File:2024-10-20_Omoide-Yokoch%C5%8D,_Shinjuku.jpg) | [Alexkom000](https://commons.wikimedia.org/wiki/User:Alexkom000) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | Hẻm Omoide Yokochō, Shinjuku, Tokyo |

Ghi chú:

- Nguồn dữ liệu đầy đủ (trang ảnh, đường dẫn tải, tác giả, giấy phép, mô tả thay thế/alt) nằm ở `src/config/japan-photos.ts` (`PHOTO_SOURCES`).
- Ảnh trong repo là bản đã thu nhỏ (tối đa 1920 px chiều rộng, JPEG q78) từ bản thu nhỏ 1920 px của Commons; bản gốc độ phân giải đầy đủ (5.199–7.664 px) xem tại trang ảnh. Việc thu nhỏ/nén lại là "chỉnh sửa" theo nghĩa của CC BY-SA — dự án phân phối các bản thu nhỏ này kèm ghi công và liên kết giấy phép ở tài liệu này.
- Chủ đề **Công sở**, **thư pháp**, **hiragana/katakana** vẫn chỉ dùng tranh SVG tự vẽ của dự án, không dính giấy phép bên thứ ba.

## 2. Cách tải lại / đổi ảnh (trên máy bạn)

```
npm run photos:fetch
```

Lệnh này:

- chỉ tải đúng 8 ảnh ở bảng trên, **lần lượt từng ảnh** (không tải hàng loạt), theo `downloadUrl` của từng mục trong `PHOTO_SOURCES`;
- thu nhỏ về tối đa 2000 px cạnh dài, lưu JPEG vào `public/images/japan/`;
- ghi kích thước vào `src/config/japan-photos.generated.json` (để `next/image` giữ chỗ, không xô lệch bố cục);
- tùy chọn: `--only hero-fuji,sakura`, `--force` (tải lại), `--dry-run` (chỉ liệt kê).

Nếu muốn đổi ảnh: chỉ chọn ảnh trên Wikimedia Commons có giấy phép CC0, Public Domain, CC BY hoặc CC BY-SA (kiểm tra ở mục "Licensing" trên trang File: của ảnh), cập nhật mục tương ứng trong `PHOTO_SOURCES` (trang ảnh, `downloadUrl` bản thu nhỏ, tác giả, giấy phép, địa điểm, `alt` mô tả đúng ảnh mới), chạy lại `npm run photos:fetch -- --force --only <slot>`, mở xem ảnh mới và cập nhật bảng ở file này.

## 3. Lưu ý khi triển khai

- Ảnh được phục vụ từ chính website (không nhúng link ngoài lúc chạy). Vercel có hạn mức tối ưu hóa ảnh theo gói; hãy xem trang giới hạn hiện hành của Vercel. Ảnh chỉ có 8 tấm (~350–650 KB/tấm) nên mức dùng thấp.
- Ảnh phía dưới màn hình dùng lazy-load; ảnh banner đầu trang (Dashboard, chi tiết JLPT, Kanji Quest) dùng `priority`.
- Mọi ảnh trang trí có `alt` rỗng; ảnh có nghĩa có `alt` tiếng Việt mô tả nội dung.
