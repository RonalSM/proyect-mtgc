import { hash, verify } from '@node-rs/argon2';
import { scryptSync, timingSafeEqual } from 'crypto';

/**
 * Password hashing and verification service using Argon2id (REQ-1.4)
 * with backward-compatible verification for legacy hashes.
 */
export class PasswordService {
  /**
   * Hashes a plain password with Argon2id
   */
  public static async hash(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19456, // 19 MiB (RFC 9106 recommended)
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  /**
   * Verifies password against a stored Argon2id or legacy hash
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      if (storedHash.startsWith('$argon2')) {
        return await verify(storedHash, password);
      }

      // Legacy fallback (crypto.scrypt salt:hash)
      const parts = storedHash.split(':');
      if (parts.length === 2) {
        const salt = parts[0]!;
        const key = parts[1]!;
        const keyBuffer = Buffer.from(key, 'hex');
        const derivedKey = scryptSync(password, salt, 64);
        if (keyBuffer.length === derivedKey.length) {
          return timingSafeEqual(keyBuffer, derivedKey);
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
