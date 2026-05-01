self.addEventListener('push', event => {
  if (!event.data) return
  const payload = event.data.json()
  event.waitUntil(
    self.registration.showNotification(payload.Title || 'Garage', {
      body: payload.Body,
      icon: payload.Icon || '/favicon.ico',
      tag: payload.Tag,
      data: { url: payload.Url },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  }
})
