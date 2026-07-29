import { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; perPage: number; total: number },
) {
  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    // Legacy compatibility for existing Vue client
    message,
  });
}

export function noContent(res: Response) {
  return res.status(204).send();
}
