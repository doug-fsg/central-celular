import { Router } from 'express';
import { z } from 'zod';
import { autenticacao } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ok, noContent, fail } from '../lib/response';
import { prisma } from '../lib/prisma';
import { getUserId } from '../lib/tenant';
import { getVapidPublicKey, sendPushToUser } from '../services/pushNotificationService';

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

const unsubscribeSchema = z.object({
  token: z.string().min(1),
});

const devicesRouter = Router();
devicesRouter.use(autenticacao);

devicesRouter.get(
  '/vapid-public-key',
  asyncHandler(async (_req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return fail(res, 503, 'VAPID_NOT_CONFIGURED', 'Notificações push não configuradas');
    }
    return ok(res, { publicKey });
  }),
);

devicesRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
    }

    const { token, platform } = req.body as z.infer<typeof registerSchema>;

    const device = await prisma.deviceToken.upsert({
      where: { token },
      update: { usuarioId: userId, platform },
      create: { usuarioId: userId, token, platform },
    });

    return ok(res, device, 201);
  }),
);

devicesRouter.post(
  '/unsubscribe',
  validate(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
    }

    const { token } = req.body as z.infer<typeof unsubscribeSchema>;

    const existing = await prisma.deviceToken.findFirst({
      where: { token, usuarioId: userId },
    });

    if (!existing) {
      return fail(res, 404, 'NOT_FOUND', 'Token não encontrado');
    }

    await prisma.deviceToken.delete({ where: { id: existing.id } });
    return noContent(res);
  }),
);

devicesRouter.post(
  '/test-push',
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
    }

    const result = await sendPushToUser(userId, {
      title: 'Aprisco',
      body: 'Esta é uma notificação de teste.',
      url: '/configuracoes',
    });

    const message =
      result.sent > 0
        ? 'Notificação de teste enviada'
        : 'Nenhum dispositivo recebeu a notificação';

    return ok(res, { ...result, message });
  }),
);

devicesRouter.delete(
  '/:token',
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário não autenticado');
    }

    const existing = await prisma.deviceToken.findFirst({
      where: { token: req.params.token, usuarioId: userId },
    });

    if (!existing) {
      return fail(res, 404, 'NOT_FOUND', 'Token não encontrado');
    }

    await prisma.deviceToken.delete({ where: { id: existing.id } });
    return noContent(res);
  }),
);

export { devicesRouter };
