import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://mtgc_user:mtgc_password@localhost:5432/mtgc_db?schema=public';

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos PostgreSQL conectada correctamente.');
  } catch (error) {
    console.warn(
      '⚠️ PostgreSQL no disponible en este momento. Servidor funcionando en modo Scryfall directo / memoria.',
    );
  }
}
