import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/store";
import { getContentSettings, getDashboardSections, getNavigation, getTheme } from "@/lib/settings";
import { PageHeader } from "@/components/ui/card";
import { AppearanceEditor, type AppearanceData } from "@/components/admin/appearance-editor";
import type { VersionInfo } from "@/components/admin/setting-parts";

export const metadata = { title: "Giao diện & menu" };

export default async function AppearancePage() {
  await requireAdmin();
  const store = await getStore();
  const info = async (k: "theme" | "navigation" | "dashboard" | "content"): Promise<VersionInfo[]> =>
    (await store.settingHistory(k)).map((h) => ({ version: h.version, saved_at: h.saved_at, saved_by: h.saved_by }));
  const [theme, nav, dash, content, hTheme, hNav, hDash, hContent] = await Promise.all([
    getTheme(),
    getNavigation(),
    getDashboardSections(),
    getContentSettings(),
    info("theme"),
    info("navigation"),
    info("dashboard"),
    info("content"),
  ]);
  const data: AppearanceData = {
    theme,
    navigation: nav.map((n) => ({ id: n.id, label: n.label, enabled: n.enabled })),
    dashboard: dash,
    content,
    history: { theme: hTheme, navigation: hNav, dashboard: hDash, content: hContent },
  };
  // key = phiên bản hiện hành của từng nhóm → sau khi lưu/khôi phục, editor dựng lại từ dữ liệu mới
  const key = [hTheme, hNav, hDash, hContent].map((h) => h[0]?.version ?? 0).join("-");
  return (
    <>
      <PageHeader title="Giao diện & menu" description="Thay đổi thương hiệu, màu sắc, menu và các khối trên trang Tổng quan mà không cần sửa code. Mọi phiên bản được lưu để khôi phục." />
      <AppearanceEditor key={key} data={data} />
    </>
  );
}
