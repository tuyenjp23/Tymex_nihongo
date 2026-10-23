/* Service worker tối giản cho Nihongo Compass.
 * - Cài được như PWA.
 * - Tài nguyên tĩnh (/_next/static, /images, /icons): lấy từ cache trước, cập nhật ngầm.
 * - Trang: luôn lấy từ mạng; nếu mất mạng → trang /offline.html.
 * KHÔNG cache dữ liệu /api hay /admin (tránh lộ/giữ dữ liệu cũ). Học hoàn toàn offline CHƯA được hỗ trợ.
 */
const VERSION = "nc-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/admin")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (/^\/(_next\/static|images|icons)\//.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
  }
});
