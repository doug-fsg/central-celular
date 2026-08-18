import { AppError } from '../lib/errors'
import { prisma } from '../lib/prisma'
import { sendPushToUser, type PushPayload, type PushSendResult } from './pushNotificationService'

export type PushSubscriber = {
  userId: number
  nome: string
  cargo: string
  platforms: string[]
  deviceCount: number
  updatedAt: string
}

export type PushSendAllResult = PushSendResult & {
  usersTargeted: number
  usersWithSend: number
}

type DeviceMeta = {
  platform: string
  updatedAt: Date
}

function toSubscriber(user: {
  id: number
  nome: string
  cargo: string
  deviceTokens: DeviceMeta[]
}): PushSubscriber {
  const lastUpdated = user.deviceTokens.reduce<Date>(
    (latest, device) => (device.updatedAt > latest ? device.updatedAt : latest),
    user.deviceTokens[0]?.updatedAt ?? new Date(0),
  )
  const platforms = [...new Set(user.deviceTokens.map((device) => device.platform))]

  return {
    userId: user.id,
    nome: user.nome,
    cargo: user.cargo,
    platforms,
    deviceCount: user.deviceTokens.length,
    updatedAt: lastUpdated.toISOString(),
  }
}

export async function listPushSubscribers(
  accountId: number,
  opts: { search?: string; page: number; perPage: number },
) {
  const where = {
    accountId,
    deviceTokens: { some: {} },
    ...(opts.search
      ? { nome: { contains: opts.search, mode: 'insensitive' as const } }
      : {}),
  }

  const [total, users] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cargo: true,
        deviceTokens: {
          select: {
            platform: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
      skip: (opts.page - 1) * opts.perPage,
      take: opts.perPage,
    }),
  ])

  return {
    subscribers: users.map(toSubscriber),
    pagination: {
      page: opts.page,
      perPage: opts.perPage,
      total,
    },
  }
}

export async function sendPushToAccountUser(
  accountId: number,
  userId: number,
  payload: PushPayload,
): Promise<PushSendResult> {
  const usuario = await prisma.usuario.findFirst({
    where: { id: userId, accountId },
    select: {
      id: true,
      _count: { select: { deviceTokens: true } },
    },
  })

  if (!usuario) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado')
  }

  if (usuario._count.deviceTokens === 0) {
    throw new AppError(422, 'NO_DEVICES', 'Este usuário não tem notificações ativas')
  }

  return sendPushToUser(usuario.id, payload)
}

export async function sendPushToAllInAccount(
  accountId: number,
  payload: PushPayload,
): Promise<PushSendAllResult> {
  const users = await prisma.usuario.findMany({
    where: { accountId, deviceTokens: { some: {} } },
    select: { id: true },
  })

  if (users.length === 0) {
    throw new AppError(422, 'NO_DEVICES', 'Nenhum usuário com notificações ativas nesta igreja')
  }

  const totals: PushSendAllResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    usersTargeted: users.length,
    usersWithSend: 0,
  }

  for (const user of users) {
    const result = await sendPushToUser(user.id, payload)
    totals.sent += result.sent
    totals.skipped += result.skipped
    totals.failed += result.failed
    if (result.sent > 0) {
      totals.usersWithSend += 1
    }
  }

  return totals
}
