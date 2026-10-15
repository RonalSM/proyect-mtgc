import { prisma } from '../db.js';
import { CardDefinition, CardColor } from '@mtgc/shared';
import { randomUUID } from 'crypto';

export interface SavedDeck {
  id: string;
  userId: string;
  name: string;
  format: string;
  commanderName?: string | null;
  colorIdentity: CardColor[];
  cardCount: number;
  rawDecklist?: string | null;
  commanderCards: CardDefinition[];
  maindeckCards: CardDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export class DeckService {
  // In-memory fallback for local dev & testing when PostgreSQL is offline
  private inMemoryDecks = new Map<string, SavedDeck>();

  /**
   * Saves a deck associated with a user's account (REQ-7.5)
   */
  public async saveDeck(
    userId: string,
    input: {
      name: string;
      format?: string;
      rawDecklist?: string;
      commanderCards: CardDefinition[];
      maindeckCards: CardDefinition[];
    },
  ): Promise<SavedDeck> {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error('El nombre del mazo es obligatorio.');
    }

    const deckId = randomUUID();
    const commanderName = input.commanderCards[0]?.name || null;

    // Calculate combined color identity
    const colorSet = new Set<CardColor>();
    for (const cmd of input.commanderCards) {
      for (const color of cmd.colorIdentity || []) {
        colorSet.add(color);
      }
    }
    const colorIdentity = Array.from(colorSet);
    const cardCount = input.commanderCards.length + input.maindeckCards.length;

    const deckData = {
      commanderCards: input.commanderCards,
      maindeckCards: input.maindeckCards,
    };

    try {
      const created = await prisma.deck.create({
        data: {
          id: deckId,
          userId,
          name: cleanName,
          format: input.format || 'commander',
          commanderName,
          colorIdentity,
          cardCount,
          rawDecklist: input.rawDecklist || null,
          deckData: deckData as any,
        },
      });

      return {
        id: created.id,
        userId: created.userId!,
        name: created.name,
        format: created.format,
        commanderName: created.commanderName,
        colorIdentity: created.colorIdentity as CardColor[],
        cardCount: created.cardCount,
        rawDecklist: created.rawDecklist,
        commanderCards: input.commanderCards,
        maindeckCards: input.maindeckCards,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch {
      // In-memory fallback
      const memoryDeck: SavedDeck = {
        id: deckId,
        userId,
        name: cleanName,
        format: input.format || 'commander',
        commanderName,
        colorIdentity,
        cardCount,
        rawDecklist: input.rawDecklist || null,
        commanderCards: input.commanderCards,
        maindeckCards: input.maindeckCards,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.inMemoryDecks.set(deckId, memoryDeck);
      return memoryDeck;
    }
  }

  /**
   * Retrieves all decks belonging to a user (REQ-7.5)
   */
  public async getUserDecks(userId: string): Promise<SavedDeck[]> {
    try {
      const decks = await prisma.deck.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      return decks.map((d: any) => {
        const parsedData = (d.deckData as any) || {};
        return {
          id: d.id,
          userId: d.userId!,
          name: d.name,
          format: d.format,
          commanderName: d.commanderName,
          colorIdentity: d.colorIdentity as CardColor[],
          cardCount: d.cardCount,
          rawDecklist: d.rawDecklist,
          commanderCards: parsedData.commanderCards || [],
          maindeckCards: parsedData.maindeckCards || [],
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });
    } catch {
      // In-memory fallback
      return Array.from(this.inMemoryDecks.values())
        .filter(d => d.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
  }

  /**
   * Retrieves a specific deck by ID
   */
  public async getDeckById(deckId: string, userId?: string): Promise<SavedDeck | null> {
    try {
      const d = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!d) return null;
      if (userId && d.userId !== userId) return null;

      const parsedData = (d.deckData as any) || {};
      return {
        id: d.id,
        userId: d.userId!,
        name: d.name,
        format: d.format,
        commanderName: d.commanderName,
        colorIdentity: d.colorIdentity as CardColor[],
        cardCount: d.cardCount,
        rawDecklist: d.rawDecklist,
        commanderCards: parsedData.commanderCards || [],
        maindeckCards: parsedData.maindeckCards || [],
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    } catch {
      const mem = this.inMemoryDecks.get(deckId);
      if (!mem) return null;
      if (userId && mem.userId !== userId) return null;
      return mem;
    }
  }

  /**
   * Deletes a deck owned by user
   */
  public async deleteDeck(deckId: string, userId: string): Promise<boolean> {
    try {
      const deck = await prisma.deck.findUnique({ where: { id: deckId } });
      if (!deck || deck.userId !== userId) return false;

      await prisma.deck.delete({ where: { id: deckId } });
      return true;
    } catch {
      const mem = this.inMemoryDecks.get(deckId);
      if (!mem || mem.userId !== userId) return false;
      return this.inMemoryDecks.delete(deckId);
    }
  }
}

export const deckService = new DeckService();
