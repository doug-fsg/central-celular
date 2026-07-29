import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getJwtSecret, verifyAccessToken } from '../lib/jwt';
import { fail } from '../lib/response';

interface TokenPayload {
  id?: number;
  userId?: number;
  accountId?: number;
  isSuperAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: any;
      user?: {
        id: number;
        accountId: number;
        isSuperAdmin: boolean;
      };
    }
  }
}

export const autenticacao = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return fail(res, 401, 'UNAUTHORIZED', 'Token não fornecido');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
      return fail(res, 401, 'UNAUTHORIZED', 'Formato de token inválido');
    }

    const token = parts[1];
    let decoded: TokenPayload;

    try {
      decoded = verifyAccessToken(token);
    } catch {
      return fail(res, 401, 'UNAUTHORIZED', 'Token inválido ou expirado');
    }

    const userId = decoded.userId ?? decoded.id;
    const accountId = decoded.accountId;

    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Token não contém ID do usuário');
    }

    const queryWhere = accountId ? { id: userId, accountId } : { id: userId };

    const usuario = await prisma.usuario.findFirst({
      where: queryWhere,
      include: {
        account: {
          select: {
            id: true,
            nome: true,
            ativo: true,
          },
        },
      },
    });

    if (!usuario) {
      return fail(res, 401, 'UNAUTHORIZED', 'Usuário não encontrado');
    }

    if (!usuario.ativo) {
      return fail(res, 403, 'FORBIDDEN', 'Usuário desativado');
    }

    if (usuario.account && !usuario.account.ativo) {
      return fail(res, 403, 'FORBIDDEN', 'Account desativada');
    }

    const { senha, ...usuarioSemSenha } = usuario;

    req.usuario = usuarioSemSenha;
    req.user = {
      id: usuario.id,
      accountId: usuario.accountId,
      isSuperAdmin: usuario.isSuperAdmin || false,
    };

    return next();
  } catch (error) {
    console.error('Erro na autenticação:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return fail(res, 401, 'UNAUTHORIZED', 'Token inválido');
    }

    if (error instanceof jwt.TokenExpiredError) {
      return fail(res, 401, 'TOKEN_EXPIRED', 'Token expirado');
    }

    return fail(res, 500, 'INTERNAL_ERROR', 'Erro na autenticação');
  }
};
