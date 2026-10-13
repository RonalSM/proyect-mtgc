import { Redis } from 'ioredis';
import { RoomState } from '@mtgc/shared';

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
   * Loads a snapshot by room code
   */
  public async load(roomCode: string): Promise<RoomState | null> {
    const code = roomCode.toUpperCase();

    if (this.redis && this.isConnected) {
      try {
        const data = await this.redis.get(`mtgc:table:${code}`);
        if (data) {
          return JSON.parse(data) as RoomState;
        }
      } catch {
        // Fall back to memory
      }
    }

    const memoryData = this.fallbackMemory.get(code);
    if (memoryData) {
      try {
        return JSON.parse(memoryData) as RoomState;
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
