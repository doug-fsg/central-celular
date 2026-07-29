import { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';
import { fail } from '../lib/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        accountId: number;
        isSuperAdmin: boolean;
      };
    }
  }
}

export const accountMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return fail(res, 401, 'UNAUTHORIZED', 'Token não fornecido');
  }

  try {
    const [, token] = authHeader.split(' ');
    const decoded = verifyAccessToken(token);

    const account = await prisma.account.findFirst({
      where: {
        id: decoded.accountId,
        ativo: true,
      },
    });

    if (!account) {
      return fail(res, 401, 'UNAUTHORIZED', 'Account inativa ou não encontrada');
    }

    const user = await prisma.usuario.findFirst({
      where: {
        id: decoded.userId,
        accountId: decoded.accountId,
        ativo: true,
      },
    });

    if (!user) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário inativo ou não encontrado');
    }

    req.user = {
      id: decoded.userId,
      accountId: decoded.accountId,
      isSuperAdmin: decoded.isSuperAdmin,
    };

    return next();
  } catch {
    return fail(res, 401, 'UNAUTHORIZED', 'Token inválido');
  }
};

export const superAdminMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return fail(res, 403, 'FORBIDDEN', 'Acesso permitido apenas para super administradores');
  }

  return next();
};
