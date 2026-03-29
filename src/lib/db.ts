import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const logLevels: ('error' | 'warn')[] =
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'];

  const url = process.env.DATABASE_URL ?? '';

  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    // PostgreSQL server: use @prisma/adapter-pg with connection pool
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: logLevels });
  }

  // PGlite: embedded PostgreSQL, no server needed
  // DATABASE_URL is the data directory path (e.g. "./pglite/dev")
  const { PGlite } = require('@electric-sql/pglite');
  const { PrismaPGlite } = require('pglite-prisma-adapter');
  const client = new PGlite(url || './pglite/dev');
  const adapter = new PrismaPGlite(client);
  return new PrismaClient({ adapter, log: logLevels });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop);
  },
});
