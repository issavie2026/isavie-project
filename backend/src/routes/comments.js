import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizerOrCo } from '../middleware/rbac.js';
import { badRequest, notFound } from '../middleware/error.js';
import { handleValidationErrors } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

const ENTITY_TYPES = ['itinerary_item', 'announcement'];

const createCommentValidators = [
  body('entity_type').isIn(ENTITY_TYPES).withMessage('entity_type must be itinerary_item or announcement'),
  body('entity_id').notEmpty().withMessage('entity_id required').bail().isString().isLength({ max: 100 }),
  body('body').trim().notEmpty().withMessage('body required').bail().isLength({ max: 10000 }),
];

router.get('/', requireAuth, requireMember, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query;
    const where = { tripId: req.params.tripId, deletedAt: null };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    const list = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, requireMember, createCommentValidators, handleValidationErrors, async (req, res, next) => {
  try {
    const { entity_type, entity_id, body: bodyText } = req.body;
    const comment = await prisma.comment.create({
      data: {
        tripId: req.params.tripId,
        entityType: entity_type,
        entityId: String(entity_id),
        userId: req.userId,
        body: String(bodyText).trim(),
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
});

router.delete('/:commentId', requireAuth, requireMember, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findFirst({
      where: { id: req.params.commentId, tripId: req.params.tripId, deletedAt: null },
    });
    if (!comment) throw notFound('Comment not found');
    const canDeleteAny = ['organizer', 'co_organizer'].includes(req.tripMember.role);
    if (comment.userId !== req.userId && !canDeleteAny) throw badRequest('You can only delete your own comments');
    await prisma.comment.update({
      where: { id: comment.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export const commentsRouter = router;
