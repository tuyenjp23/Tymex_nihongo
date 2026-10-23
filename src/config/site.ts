/**
 * Cấu hình site MẶC ĐỊNH. Quản trị viên có thể ghi đè phần tên/logo qua /admin/appearance
 * (giá trị ghi đè nằm trong app_settings, không sửa file này).
 */
export const siteConfig = {
  name: "Nihongo Compass",
  nameJa: "日本語学習ラボ",
  tagline: "Học tiếng Nhật toàn diện cho người Việt — từ JLPT N5 đến N1",
  description:
    "Nền tảng học tiếng Nhật cho người Việt: luyện thi JLPT, giao tiếp thực tế, từ vựng, Kanji, ngữ pháp và trò chơi ghi nhớ.",
  locale: "vi",
  /** Phiên bản dữ liệu tiến độ lưu trong trình duyệt (tăng khi đổi cấu trúc). */
  progressSchemaVersion: 1,
  /** Múi giờ dùng để tính "hôm nay" và chuỗi ngày học. */
  timeZone: "Asia/Tokyo",
} as const;

export type SiteConfig = typeof siteConfig;
