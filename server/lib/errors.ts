export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = 'Recurso não encontrado'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function forbidden(message = 'Acesso negado'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function unauthorized(message = 'Não autorizado'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}
