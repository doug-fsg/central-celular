import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas requisições. Tente novamente mais tarde.' },
    message: 'Muitas requisições. Tente novamente mais tarde.',
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas tentativas. Aguarde um minuto.' },
    message: 'Muitas tentativas. Aguarde um minuto.',
  },
});
