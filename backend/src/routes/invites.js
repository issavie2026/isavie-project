import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { param } from 'express-validator';
import { prisma } from '../lib/db.js';
import { hashInviteToken } from '../lib/inviteToken.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest } from '../middleware/error.js';
import { handleValidationErrors } from '../middleware/validate.js';

const joinLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many join attempts' } });

export const invitesRouter = Router();

const inviteTokenParam = [param('token').notEmpty().trim().withMessage('Invite token required').bail().isLength({ max: 200 })];

/**
 * Find valid invite by token (hash lookup). Returns invite with tripId or null.
 */
async function findValidInvite(token) {
  if (!token || typeof token !== 'string' || !token.trim()) return null;
  const tokenHash = hashInviteToken(token.trim());
  if (!tokenHash) return null;
  const now = new Date();
  const invite = await prisma.invite.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
      revokedAt: null,
    },
    include: { trip: true },
  });
  return invite;
}

invitesRouter.post('/:token/join', joinLimiter, inviteTokenParam, handleValidationErrors, requireAuth, async (req, res, next) => {
  try {
    const invite = await findValidInvite(req.params.token);
    if (!invite) throw badRequest('Invalid or expired invite link');
    const trip = invite.trip;
    const existing = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: { tripId: trip.id, userId: req.userId },
      },
    });
    if (existing && existing.status === 'active') {
      return res.json({ trip, membership: existing, alreadyMember: true });
    }
    if (existing) {
      // previously removed: re-activate
      await prisma.tripMember.update({
        where: { tripId_userId: { tripId: trip.id, userId: req.userId } },
        data: { status: 'active', role: 'member' },
      });
      const membership = await prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId: trip.id, userId: req.userId } },
      });
      return res.json({ trip, membership, alreadyMember: false });
    }
    const member = await prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId: req.userId,
        role: 'member',
        status: 'active',
      },
    });
    res.json({ trip, membership: member, alreadyMember: false });
  } catch (e) {
    next(e);
  }
});

invitesRouter.get('/:token/preview', inviteTokenParam, handleValidationErrors, async (req, res, next) => {
  try {
    const invite = await findValidInvite(req.params.token);
    if (!invite) throw badRequest('Invalid or expired invite link');
    const trip = invite.trip;
    res.json({
      trip: {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      valid: true,
    });
  } catch (e) {
    next(e);
  }
});
