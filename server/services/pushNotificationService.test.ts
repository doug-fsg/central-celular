import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushPayload } from './pushNotificationService'

const sendNotification = vi.fn()
const setVapidDetails = vi.fn()
const findMany = vi.fn()
const deleteToken = vi.fn()

vi.mock('web-push', () => ({
  default: {
    setVapidDetails,
    sendNotification,
  },
}))

vi.mock('../lib/prisma', () => ({
  prisma: {
    deviceToken: {
      findMany,
      delete: deleteToken,
    },
  },
}))

const { sendPushToUser } = await import('./pushNotificationService')

const webToken = JSON.stringify({
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256', auth: 'auth' },
})

describe('pushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VAPID_PUBLIC_KEY = 'public'
    process.env.VAPID_PRIVATE_KEY = 'private'
    process.env.VAPID_SUBJECT = 'mailto:dev@local.test'
    sendNotification.mockResolvedValue({})
    deleteToken.mockResolvedValue({})
  })

  it('sends web-push using parsed PushSubscriptionJSON', async () => {
    findMany.mockResolvedValue([
      { id: 1, usuarioId: 9, platform: 'web', token: webToken },
    ])

    const payload: PushPayload = { title: 'Aprisco', body: 'Olá', url: '/x' }
    const result = await sendPushToUser(9, payload)

    expect(setVapidDetails).toHaveBeenCalled()
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p256', auth: 'auth' } },
      JSON.stringify({
        title: 'Aprisco',
        body: 'Olá',
        icon: '/maskable-icon-512x512.png',
        url: '/x',
      }),
    )
    expect(result).toEqual({ sent: 1, skipped: 0, failed: 0 })
  })

  it('deletes gone web subscriptions on 410/404', async () => {
    findMany.mockResolvedValue([
      { id: 2, usuarioId: 9, platform: 'web', token: webToken },
    ])
    sendNotification.mockRejectedValue({ statusCode: 410 })

    const result = await sendPushToUser(9, { title: 'T', body: 'B' })
    expect(deleteToken).toHaveBeenCalledWith({ where: { id: 2 } })
    expect(result.sent).toBe(0)
  })

  it('skips native android/ios when Firebase is absent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    findMany.mockResolvedValue([
      { id: 3, usuarioId: 9, platform: 'android', token: 'fcm-token' },
    ])

    const result = await sendPushToUser(9, { title: 'T', body: 'B' })
    expect(sendNotification).not.toHaveBeenCalled()
    expect(result).toEqual({ sent: 0, skipped: 1, failed: 0 })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Firebase credentials ausentes'),
      'android',
    )
    warn.mockRestore()
  })

  it('does not send web-push to endpoint-only tokens', async () => {
    findMany.mockResolvedValue([
      { id: 4, usuarioId: 9, platform: 'web', token: 'https://only-endpoint' },
    ])

    const result = await sendPushToUser(9, { title: 'T', body: 'B' })
    expect(sendNotification).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
  })
})
