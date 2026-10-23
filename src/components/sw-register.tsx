"use client";
import * as React from "react";

/** Đăng ký service worker (chỉ ở bản production) để app cài được như PWA và có trang offline cơ bản. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* không hỗ trợ / bị chặn: app vẫn chạy bình thường */
    });
  }, []);
  return null;
}
