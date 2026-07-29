import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnv(): void {
  requireEnv('DATABASE_URL');

  if (process.env.NODE_ENV === 'production') {
    requireEnv('JWT_SECRET');
    if (process.env.JWT_SECRET === 'central-celular-secret') {
      throw new Error('JWT_SECRET must not use the default value in production');
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'dev-only-jwt-secret-change-me';
  }
  return secret;
}

export function getJwtRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || `${getJwtSecret()}-refresh`;
}

export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) {
    return [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
    ];
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function getQuepasaUpstream(): string {
  return (
    process.env.QUEPASA_UPSTREAM ||
    process.env.VITE_QUEPASA_UPSTREAM ||
    'http://173.249.22.227:31000'
  ).replace(/\/$/, '');
}

export function getApiPublicUrl(): string | undefined {
  return process.env.API_PUBLIC_URL;
}
