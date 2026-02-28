import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { tripsRouter } from './routes/trips.js';
import { invitesRouter } from './routes/invites.js';
import { itineraryRouter } from './routes/itinerary.js';
import { changeRequestsRouter } from './routes/change-requests.js';
import { announcementsRouter } from './routes/announcements.js';
import { commentsRouter } from './routes/comments.js';
import { essentialsRouter } from './routes/essentials.js';
import { notificationsRouter } from './routes/notifications.js';
import { exportRouter } from './routes/export.js';
import { analyticsRouter } from './routes/analytics.js';
import { errorHandler } from './middleware/error.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many auth attempts, try again later' },
});
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/trips/:tripId/itinerary', itineraryRouter);
app.use('/api/trips/:tripId/change-requests', changeRequestsRouter);
app.use('/api/trips/:tripId/announcements', announcementsRouter);
app.use('/api/trips/:tripId/comments', commentsRouter);
app.use('/api/trips/:tripId/essentials', essentialsRouter);
app.use('/api/trips/:tripId/export', exportRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;
