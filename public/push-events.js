self.addEventListener('push', event => {
  let data;
  try { data = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification('আলুসাথী · AluSathi', {
    body: typeof data.body === 'string' ? data.body.slice(0,200) : 'Open your field Khata.',
    icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
    tag: typeof data.id === 'string' ? data.id : 'alusathi-reminder', data: {url: '/#tools'},
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate('/#tools'); return existing.focus(); }
    return self.clients.openWindow('/#tools');
  })());
});
