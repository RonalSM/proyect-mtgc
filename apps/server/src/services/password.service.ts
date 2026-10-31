import { verify as argon2Verify } from '@node-rs/argon2';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Promise-wrapped asynchronous scrypt with explicit options
 */
function scryptAsync(
  password: string,
  salt: string,
  keyLen: number,
  options: { cost: number; blockSize: number; parallelization: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Semaphore to limit concurrent cryptographic computations, preventing memory
 * spikes on memory-constrained environments (e.g. 512 MB Basic Dyno).
 */
class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  public get activeCount(): number {
    return this.active;
  }

  public get queueLength(): number {
    return this.queue.length;
  }
}

/**
 * Concurrency limiter allowing max 3 parallel scrypt operations.
 * Each scrypt with N=16384, r=8 uses ~16 MiB of RAM.
 * 3 parallel ops = ~48 MiB peak overhead, safely within 512 MB dyno budget.
 */
const scryptLimiter = new ConcurrencyLimiter(3);

export interface ScrypthOptions {
  N?: number; // CPU/memory cost parameter (default: 16384)
  r?: number; // Block size (default: 8)
  p?: number; // Parallelization parameter (default: 1)
  keyLen?: number; // Output key length in bytes (default: 64)
}

/**
 * Password hashing and verification service using asynchronous crypto.scrypt
 * with OWASP-recommended parameters and backward-compatible verification (REQ-1.4, REQ-16.7).
 */
export class PasswordService {
  // OWASP Recommended Default Parameters for scrypt
  public static readonly DEFAULT_N = 16384; // 2^14
  public static readonly DEFAULT_R = 8;
  public static readonly DEFAULT_P = 1;
  public static readonly DEFAULT_KEY_LEN = 64;
  public static readonly DEFAULT_SALT_BYTES = 16;

  /**
   * Hashes a plain password asynchronously with OWASP-recommended scrypt parameters
   * and encodes the scheme in the hash: `$scrypt$N=16384,r=8,p=1$salt$derivedKey`
   */
  public static async hash(password: string, options?: ScrypthOptions): Promise<string> {
    const N = options?.N || PasswordService.DEFAULT_N;
    const r = options?.r || PasswordService.DEFAULT_R;
    const p = options?.p || PasswordService.DEFAULT_P;
    const keyLen = options?.keyLen || PasswordService.DEFAULT_KEY_LEN;

    const salt = randomBytes(PasswordService.DEFAULT_SALT_BYTES).toString('hex');

    const derivedKey = await scryptLimiter.run(async () => {
      return await scryptAsync(password, salt, keyLen, {
        cost: N,
        blockSize: r,
        parallelization: p,
        maxmem: 32 * 1024 * 1024, // 32 MiB safety guard
      });
    });

    return `$scrypt$N=${N},r=${r},p=${p}$${salt}$${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies password against a stored hash (supporting $scrypt$, legacy $argon2$, and legacy salt:key).
   * Fully asynchronous and non-blocking for the event loop.
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    if (!password || !storedHash) {
      return false;
    }

    try {
      // 1. Current format: $scrypt$N=...,r=...,p=...$salt$derivedKey
      if (storedHash.startsWith('$scrypt$')) {
        const parts = storedHash.split('$');
        // Format: ['', 'scrypt', 'N=16384,r=8,p=1', 'salt', 'derivedKey']
        if (parts.length === 5) {
          const paramsStr = parts[2] || '';
          const salt = parts[3] || '';
          const expectedKeyHex = parts[4] || '';

          const params: Record<string, number> = {};
          for (const item of paramsStr.split(',')) {
            const [k, v] = item.split('=');
            if (k && v) params[k] = parseInt(v, 10);
          }

          const N = params['N'] || PasswordService.DEFAULT_N;
          const r = params['r'] || PasswordService.DEFAULT_R;
          const p = params['p'] || PasswordService.DEFAULT_P;

          const expectedKeyBuffer = Buffer.from(expectedKeyHex, 'hex');

          const derivedKey = await scryptLimiter.run(async () => {
            return await scryptAsync(password, salt, expectedKeyBuffer.length, {
              cost: N,
              blockSize: r,
              parallelization: p,
              maxmem: 32 * 1024 * 1024,
            });
          });

          if (expectedKeyBuffer.length !== derivedKey.length) {
            return false;
          }

          return timingSafeEqual(expectedKeyBuffer, derivedKey);
        }
      }

      // 2. Backward compatibility: Argon2id hashes
      if (storedHash.startsWith('$argon2')) {
        return await argon2Verify(storedHash, password);
      }

      // 3. Backward compatibility: legacy scrypt salt:key format
      const colonParts = storedHash.split(':');
      if (colonParts.length === 2) {
        const salt = colonParts[0]!;
        const keyHex = colonParts[1]!;
        const expectedKeyBuffer = Buffer.from(keyHex, 'hex');

        const derivedKey = await scryptLimiter.run(async () => {
          return await scryptAsync(password, salt, expectedKeyBuffer.length, {
            cost: PasswordService.DEFAULT_N,
            blockSize: PasswordService.DEFAULT_R,
            parallelization: PasswordService.DEFAULT_P,
            maxmem: 32 * 1024 * 1024,
          });
        });

        if (expectedKeyBuffer.length !== derivedKey.length) {
          return false;
        }

        return timingSafeEqual(expectedKeyBuffer, derivedKey);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Returns current limiter statistics for diagnostics and tests
   */
  public static getLimiterStats() {
    return {
      active: scryptLimiter.activeCount,
      queued: scryptLimiter.queueLength,
    };
  }
}
