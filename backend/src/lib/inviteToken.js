import crypto from 'crypto';

/**
 * Hash an invite token for storage or lookup. Only the hash is stored in the DB.
 */
export function hashInviteToken(token) {
  if (!token || typeof token !== 'string') return null;
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Generate a new cryptographically random invite token (plain).
 * Caller must hash and store the hash; return the plain token only in the invite URL.
 */
export function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}
