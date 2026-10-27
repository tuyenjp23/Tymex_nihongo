import type { ArtKind } from "@/components/art/japan-art";
import generated from "./japan-photos.generated.json";

/**
 * Ảnh phong cảnh/đời sống Nhật Bản dùng trong giao diện.
 *
 * Quy tắc:
 *  - Chỉ dùng ảnh GIẤY PHÉP TỰ DO lấy từ Wikimedia Commons: CC0, Public Domain, CC BY hoặc CC BY-SA — đã đọc metadata giấy phép
 *    (LicenseShortName/LicenseUrl) của TỪNG ảnh ngày 2026-10-25; ảnh có điều khoản NC/ND hoặc giấy phép không rõ đều bị từ chối.
 *    Ghi công tác giả + giấy phép đầy đủ ở docs/ANH-VA-GIAY-PHEP.md (CC BY và CC BY-SA bắt buộc ghi công khi dùng lại).
 *  - File ảnh THẬT đã tải sẵn trong mã nguồn ở public/images/japan, kích thước ghi trong japan-photos.generated.json.
 *    Chạy `npm run photos:fetch` (xem docs/ANH-VA-GIAY-PHEP.md) khi cần tải lại hoặc đổi ảnh. Ảnh lỗi/thiếu → giao diện dùng tranh SVG tự vẽ, không bao giờ vỡ bố cục.
 *  - Không dùng liên kết ảnh ngoài lúc chạy: mọi ảnh được phục vụ từ chính website.
 *  - Lịch sử: đợt chọn ảnh đầu tiên định dùng Unsplash, nhưng lần thử tải ngày 2026-10-25 máy chủ Unsplash trả HTTP 401 cho cả 8 ảnh
 *    trong môi trường làm việc, nên dự án chuyển sang Wikimedia Commons (chủ dự án đã duyệt lấy ảnh web giấy phép tự do).
 */
export type PhotoSlot = "hero-fuji" | "sakura" | "torii" | "kyoto" | "autumn" | "station" | "city" | "izakaya";

export interface PhotoSource {
  slot: PhotoSlot;
  /** Kho ảnh nguồn */
  source: "Wikimedia Commons";
  /** Trang File: của ảnh trên Wikimedia Commons */
  pageUrl: string;
  /** URL tải trực tiếp bản thu nhỏ 1920 px mà script `photos:fetch` dùng */
  downloadUrl: string;
  /** Tác giả theo metadata Artist trên trang ảnh (đã bỏ thẻ HTML) */
  photographer: string;
  photographerUrl: string;
  /** Tên giấy phép theo metadata của ảnh, vd "CC BY-SA 4.0" */
  license: string;
  licenseUrl: string;
  /** Địa điểm chụp theo trang ảnh/thể loại trên Commons */
  place: string;
  alt: string;
}

export const PHOTO_SOURCES: PhotoSource[] = [
  { slot: "hero-fuji", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Chureito_Pagoda,_Fujiyoshida_(34256262385).jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Chureito_Pagoda%2C_Fujiyoshida_%2834256262385%29.jpg/1920px-Chureito_Pagoda%2C_Fujiyoshida_%2834256262385%29.jpg", photographer: "Olivier Bruchez", photographerUrl: "https://www.flickr.com/people/73293249@N00", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", place: "Chùa Chureito (công viên Arakurayama Sengen), Fujiyoshida", alt: "Tháp chùa Chureito giữa những cây anh đào chớm nở, nhìn ra thành phố Fujiyoshida và núi Phú Sĩ phủ tuyết" },
  { slot: "sakura", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Lake_Biwa_Canal_(5767175848).jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Lake_Biwa_Canal_%285767175848%29.jpg/1920px-Lake_Biwa_Canal_%285767175848%29.jpg", photographer: "KimonBerlin", photographerUrl: "https://www.flickr.com/people/81943113@N00", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", place: "Kênh đào hồ Biwa (Biwako Sosui), Kyoto", alt: "Cành hoa anh đào nở trắng rủ xuống mặt nước kênh đào hồ Biwa" },
  { slot: "torii", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Double_torii_path_at_Fushimi_Inari_Taisha_Shrine,_Kyoto,_Japan.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Double_torii_path_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/1920px-Double_torii_path_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg", photographer: "Basile Morin", photographerUrl: "https://commons.wikimedia.org/wiki/User:Basile_Morin", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", place: "Đền Fushimi Inari Taisha, Kyoto", alt: "Hai đường hầm cổng torii màu cam song song (Senbon Torii) ở đền Fushimi Inari, Kyoto" },
  { slot: "kyoto", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_(Hokan-ji_Temple),_Kyoto,_Japan.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_%28Hokan-ji_Temple%29%2C_Kyoto%2C_Japan.jpg/1920px-Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_%28Hokan-ji_Temple%29%2C_Kyoto%2C_Japan.jpg", photographer: "Basile Morin", photographerUrl: "https://commons.wikimedia.org/wiki/User:Basile_Morin", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", place: "Phố Yasaka (Yasaka-dōri), Higashiyama, Kyoto", alt: "Phố cổ lát đá với đèn lồng buổi sớm và tháp Yasaka (chùa Hōkan-ji) ở Kyoto" },
  { slot: "autumn", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Eikando,_Kyoto_-_Eikando7373.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Eikando%2C_Kyoto_-_Eikando7373.jpg/1920px-Eikando%2C_Kyoto_-_Eikando7373.jpg", photographer: "lumoplank", photographerUrl: "https://www.flickr.com/people/199350666@N08", license: "CC0 1.0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", place: "Chùa Eikan-dō (Zenrin-ji), Kyoto", alt: "Đèn lồng đồng giữa rừng phong lá đỏ mùa thu ở chùa Eikan-dō, Kyoto" },
  { slot: "station", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Platform_at_Mishima_Station,_with_arriving_T%C5%8Dkaid%C5%8D_Shinkansen_train,_Mishima,_2016.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Platform_at_Mishima_Station%2C_with_arriving_T%C5%8Dkaid%C5%8D_Shinkansen_train%2C_Mishima%2C_2016.jpg/1920px-Platform_at_Mishima_Station%2C_with_arriving_T%C5%8Dkaid%C5%8D_Shinkansen_train%2C_Mishima%2C_2016.jpg", photographer: "DimiTalen", photographerUrl: "https://commons.wikimedia.org/wiki/User:DimiTalen", license: "CC0 1.0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", place: "Ga Mishima, Shizuoka", alt: "Hành khách chờ trên sân ga Mishima, tàu Shinkansen đang vào ga" },
  { slot: "city", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg/1920px-Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg", photographer: "Benh LIEU SONG", photographerUrl: "https://commons.wikimedia.org/wiki/User:Benh", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", place: "Ngã tư Shibuya, Tokyo", alt: "Dòng người qua đường ở ngã tư Shibuya về đêm, xung quanh là biển hiệu neon" },
  { slot: "izakaya", source: "Wikimedia Commons", pageUrl: "https://commons.wikimedia.org/wiki/File:2024-10-20_Omoide-Yokoch%C5%8D,_Shinjuku.jpg", downloadUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/2024-10-20_Omoide-Yokoch%C5%8D%2C_Shinjuku.jpg/1920px-2024-10-20_Omoide-Yokoch%C5%8D%2C_Shinjuku.jpg", photographer: "Alexkom000", photographerUrl: "https://commons.wikimedia.org/wiki/User:Alexkom000", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", place: "Hẻm Omoide Yokochō, Shinjuku, Tokyo", alt: "Thực khách ăn tối trong hẻm quán ăn Omoide Yokochō với đèn lồng đỏ về đêm, Shinjuku" },
];

export interface PhotoFile {
  file: string;
  width: number;
  height: number;
}
/** Ảnh nào đã được tải về (do `npm run photos:fetch` ghi). */
export const AVAILABLE_PHOTOS = generated as Partial<Record<PhotoSlot, PhotoFile>>;

export type SceneId =
  | "hero"
  | "level-N5" | "level-N4" | "level-N3" | "level-N2" | "level-N1"
  | "topic-restaurant" | "topic-station" | "topic-workplace" | "topic-shopping" | "topic-keigo"
  | "quest" | "quest-kanji" | "kana";

/** Mỗi "cảnh" trong giao diện = ảnh thật (nếu đã tải) + tranh SVG dự phòng + alt tiếng Việt. */
export const SCENES: Record<SceneId, { photo?: PhotoSlot; art: ArtKind; alt: string }> = {
  hero: { photo: "hero-fuji", art: "fuji", alt: "Núi Phú Sĩ và tháp chùa Chureito" },
  "level-N5": { photo: "sakura", art: "sakura", alt: "Hoa anh đào bên kênh nước" },
  "level-N4": { photo: "torii", art: "torii", alt: "Đường hầm cổng torii" },
  "level-N3": { photo: "kyoto", art: "pagoda", alt: "Phố cổ Kyoto với tháp chùa" },
  "level-N2": { photo: "autumn", art: "momiji", alt: "Đền giữa rừng lá đỏ" },
  "level-N1": { photo: "hero-fuji", art: "fuji", alt: "Núi Phú Sĩ" },
  "topic-restaurant": { photo: "izakaya", art: "lantern", alt: "Quán ăn izakaya" },
  "topic-station": { photo: "station", art: "train", alt: "Sân ga ở Nhật" },
  "topic-workplace": { art: "office", alt: "Tòa nhà văn phòng" },
  "topic-shopping": { photo: "city", art: "city", alt: "Phố mua sắm về đêm" },
  "topic-keigo": { photo: "kyoto", art: "pagoda", alt: "Kyoto truyền thống" },
  quest: { photo: "torii", art: "torii", alt: "Cổng torii — bắt đầu hành trình" },
  "quest-kanji": { art: "brush", alt: "Thư pháp" },
  kana: { art: "brush", alt: "Thư pháp" },
};

export const photoBySlot = (slot: PhotoSlot) => PHOTO_SOURCES.find((p) => p.slot === slot);
