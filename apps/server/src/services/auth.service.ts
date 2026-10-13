import { prisma } from '../db.js';
import { PasswordService } from './password.service.js';
import { randomUUID } from 'crypto';

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  isGuest: boolean;
}

export class AuthService {
  // In-memory fallback for local dev when PostgreSQL is offline
  private inMemoryUsers = new Map<
    string,
    { id: string; username: string; email?: string | null; passwordHash?: string; isGuest: boolean }
  >();

  /**
   * Registers a new user with hashed password
   */
  public async register(input: {
    username: string;
    email?: string;
    password: string;
  }): Promise<AuthUser> {
    const cleanUsername = input.username.trim();
    const cleanEmail = input.email ? input.email.trim().toLowerCase() : undefined;

    if (cleanUsername.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres.');
    }
    if (input.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const passwordHash = PasswordService.hash(input.password);
    const userId = randomUUID();

    try {
      const created = await prisma.user.create({
        data: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          isGuest: false,
        },
      });

      return {
        id: created.id,
        username: created.username,
        email: created.email,
        isGuest: created.isGuest,
      };
    } catch {
      // Check in-memory unique constraint fallback
      for (const u of this.inMemoryUsers.values()) {
        if (u.username.toLowerCase() === cleanUsername.toLowerCase()) {
          throw new Error('El nombre de usuario ya está registrado.');
        }
      }

      const memoryUser = {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        isGuest: false,
      };
      this.inMemoryUsers.set(userId, memoryUser);

      return {
        id: memoryUser.id,
        username: memoryUser.username,
        email: memoryUser.email,
        isGuest: false,
      };
    }
  }

  /**
   * Authenticates user credentials
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

      const isValid = PasswordService.verify(input.password, user.passwordHash);
      if (!isValid) {
        throw new Error('Credenciales incorrectas.');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
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
          const isValid = PasswordService.verify(input.password, u.passwordHash);
          if (isValid) {
            return {
              id: u.id,
              username: u.username,
              email: u.email,
              isGuest: u.isGuest,
            };
          }
        }
      }

      throw new Error('Credenciales incorrectas.');
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
        },
      });

      return {
        id: created.id,
        username: created.username,
        isGuest: true,
      };
    } catch {
      const memoryUser = {
        id: guestId,
        username: guestUsername,
        isGuest: true,
      };
      this.inMemoryUsers.set(guestId, memoryUser);

      return {
        id: memoryUser.id,
        username: memoryUser.username,
        isGuest: true,
      };
    }
  }

  /**
   * Deletes a user account and associated data (GDPR requirement)
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
