import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { getTheme } from "@/lib/settings";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Quản trị", template: "%s · Quản trị" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Kiểm tra quyền ở server cho MỌI trang trong khu admin (proxy.ts chỉ là lớp chặn sớm)
  const actor = await requireAdmin();
  const theme = await getTheme();
  return (
    <AdminShell actorLabel={actor.label} appName={theme.appName}>
      {children}
    </AdminShell>
  );
}
