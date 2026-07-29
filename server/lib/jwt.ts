import jwt from 'jsonwebtoken';
import { getJwtSecret, getJwtRefreshSecret } from './env';

export interface AccessTokenPayload {
  userId: number;
  accountId: number;
  isSuperAdmin: boolean;
}

export interface SetupTokenPayload {
  purpose: 'setup-password';
  whatsapp: string;
  accountId: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1h' });
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, getJwtRefreshSecret(), {
    expiresIn: '30d',
  });
}

export function signSetupToken(payload: SetupTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '5m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload & { id?: number } {
  const decoded = jwt.verify(token, getJwtSecret()) as AccessTokenPayload & {
    id?: number;
    type?: string;
  };
  if (decoded.type === 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  const userId = decoded.userId ?? decoded.id;
  if (!userId) {
    throw new jwt.JsonWebTokenError('Token missing userId');
  }
  return {
    userId,
    accountId: decoded.accountId,
    isSuperAdmin: decoded.isSuperAdmin ?? false,
  };
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtRefreshSecret()) as AccessTokenPayload & {
    type?: string;
    id?: number;
  };
  if (decoded.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid refresh token');
  }
  const userId = decoded.userId ?? decoded.id;
  if (!userId) {
    throw new jwt.JsonWebTokenError('Token missing userId');
  }
  return {
    userId,
    accountId: decoded.accountId,
    isSuperAdmin: decoded.isSuperAdmin ?? false,
  };
}

export function verifySetupToken(token: string): SetupTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as SetupTokenPayload;
  if (decoded.purpose !== 'setup-password') {
    throw new jwt.JsonWebTokenError('Invalid setup token');
  }
  return decoded;
}
