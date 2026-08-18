import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const findFirstUser = vi.fn()
const findManyUsers = vi.fn()
const countUsers = vi.fn()
const sendPushToUser = vi.fn()

vi.mock('../lib/prisma', () => ({
  prisma: {
    usuario: {
      findFirst: findFirstUser,
      findMany: findManyUsers,
      count: countUsers,
    },
  },
}))

vi.mock('../services/pushNotificationService', () => ({
  sendPushToUser,
  getVapidPublicKey: vi.fn(),
}))

const { createApp } = await import('../app')
const app = createApp()

const ACCOUNT_ID = 22

const pastor = {
  id: 10,
  nome: 'Pastor Teste',
  email: null,
  whatsapp: '5511999990010',
  senha: 'hash',
  cargo: 'PASTOR',
  ativo: true,
  accountId: ACCOUNT_ID,
  isSuperAdmin: false,
  account: { id: ACCOUNT_ID, nome: 'Igreja', ativo: true },
}

const lider = {
  ...pastor,
  id: 11,
  nome: 'Líder Teste',
  cargo: 'LIDER',
  whatsapp: '5511999990011',
}

const sameTenantUser = {
  id: 30,
  nome: 'Ana Líder',
  cargo: 'LIDER',
  accountId: ACCOUNT_ID,
}

const otherTenantUserId = 77

function signUser(user: { id: number; accountId: number; isSuperAdmin?: boolean }) {
  return jwt.sign(
    { userId: user.id, accountId: user.accountId, isSuperAdmin: user.isSuperAdmin === true },
    process.env.JWT_SECRET || 'test-jwt-secret-for-vitest-only',
    { expiresIn: '1h' },
  )
}

function authHeader(user = pastor) {
  return { Authorization: `Bearer ${signUser(user)}` }
}

describe('Admin push API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirstUser.mockImplementation(async (args: { where?: { id?: number; accountId?: number }; select?: { _count?: unknown } }) => {
      const id = args?.where?.id
      const accountId = args?.where?.accountId

      if (id === pastor.id && (accountId == null || accountId === ACCOUNT_ID)) {
        if (args.select?._count) {
          return { id: pastor.id, _count: { deviceTokens: 1 } }
        }
        return pastor
      }

      if (id === lider.id && (accountId == null || accountId === ACCOUNT_ID)) {
        return lider
      }

      if (id === sameTenantUser.id && accountId === ACCOUNT_ID) {
        if (args.select?._count) {
          return { id: sameTenantUser.id, _count: { deviceTokens: 2 } }
        }
        return sameTenantUser
      }

      if (id === 31 && accountId === ACCOUNT_ID) {
        return { id: 31, _count: { deviceTokens: 0 } }
      }

      return null
    })
    findManyUsers.mockResolvedValue([])
    countUsers.mockResolvedValue(0)
    sendPushToUser.mockResolvedValue({ sent: 1, skipped: 0, failed: 0 })
  })

  it('lists subscribers without leaking push tokens', async () => {
    const secretToken = JSON.stringify({
      endpoint: 'https://fcm.googleapis.com/fcm/send/secret-endpoint',
      keys: { p256dh: 'secret-p256', auth: 'secret-auth' },
    })

    countUsers.mockResolvedValue(1)
    findManyUsers.mockResolvedValue([
      {
        id: sameTenantUser.id,
        nome: sameTenantUser.nome,
        cargo: sameTenantUser.cargo,
        deviceTokens: [
          {
            platform: 'web',
            updatedAt: new Date('2026-08-18T12:00:00.000Z'),
            token: secretToken,
          },
        ],
      },
    ])

    const res = await request(app).get('/api/admin/push/subscribers').set(authHeader())

    expect(res.status).toBe(200)
    expect(findManyUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: ACCOUNT_ID }),
        select: expect.objectContaining({
          deviceTokens: {
            select: { platform: true, updatedAt: true },
          },
        }),
      }),
    )

    const bodyText = JSON.stringify(res.body)
    expect(bodyText).not.toContain('secret-endpoint')
    expect(bodyText).not.toContain('secret-p256')
    expect(bodyText).not.toContain('secret-auth')
    expect(bodyText).not.toContain(secretToken)
    expect(res.body.data.subscribers).toEqual([
      expect.objectContaining({
        userId: sameTenantUser.id,
        nome: 'Ana Líder',
        cargo: 'LIDER',
        platforms: ['web'],
        deviceCount: 1,
      }),
    ])
    expect(res.body.data.subscribers[0]).not.toHaveProperty('token')
    expect(res.body.data.subscribers[0].deviceTokens).toBeUndefined()
  })

  it('sends a push to a user in the same tenant via the service', async () => {
    const res = await request(app)
      .post(`/api/admin/push/users/${sameTenantUser.id}/send`)
      .set(authHeader())
      .send({ title: 'Culto', body: 'Começa às 19h', url: '/dashboard' })

    expect(res.status).toBe(200)
    expect(sendPushToUser).toHaveBeenCalledWith(sameTenantUser.id, {
      title: 'Culto',
      body: 'Começa às 19h',
      url: '/dashboard',
    })
    expect(res.body.data.sent).toBe(1)
  })

  it('cannot send to a user from another account', async () => {
    const res = await request(app)
      .post(`/api/admin/push/users/${otherTenantUserId}/send`)
      .set(authHeader())
      .send({ title: 'Oi', body: 'Mensagem' })

    expect(res.status).toBe(404)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('returns 422 when the tenant user has no devices', async () => {
    const res = await request(app)
      .post('/api/admin/push/users/31/send')
      .set(authHeader())
      .send({ title: 'Oi', body: 'Mensagem' })

    expect(res.status).toBe(422)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('rejects non-admin leaders with 403', async () => {
    const res = await request(app)
      .get('/api/admin/push/subscribers')
      .set(authHeader(lider))

    expect(res.status).toBe(403)
    expect(findManyUsers).not.toHaveBeenCalled()
  })

  it('rejects non-admin send with 403', async () => {
    const res = await request(app)
      .post(`/api/admin/push/users/${sameTenantUser.id}/send`)
      .set(authHeader(lider))
      .send({ title: 'Oi', body: 'Mensagem' })

    expect(res.status).toBe(403)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('validates send payload length', async () => {
    const res = await request(app)
      .post(`/api/admin/push/users/${sameTenantUser.id}/send`)
      .set(authHeader())
      .send({ title: 'x'.repeat(81), body: 'ok' })

    expect(res.status).toBe(400)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('requires confirm to send to everyone', async () => {
    const res = await request(app)
      .post('/api/admin/push/send-all')
      .set(authHeader())
      .send({ title: 'Aviso', body: 'Mensagem geral' })

    expect(res.status).toBe(400)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('returns 422 when nobody in the tenant has devices', async () => {
    findManyUsers.mockResolvedValue([])

    const res = await request(app)
      .post('/api/admin/push/send-all')
      .set(authHeader())
      .send({ title: 'Aviso', body: 'Mensagem geral', confirm: true })

    expect(res.status).toBe(422)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('sends to all subscribers in the tenant after confirm', async () => {
    findManyUsers.mockResolvedValue([{ id: sameTenantUser.id }, { id: pastor.id }])

    const res = await request(app)
      .post('/api/admin/push/send-all')
      .set(authHeader())
      .send({ title: 'Aviso', body: 'Mensagem geral', confirm: true })

    expect(res.status).toBe(200)
    expect(findManyUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: ACCOUNT_ID, deviceTokens: { some: {} } },
        select: { id: true },
      }),
    )
    expect(sendPushToUser).toHaveBeenCalledTimes(2)
    expect(sendPushToUser).toHaveBeenNthCalledWith(1, sameTenantUser.id, {
      title: 'Aviso',
      body: 'Mensagem geral',
      url: undefined,
    })
    expect(res.body.data.usersTargeted).toBe(2)
  })
})
