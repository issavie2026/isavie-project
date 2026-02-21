import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db.js';
import { unauthorized, badRequest } from './error.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-min-32-characters-long';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return next(unauthorized('Missing or invalid token'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    prisma.user.findUnique({ where: { id: payload.userId } })
      .then((user) => {
        if (!user) return next(unauthorized('User not found'));
        req.user = user;
        req.userId = user.id;
        next();
      })
      .catch(next);
  } catch (e) {
    next(unauthorized('Invalid or expired token'));
  }
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    prisma.user.findUnique({ where: { id: payload.userId } })
      .then((user) => {
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
        next();
      })
      .catch(next);
  } catch (e) {
    next();
  }
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
