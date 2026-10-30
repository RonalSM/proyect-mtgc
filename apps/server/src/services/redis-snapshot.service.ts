import { Redis } from 'ioredis';
import { RoomState, getCardDimensions } from '@mtgc/shared';
import { pool } from '../db.js';

export interface SnapshotStorage {
  save(roomCode: string, state: RoomState): Promise<void>;
  load(roomCode: string): Promise<RoomState | null>;
  delete(roomCode: string): Promise<void>;
  listActiveCodes(): Promise<string[]>;
}

/**
 * Service managing Redis snapshots of active game tables (COMP-7 / Paso 2A.6)
 * Features graceful in-memory fallback when Redis is offline in local dev or unit tests.
 */
export class RedisSnapshotService implements SnapshotStorage {
  private redis: Redis | null = null;
  private isConnected = false;
  private fallbackMemory = new Map<string, string>(); // roomCode -> JSON string

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url, {
          lazyConnect: true,
          retryStrategy: times => {
            // Stop retrying after 3 failed attempts in unit testing/local dev without Redis
            if (times > 3) return null;
            return Math.min(times * 100, 1000);
          },
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        });

        this.redis.on('connect', () => {
          this.isConnected = true;
          console.log('📦 [Redis] Conectado a Redis para instantáneas de mesas.');
        });

        this.redis.on('error', () => {
          this.isConnected = false;
        });

        // Attempt non-blocking connection
        this.redis.connect().catch(() => {
          this.isConnected = false;
        });
      } catch {
        this.isConnected = false;
      }
    }
  }

  /**
   * Saves a snapshot of room state with a 24-hour expiration in Redis and PostgreSQL (Punto A2.4)
   */
  public async save(roomCode: string, state: RoomState): Promise<void> {
    const code = roomCode.toUpperCase();
    (state as any).positionConvention = 'center';
    const serialized = JSON.stringify(state);

    // 1. Guardar en PostgreSQL (persistencia duradera entre reinicios de Dyno)
    try {
      await pool.query(
        `INSERT INTO "room_snapshots" ("roomCode", "state", "updatedAt")
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT ("roomCode") DO UPDATE SET "state" = $2, "updatedAt" = CURRENT_TIMESTAMP`,
        [code, serialized],
      );
    } catch {
      // Ignorar si la tabla no está creada aún en tests unitarios en memoria
    }

    // 2. Guardar en Redis si está disponible
    if (this.redis && this.isConnected) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.set(`mtgc:table:${code}`, serialized, 'EX', 86400); // 24 hours
        pipeline.sadd('mtgc:active_tables', code);
        await pipeline.exec();
        return;
      } catch {
        // Fall back to memory
      }
    }

    this.fallbackMemory.set(code, serialized);
  }

  /**
   * Loads a snapshot by room code and migrates/validates center position convention (Punto 2 / A2.4)
   */
  public async load(roomCode: string): Promise<RoomState | null> {
    const code = roomCode.toUpperCase();

    const migrateState = (state: RoomState): RoomState => {
      if ((state as any).positionConvention !== 'center') {
        const totalPlayers = Object.keys(state.players || {}).length || 4;
        const cardDims = getCardDimensions(totalPlayers, { width: 1920, height: 1080 });
        for (const zones of Object.values(state.playerZones || {})) {
          if (zones?.battlefield) {
            for (const card of zones.battlefield) {
              if (card.position) {
                const orientedW = card.isTapped ? cardDims.height : cardDims.width;
                const orientedH = card.isTapped ? cardDims.width : cardDims.height;
                card.position.x += orientedW / 2 / 1920;
                card.position.y += orientedH / 2 / 1080;
              }
            }
          }
        }
        (state as any).positionConvention = 'center';
      }
      return state;
    };

    if (this.redis && this.isConnected) {
      try {
        const data = await this.redis.get(`mtgc:table:${code}`);
        if (data) {
          const parsed = JSON.parse(data) as RoomState;
          return migrateState(parsed);
        }
      } catch {
        // Fall back
      }
    }

    // Consultar PostgreSQL si Redis no tiene la sala
    try {
      const res = await pool.query(
        'SELECT "state" FROM "room_snapshots" WHERE "roomCode" = $1',
        [code],
      );
      if (res.rows.length > 0) {
        const rowState = res.rows[0].state;
        const parsed = (typeof rowState === 'string' ? JSON.parse(rowState) : rowState) as RoomState;
        this.fallbackMemory.set(code, JSON.stringify(parsed));
        return migrateState(parsed);
      }
    } catch {
      // Fall back to memory
    }

    const memoryData = this.fallbackMemory.get(code);
    if (memoryData) {
      try {
        const parsed = JSON.parse(memoryData) as RoomState;
        return migrateState(parsed);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Deletes a snapshot when the table is closed
   */
  public async delete(roomCode: string): Promise<void> {
    const code = roomCode.toUpperCase();

    try {
      await pool.query('DELETE FROM "room_snapshots" WHERE "roomCode" = $1', [code]);
    } catch {}

    if (this.redis && this.isConnected) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.del(`mtgc:table:${code}`);
        pipeline.srem('mtgc:active_tables', code);
        await pipeline.exec();
      } catch {
        // Fall back to memory
      }
    }

    this.fallbackMemory.delete(code);
  }

  /**
   * Lists all active room codes stored in snapshots
   */
  public async listActiveCodes(): Promise<string[]> {
    const active = new Set<string>();

    // 1. Obtener de PostgreSQL
    try {
      const res = await pool.query('SELECT "roomCode" FROM "room_snapshots"');
      for (const row of res.rows) {
        if (row.roomCode) active.add(row.roomCode.toUpperCase());
      }
    } catch {}

    // 2. Obtener de Redis
    if (this.redis && this.isConnected) {
      try {
        const members = await this.redis.smembers('mtgc:active_tables');
        if (members && members.length > 0) {
          for (const m of members) active.add(m.toUpperCase());
        }
      } catch {}
    }

    // 3. Fallback memoria
    for (const k of this.fallbackMemory.keys()) {
      active.add(k.toUpperCase());
    }

    return Array.from(active);
  }

  /**
   * Restores all active room states from snapshots
   */
  public async restoreAllActiveRooms(): Promise<Map<string, RoomState>> {
    const restored = new Map<string, RoomState>();
    const codes = await this.listActiveCodes();

    for (const code of codes) {
      const state = await this.load(code);
      if (state) {
        restored.set(code, state);
      }
    }

    return restored;
  }

  public isUsingRedis(): boolean {
    return this.isConnected;
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // Ignore disconnect errors
      }
    }
  }
}

export const redisSnapshotService = new RedisSnapshotService();
