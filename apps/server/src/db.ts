import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const rawConnectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public&sslmode=disable';

const connectionString = rawConnectionString.startsWith('postgres://')
  ? rawConnectionString.replace(/^postgres:\/\//, 'postgresql://')
  : rawConnectionString;

const isLocalDb = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');
const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('amazonaws.com') ||
  (!isLocalDb && isProduction);

let pgliteServerInstance: any = null;
let pgliteDbInstance: any = null;

export const pool = new pg.Pool({
  connectionString,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  max: 2,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensureTablesExist(): Promise<void> {
  const ddl = `
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT UNIQUE NOT NULL,
      "email" TEXT UNIQUE,
      "passwordHash" TEXT,
      "isGuest" BOOLEAN NOT NULL DEFAULT false,
      "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
      "emailVerificationToken" TEXT,
      "refreshTokenHash" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "cards" (
      "id" TEXT PRIMARY KEY,
      "scryfallId" TEXT UNIQUE NOT NULL,
      "oracleId" TEXT,
      "name" TEXT NOT NULL,
      "manaCost" TEXT,
      "cmc" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "typeLine" TEXT NOT NULL,
      "oracleText" TEXT,
      "colors" TEXT[] NOT NULL DEFAULT '{}',
      "colorIdentity" TEXT[] NOT NULL DEFAULT '{}',
      "power" TEXT,
      "toughness" TEXT,
      "loyalty" TEXT,
      "set" TEXT,
      "setName" TEXT,
      "rarity" TEXT,
      "collectorNumber" TEXT,
      "artist" TEXT,
      "imageUrlSmall" TEXT,
      "imageUrlNormal" TEXT,
      "imageUrlArtCrop" TEXT,
      "layout" TEXT,
      "legalities" JSONB,
      "isCommander" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "cards_name_idx" ON "cards"("name");
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "set" TEXT;
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "setName" TEXT;
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "rarity" TEXT;
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "collectorNumber" TEXT;
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "artist" TEXT;
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "loyalty" TEXT;
    CREATE INDEX IF NOT EXISTS "cards_oracleId_idx" ON "cards"("oracleId");

    CREATE TABLE IF NOT EXISTS "rulings" (
      "id" TEXT PRIMARY KEY,
      "oracleId" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'wotc',
      "publishedAt" TIMESTAMP(3) NOT NULL,
      "comment" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "rulings_oracleId_idx" ON "rulings"("oracleId");

    CREATE TABLE IF NOT EXISTS "card_locales" (
      "id" TEXT PRIMARY KEY,
      "oracle_id" TEXT NOT NULL,
      "lang" TEXT NOT NULL,
      "printing_id" TEXT NOT NULL,
      "printed_name" TEXT NOT NULL,
      "printed_text" TEXT,
      "printed_type_line" TEXT,
      "image_url_small" TEXT,
      "image_url_normal" TEXT,
      "image_url_large" TEXT,
      "image_url_art_crop" TEXT,
      "released_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "card_locales_oracle_id_lang_key" UNIQUE ("oracle_id", "lang")
    );
    CREATE INDEX IF NOT EXISTS "card_locales_oracle_id_idx" ON "card_locales"("oracle_id");
    CREATE INDEX IF NOT EXISTS "card_locales_lang_idx" ON "card_locales"("lang");
    CREATE INDEX IF NOT EXISTS "card_locales_printed_name_idx" ON "card_locales"("printed_name");

    CREATE TABLE IF NOT EXISTS "decks" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT,
      "name" TEXT NOT NULL,
      "format" TEXT NOT NULL DEFAULT 'commander',
      "commanderName" TEXT,
      "colorIdentity" TEXT[] NOT NULL DEFAULT '{}',
      "cardCount" INTEGER NOT NULL DEFAULT 0,
      "rawDecklist" TEXT,
      "deckData" JSONB,
      "isPreset" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "deck_cards" (
      "id" TEXT PRIMARY KEY,
      "deckId" TEXT NOT NULL,
      "cardId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "isCommander" BOOLEAN NOT NULL DEFAULT false,
      "section" TEXT NOT NULL DEFAULT 'main',
      CONSTRAINT "deck_cards_deckId_cardId_section_key" UNIQUE ("deckId", "cardId", "section")
    );

    CREATE TABLE IF NOT EXISTS "tables" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "hostId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'lobby',
      "settings" JSONB NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" TIMESTAMP(3)
    );

    CREATE TABLE IF NOT EXISTS "game_records" (
      "id" TEXT PRIMARY KEY,
      "tableId" TEXT UNIQUE NOT NULL,
      "winnerId" TEXT,
      "turnsCount" INTEGER NOT NULL DEFAULT 0,
      "durationSec" INTEGER NOT NULL DEFAULT 0,
      "summary" JSONB,
      "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "action_log_entries" (
      "id" TEXT PRIMARY KEY,
      "tableId" TEXT NOT NULL,
      "sequenceNumber" INTEGER NOT NULL,
      "playerId" TEXT NOT NULL,
      "actionType" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "action_log_entries_tableId_sequenceNumber_idx" ON "action_log_entries"("tableId", "sequenceNumber");

    CREATE TABLE IF NOT EXISTS "app_metadata" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "room_snapshots" (
      "roomCode" TEXT PRIMARY KEY,
      "state" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(ddl);
}

export async function getAppMetadata<T = any>(key: string): Promise<T | null> {
  try {
    const res = await pool.query('SELECT value FROM "app_metadata" WHERE "key" = $1', [key]);
    return (res.rows[0]?.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function setAppMetadata(key: string, value: any): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO "app_metadata" ("key", "value", "updatedAt")
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE SET "value" = $2, "updatedAt" = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)],
    );
  } catch (err) {
    console.warn(`[DB] Error guardando app_metadata [${key}]:`, err);
  }
}

function getRootDataDir(): string {
  let curr = process.cwd();
  while (curr) {
    const pkgPath = path.join(curr, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return path.resolve(curr, 'data/postgres');
        }
      } catch {}
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(process.cwd(), 'data/postgres');
}

export async function connectDatabase(): Promise<void> {
  if (isLocalDb) {
    const port = 5432;
    const isAvailable = await isPortOpen(port);

    if (!isAvailable) {
      try {
        console.log(
          '🔄 PostgreSQL no detectado en puerto 5432. Iniciando PGlite persistente embebido...',
        );
        const { PGlite } = await import('@electric-sql/pglite');
        const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

        const dataDir = getRootDataDir();
        fs.mkdirSync(dataDir, { recursive: true });

        pgliteDbInstance = await PGlite.create({ dataDir });
        pgliteServerInstance = new PGLiteSocketServer({
          db: pgliteDbInstance,
          port,
          host: '127.0.0.1',
        });

        await pgliteServerInstance.start();
        if (process.env.NODE_ENV === 'test' && (pgliteServerInstance as any).server?.unref) {
          (pgliteServerInstance as any).server.unref();
        }
        console.log(
          `✅ Servidor PostgreSQL (PGlite) activo en puerto ${port} (datos en ${dataDir}).`,
        );
      } catch (err: any) {
        console.warn('⚠️ No se pudo iniciar el servidor PGlite embebido:', err?.message || err);
      }
    }
  }

  try {
    await pool.query('SELECT 1');
    await ensureTablesExist();
    await prisma.$connect();
    console.log('✅ Base de datos PostgreSQL conectada y esquemas verificados.');
    await seedPresetFixtureIfEmpty();
  } catch (error: any) {
    console.warn(
      '⚠️ Error conectando a PostgreSQL:',
      error?.message || error,
      '. Operando en modo Scryfall directo / memoria.',
    );
  }
}

export async function seedPresetFixtureIfEmpty(): Promise<void> {
  try {
    const cardCount = await prisma.card.count();
    if (cardCount > 0) return;

    let fixtureFile = '';
    const possiblePaths = [
      path.resolve(process.cwd(), 'apps/server/prisma/seed/preset-cards-fixture.json'),
      path.resolve(process.cwd(), 'prisma/seed/preset-cards-fixture.json'),
    ];

    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      possiblePaths.push(path.resolve(__dirname, '../prisma/seed/preset-cards-fixture.json'));
      possiblePaths.push(path.resolve(__dirname, '../../prisma/seed/preset-cards-fixture.json'));
    } catch {}

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fixtureFile = p;
        break;
      }
    }

    if (!fixtureFile) {
      return;
    }

    console.log('🌱 Base de datos vacía detectada. Sembrando fixture de mazos listos...');
    const raw = fs.readFileSync(fixtureFile, 'utf-8');
    const data = JSON.parse(raw);

    if (Array.isArray(data.cards) && data.cards.length > 0) {
      const cards = data.cards.map((c: any) => ({
        ...c,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      }));
      await prisma.card.createMany({
        data: cards,
        skipDuplicates: true,
      });
    }

    if (Array.isArray(data.rulings) && data.rulings.length > 0) {
      const rulings = data.rulings.map((r: any) => ({
        ...r,
        publishedAt: new Date(r.publishedAt),
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
      }));
      await (prisma as any).ruling?.createMany({
        data: rulings,
        skipDuplicates: true,
      });
    }

    if (Array.isArray(data.locales) && data.locales.length > 0) {
      const locales = data.locales.map((l: any) => ({
        ...l,
        releasedAt: l.releasedAt ? new Date(l.releasedAt) : null,
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
      }));
      await (prisma as any).cardLocale?.createMany({
        data: locales,
        skipDuplicates: true,
      });
    }

    console.log(
      `✅ Fixture sembrada: ${data.cards?.length || 0} cartas, ${data.rulings?.length || 0} dictámenes, ${data.locales?.length || 0} traducciones.`,
    );
  } catch (err: any) {
    console.warn('⚠️ No se pudo sembrar el fixture de cartas inicial:', err?.message || err);
  }
}

export async function disconnectDatabase(stopServer = false): Promise<void> {
  try {
    await prisma.$disconnect();
    if (stopServer) {
      await pool.end();
      if (pgliteServerInstance) {
        await pgliteServerInstance.stop();
        pgliteServerInstance = null;
      }
      if (pgliteDbInstance) {
        await pgliteDbInstance.close();
        pgliteDbInstance = null;
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
