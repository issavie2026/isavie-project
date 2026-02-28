import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizer } from '../middleware/rbac.js';
import { badRequest, notFound } from '../middleware/error.js';
import { notifyTripMembers, notifyUser } from '../lib/notifications.js';

const router = Router({ mergeParams: true });

function getTripId(req) {
  return req.params.tripId;
}

router.get('/', requireAuth, requireMember, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const status = req.query.status; // optional filter
    const where = { tripId };
    if (status) where.status = status;
    const list = await prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { id: true, title: true, dayId: true, startTime: true } },
        requester: { select: { id: true, email: true, name: true } },
      },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

function applyPatch(item, patch) {
  const allowed = ['title', 'startTime', 'endTime', 'locationText', 'coverImage', 'notes', 'externalLinks'];
  const data = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      if (k === 'externalLinks') data[k] = Array.isArray(patch[k]) ? JSON.stringify(patch[k]) : patch[k];
      else data[k] = patch[k];
    }
  }
  return data;
}

router.post('/:requestId/approve', requireAuth, requireMember, requireOrganizer, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { requestId } = req.params;
    const cr = await prisma.changeRequest.findFirst({
      where: { id: requestId, tripId },
      include: { item: true },
    });
    if (!cr) throw notFound('Change request not found');
    if (cr.status !== 'pending') throw badRequest('Request already decided');
    const patch = JSON.parse(cr.proposedPatch);
    const data = applyPatch(cr.item, patch);
    data.updatedBy = req.userId;
    await prisma.$transaction([
      prisma.itineraryItem.update({ where: { id: cr.itineraryItemId }, data }),
      prisma.changeRequest.update({
        where: { id: requestId },
        data: { status: 'approved', decidedBy: req.userId, decidedAt: new Date() },
      }),
    ]);
    await notifyUser(cr.requestedBy, tripId, 'change_request_approved', { requestId, itemId: cr.itineraryItemId, title: cr.item.title });
    await notifyTripMembers(tripId, null, 'itinerary_updated', { requestId, itemId: cr.itineraryItemId, title: cr.item.title });
    const updated = await prisma.changeRequest.findUnique({ where: { id: requestId }, include: { item: true } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post('/:requestId/deny', requireAuth, requireMember, requireOrganizer, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { requestId } = req.params;
    const cr = await prisma.changeRequest.findFirst({ where: { id: requestId, tripId } });
    if (!cr) throw notFound('Change request not found');
    if (cr.status !== 'pending') throw badRequest('Request already decided');
    await prisma.changeRequest.update({
      where: { id: requestId },
      data: { status: 'denied', decidedBy: req.userId, decidedAt: new Date() },
    });
    await notifyUser(cr.requestedBy, tripId, 'change_request_denied', { requestId, itemId: cr.itineraryItemId });
    const updated = await prisma.changeRequest.findUnique({ where: { id: requestId } });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export const changeRequestsRouter = router;
