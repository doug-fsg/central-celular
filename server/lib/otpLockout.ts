const lockouts = new Map<string, { attempts: number; lockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function keyFor(whatsapp: string, accountId: number): string {
  return `${accountId}:${whatsapp}`;
}

export const otpLockout = {
  isLocked(whatsapp: string, accountId: number): boolean {
    const entry = lockouts.get(keyFor(whatsapp, accountId));
    if (!entry?.lockedUntil) return false;
    if (Date.now() >= entry.lockedUntil) {
      lockouts.delete(keyFor(whatsapp, accountId));
      return false;
    }
    return true;
  },

  recordFailure(whatsapp: string, accountId: number): void {
    const key = keyFor(whatsapp, accountId);
    const entry = lockouts.get(key) ?? { attempts: 0 };
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    lockouts.set(key, entry);
  },

  reset(whatsapp: string, accountId: number): void {
    lockouts.delete(keyFor(whatsapp, accountId));
  },
};
