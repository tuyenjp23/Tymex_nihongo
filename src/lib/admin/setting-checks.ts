import type { SettingKey } from "../settings-schemas";
import { defaultNavigation, LOCKED_NAV_IDS } from "@/config/navigation";
import { dashboardSectionDefs } from "@/config/dashboard";
import { gameModeDefs } from "@/config/games";
import type { FieldError } from "./validate";

/** Kiểm tra bổ sung cho cấu hình (ngoài Zod): mục menu/section/chế độ chơi phải tồn tại, mục khóa không được tắt. Dùng cho cả lưu tay và khôi phục từ sao lưu. */
export function extraSettingChecks(key: SettingKey, value: unknown): FieldError[] {
  const errs: FieldError[] = [];
  if (key === "navigation") {
    const items = (value as { items: { id: string; enabled: boolean }[] }).items;
    const known = new Set(defaultNavigation.map((d) => d.id));
    for (const it of items) {
      if (!known.has(it.id)) errs.push({ path: "items", message: `Mục menu "${it.id}" không tồn tại` });
      if (LOCKED_NAV_IDS.has(it.id) && !it.enabled) errs.push({ path: "items", message: `Mục "${it.id}" không được tắt` });
    }
  }
  if (key === "dashboard") {
    const known = new Set(dashboardSectionDefs.map((d) => d.id));
    for (const s of (value as { sections: { id: string }[] }).sections)
      if (!known.has(s.id)) errs.push({ path: "sections", message: `Section "${s.id}" không tồn tại` });
  }
  if (key === "games") {
    const available = new Set(gameModeDefs.filter((g) => g.status === "available").map((g) => g.id));
    for (const m of (value as { enabledModes: string[] }).enabledModes)
      if (!available.has(m)) errs.push({ path: "enabledModes", message: `Chế độ "${m}" chưa có sẵn` });
  }
  return errs;
}

