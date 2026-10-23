import Link from "next/link";
import { Icon, LogOut } from "@/components/icons";
import { COLLECTION_KEYS } from "@/lib/types";
import { COLLECTION_LABELS } from "@/lib/schemas";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminNavLink } from "./admin-nav-link";

const MAIN = [
  { href: "/admin", label: "Tổng quan", icon: "dashboard", exact: true },
  { href: "/admin/import-export", label: "Nhập / xuất", icon: "file" },
  { href: "/admin/data-sources", label: "Nguồn dữ liệu", icon: "library" },
  { href: "/admin/data-quality", label: "Chất lượng dữ liệu", icon: "shield" },
  { href: "/admin/appearance", label: "Giao diện & menu", icon: "palette" },
  { href: "/admin/games", label: "Kanji Quest", icon: "gamepad" },
  { href: "/admin/audit", label: "Nhật ký", icon: "history" },
  { href: "/admin/system", label: "Hệ thống", icon: "settings" },
];

export function AdminShell({ children, actorLabel, appName }: { children: React.ReactNode; actorLabel: string; appName: string }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-dvh md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:block">
          <div>
            <p className="text-sm font-bold">{appName}</p>
            <p className="text-xs text-muted-foreground">Quản trị · {actorLabel}</p>
          </div>
          <form action={logoutAction} className="md:mt-3">
            <button type="submit" className="nc-touch inline-flex items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-muted">
              <LogOut size={14} aria-hidden="true" /> Đăng xuất
            </button>
          </form>
        </div>
        <nav aria-label="Menu quản trị" className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-0.5 md:overflow-visible md:px-3 md:pb-4">
          {MAIN.slice(0, 1).map((m) => (
            <AdminNavLink key={m.href} {...m} />
          ))}
          <p className="hidden px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">Nội dung</p>
          {COLLECTION_KEYS.map((c) => (
            <AdminNavLink key={c} href={`/admin/content/${c}`} label={COLLECTION_LABELS[c].plural} icon="book" />
          ))}
          <p className="hidden px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">Quản lý</p>
          {MAIN.slice(1).map((m) => (
            <AdminNavLink key={m.href} {...m} />
          ))}
          <Link href="/" className="nc-touch flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:mt-3">
            <Icon name="home" size={16} /> <span className="whitespace-nowrap">Xem trang người học</span>
          </Link>
        </nav>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
