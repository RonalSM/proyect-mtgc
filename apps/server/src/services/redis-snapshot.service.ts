import { Redis } from 'ioredis';
import { RoomState, getCardDimensions } from '@mtgc/shared';

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
   * Saves a snapshot of room state with a 24-hour expiration
   */
  public async save(roomCode: string, state: RoomState): Promise<void> {
    const code = roomCode.toUpperCase();
    (state as any).positionConvention = 'center';
    const serialized = JSON.stringify(state);

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
   * Loads a snapshot by room code and migrates/validates center position convention (Punto 2)
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
                card.position.x += (orientedW / 2) / 1920;
                card.position.y += (orientedH / 2) / 1080;
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
        // Fall back to memory
      }
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
    if (this.redis && this.isConnected) {
      try {
        const members = await this.redis.smembers('mtgc:active_tables');
        if (members && members.length > 0) {
          return members.map(m => m.toUpperCase());
        }
      } catch {
        // Fall back to memory
      }
    }

    return Array.from(this.fallbackMemory.keys());
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
