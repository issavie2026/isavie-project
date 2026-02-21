import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { trip: { select: { id: true, name: true } } },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!n) return res.status(404).json({ error: 'Not found' });
    await prisma.notification.update({
      where: { id: n.id },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
