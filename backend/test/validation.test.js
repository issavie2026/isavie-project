import './setup.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { createUser, authHeader, cleanupTestDb } from './helpers.js';

const api = request(app);

describe('Request validation', () => {
  let user;
  let auth;

  before(async () => {
    await cleanupTestDb();
    user = await createUser({ email: 'val@test.issavie' });
    auth = authHeader(user.id);
  });

  after(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('POST /auth/magic-link with invalid email returns 400', async () => {
    const res = await api
      .post('/api/auth/magic-link')
      .send({ email: 'not-an-email' })
      .expect(400);
    assert.ok(res.body?.error);
  });

  it('POST /auth/magic-link with missing email returns 400', async () => {
    const res = await api
      .post('/api/auth/magic-link')
      .send({})
      .expect(400);
    assert.ok(res.body?.error);
  });

  it('POST /trips with invalid dates returns 400', async () => {
    const res = await api
      .post('/api/trips')
      .set(auth)
      .send({
        name: 'T',
        destination: 'D',
        start_date: '2025-01-10',
        end_date: '2025-01-01',
      })
      .expect(400);
    assert.ok(res.body?.error);
  });

  it('POST /trips with missing required fields returns 400', async () => {
    const res = await api
      .post('/api/trips')
      .set(auth)
      .send({ name: 'Only name' })
      .expect(400);
    assert.ok(res.body?.error);
  });
});
