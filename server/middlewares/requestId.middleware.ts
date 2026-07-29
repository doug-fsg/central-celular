import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
