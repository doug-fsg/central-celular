import { z } from 'zod'
import { asyncHandler } from '../middlewares/asyncHandler'
import { fail, ok } from '../lib/response'
import { getAccountId } from '../lib/tenant'
import {
  listPushSubscribers,
  sendPushToAccountUser,
  sendPushToAllInAccount,
} from '../services/adminPush.service'

const optionalAppUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => value == null || value.startsWith('/') || /^https:\/\//i.test(value),
    'Informe um caminho do app (ex.: /dashboard) ou uma URL https',
  )

function queryInt(defaultValue: number, min: number, max?: number) {
  let schema = z.coerce.number().int().min(min)
  if (max != null) schema = schema.max(max)
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return defaultValue
    return value
  }, schema)
}

export const listSubscribersQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  page: queryInt(1, 1),
  perPage: queryInt(50, 1, 100),
})

export const sendPushBodySchema = z.object({
  title: z.string().trim().min(1, 'Título obrigatório').max(80, 'Título muito longo'),
  body: z.string().trim().min(1, 'Mensagem obrigatória').max(240, 'Mensagem muito longa'),
  url: optionalAppUrl,
})

export const sendAllPushBodySchema = sendPushBodySchema.extend({
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Confirme o envio para todos' }),
  }),
})

export const sendPushParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
})

export const listSubscribersHandler = asyncHandler(async (req, res) => {
  const accountId = getAccountId(req)
  if (!accountId) {
    return fail(res, 401, 'UNAUTHORIZED', 'Não autenticado')
  }

  const { search, page, perPage } = req.query as unknown as z.infer<typeof listSubscribersQuerySchema>
  const result = await listPushSubscribers(accountId, { search, page, perPage })
  return ok(res, result)
})

export const sendToUserHandler = asyncHandler(async (req, res) => {
  const accountId = getAccountId(req)
  if (!accountId) {
    return fail(res, 401, 'UNAUTHORIZED', 'Não autenticado')
  }

  const { userId } = req.params as unknown as z.infer<typeof sendPushParamsSchema>
  const { title, body, url } = req.body as z.infer<typeof sendPushBodySchema>
  const result = await sendPushToAccountUser(accountId, userId, { title, body, url })

  const message =
    result.sent > 0
      ? `Notificação enviada para ${result.sent} dispositivo(s)`
      : 'Nenhum dispositivo recebeu a notificação'

  return ok(res, { ...result, message })
})

export const sendToAllHandler = asyncHandler(async (req, res) => {
  const accountId = getAccountId(req)
  if (!accountId) {
    return fail(res, 401, 'UNAUTHORIZED', 'Não autenticado')
  }

  const { title, body, url } = req.body as z.infer<typeof sendAllPushBodySchema>
  const result = await sendPushToAllInAccount(accountId, { title, body, url })

  const message =
    result.usersWithSend > 0
      ? `Enviada para ${result.usersWithSend} de ${result.usersTargeted} usuário(s) (${result.sent} dispositivo(s))`
      : 'Nenhum dispositivo recebeu a notificação'

  return ok(res, { ...result, message })
})
