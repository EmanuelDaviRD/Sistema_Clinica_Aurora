import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

const ensureSupabaseSslIfNeeded = (url: string) => {
  if (url.includes('.supabase.co') && !url.includes('sslmode=')) {
    if (url.includes('?')) {
      return `${url}&sslmode=require`;
    }
    return `${url}?sslmode=require`;
  }
  return url;
};

/**
 * Retorna uma instância lazy-loaded do client do Prisma.
 * Previne falhas de inicialização estática se as variáveis de ambiente não estiverem prontas.
 */
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    let databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.warn("AVISO: a variável DATABASE_URL não foi definida. Usando fallback para fins de compilação.");
    } else {
      databaseUrl = ensureSupabaseSslIfNeeded(databaseUrl);
    }

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl || "postgresql://user:password@localhost:5432/clinic_db?schema=public"
        }
      }
    });
  }
  return prismaInstance;
}
