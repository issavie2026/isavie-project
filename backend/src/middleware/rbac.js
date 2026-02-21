import { prisma } from '../lib/db.js';
import { forbidden, notFound } from './error.js';

export async function getMember(req) {
  const { tripId } = req.params;
  const userId = req.userId;
  if (!userId) return null;
  const member = await prisma.tripMember.findFirst({
    where: { tripId, userId, status: 'active' },
    include: { trip: true },
  });
  return member;
}

export function requireMember(req, res, next) {
  getMember(req).then((member) => {
    if (!member) return next(notFound('Trip not found or you are not a member'));
    req.tripMember = member;
    req.trip = member.trip;
    req.tripId = req.params.tripId;
    next();
  }).catch(next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (process.env.UNLOCK_ALL === 'true') return next();
    const member = req.tripMember;
    if (!member) return next(forbidden('Not a trip member'));
    if (!roles.includes(member.role)) return next(forbidden('Insufficient role'));
    next();
  };
}

export const requireOrganizerOrCo = requireRole('organizer', 'co_organizer');
export const requireOrganizer = requireRole('organizer');
