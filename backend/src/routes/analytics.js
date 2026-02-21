import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

export const analyticsRouter = Router();

analyticsRouter.post('/event', requireAuth, async (req, res, next) => {
  try {
    const { event, payload } = req.body ?? {};
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'event required' });
    }
    await prisma.analyticsEvent.create({
      data: {
        event: event.substring(0, 100),
        payload: typeof payload === 'object' ? JSON.stringify(payload) : (payload ? String(payload) : '{}'),
        userId: req.userId,
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
