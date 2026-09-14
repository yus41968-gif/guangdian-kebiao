/* 课表网站 Service Worker：静态资源离线缓存
 * 维护提示：更新网站文件时，把下面的 VERSION 改大一次（如 kb-v5），
 * 用户下次打开会自动拉取新版并清理旧缓存。 */
const VERSION = "kb-v4";
const CACHE = VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./schedule.css",
  "./schedule.js",
  "./schedule-data.js",
  "./manifest.webmanifest",
  "./icon-32.png",
  "./icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 页面导航：网络优先，失败回退缓存（离线可用） */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", cp));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* 静态资源：缓存优先，未命中再走网络并写入缓存 */
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((r) => {
        if (r && r.status === 200 && r.type === "basic") {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return r;
      })
    )
  );
});
