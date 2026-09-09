self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Elisssence Parfum', body: event.data.text() };
  }
  const title = payload.title || 'Elisssence Parfum';
  const options = {
    body: payload.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    })
  );
});