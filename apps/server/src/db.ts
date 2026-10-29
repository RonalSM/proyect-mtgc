import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public&sslmode=disable';

let pgliteServerInstance: any = null;
let pgliteDbInstance: any = null;

export const pool = new pg.Pool({
  connectionString,
  ssl: false,
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
  `;

  await pool.query(ddl);
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

  try {
    await pool.query('SELECT 1');
    await ensureTablesExist();
    await prisma.$connect();
    console.log('✅ Base de datos PostgreSQL conectada y esquemas verificados.');
  } catch (error: any) {
    console.warn(
      '⚠️ Error conectando a PostgreSQL:',
      error?.message || error,
      '. Operando en modo Scryfall directo / memoria.',
    );
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
