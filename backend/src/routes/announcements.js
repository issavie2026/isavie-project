import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizerOrCo } from '../middleware/rbac.js';
import { notifyTripMembers } from '../lib/notifications.js';
import { badRequest, notFound } from '../middleware/error.js';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, requireMember, async (req, res, next) => {
  try {
    const list = await prisma.announcement.findMany({
      where: { tripId: req.params.tripId },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, email: true, name: true } } },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, requireMember, requireOrganizerOrCo, async (req, res, next) => {
  try {
    const { title, body } = req.body ?? {};
    const bodyStr = body != null ? String(body).trim() : '';
    if (!bodyStr) throw badRequest('body required');
    const ann = await prisma.announcement.create({
      data: {
        tripId: req.params.tripId,
        title: title != null ? String(title).trim() || null : null,
        body: bodyStr,
        createdBy: req.userId,
      },
      include: { creator: { select: { id: true, email: true, name: true } } },
    });
    await notifyTripMembers(req.params.tripId, req.userId, 'announcement_posted', { announcementId: ann.id, title: ann.title });
    res.status(201).json(ann);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/pin', requireAuth, requireMember, requireOrganizerOrCo, async (req, res, next) => {
  try {
    const { tripId, id } = req.params;
    const pinned = req.body?.pinned === true || req.body?.pinned === 'true';
    const ann = await prisma.announcement.findFirst({
      where: { id, tripId },
      include: { creator: { select: { id: true, email: true, name: true } } },
    });
    if (!ann) throw notFound('Announcement not found');
    const updated = await prisma.announcement.update({
      where: { id },
      data: { pinned },
      include: { creator: { select: { id: true, email: true, name: true } } },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export const announcementsRouter = router;
