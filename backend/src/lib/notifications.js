import { prisma } from './db.js';

export async function notifyTripMembers(tripId, excludeUserId, type, payload = {}) {
  const members = await prisma.tripMember.findMany({
    where: { tripId, status: 'active', userId: excludeUserId ? { not: excludeUserId } : undefined },
    select: { userId: true },
  });
  const records = members.map((m) => ({
    userId: m.userId,
    tripId,
    type,
    payload: JSON.stringify(payload),
  }));
  if (records.length) await prisma.notification.createMany({ data: records });
}

export async function notifyUser(userId, tripId, type, payload = {}) {
  await prisma.notification.create({
    data: {
      userId,
      tripId,
      type,
      payload: JSON.stringify(payload),
    },
  });
}
