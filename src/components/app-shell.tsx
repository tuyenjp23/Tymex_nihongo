"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, Menu, Search } from "@/components/icons";
import { Dialog } from "@/components/ui/dialog";
import { DisplayControls } from "@/components/display-controls";

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Brand({ name, nameJa, logoUrl }: { name: string; nameJa: string; logoUrl: string | null }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-9 w-9 rounded-md object-contain" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground" aria-hidden="true">
          羅
        </span>
      )}
      <span className="leading-tight">
        <span className="block text-base font-bold">{name}</span>
        {nameJa ? <span className="jp block text-xs text-muted-foreground">{nameJa}</span> : null}
      </span>
    </Link>
  );
}

function NavList({ nav, pathname, onNavigate }: { nav: ShellNavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {nav.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <li key={n.id}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "nc-touch flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({
  nav,
  brand,
  defaultFurigana,
  children,
}: {
  nav: ShellNavItem[];
  brand: { name: string; nameJa: string; logoUrl: string | null };
  defaultFurigana: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);
  const bottom = nav.slice(0, 4);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>

      {/* Thanh bên (máy tính) */}
      <aside className="nc-no-print sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto border-r border-border bg-card px-3 py-4 md:flex">
        <div className="px-2">
          <Brand {...brand} />
        </div>
        <nav aria-label="Điều hướng chính" className="flex-1">
          <NavList nav={nav} pathname={pathname} />
        </nav>
        <div className="space-y-1 px-2 text-xs text-muted-foreground">
          <div className="flex gap-3">
            <Link href="/account" className="underline-offset-2 hover:underline">
              Tài khoản &amp; đồng bộ
            </Link>
            <Link href="/admin" className="underline-offset-2 hover:underline">
              Khu quản trị
            </Link>
          </div>
          <p>Nội dung do AI soạn cần được giáo viên rà soát. Xem trang “Nguồn học liệu”.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="nc-no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-[color-mix(in_oklab,var(--background)_92%,transparent)] px-3 py-2 backdrop-blur md:px-6">
          <button
            type="button"
            className="nc-touch grid h-10 w-10 place-items-center rounded-md border border-border bg-card md:hidden"
            aria-label="Mở menu"
            onClick={() => setDrawer(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="md:hidden">
            <span className="block max-w-[7rem] truncate text-sm font-bold">{brand.name}</span>
          </div>
          <form action="/search" role="search" className="ml-auto hidden max-w-xs flex-1 sm:block">
            <label htmlFor="global-search" className="sr-only">
              Tìm kiếm toàn bộ nội dung
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="global-search"
                name="q"
                type="search"
                placeholder="Tìm từ, Kanji, ngữ pháp…"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm"
              />
            </div>
          </form>
          <Link href="/search" aria-label="Tìm kiếm" className="nc-touch ml-auto grid h-10 w-10 place-items-center rounded-md border border-border bg-card sm:hidden">
            <Search size={18} aria-hidden="true" />
          </Link>
          <DisplayControls defaultFurigana={defaultFurigana} />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-[var(--page-padding)] pb-24 pt-6 md:pb-10">
          {children}
        </main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav aria-label="Điều hướng nhanh" className="nc-no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden">
        <ul className="grid grid-cols-5">
          {bottom.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}
                >
                  <Icon name={n.icon} size={20} />
                  <span className="max-w-full truncate">{n.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground"
            >
              <Menu size={20} aria-hidden="true" />
              Thêm
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={drawer} onClose={() => setDrawer(false)} title="Menu" variant="drawer">
        <nav aria-label="Tất cả mục">
          <NavList nav={nav} pathname={pathname} onNavigate={() => setDrawer(false)} />
        </nav>
        <p className="mt-4 text-xs text-muted-foreground">
          <Link href="/account" onClick={() => setDrawer(false)} className="underline">
            Tài khoản &amp; đồng bộ
          </Link>
          {" · "}
          <Link href="/admin" onClick={() => setDrawer(false)} className="underline">
            Khu quản trị
          </Link>
        </p>
      </Dialog>
    </div>
  );
}
