import type { ArtKind } from "@/components/art/japan-art";
import generated from "./japan-photos.generated.json";

/**
 * Ảnh phong cảnh/đời sống Nhật Bản dùng trong giao diện.
 *
 * Quy tắc:
 *  - Chỉ dùng ảnh theo Unsplash License (miễn phí cho mục đích thương mại, không bắt buộc ghi công) — đã kiểm tra từng trang ảnh ngày 2026-10-23.
 *    Dù không bắt buộc, dự án vẫn ghi công nhiếp ảnh gia ở docs/ANH-VA-GIAY-PHEP.md và ở chân trang "Nguồn học liệu".
 *  - File ảnh KHÔNG nằm sẵn trong mã nguồn: chạy `npm run photos:fetch` (xem docs/ANH-VA-GIAY-PHEP.md) để tải đúng các ảnh dưới đây về public/images/japan
 *    và ghi kích thước vào japan-photos.generated.json. Chưa có ảnh (hoặc ảnh lỗi) → giao diện dùng tranh SVG tự vẽ, không bao giờ vỡ bố cục.
 *  - Không dùng liên kết ảnh ngoài lúc chạy: mọi ảnh được phục vụ từ chính website.
 */
export type PhotoSlot = "hero-fuji" | "sakura" | "torii" | "kyoto" | "autumn" | "station" | "city" | "izakaya";

export interface PhotoSource {
  slot: PhotoSlot;
  /** ID ảnh trên Unsplash (đoạn cuối của địa chỉ trang ảnh) */
  unsplashId: string;
  pageUrl: string;
  photographer: string;
  photographerUrl: string;
  /** Địa điểm theo thẻ ghi trên trang ảnh (nếu trang không ghi: nói rõ) */
  place: string;
  alt: string;
}

const U = (id: string) => `https://unsplash.com/photos/${id}`;

export const PHOTO_SOURCES: PhotoSource[] = [
  { slot: "hero-fuji", unsplashId: "n--CMLApjfI", pageUrl: U("n--CMLApjfI"), photographer: "Manuel Cosentino", photographerUrl: "https://unsplash.com/@manucosen", place: "Chùa Chureito, Fujiyoshida (nhìn ra núi Phú Sĩ)", alt: "Tháp chùa Chureito nhìn xuống thành phố Fujiyoshida, núi Phú Sĩ phía xa" },
  { slot: "sakura", unsplashId: "8sOZJ8JF0S8", pageUrl: U("8sOZJ8JF0S8"), photographer: "Sora Sagano", photographerUrl: "https://unsplash.com/@sorasagano", place: "Sông Meguro, Tokyo", alt: "Kênh nước hai bên là hàng anh đào nở rộ ở sông Meguro, Tokyo" },
  { slot: "torii", unsplashId: "EJvGBYjrwEA", pageUrl: U("EJvGBYjrwEA"), photographer: "David Emrich", photographerUrl: "https://unsplash.com/@davidemrich", place: "Fushimi Inari, Kyoto", alt: "Lối đi đá xuyên qua đường hầm cổng torii màu cam ở Fushimi Inari, Kyoto" },
  { slot: "kyoto", unsplashId: "SlIl9eZjWUc", pageUrl: U("SlIl9eZjWUc"), photographer: "Roméo A.", photographerUrl: "https://unsplash.com/@gronemo", place: "Kyoto", alt: "Tháp chùa cổ phía trên một con phố hẹp ở Kyoto" },
  { slot: "autumn", unsplashId: "PMkQ7WVWqr0", pageUrl: U("PMkQ7WVWqr0"), photographer: "Svetlana Gumerova", photographerUrl: "https://unsplash.com/@bananablackcat", place: "Chùa Chureito, Fujiyoshida (mùa thu)", alt: "Ngôi đền giữa rừng cây lá đỏ mùa thu ở Fujiyoshida" },
  { slot: "station", unsplashId: "wffp0K8sr7s", pageUrl: U("wffp0K8sr7s"), photographer: "Samantha Hendrata", photographerUrl: "https://unsplash.com/@madebysamh", place: "Kyoto", alt: "Người đi lại trên sân ga ở Kyoto vào ngày nhiều mây" },
  { slot: "city", unsplashId: "alY6_OpdwRQ", pageUrl: U("alY6_OpdwRQ"), photographer: "Jezael Melgoza", photographerUrl: "https://unsplash.com/@jezar", place: "Shibuya, Tokyo", alt: "Ngã tư Shibuya về đêm với biển hiệu neon" },
  { slot: "izakaya", unsplashId: "AVGywODVmro", pageUrl: U("AVGywODVmro"), photographer: "natsuki", photographerUrl: "https://unsplash.com/@myr0326", place: "Trang ảnh không ghi địa điểm (thẻ: japanese, izakaya, enoshima)", alt: "Quán ăn kiểu izakaya ánh đèn ấm về đêm" },
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
