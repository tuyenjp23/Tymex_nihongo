import { defaultNavigation, LOCKED_NAV_IDS, type NavItemDef } from "@/config/navigation";
import { defaultDashboardSections, dashboardSectionDefs } from "@/config/dashboard";
import type { DashboardSettings, NavigationSettings } from "./settings-schemas";

// Hàm thuần (không đọc kho dữ liệu) nên dùng được ở client và trong unit test.

export interface NavItem extends NavItemDef {
  enabled: boolean;
}

/** Hợp nhất menu mặc định với cấu hình ghi đè của admin (thứ tự, tên, bật/tắt). */
export function mergeNavigation(override: NavigationSettings | null): NavItem[] {
  const defs = new Map(defaultNavigation.map((d) => [d.id, d]));
  const out: NavItem[] = [];
  const seen = new Set<string>();
  for (const o of override?.items ?? []) {
    const d = defs.get(o.id);
    if (!d || seen.has(o.id)) continue; // bỏ mục không còn tồn tại
    seen.add(o.id);
    out.push({ ...d, label: o.label, enabled: LOCKED_NAV_IDS.has(o.id) ? true : o.enabled });
  }
  for (const d of defaultNavigation) if (!seen.has(d.id)) out.push({ ...d, enabled: true }); // mục mới của bản cập nhật
  return out;
}

export function mergeDashboard(override: DashboardSettings | null): { id: string; enabled: boolean }[] {
  const known = new Set(dashboardSectionDefs.map((d) => d.id));
  const out: { id: string; enabled: boolean }[] = [];
  const seen = new Set<string>();
  for (const s of override?.sections ?? []) {
    if (!known.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({ id: s.id, enabled: s.enabled });
  }
  for (const d of defaultDashboardSections) if (!seen.has(d.id)) out.push({ ...d });
  return out;
}

