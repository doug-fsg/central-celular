import { Router } from 'express';
import { z } from 'zod';
import { autenticacao } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ok, noContent, fail } from '../lib/response';
import { prisma } from '../lib/prisma';
import { getUserId } from '../lib/tenant';

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

const devicesRouter = Router();
devicesRouter.use(autenticacao);

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
