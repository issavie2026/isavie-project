import './setup.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { createUser, createTrip, addMember, authHeader, cleanupTestDb } from './helpers.js';

const api = request(app);

describe('RBAC', () => {
  let userOrganizer;
  let userMember;
  let userOther;
  let tripId;
  let organizerToken;
  let memberToken;
  let otherToken;

  before(async () => {
    await cleanupTestDb();
    userOrganizer = await createUser({ email: 'org@rbac.test' });
    userMember = await createUser({ email: 'member@rbac.test' });
    userOther = await createUser({ email: 'other@rbac.test' });
    const trip = await createTrip(userOrganizer.id);
    tripId = trip.id;
    await addMember(tripId, userMember.id, 'member');
    organizerToken = authHeader(userOrganizer.id);
    memberToken = authHeader(userMember.id);
    otherToken = authHeader(userOther.id);
  });

  after(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('DELETE /trips/:tripId without token returns 401', async () => {
    const res = await api.delete(`/api/trips/${tripId}`).expect(401);
    assert.ok(res.body?.error || res.status === 401);
  });

  it('DELETE /trips/:tripId with token but not member returns 404', async () => {
    const res = await api
      .delete(`/api/trips/${tripId}`)
      .set(otherToken)
      .expect((n) => n === 404 || n === 403);
    assert.ok([404, 403].includes(res.status));
  });

  it('DELETE /trips/:tripId as member (not organizer) returns 403', async () => {
    const res = await api
      .delete(`/api/trips/${tripId}`)
      .set(memberToken)
      .expect(403);
    assert.strictEqual(res.status, 403);
  });

  it('DELETE /trips/:tripId as organizer returns 204', async () => {
    const trip = await createTrip(userOrganizer.id, { name: 'To Delete' });
    const res = await api
      .delete(`/api/trips/${trip.id}`)
      .set(organizerToken)
      .expect(204);
    assert.strictEqual(res.status, 204);
    const gone = await prisma.trip.findUnique({ where: { id: trip.id } });
    assert.strictEqual(gone, null);
  });

  it('PATCH member role as member returns 403', async () => {
    const trip = await createTrip(userOrganizer.id);
    await addMember(trip.id, userMember.id, 'member');
    const res = await api
      .patch(`/api/trips/${trip.id}/members/${userMember.id}`)
      .set(memberToken)
      .send({ role: 'co_organizer' })
      .expect(403);
    assert.strictEqual(res.status, 403);
  });

  it('POST itinerary item as member returns 403', async () => {
    const trip = await createTrip(userOrganizer.id);
    await addMember(trip.id, userMember.id, 'member');
    const day = await prisma.itineraryDay.findFirst({ where: { tripId: trip.id } });
    const res = await api
      .post(`/api/trips/${trip.id}/itinerary/items`)
      .set(memberToken)
      .send({ title: 'Item', day_id: day.id })
      .expect(403);
    assert.strictEqual(res.status, 403);
  });
});
