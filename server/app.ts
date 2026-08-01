import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { router } from './routes/index';
import { adminRouter } from './routes/admin.routes';
import { devicesRouter } from './routes/devices.routes';
import { corsOptions } from './lib/cors';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { globalLimiter } from './middlewares/rateLimit.middleware';
import { notFoundMiddleware, errorHandlerMiddleware } from './middlewares/errorHandler.middleware';
import { ok } from './lib/response';
import { prisma } from './lib/prisma';

const UPLOADS_DIR = path.resolve(process.cwd(), 'server', 'uploads');

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors(corsOptions));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestIdMiddleware);
  app.use(globalLimiter);

  app.get('/api/health', (_req, res) => {
    return ok(res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return ok(res, { status: 'ready', db: 'ok' });
    } catch {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_READY', message: 'Database unavailable' },
      });
    }
  });

  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '7d',
      fallthrough: true,
    })
  );

  app.use('/', router);
  app.use('/api/admin', adminRouter);
  app.use('/api/devices', devicesRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
