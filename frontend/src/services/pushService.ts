import httpClient from './httpClient'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushService = {
  async getVapidKey(): Promise<string> {
    const r = await httpClient.get<{ publicKey: string }>('/notifications/vapid-public-key')
    return r.data.publicKey
  },

  async subscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.register('/sw.js')
    const publicKey = await pushService.getVapidKey()

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const json = sub.toJSON()
    await httpClient.post('/notifications/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      userAgent: navigator.userAgent,
    })

    return true
  },

  async unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return

    const sub = await reg.pushManager.getSubscription()
    if (!sub) return

    const json = sub.toJSON()
    await httpClient.delete('/notifications/unsubscribe', {
      data: {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
    })
    await sub.unsubscribe()
  },

  async isSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  },
}
