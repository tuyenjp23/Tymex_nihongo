import "server-only";
import { cache } from "react";
import { getPublicStore } from "./store";
import { defaultTheme } from "@/config/theme";
import { defaultGamesSettings } from "@/config/games";
import {
  ContentSettingsSchema,
  DashboardSettingsSchema,
  GamesSettingsSchema,
  NavigationSettingsSchema,
  ThemeSettingsSchema,
  type ContentSettings,
  type DashboardSettings,
  type GamesSettings,
  type NavigationSettings,
  type SettingKey,
  type ThemeSettings,
} from "./settings-schemas";
import type { ZodType } from "zod";
import { mergeDashboard, mergeNavigation, type NavItem } from "./settings-merge";

export { mergeDashboard, mergeNavigation, type NavItem };

export const defaultContentSettings: ContentSettings = { showUnverified: true, defaultFurigana: true };

async function readSetting<T>(key: SettingKey, schema: ZodType<T>, fallback: T): Promise<T> {
  try {
    // Đọc qua store CÔNG KHAI (không cookie phiên): app_settings có policy đọc tự do cho anon,
    // và việc không đụng cookie giúp layout/trang học viên giữ được ISR/CDN cache.
    // Ghi cấu hình (admin) vẫn đi qua getStore() theo phiên ở admin/actions.
    const store = await getPublicStore();
    const s = await store.getSetting(key);
    if (!s) return fallback;
    const parsed = schema.safeParse(s.value);
    if (parsed.success) return parsed.data;
    console.error(`[settings] cấu hình "${key}" không hợp lệ, dùng mặc định:`, parsed.error.issues[0]?.message);
  } catch (e) {
    // Không để lỗi cấu hình làm sập cả ứng dụng
    console.error(`[settings] không đọc được "${key}":`, e);
  }
  return fallback;
}

export const getTheme = cache(() => readSetting<ThemeSettings>("theme", ThemeSettingsSchema, defaultTheme));
export const getContentSettings = cache(() => readSetting<ContentSettings>("content", ContentSettingsSchema, defaultContentSettings));
export const getGamesSettings = cache(() => readSetting<GamesSettings>("games", GamesSettingsSchema, defaultGamesSettings));

export const getNavigation = cache(async (): Promise<NavItem[]> => {
  const o = await readSetting<NavigationSettings | null>("navigation", NavigationSettingsSchema.nullable(), null);
  return mergeNavigation(o);
});

export const getDashboardSections = cache(async () => {
  const o = await readSetting<DashboardSettings | null>("dashboard", DashboardSettingsSchema.nullable(), null);
  return mergeDashboard(o);
});

/** Route thuộc module đã bị admin tắt → gọi notFound(). */
export async function isModuleEnabled(navId: string): Promise<boolean> {
  const nav = await getNavigation();
  const item = nav.find((n) => n.id === navId);
  return item ? item.enabled : true;
}
