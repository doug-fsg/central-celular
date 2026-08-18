/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// @ts-expect-error VitePWA injects the precache manifest at build time
precacheAndRoute(self.__WB_MANIFEST)

void self.skipWaiting()
clientsClaim()

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
)

type PushPayload = {
  title?: string
  body?: string
  icon?: string
  url?: string
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        let title = 'Aprisco'
        let body = 'Você tem uma nova notificação'
        let icon = '/maskable-icon-512x512.png'
        let url = '/'

        if (event.data) {
          try {
            const payload = event.data.json() as PushPayload
            title = payload.title || title
            body = payload.body || body
            icon = payload.icon || icon
            url = payload.url || url
          } catch {
            const text = event.data.text()
            if (text) body = text
          }
        }

        await self.registration.showNotification(title, {
          body,
          icon,
          data: { url },
        })
      } catch (error) {
        console.error('[sw] falha ao exibir notificação push:', error)
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string | undefined) || '/'

  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

        for (const client of clientList) {
          if ('focus' in client) {
            const focused = await client.focus()
            if (focused && 'navigate' in focused) {
              try {
                await focused.navigate(targetUrl)
              } catch {
                // Alguns clients não suportam navigate
              }
            }
            return
          }
        }

        await self.clients.openWindow(targetUrl)
      } catch (error) {
        console.error('[sw] falha no clique da notificação:', error)
      }
    })(),
  )
})
