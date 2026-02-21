import './setup.js';
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { cleanupTestDb } from './helpers.js';

const api = request(app);

describe('Rate limiting', () => {
  after(async () => {
    await cleanupTestDb();
    await prisma.$disconnect();
  });

  it('POST /auth/magic-link eventually returns 429 after limit', async () => {
    const limit = 16;
    let lastStatus = 0;
    for (let i = 0; i < limit; i++) {
      const res = await api
        .post('/api/auth/magic-link')
        .send({ email: `rate-${i}@test.issavie` });
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    assert.strictEqual(lastStatus, 429, 'Expected at least one 429 from auth rate limiter');
  });
});
