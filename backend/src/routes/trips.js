import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/db.js';
import { generateInviteToken, hashInviteToken } from '../lib/inviteToken.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizer, requireOrganizerOrCo } from '../middleware/rbac.js';
import { badRequest, notFound } from '../middleware/error.js';
import { notifyUser } from '../lib/notifications.js';
import { handleValidationErrors } from '../middleware/validate.js';

export const tripsRouter = Router();

const createTripValidators = [
  body('name').trim().notEmpty().withMessage('name required').bail().isLength({ max: 500 }),
  body('destination').trim().notEmpty().withMessage('destination required').bail().isLength({ max: 1000 }),
  body('start_date').notEmpty().withMessage('start_date required').bail().isISO8601().withMessage('Invalid start_date').bail()
    .custom((start) => {
      const startDate = new Date(start);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const maxStart = new Date(today);
      maxStart.setUTCMonth(maxStart.getUTCMonth() + 6);
      const normalizedStart = new Date(startDate);
      normalizedStart.setUTCHours(0, 0, 0, 0);
      if (normalizedStart < today) throw new Error('start_date must be today or later');
      if (normalizedStart > maxStart) {
        throw new Error(`start_date must be on or before ${maxStart.toISOString().slice(0, 10)}`);
      }
      return true;
    }),
  body('end_date').notEmpty().withMessage('end_date required').bail().isISO8601().withMessage('Invalid end_date').bail()
    .custom((end, { req }) => {
      const start = new Date(req.body?.start_date);
      const endD = new Date(end);
      if (endD < start) throw new Error('end_date must be on or after start_date');
      return true;
    }),
  body('timezone').optional({ values: 'null' }).trim().isLength({ max: 100 }),
];

tripsRouter.post('/', requireAuth, createTripValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const { name, destination, start_date, end_date, timezone } = req.body;
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    // Normalize to start-of-day for consistent day boundaries
    const startDay = new Date(startDate);
    startDay.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(endDate);
    endDay.setUTCHours(0, 0, 0, 0);

    const trip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.create({
        data: {
          name: String(name).trim(),
          destination: String(destination).trim(),
          startDate: startDay,
          endDate: endDay,
          timezone: (timezone && String(timezone).trim()) || 'UTC',
          createdBy: req.userId,
        },
      });
      await tx.tripMember.create({
        data: { tripId: t.id, userId: req.userId, role: 'organizer', status: 'active' },
      });
      // Pre-create itinerary_days from start_date to end_date (inclusive)
      const days = [];
      let pos = 0;
      for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1), pos++) {
        days.push({
          tripId: t.id,
          date: new Date(d),
          position: pos,
        });
      }
      if (days.length) {
        await tx.itineraryDay.createMany({ data: days });
      }
      return t;
    });
    res.status(201).json(trip);
  } catch (e) {
    next(e);
  }
});

tripsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const members = await prisma.tripMember.findMany({
      where: { userId: req.userId, status: 'active' },
      include: { trip: true },
    });
    res.json(members.map((m) => ({ ...m.trip, myRole: m.role })));
  } catch (e) {
    next(e);
  }
});

tripsRouter.get('/:tripId', requireAuth, requireMember, (req, res) => {
  res.json(req.trip);
});

tripsRouter.delete('/:tripId', requireAuth, requireMember, requireOrganizer, async (req, res, next) => {
  try {
    await prisma.trip.delete({ where: { id: req.params.tripId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

tripsRouter.post('/:tripId/invites', requireAuth, requireMember, requireOrganizerOrCo, async (req, res, next) => {
  try {
    const tripId = req.params.tripId;
    const plainToken = generateInviteToken();
    const tokenHash = hashInviteToken(plainToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.invite.create({
      data: { tripId, tokenHash, expiresAt, createdBy: req.userId },
    });
    const base = process.env.FRONTEND_URL || 'http://localhost:5173';
    const url = `${base}/join/${plainToken}`;
    res.json({ url, token: plainToken, expiresIn: '30d' });
  } catch (e) {
    next(e);
  }
});

tripsRouter.get('/:tripId/members', requireAuth, requireMember, async (req, res, next) => {
  try {
    const members = await prisma.tripMember.findMany({
      where: { tripId: req.params.tripId, status: 'active' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json(members);
  } catch (e) {
    next(e);
  }
});

const patchMemberValidators = [
  body('role').isIn(['organizer', 'co_organizer', 'member']).withMessage('Invalid role'),
];
tripsRouter.patch('/:tripId/members/:userId', requireAuth, requireMember, requireOrganizerOrCo, patchMemberValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const target = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: req.params.tripId, userId } },
    });
    if (!target || target.status !== 'active') throw notFound('Member not found');
    const me = req.tripMember;
    if (role === 'organizer') {
      if (me.role !== 'organizer') throw badRequest('Only organizer can promote to organizer');
      await prisma.$transaction([
        prisma.tripMember.update({
          where: { tripId_userId: { tripId: req.params.tripId, userId } },
          data: { role: 'organizer' },
        }),
        prisma.tripMember.update({
          where: { tripId_userId: { tripId: req.params.tripId, userId: req.userId } },
          data: { role: 'co_organizer' },
        }),
      ]);
    } else {
      if (target.role === 'organizer' && me.role !== 'organizer') throw badRequest('Only organizer can demote organizer');
      await prisma.tripMember.update({
        where: { tripId_userId: { tripId: req.params.tripId, userId } },
        data: { role },
      });
    }
    const updated = await prisma.tripMember.findMany({
      where: { tripId: req.params.tripId, status: 'active' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

tripsRouter.delete('/:tripId/members/:userId', requireAuth, requireMember, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const me = req.tripMember;
    if (userId === req.userId) {
      await prisma.tripMember.update({
        where: { tripId_userId: { tripId: req.params.tripId, userId } },
        data: { status: 'removed' },
      });
      return res.status(204).send();
    }
    if (me.role === 'member') throw badRequest('Members cannot remove others');
    const target = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId: req.params.tripId, userId } },
    });
    if (!target || target.status !== 'active') throw notFound('Member not found');
    if (target.role === 'organizer' && me.role !== 'organizer') throw badRequest('Only organizer can remove organizer');
    await prisma.tripMember.update({
      where: { tripId_userId: { tripId: req.params.tripId, userId } },
      data: { status: 'removed' },
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
