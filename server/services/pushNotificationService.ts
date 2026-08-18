import webpush from 'web-push'
import { prisma } from '../lib/prisma'

export type PushPayload = {
  title: string
  body: string
  icon?: string
  url?: string
}

export type PushSendResult = {
  sent: number
  skipped: number
  failed: number
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || 'mailto:contato@exemplo.com',
  }
}

function ensureWebPushConfigured(): boolean {
  const cfg = getVapidConfig()
  if (!cfg) return false
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey)
  return true
}

function parseWebPushSubscription(token: string): webpush.PushSubscription | null {
  try {
    const parsed = JSON.parse(token) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) {
      return null
    }
    return parsed as webpush.PushSubscription
  } catch {
    return null
  }
}

export async function sendPushToUser(
  usuarioId: number,
  payload: PushPayload,
): Promise<PushSendResult> {
  const devices = await prisma.deviceToken.findMany({ where: { usuarioId } })
  const result: PushSendResult = { sent: 0, skipped: 0, failed: 0 }
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/maskable-icon-512x512.png',
    url: payload.url || '/',
  })

  for (const device of devices) {
    if (device.platform === 'web') {
      if (!ensureWebPushConfigured()) {
        console.warn('[push] VAPID não configurado; pulando envio web-push')
        result.skipped += 1
        continue
      }

      const subscription = parseWebPushSubscription(device.token)
      if (!subscription) {
        console.warn('[push] token web inválido (precisa de endpoint + keys.p256dh + keys.auth); pulando id=%s', device.id)
        result.failed += 1
        continue
      }

      try {
        await webpush.sendNotification(subscription, body)
        result.sent += 1
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await prisma.deviceToken.delete({ where: { id: device.id } }).catch(() => undefined)
          console.warn('[push] inscrição web expirada (gone); token removido id=%s', device.id)
        } else {
          console.error('[push] falha web-push id=%s:', device.id, error)
          result.failed += 1
        }
      }
      continue
    }

    if (device.platform === 'android' || device.platform === 'ios') {
      // Sem firebase-admin / google-services.json nesta iteração: nunca misturar FCM com web-push.
      console.warn(
        '[push] Firebase credentials ausentes; pulando envio nativo (%s). Token registrado, mas FCM não será enviado.',
        device.platform,
      )
      result.skipped += 1
      continue
    }

    result.skipped += 1
  }

  return result
}
