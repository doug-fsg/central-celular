import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { fail } from '../lib/response';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Dados inválidos', parsed.error.errors);
    }
    (req as Request & Record<string, unknown>)[target] = parsed.data;
    return next();
  };
}
