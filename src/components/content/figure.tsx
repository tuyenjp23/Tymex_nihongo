"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Hình minh họa có dự phòng: nếu file hình mất/lỗi thì hiện khung chữ thay vì ảnh vỡ. */
export function Figure({ src, alt, className, fallback }: { src: string; alt: string; className?: string; fallback?: string }) {
  const [failed, setFailed] = React.useState(false);
  const ref = React.useRef<HTMLImageElement>(null);

  // Ảnh có thể lỗi TRƯỚC khi React hydrate (HTML do server render) hoặc ngay sau đó → React có thể bỏ lỡ sự kiện onError.
  // Vì vậy: kiểm tra trạng thái hiện tại + gắn thêm listener gốc ngay khi mount.
  React.useEffect(() => {
    setFailed(false);
    const el = ref.current;
    if (!el) return;
    const onErr = () => setFailed(true);
    if (el.complete && el.naturalWidth === 0) setFailed(true);
    el.addEventListener("error", onErr);
    return () => el.removeEventListener("error", onErr);
  }, [src]);

  if (failed) {
    return (
      <div role="img" aria-label={alt} className={cn("grid place-items-center rounded-md bg-muted text-center text-xs text-muted-foreground", className)}>
        <span className="jp px-2 text-2xl">{fallback ?? "🖼"}</span>
        <span className="px-2 pb-2">Không tải được hình</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn("rounded-md bg-muted object-contain", className)} />;
}
