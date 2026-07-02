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

  const targetUrl = event.notification?.data?.url || "/";
  const url = new URL(targetUrl, self.location.origin).href;

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
