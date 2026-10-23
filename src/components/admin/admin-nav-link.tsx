"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function AdminNavLink({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "nc-touch flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted",
        active && "bg-muted font-semibold text-primary",
      )}
    >
      <Icon name={icon} size={16} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
