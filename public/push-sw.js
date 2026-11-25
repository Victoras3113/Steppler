// Push-only service worker: shows order alerts when the app is closed or the phone is locked. No caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const home = () => self.registration.scope; // e.g. https://you.github.io/Steppler/

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "Seppeler Gabelstapler-Disponent", {
      body: d.body || "Neuer Auftrag",
      icon: home() + "icon-512.png",
      badge: home() + "icon-512.png",
      tag: d.orderId || "order",
      requireInteraction: true,
      data: { url: home() },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow(home());
    }),
  );
});
