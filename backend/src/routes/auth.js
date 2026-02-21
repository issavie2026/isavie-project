import { Router } from 'express';
import { body } from 'express-validator';
import crypto from 'crypto';
import { prisma } from '../lib/db.js';
import { sendMagicLink } from '../lib/email.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { badRequest } from '../middleware/error.js';
import { handleValidationErrors } from '../middleware/validate.js';

export const authRouter = Router();

const magicLinkValidators = [
  body('email').trim().notEmpty().withMessage('Email required').bail().isEmail().withMessage('Valid email required').bail().isLength({ max: 255 }),
];
const verifyValidators = [
  body('token').notEmpty().withMessage('Token required').bail().isString().bail().isLength({ min: 1, max: 500 }),
];

authRouter.post('/magic-link', magicLinkValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.magicLink.create({
      data: { email, token, expiresAt },
    });
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontend}/auth/verify?token=${token}`;
    await sendMagicLink(email, link);
    res.json({ ok: true, message: 'Magic link sent' });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/verify', verifyValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const token = req.body.token;
    const record = await prisma.magicLink.findUnique({
      where: { token },
    });
    if (!record || record.usedAt || new Date() > record.expiresAt) {
      throw badRequest('Invalid or expired link');
    }
    await prisma.magicLink.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    let user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: record.email },
      });
    }
    const jwt = signToken(user.id);
    res.json({ token: jwt, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
