import './setup.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import {
  createUser,
  createTrip,
  addMember,
  createItineraryItem,
  createChangeRequest,
  authHeader,
  cleanupTestDb,
} from './helpers.js';

const api = request(app);

describe('Change request approval', () => {
  let organizer;
  let member;
  let tripId;
  let dayId;
  let itemId;
  let requestId;
  let organizerHeader;
  let memberHeader;

  before(async () => {
    await cleanupTestDb();
    organizer = await createUser({ email: 'org@cr.test' });
    member = await createUser({ email: 'member@cr.test' });
    const trip = await createTrip(organizer.id);
    tripId = trip.id;
    await addMember(tripId, member.id, 'member');
    const day = await prisma.itineraryDay.findFirst({ where: { tripId } });
    dayId = day.id;
    const item = await createItineraryItem(tripId, dayId, organizer.id, { title: 'Original Title' });
    itemId = item.id;
    const cr = await createChangeRequest(tripId, itemId, member.id, { title: 'Updated Title' });
    requestId = cr.id;
    organizerHeader = authHeader(organizer.id);
    memberHeader = authHeader(member.id);
  });

  after(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('approve applies proposed_patch and sets decidedBy/decidedAt', async () => {
    const res = await api
      .post(`/api/trips/${tripId}/change-requests/${requestId}/approve`)
      .set(organizerHeader)
      .expect(200);
    assert.strictEqual(res.body?.status, 'approved');
    assert.ok(res.body?.decidedBy);
    assert.ok(res.body?.decidedAt);

    const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } });
    assert.strictEqual(item.title, 'Updated Title');
  });

  it('deny only updates request, not item', async () => {
    const trip = await createTrip(organizer.id);
    await addMember(trip.id, member.id, 'member');
    const day = await prisma.itineraryDay.findFirst({ where: { tripId: trip.id } });
    const item = await createItineraryItem(trip.id, day.id, organizer.id, { title: 'Unchanged' });
    const cr = await createChangeRequest(trip.id, item.id, member.id, { title: 'Would Change' });
    const res = await api
      .post(`/api/trips/${trip.id}/change-requests/${cr.id}/deny`)
      .set(organizerHeader)
      .expect(200);
    assert.strictEqual(res.body?.status, 'denied');

    const updatedItem = await prisma.itineraryItem.findUnique({ where: { id: item.id } });
    assert.strictEqual(updatedItem.title, 'Unchanged');
  });
});
