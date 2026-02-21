import './setup.js';
import { prisma } from '../src/lib/db.js';
import { signToken } from '../src/middleware/auth.js';
import { hashInviteToken, generateInviteToken } from '../src/lib/inviteToken.js';

export function authHeader(userId) {
  const token = signToken(userId);
  return { Authorization: `Bearer ${token}` };
}

export async function createUser(overrides = {}) {
  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.issavie`;
  return prisma.user.create({
    data: { email, name: overrides.name ?? null },
  });
}

export async function createTrip(createdByUserId, data = {}) {
  const start = data.startDate || new Date(Date.now());
  const end = data.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  const trip = await prisma.trip.create({
    data: {
      name: data.name || 'Test Trip',
      destination: data.destination || 'Test Dest',
      startDate: start,
      endDate: end,
      timezone: data.timezone || 'UTC',
      createdBy: createdByUserId,
    },
  });
  await prisma.tripMember.create({
    data: { tripId: trip.id, userId: createdByUserId, role: 'organizer', status: 'active' },
  });
  const days = [];
  for (let d = new Date(start), pos = 0; d <= end; d.setUTCDate(d.getUTCDate() + 1), pos++) {
    days.push({ tripId: trip.id, date: new Date(d), position: pos });
  }
  if (days.length) await prisma.itineraryDay.createMany({ data: days });
  return trip;
}

export async function addMember(tripId, userId, role = 'member') {
  return prisma.tripMember.create({
    data: { tripId, userId, role, status: 'active' },
  });
}

export async function createInvite(tripId, createdByUserId) {
  const plainToken = generateInviteToken();
  const tokenHash = hashInviteToken(plainToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.invite.create({
    data: { tripId, tokenHash, expiresAt, createdBy: createdByUserId },
  });
  return plainToken;
}

export async function createItineraryItem(tripId, dayId, createdByUserId, data = {}) {
  const day = await prisma.itineraryDay.findFirst({ where: { id: dayId, tripId } });
  if (!day) throw new Error('Day not found');
  return prisma.itineraryItem.create({
    data: {
      tripId,
      dayId,
      title: data.title || 'Item',
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      locationText: data.locationText ?? null,
      notes: data.notes ?? null,
      externalLinks: data.externalLinks ?? '[]',
      createdBy: createdByUserId,
      updatedBy: createdByUserId,
    },
  });
}

export async function createChangeRequest(tripId, itineraryItemId, requestedByUserId, proposedPatch = { title: 'Updated' }) {
  return prisma.changeRequest.create({
    data: {
      tripId,
      itineraryItemId,
      requestedBy: requestedByUserId,
      proposedPatch: JSON.stringify(proposedPatch),
      status: 'pending',
    },
  });
}

export async function cleanupTestDb() {
  await prisma.notification.deleteMany({});
  await prisma.changeRequest.deleteMany({});
  await prisma.itineraryItem.deleteMany({});
  await prisma.itineraryDay.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.tripMember.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.magicLink.deleteMany({});
  await prisma.user.deleteMany({});
}
