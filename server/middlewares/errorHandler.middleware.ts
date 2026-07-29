import { Request, Response, NextFunction } from 'express';
import { fail } from '../lib/response';
import { AppError } from '../lib/errors';
import { Prisma } from '@prisma/client';

export function notFoundMiddleware(req: Request, res: Response) {
  return fail(res, 404, 'NOT_FOUND', `Rota não encontrada: ${req.method} ${req.originalUrl}`);
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return fail(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return fail(res, 409, 'CONFLICT', 'Registro duplicado');
    }
    if (err.code === 'P2025') {
      return fail(res, 404, 'NOT_FOUND', 'Recurso não encontrado');
    }
  }

  console.error(`[${req.requestId ?? 'no-id'}]`, err);

  const message =
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Erro interno do servidor';

  return fail(res, 500, 'INTERNAL_ERROR', message);
}
