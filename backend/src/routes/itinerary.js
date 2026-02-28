import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizer } from '../middleware/rbac.js';
import { badRequest, notFound } from '../middleware/error.js';
import { notifyTripMembers, notifyUser } from '../lib/notifications.js';
import { handleValidationErrors } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

const ALLOWED_PATCH_KEYS = ['title', 'startTime', 'endTime', 'locationText', 'coverImage', 'notes', 'externalLinks'];

const createItemValidators = [
  body('title').trim().notEmpty().withMessage('title required').bail().isLength({ max: 500 }),
  body('day_id').optional({ values: 'null' }).isString().isLength({ max: 100 }),
  body('date').optional({ values: 'null' }),
  body('start_time').optional({ values: 'null' }).isString().isLength({ max: 50 }),
  body('end_time').optional({ values: 'null' }).isString().isLength({ max: 50 }),
  body('location_text').optional({ values: 'null' }).isString().isLength({ max: 500 }),
  body('cover_image').optional({ values: 'null' }).isString().isLength({ max: 5000000 }),
  body('notes').optional({ values: 'null' }).isString().isLength({ max: 5000 }),
  body('external_links').optional({ values: 'null' }).isArray(),
  body().custom((_, { req }) => {
    if (!req.body?.day_id && (req.body?.date === undefined || req.body?.date === null)) {
      throw new Error('day_id or date required');
    }
    return true;
  }),
];
const changeRequestValidators = [
  body('proposed_patch').notEmpty().withMessage('proposed_patch required').bail().isObject().withMessage('proposed_patch must be an object').bail()
    .custom((patch) => {
      const keys = Object.keys(patch);
      const invalid = keys.filter((k) => !ALLOWED_PATCH_KEYS.includes(k));
      if (invalid.length) throw new Error(`Invalid keys in proposed_patch: ${invalid.join(', ')}`);
      return true;
    }),
];

function getTripId(req) {
  return req.params.tripId;
}

router.get('/', requireAuth, requireMember, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const days = await prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: [{ date: 'asc' }, { position: 'asc' }],
      include: {
        items: {
          orderBy: [
            { startTime: 'asc' },
            { title: 'asc' },
          ],
        },
      },
    });
    const tbd = (a, b) => {
      const au = !a.startTime || a.startTime === 'TBD';
      const bu = !b.startTime || b.startTime === 'TBD';
      if (au && !bu) return 1;
      if (!au && bu) return -1;
      return (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title);
    };
    days.forEach((d) => d.items.sort(tbd));
    res.json({ days });
  } catch (e) {
    next(e);
  }
});

router.post('/items', requireAuth, requireMember, requireOrganizer, createItemValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { day_id, date, title, start_time, end_time, location_text, cover_image, notes, external_links } = req.body ?? {};
    const titleStr = (title != null ? String(title).trim() : '') || '';
    let dayId = day_id;
    let dayDate = date;
    if (!dayId && dayDate) {
      dayDate = new Date(dayDate);
      if (isNaN(dayDate.getTime())) throw badRequest('Invalid date');
      let day = await prisma.itineraryDay.findUnique({
        where: { tripId_date: { tripId, date: dayDate } },
      });
      if (!day) {
        const count = await prisma.itineraryDay.count({ where: { tripId } });
        day = await prisma.itineraryDay.create({
          data: { tripId, date: dayDate, position: count },
        });
      }
      dayId = day.id;
    }
    if (!dayId) throw badRequest('day_id or date required');
    const day = await prisma.itineraryDay.findFirst({ where: { id: dayId, tripId } });
    if (!day) throw notFound('Day not found');
    const links = Array.isArray(external_links) ? JSON.stringify(external_links) : (external_links ? String(external_links) : '[]');
    const item = await prisma.itineraryItem.create({
      data: {
        tripId,
        dayId,
        title: titleStr,
        startTime: start_time != null ? (start_time === '' || start_time === 'TBD' ? null : String(start_time)) : null,
        endTime: end_time != null ? (end_time === '' ? null : String(end_time)) : null,
        locationText: location_text != null ? String(location_text).trim() || null : null,
        coverImage: cover_image != null ? String(cover_image).trim() || null : null,
        notes: notes != null ? String(notes).trim() || null : null,
        externalLinks: links,
        createdBy: req.userId,
        updatedBy: req.userId,
      },
    });
    await notifyTripMembers(tripId, req.userId, 'itinerary_item_created', { itemId: item.id, title: item.title, dayId });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/items/:itemId', requireAuth, requireMember, requireOrganizer, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { itemId } = req.params;
    const item = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw notFound('Item not found');
    const {
      day_id, title, start_time, end_time, location_text, cover_image, notes, external_links,
    } = req.body ?? {};
    const data = {};
    if (day_id !== undefined) data.dayId = day_id;
    if (title !== undefined) data.title = String(title).trim();
    if (start_time !== undefined) data.startTime = start_time === '' || start_time === 'TBD' ? null : start_time;
    if (end_time !== undefined) data.endTime = end_time === '' ? null : end_time;
    if (location_text !== undefined) data.locationText = String(location_text).trim() || null;
    if (cover_image !== undefined) data.coverImage = String(cover_image).trim() || null;
    if (notes !== undefined) data.notes = String(notes).trim() || null;
    if (external_links !== undefined) data.externalLinks = Array.isArray(external_links) ? JSON.stringify(external_links) : String(external_links);
    data.updatedBy = req.userId;
    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data,
    });
    await notifyTripMembers(tripId, req.userId, 'itinerary_item_updated', { itemId, title: updated.title });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete('/items/:itemId', requireAuth, requireMember, requireOrganizer, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { itemId } = req.params;
    const item = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw notFound('Item not found');
    await prisma.itineraryItem.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.post('/items/:itemId/change-requests', requireAuth, requireMember, changeRequestValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { itemId } = req.params;
    const { proposed_patch } = req.body;
    const item = await prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw notFound('Item not found');
    const patchStr = JSON.stringify(proposed_patch);
    const cr = await prisma.changeRequest.create({
      data: {
        tripId,
        itineraryItemId: itemId,
        requestedBy: req.userId,
        proposedPatch: patchStr,
        status: 'pending',
      },
    });
    const organizers = await prisma.tripMember.findMany({
      where: { tripId, status: 'active', role: { in: ['organizer', 'co_organizer'] } },
      select: { userId: true },
    });
    for (const o of organizers) {
      if (o.userId !== req.userId) {
        await notifyUser(o.userId, tripId, 'change_request_submitted', { requestId: cr.id, itemId, title: item.title });
      }
    }
    res.status(201).json(cr);
  } catch (e) {
    next(e);
  }
});

export const itineraryRouter = router;
