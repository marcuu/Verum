self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Verum";
  const options = {
    body: data.body || "Open Verum",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "verum",
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
