import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("AVISO: a variável DATABASE_URL não foi definida.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

let parsedUrl = databaseUrl || "postgresql://user:password@localhost:5432/clinic_db?schema=public";
if (parsedUrl && !parsedUrl.includes('pgbouncer=true')) {
  parsedUrl += parsedUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
}

const prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: parsedUrl
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaInstance;
}

/**
 * Retorna uma instância do client do Prisma.
 */
export function getPrisma(): PrismaClient {
  return prismaInstance;
}
