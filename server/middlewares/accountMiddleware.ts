import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

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
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const [, token] = authHeader.split(' ');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      accountId: number;
      isSuperAdmin: boolean;
    };

    // Verifica se a account está ativa
    const account = await prisma.account.findFirst({
      where: {
        id: decoded.accountId,
        ativo: true
      }
    });

    if (!account) {
      return res.status(401).json({ error: 'Account inativa ou não encontrada' });
    }

    // Verifica se o usuário ainda está ativo
    const user = await prisma.usuario.findFirst({
      where: {
        id: decoded.userId,
        accountId: decoded.accountId,
        ativo: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    req.user = {
      id: decoded.userId,
      accountId: decoded.accountId,
      isSuperAdmin: decoded.isSuperAdmin
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const superAdminMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Acesso permitido apenas para super administradores' });
  }

  return next();
}; 