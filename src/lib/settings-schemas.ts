import { z } from "zod";

/** Màu hex 6 ký tự — kiểm tra chặt để không thể chèn CSS tùy ý vào <style> do server sinh ra. */
export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu phải có dạng #RRGGBB");

/** URL an toàn cho logo/favicon: đường dẫn nội bộ (/...) hoặc http(s). Chặn javascript:, data:text/html... */
export const SafeUrlSchema = z
  .string()
  .max(600)
  .refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "URL phải bắt đầu bằng / hoặc http(s)://");

const ColorSetSchema = z.object({
  primary: HexColorSchema,
  accent: HexColorSchema,
  background: HexColorSchema,
  foreground: HexColorSchema,
});

export const CARD_STYLES = ["elevated", "outlined", "flat", "soft"] as const;
export const DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const FONT_BODIES = ["sans", "serif", "rounded"] as const;
export const FONT_JPS = ["gothic", "mincho", "kyokasho"] as const;

export const ThemeSettingsSchema = z.object({
  appName: z.string().trim().min(1, "Không được để trống").max(40),
  appNameJa: z.string().trim().max(40),
  tagline: z.string().trim().max(160),
  logoUrl: SafeUrlSchema.nullable(),
  faviconUrl: SafeUrlSchema.nullable(),
  colors: z.object({ light: ColorSetSchema, dark: ColorSetSchema }),
  radius: z.number().min(0).max(28),
  density: z.enum(DENSITIES),
  cardStyle: z.enum(CARD_STYLES),
  fontBody: z.enum(FONT_BODIES),
  fontJp: z.enum(FONT_JPS),
  baseFontSize: z.number().min(14).max(20),
});
export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;

export const NavigationSettingsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().trim().min(1).max(40),
        enabled: z.boolean(),
      }),
    )
    .max(40),
});
export type NavigationSettings = z.infer<typeof NavigationSettingsSchema>;

export const DashboardSettingsSchema = z.object({
  sections: z
    .array(z.object({ id: z.string().min(1).max(40), enabled: z.boolean() }))
    .max(40),
});
export type DashboardSettings = z.infer<typeof DashboardSettingsSchema>;

export const ContentSettingsSchema = z.object({
  /** Cho người học thấy nội dung chưa "verified"/"published" (kèm huy hiệu cảnh báo). */
  showUnverified: z.boolean(),
  /** Hiển thị furigana mặc định cho người học mới. */
  defaultFurigana: z.boolean(),
});
export type ContentSettings = z.infer<typeof ContentSettingsSchema>;

export const GamesSettingsSchema = z.object({
  enabledModes: z.array(z.string()).max(30),
  levels: z.array(z.enum(["N5", "N4", "N3", "N2", "N1"])).min(1),
  /** Rỗng = tất cả chủ đề */
  topics: z.array(z.string()).max(100),
  questionsPerRound: z.number().int().min(5).max(50),
  requireImageForPictureGames: z.boolean(),
});
export type GamesSettings = z.infer<typeof GamesSettingsSchema>;

export const SETTING_KEYS = ["theme", "navigation", "dashboard", "content", "games"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_SCHEMAS = {
  theme: ThemeSettingsSchema,
  navigation: NavigationSettingsSchema,
  dashboard: DashboardSettingsSchema,
  content: ContentSettingsSchema,
  games: GamesSettingsSchema,
} as const;

export interface SettingVersion<T = unknown> {
  version: number;
  saved_at: string;
  saved_by: string;
  value: T;
}
