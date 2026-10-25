"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, Icon, LogOut } from "@/components/icons";
import { ANONYMOUS_ME, meInitial, type MeInfo } from "@/lib/auth/me";
import { signOutAction } from "@/app/(site)/account/actions";

/**
 * Góc tài khoản ở đầu thanh điều hướng (dưới brand, trên menu chính).
 *  - Tự gọi /api/me khi mount (no-store) — KHÔNG nhận dữ liệu phiên qua props để các trang (site)
 *    vẫn tĩnh/ISR; phần này tải riêng sau, có khung giữ chỗ cố định nên không giật bố cục.
 *  - Chưa đăng nhập: nút Đăng nhập / Đăng ký → /account.
 *  - Đã đăng nhập: avatar (ảnh hoặc vòng tròn gradient hoàng hôn với chữ cái đầu) + tên/email,
 *    bấm để xổ menu: Tài khoản & đồng bộ, Tiến độ của tôi, (Khu quản trị — CHỈ khi isAdmin), Đăng xuất.
 *  - Chế độ local (chưa có tài khoản học viên): nếu có phiên admin local thì chỉ hiện lối vào Khu quản trị.
 * `onInk`: đặt trên nền chàm của thanh bên desktop. Mặc định: nền sáng (dùng trong ngăn kéo menu điện thoại).
 */
export function AccountCorner({ onInk = false, onNavigate }: { onInk?: boolean; onNavigate?: () => void }) {
  const [me, setMe] = React.useState<MeInfo | null>(null);
  const [open, setOpen] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<MeInfo>) : ANONYMOUS_ME))
      .then((d) => { if (alive) setMe(d); })
      .catch(() => { if (alive) setMe(ANONYMOUS_ME); });
    return () => { alive = false; };
  }, []);

  // Đóng menu khi bấm ra ngoài hoặc nhấn Esc.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open ]);

  const wrap = onInk ? "rounded-xl border border-white/15 bg-white/8 p-3" : "rounded-lg border border-border-soft bg-muted p-3";
  const subText = onInk ? "text-ink-foreground/70" : "text-muted-foreground";

  // Đang tải: giữ chỗ đúng chiều cao xấp xỉ trạng thái đã tải để không đẩy menu chính xuống.
  if (me === null) {
    return (
      <div className={wrap} aria-busy="true">
        <span className="sr-only">Đang tải thông tin tài khoản…</span>
        <div className={cn("h-9 animate-pulse rounded-lg", onInk ? "bg-white/10" : "bg-border/50")} aria-hidden="true" />
      </div>
    );
  }

  const menuLink = cn(
    "nc-touch flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
    onInk ? "text-ink-foreground/90 hover:bg-white/10 hover:text-white" : "hover:bg-muted",
  );

  return (
    <div className={wrap} ref={rootRef}>
      {me.signedIn ? (
        <>
          <button
            type="button"
            className="nc-touch flex w-full items-center gap-2.5 rounded-lg text-left"
            aria-expanded={open}
            aria-haspopup="true"
            onClick={() => setOpen((v) => !v)}
          >
            {me.avatarUrl && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" onError={() => setImgFailed(true)} />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent) 0%, #e86a4e 55%, var(--gold) 130%)" }}
              >
                {meInitial(me)}
              </span>
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className={cn("block truncate text-sm font-semibold", onInk && "text-white")}>{me.displayName ?? me.email}</span>
              {me.email && me.displayName ? <span className={cn("block truncate text-xs", subText)}>{me.email}</span> : null}
            </span>
            <ChevronDown size={16} aria-hidden="true" className={cn("shrink-0 transition-transform", subText, open && "rotate-180")} />
          </button>
          {open ? (
            <div className={cn("mt-2 space-y-0.5 border-t pt-2", onInk ? "border-white/12" : "border-border-soft")}>
              <Link href="/account" className={menuLink} onClick={onNavigate}>
                <Icon name="settings" size={16} /> Tài khoản &amp; đồng bộ
              </Link>
              <Link href="/progress" className={menuLink} onClick={onNavigate}>
                <Icon name="chart" size={16} /> Tiến độ của tôi
              </Link>
              {me.isAdmin ? (
                <Link href="/admin" className={menuLink} onClick={onNavigate}>
                  <Icon name="shield" size={16} /> Khu quản trị
                </Link>
              ) : null}
              <form action={signOutAction}>
                <button type="submit" className={menuLink}>
                  <LogOut size={16} aria-hidden="true" /> Đăng xuất
                </button>
              </form>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {me.isAdmin ? (
            <Link href="/admin" className={menuLink} onClick={onNavigate}>
              <Icon name="shield" size={16} /> Khu quản trị
            </Link>
          ) : null}
          <p className={cn("text-xs leading-relaxed", me.isAdmin && "mt-1.5", subText)}>Đăng nhập để đồng bộ tiến độ học giữa các thiết bị.</p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href="/account"
              onClick={onNavigate}
              className="nc-touch inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_88%,black)]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/account"
              onClick={onNavigate}
              className={cn(
                "nc-touch inline-flex h-9 items-center rounded-lg border px-3.5 text-sm font-semibold transition-colors",
                onInk ? "border-white/25 text-white hover:bg-white/10" : "border-border bg-card hover:bg-muted",
              )}
            >
              Đăng ký
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
