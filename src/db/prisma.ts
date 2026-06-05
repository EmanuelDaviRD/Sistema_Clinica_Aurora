import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("AVISO: a variável DATABASE_URL não foi definida.");
}

const prismaInstance = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl || "postgresql://user:password@localhost:5432/clinic_db?schema=public"
    }
  }
});

/**
 * Retorna uma instância do client do Prisma.
 */
export function getPrisma(): PrismaClient {
  return prismaInstance;
}
