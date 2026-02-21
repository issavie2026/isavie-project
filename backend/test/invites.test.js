import './setup.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { createUser, createTrip, createInvite, authHeader, cleanupTestDb } from './helpers.js';

const api = request(app);

describe('Invite join flow', () => {
  let organizer;
  let joiner;
  let tripId;
  let token;
  let organizerHeader;
  let joinerHeader;

  before(async () => {
    await cleanupTestDb();
    organizer = await createUser({ email: 'org@invite.test' });
    joiner = await createUser({ email: 'joiner@invite.test' });
    const trip = await createTrip(organizer.id);
    tripId = trip.id;
    token = await createInvite(tripId, organizer.id);
    organizerHeader = authHeader(organizer.id);
    joinerHeader = authHeader(joiner.id);
  });

  after(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('POST /invites/:token/join creates membership and returns 200', async () => {
    const res = await api
      .post(`/api/invites/${token}/join`)
      .set(joinerHeader)
      .expect(200);
    assert.strictEqual(res.body?.alreadyMember, false);
    assert.ok(res.body?.membership);
    assert.ok(res.body?.trip);
    assert.strictEqual(res.body.membership.userId, joiner.id);
    assert.strictEqual(res.body.membership.role, 'member');

    const member = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: joiner.id } },
    });
    assert.ok(member);
    assert.strictEqual(member.status, 'active');
  });

  it('POST /invites/:token/join again returns 200 with alreadyMember: true (idempotent)', async () => {
    const res = await api
      .post(`/api/invites/${token}/join`)
      .set(joinerHeader)
      .expect(200);
    assert.strictEqual(res.body?.alreadyMember, true);
    assert.ok(res.body?.membership);

    const count = await prisma.tripMember.count({
      where: { tripId, userId: joiner.id, status: 'active' },
    });
    assert.strictEqual(count, 1);
  });
});
