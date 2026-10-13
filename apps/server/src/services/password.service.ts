import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Password hashing and verification service using memory-hard scrypt
 * with cryptographic salt and timing-safe comparison to prevent timing attacks.
 */
export class PasswordService {
  /**
   * Hashes a plain password with a secure 16-byte random salt
   */
  public static hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies password against a stored salt:hash string using timing-safe comparison
   */
  public static verify(password: string, storedHash: string): boolean {
    try {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return false;

      const salt = parts[0]!;
      const key = parts[1]!;
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = scryptSync(password, salt, 64);

      if (keyBuffer.length !== derivedKey.length) return false;
      return timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }
}
