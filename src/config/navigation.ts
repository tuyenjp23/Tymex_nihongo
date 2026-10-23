export interface NavItemDef {
  id: string;
  label: string;
  href: string;
  /** Tên icon trong src/components/icons.tsx */
  icon: string;
  /** Mô-đun: nếu bị tắt, các route thuộc href này trả về 404. */
  module: boolean;
}

/**
 * Menu MẶC ĐỊNH. Thứ tự trong mảng = thứ tự hiển thị mặc định.
 * Admin có thể đổi tên, bật/tắt, sắp xếp lại tại /admin/appearance (ghi đè nằm trong app_settings).
 * `dashboard` luôn bật (không thể tắt) để người dùng không bị khóa khỏi ứng dụng.
 */
export const defaultNavigation: NavItemDef[] = [
  { id: "dashboard", label: "Tổng quan", href: "/", icon: "dashboard", module: false },
  { id: "jlpt", label: "Luyện thi JLPT", href: "/jlpt", icon: "graduation", module: true },
  { id: "vocabulary", label: "Từ vựng", href: "/vocabulary", icon: "book", module: true },
  { id: "kanji", label: "Kanji", href: "/kanji", icon: "kanji", module: true },
  { id: "kana", label: "Hiragana · Katakana", href: "/kana", icon: "type", module: true },
  { id: "grammar", label: "Ngữ pháp", href: "/grammar", icon: "scroll", module: true },
  { id: "conversation", label: "Giao tiếp", href: "/conversation", icon: "messages", module: true },
  { id: "games", label: "Kanji Quest", href: "/games", icon: "gamepad", module: true },
  { id: "review", label: "Ôn tập", href: "/review", icon: "repeat", module: true },
  { id: "progress", label: "Tiến độ", href: "/progress", icon: "chart", module: true },
  { id: "sources", label: "Nguồn học liệu", href: "/sources", icon: "library", module: true },
];

export const LOCKED_NAV_IDS = new Set(["dashboard"]);
