import { prisma } from '../db.js';
import { PasswordService } from './password.service.js';
import { emailSender, EmailSender } from './email.service.js';
import { randomUUID, randomBytes, createHash } from 'crypto';

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  isGuest: boolean;
  isEmailVerified: boolean;
}

export interface InMemoryUserRecord {
  id: string;
  username: string;
  email?: string | null;
  passwordHash?: string;
  isGuest: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  refreshTokenHash?: string | null;
}

export class AuthService {
  private emailClient: EmailSender;

  // In-memory fallback for local dev when PostgreSQL is offline
  private inMemoryUsers = new Map<string, InMemoryUserRecord>();

  constructor(emailClient: EmailSender = emailSender) {
    this.emailClient = emailClient;
  }

  /**
   * Hashes a refresh token with SHA-256 for safe storage
   */
  public hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random token
   */
  public generateSecureToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Registers a new user, hashes password with Argon2id, and sends verification email (REQ-1.1, 1.4)
   */
  public async register(
    input: {
      username: string;
      email?: string;
      password: string;
    },
    baseUrl: string = 'http://localhost:3000',
  ): Promise<AuthUser> {
    const cleanUsername = input.username.trim();
    const cleanEmail = input.email ? input.email.trim().toLowerCase() : undefined;

    if (cleanUsername.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres.');
    }
    if (input.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const passwordHash = await PasswordService.hash(input.password);
    const userId = randomUUID();
    const verificationToken = cleanEmail ? this.generateSecureToken(32) : undefined;

    let createdUser: AuthUser;

    try {
      const created = await prisma.user.create({
        data: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          isGuest: false,
          isEmailVerified: false,
          emailVerificationToken: verificationToken,
        },
      });

      createdUser = {
        id: created.id,
        username: created.username,
        email: created.email,
        isGuest: created.isGuest,
        isEmailVerified: created.isEmailVerified,
      };
    } catch {
      // Check in-memory unique constraint fallback
      for (const u of this.inMemoryUsers.values()) {
        if (u.username.toLowerCase() === cleanUsername.toLowerCase()) {
          throw new Error('El nombre de usuario ya está registrado.');
        }
        if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail.toLowerCase()) {
          throw new Error('El correo electrónico ya está registrado.');
        }
      }

      const memoryUser: InMemoryUserRecord = {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        isGuest: false,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
      };
      this.inMemoryUsers.set(userId, memoryUser);

      createdUser = {
        id: memoryUser.id,
        username: memoryUser.username,
        email: memoryUser.email,
        isGuest: false,
        isEmailVerified: false,
      };
    }

    // Send verification email if email was provided
    if (cleanEmail && verificationToken) {
      const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
      await this.emailClient.sendVerificationEmail(cleanEmail, verificationToken, verifyUrl);
    }

    return createdUser;
  }

  /**
   * Verifies user email with token
   */
  public async verifyEmail(token: string): Promise<boolean> {
    if (!token || token.trim().length === 0) return false;

    try {
      const user = await prisma.user.findFirst({
        where: { emailVerificationToken: token },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: true,
            emailVerificationToken: null,
          },
        });
        return true;
      }
    } catch {
      // Check in-memory fallback
    }

    for (const u of this.inMemoryUsers.values()) {
      if (u.emailVerificationToken === token) {
        u.isEmailVerified = true;
        u.emailVerificationToken = null;
        return true;
      }
    }

    return false;
  }

  /**
   * Authenticates user credentials with Argon2id
   */
  public async login(input: {
    identifier: string; // username or email
    password: string;
  }): Promise<AuthUser> {
    const cleanIdent = input.identifier.trim();

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanIdent, mode: 'insensitive' } },
            { email: { equals: cleanIdent.toLowerCase(), mode: 'insensitive' } },
          ],
        },
      });

      if (!user || !user.passwordHash) {
        throw new Error('Credenciales incorrectas.');
      }

      const isValid = await PasswordService.verify(input.password, user.passwordHash);
      if (!isValid) {
        throw new Error('Credenciales incorrectas.');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
        isEmailVerified: user.isEmailVerified,
      };
    } catch (err: any) {
      if (err.message === 'Credenciales incorrectas.') throw err;

      // In-memory fallback
      for (const u of this.inMemoryUsers.values()) {
        if (
          (u.username.toLowerCase() === cleanIdent.toLowerCase() ||
            (u.email && u.email.toLowerCase() === cleanIdent.toLowerCase())) &&
          u.passwordHash
        ) {
          const isValid = await PasswordService.verify(input.password, u.passwordHash);
          if (isValid) {
            return {
              id: u.id,
              username: u.username,
              email: u.email,
              isGuest: u.isGuest,
              isEmailVerified: u.isEmailVerified,
            };
          }
        }
      }

      throw new Error('Credenciales incorrectas.');
    }
  }

  /**
   * Generates and stores a new refresh token for a user session
   */
  public async createRefreshToken(userId: string): Promise<string> {
    const rawToken = this.generateSecureToken(40);
    const tokenHash = this.hashRefreshToken(rawToken);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: tokenHash },
      });
    } catch {
      const user = this.inMemoryUsers.get(userId);
      if (user) {
        user.refreshTokenHash = tokenHash;
      }
    }

    return rawToken;
  }

  /**
   * Rotates a refresh token: verifies the incoming token and issues a new one
   */
  public async rotateRefreshToken(userId: string, incomingToken: string): Promise<string | null> {
    const incomingHash = this.hashRefreshToken(incomingToken);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.refreshTokenHash === incomingHash) {
        const newRawToken = this.generateSecureToken(40);
        const newHash = this.hashRefreshToken(newRawToken);

        await prisma.user.update({
          where: { id: userId },
          data: { refreshTokenHash: newHash },
        });

        return newRawToken;
      }
    } catch {
      // In-memory fallback
    }

    const memoryUser = this.inMemoryUsers.get(userId);
    if (memoryUser && memoryUser.refreshTokenHash === incomingHash) {
      const newRawToken = this.generateSecureToken(40);
      memoryUser.refreshTokenHash = this.hashRefreshToken(newRawToken);
      return newRawToken;
    }

    return null;
  }

  /**
   * Revokes a refresh token on logout
   */
  public async revokeRefreshToken(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    } catch {
      const user = this.inMemoryUsers.get(userId);
      if (user) {
        user.refreshTokenHash = null;
      }
    }
  }

  /**
   * Creates an anonymous guest user session
   */
  public async createGuest(customName?: string): Promise<AuthUser> {
    const guestId = randomUUID();
    const guestUsername =
      customName?.trim() || `Invitado_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      const created = await prisma.user.create({
        data: {
          id: guestId,
          username: guestUsername,
          isGuest: true,
          isEmailVerified: false,
        },
      });

      return {
        id: created.id,
        username: created.username,
        isGuest: true,
        isEmailVerified: false,
      };
    } catch {
      const memoryUser: InMemoryUserRecord = {
        id: guestId,
        username: guestUsername,
        isGuest: true,
        isEmailVerified: false,
      };
      this.inMemoryUsers.set(guestId, memoryUser);

      return {
        id: memoryUser.id,
        username: memoryUser.username,
        isGuest: true,
        isEmailVerified: false,
      };
    }
  }

  /**
   * Deletes a user account and associated data (GDPR / Ley 1581 requirement)
   */
  public async deleteAccount(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch {
      return this.inMemoryUsers.delete(userId);
    }
  }
}

export const authService = new AuthService();
