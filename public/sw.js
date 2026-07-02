// ---- offline shell ----
// Capture must work on a plane: cache the app shell and static assets so the
// PWA opens without a network. API traffic is never cached — entries always
// come live (or queue client-side via lib/offline.ts when the network's gone).
const SHELL_CACHE = "verum-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache the record

  // Navigations: network-first, falling back to the cached shell offline.
  // Only successful, non-redirect responses are cached so a /login redirect
  // never becomes the stored shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches
              .open(SHELL_CACHE)
              .then((c) => c.put("/", copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Hashed build assets and icons: cache-first (immutable by construction).
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|ico|svg)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches
                .open(SHELL_CACHE)
                .then((c) => c.put(req, copy))
                .catch(() => {});
            }
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Verum";
  // Priority alerts pin on screen until acknowledged and vibrate on delivery,
  // instead of quietly auto-dismissing. Driven by the payload flag the server
  // sets for time-sensitive notification types.
  const priority = data.requireInteraction === true;
  const options = {
    body: data.body || "Open Verum",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "verum",
    requireInteraction: priority,
    renotify: priority,
    vibrate: priority ? [200, 100, 200] : undefined,
    data: {
      url: data.url || "/",
      type: data.type || "generic",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Pin navigation to this origin; a payload URL pointing elsewhere falls
  // back to the app root.
  const targetUrl = event.notification?.data?.url || "/";
  const resolved = new URL(targetUrl, self.location.origin);
  const url =
    resolved.origin === self.location.origin
      ? resolved.href
      : self.location.origin + "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
