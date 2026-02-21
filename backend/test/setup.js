// Must run before any import that uses Prisma/DATABASE_URL
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/test.db';
