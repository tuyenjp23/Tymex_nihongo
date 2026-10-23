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

function Brand({ name, nameJa, logoUrl, onInk = false }: { name: string; nameJa: string; logoUrl: string | null; onInk?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
      ) : (
        <span className="nc-hanko grid h-10 w-10 place-items-center text-xl" aria-hidden="true">
          羅
        </span>
      )}
      <span className="leading-tight">
        <span className={cn("block text-[0.95rem] font-bold tracking-tight", onInk && "text-ink-foreground")}>{name}</span>
        {nameJa ? <span className={cn("jp block text-xs tracking-[0.18em]", onInk ? "text-gold" : "text-muted-foreground")}>{nameJa}</span> : null}
      </span>
    </Link>
  );
}

function NavList({ nav, pathname, onNavigate, onInk = false }: { nav: ShellNavItem[]; pathname: string; onNavigate?: () => void; onInk?: boolean }) {
  return (
    <ul className="space-y-1">
      {nav.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <li key={n.id}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "nc-touch group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                onInk
                  ? active
                    ? "bg-white/12 font-semibold text-white"
                    : "text-ink-foreground/80 hover:bg-white/8 hover:text-white"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
              )}
            >
              {/* Thanh vàng bên trái: dấu hiệu "đang ở đây" ngoài màu nền (không chỉ dựa vào màu) */}
              {active && onInk ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gold" /> : null}
              <Icon name={n.icon} size={18} className={cn(onInk && active ? "text-gold" : onInk ? "text-ink-foreground/70 group-hover:text-gold" : "")} />
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
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>

      {/* Thanh bên (máy tính): nền chàm, chữ ngà, điểm nhấn vàng */}
      <aside className="nc-no-print nc-on-ink sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto bg-ink px-3 py-5 text-ink-foreground md:flex">
        <div className="px-2">
          <Brand {...brand} onInk />
        </div>
        <nav aria-label="Điều hướng chính" className="flex-1">
          <NavList nav={nav} pathname={pathname} onInk />
        </nav>
        <div className="space-y-2 px-2 text-xs text-ink-foreground/70">
          <div className="nc-seigaiha h-10 rounded-md opacity-70" aria-hidden="true" />
          <div className="flex gap-3">
            <Link href="/account" className="underline-offset-2 hover:text-white hover:underline">
              Tài khoản &amp; đồng bộ
            </Link>
            <Link href="/admin" className="underline-offset-2 hover:text-white hover:underline">
              Khu quản trị
            </Link>
          </div>
          <p className="leading-relaxed">Nội dung do AI soạn cần được giáo viên rà soát. Xem trang “Nguồn học liệu”.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="nc-no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border-soft bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-3 py-2.5 backdrop-blur-sm md:gap-3 md:px-6">
          <button
            type="button"
            className="nc-touch grid h-10 w-10 place-items-center rounded-lg border border-border bg-card md:hidden"
            aria-label="Mở menu"
            onClick={() => setDrawer(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <Link href="/" className="flex items-center gap-2 md:hidden" aria-label={`${brand.name} — trang chủ`}>
            <span className="nc-hanko grid h-8 w-8 place-items-center text-base" aria-hidden="true">羅</span>
          </Link>
          <form action="/search" role="search" className="hidden max-w-md flex-1 sm:block">
            <label htmlFor="global-search" className="sr-only">
              Tìm kiếm toàn bộ nội dung
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                id="global-search"
                name="q"
                type="search"
                placeholder="Tìm từ, Kanji, ngữ pháp…"
                className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm shadow-[0_1px_2px_rgb(32_43_80/0.04)] placeholder:text-muted-foreground"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/search" aria-label="Tìm kiếm" className="nc-touch grid h-10 w-10 place-items-center rounded-lg border border-border bg-card sm:hidden">
              <Search size={18} aria-hidden="true" />
            </Link>
            <DisplayControls defaultFurigana={defaultFurigana} />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-[var(--page-padding)] pb-24 pt-6 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>

      {/* Thanh dưới (điện thoại) */}
      <nav aria-label="Điều hướng nhanh" className="nc-no-print fixed inset-x-0 bottom-0 z-40 border-t border-border-soft bg-card shadow-[0_-6px_20px_-12px_rgb(32_43_80/0.25)] md:hidden">
        <ul className="grid grid-cols-5">
          {bottom.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium", active ? "font-semibold text-primary" : "text-muted-foreground")}
                >
                  {active ? <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-accent" /> : null}
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
        <div className="mb-4 rounded-lg border border-border-soft bg-muted p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Hiển thị</p>
          <DisplayControls defaultFurigana={defaultFurigana} variant="panel" />
        </div>
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
