import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const upsert = vi.fn()
const findFirstDevice = vi.fn()
const deleteToken = vi.fn()
const findFirstUser = vi.fn()
const sendPushToUser = vi.fn()
const getVapidPublicKey = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    usuario: { findFirst: findFirstUser },
    deviceToken: {
      upsert,
      findFirst: findFirstDevice,
      delete: deleteToken,
    },
  },
}))

vi.mock('../services/pushNotificationService', () => ({
  getVapidPublicKey,
  sendPushToUser,
}))

const { createApp } = await import('../app')

const app = createApp()

const authUser = {
  id: 11,
  nome: 'Líder Teste',
  email: null,
  whatsapp: '5511999990000',
  senha: 'hash',
  cargo: 'LIDER',
  ativo: true,
  accountId: 22,
  isSuperAdmin: false,
  account: { id: 22, nome: 'Igreja', ativo: true },
}

function authHeader() {
  const token = jwt.sign(
    { userId: authUser.id, accountId: authUser.accountId, isSuperAdmin: false },
    process.env.JWT_SECRET || 'test-jwt-secret-for-vitest-only',
    { expiresIn: '1h' },
  )
  return { Authorization: `Bearer ${token}` }
}

const webToken = JSON.stringify({
  endpoint: 'https://fcm.googleapis.com/fcm/send/web-sub',
  keys: { p256dh: 'p256', auth: 'auth' },
})

describe('Devices routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirstUser.mockResolvedValue(authUser)
    getVapidPublicKey.mockReturnValue('vapid-public')
    upsert.mockResolvedValue({
      id: 1,
      usuarioId: authUser.id,
      platform: 'web',
      token: webToken,
    })
    sendPushToUser.mockResolvedValue({ sent: 1, skipped: 0, failed: 0, message: 'ok' })
  })

  it('registers a web JSON PushSubscription token', async () => {
    const res = await request(app)
      .post('/api/devices/register')
      .set(authHeader())
      .send({ platform: 'web', token: webToken })

    expect(res.status).toBe(201)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: webToken },
        create: expect.objectContaining({ platform: 'web', token: webToken }),
      }),
    )
    expect(JSON.parse(webToken).keys.p256dh).toBe('p256')
  })

  it('returns the VAPID public key', async () => {
    const res = await request(app).get('/api/devices/vapid-public-key').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.data.publicKey).toBe('vapid-public')
  })

  it('unsubscribes with token in the body, not the URL', async () => {
    findFirstDevice.mockResolvedValue({ id: 7, usuarioId: authUser.id, token: webToken })
    deleteToken.mockResolvedValue({})

    const res = await request(app)
      .post('/api/devices/unsubscribe')
      .set(authHeader())
      .send({ token: webToken })

    expect(res.status).toBe(204)
    expect(findFirstDevice).toHaveBeenCalledWith({
      where: { token: webToken, usuarioId: authUser.id },
    })
    expect(deleteToken).toHaveBeenCalledWith({ where: { id: 7 } })
  })

  it('sends a test push to the current user', async () => {
    sendPushToUser.mockResolvedValue({ sent: 1, skipped: 0, failed: 0 })

    const res = await request(app).post('/api/devices/test-push').set(authHeader()).send({})

    expect(res.status).toBe(200)
    expect(sendPushToUser).toHaveBeenCalledWith(authUser.id, expect.objectContaining({
      title: 'Aprisco',
    }))
    expect(res.body.data.sent).toBe(1)
  })

  it('requires auth for vapid public key', async () => {
    const res = await request(app).get('/api/devices/vapid-public-key')
    expect(res.status).toBe(401)
  })
})
