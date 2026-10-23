import type { ThemeSettings } from "@/lib/settings-schemas";
import { siteConfig } from "./site";

/**
 * Theme token MẶC ĐỊNH. Mọi component chỉ dùng biến CSS (--primary, --radius, ...) được sinh từ đây,
 * nên đổi một giá trị là cả ứng dụng đổi theo. Admin có thể ghi đè tại /admin/appearance.
 */
export const defaultTheme: ThemeSettings = {
  appName: siteConfig.name,
  appNameJa: siteConfig.nameJa,
  tagline: siteConfig.tagline,
  logoUrl: null,
  faviconUrl: null,
  colors: {
    // Premium Japanese Learning: ivory (nền) · indigo 藍 (chủ đạo) · vermilion 朱 (nhấn) — vàng champagne là màu trang trí, thêm ở lib/theme.ts
    light: { primary: "#202b50", accent: "#c94b4b", background: "#f7f5ef", foreground: "#1c2340" },
    dark: { primary: "#aebdf5", accent: "#f08a84", background: "#0f1428", foreground: "#eeeadf" },
  },
  radius: 14,
  density: "comfortable",
  cardStyle: "elevated",
  fontBody: "sans",
  fontJp: "gothic",
  baseFontSize: 16,
};

/** Bộ font hệ thống (không tải font ngoài → nhanh, hiển thị Kanji/Kana đúng trên Windows/macOS/Android/iOS). */
export const FONT_STACKS = {
  body: {
    // Font có đủ dấu tiếng Việt đứng ĐẦU (Segoe UI, Roboto, Noto Sans, Helvetica/Arial), font Nhật đứng sau để trình duyệt chỉ dùng chúng cho Kanji/Kana.
    // Nếu để font Nhật (Yu Gothic UI, Meiryo, Hiragino) đứng đầu, Windows/macOS hiển thị sai các chữ có 2 dấu như "ồ", "ế" (dấu tách rời khỏi chữ).
    sans: '"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,system-ui,-apple-system,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",sans-serif',
    serif: '"Noto Serif",Georgia,"Times New Roman","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif',
    rounded: '"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,system-ui,"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo","Noto Sans JP",sans-serif',
  },
  jp: {
    gothic: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo","Noto Sans JP",sans-serif',
    mincho: '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif',
    kyokasho:
      '"UD Digi Kyokasho N-R","UD Digi Kyokasho NK-R","UD デジタル 教科書体 N-R","Kyokasho ICA","Hiragino Mincho ProN","Yu Mincho",serif',
  },
} as const;

export const FONT_LABELS = {
  body: { sans: "Gothic (không chân)", serif: "Mincho (có chân)", rounded: "Bo tròn" },
  jp: { gothic: "Gothic", mincho: "Mincho", kyokasho: "Kyōkasho (chữ sách giáo khoa)" },
} as const;

export const DENSITY_TOKENS = {
  compact: { cardPadding: "0.875rem", gap: "0.75rem", pagePadding: "1rem" },
  comfortable: { cardPadding: "1.25rem", gap: "1rem", pagePadding: "1.5rem" },
  spacious: { cardPadding: "1.75rem", gap: "1.5rem", pagePadding: "2rem" },
} as const;

export const CARD_STYLE_LABELS = {
  elevated: "Nổi (đổ bóng)",
  outlined: "Viền",
  flat: "Phẳng",
  soft: "Nền dịu",
} as const;

export const DENSITY_LABELS = {
  compact: "Gọn",
  comfortable: "Vừa",
  spacious: "Rộng",
} as const;
