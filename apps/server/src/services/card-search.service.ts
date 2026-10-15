import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';
import { CardDefinition } from '@mtgc/shared';

export class CardSearchService {
  // Simple in-memory LRU cache for recent autocomplete searches
  private autocompleteCache = new Map<string, { timestamp: number; results: string[] }>();
  private readonly cacheTtlMs = 1000 * 60 * 30; // 30 minutes

  /**
   * Fast autocomplete search with local DB priority and Scryfall fallback
   */
  public async autocomplete(query: string): Promise<string[]> {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    // 1. Check in-memory cache
    const cached = this.autocompleteCache.get(trimmed);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.results;
    }

    let results: string[] = [];

    // 2. Query local database if available
    try {
      const dbCards = await prisma.card.findMany({
        where: {
          name: {
            contains: trimmed,
            mode: 'insensitive',
          },
        },
        select: { name: true },
        distinct: ['name'],
        take: 10,
      });

      results = dbCards.map((c: any) => c.name);
    } catch {
      // Local DB might not be connected or populated yet; fallback to Scryfall
    }

    // 3. Fallback to Scryfall API if DB returned few results
    if (results.length < 5) {
      try {
        const scryfallResults = await scryfallService.autocomplete(trimmed);
        const combined = Array.from(new Set([...results, ...scryfallResults])).slice(0, 10);
        results = combined;
      } catch (err) {
        console.warn(`[CardSearch] Scryfall autocomplete failed:`, err);
      }
    }

    // Cache the result
    this.autocompleteCache.set(trimmed, { timestamp: Date.now(), results });
    return results;
  }

  /**
   * Find a card by exact or fuzzy name
   */
  public async findCardByName(name: string, exact = false): Promise<CardDefinition | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    // 1. Try local database
    try {
      const dbCard = await prisma.card.findFirst({
        where: exact
          ? { name: { equals: trimmed, mode: 'insensitive' } }
          : { name: { contains: trimmed, mode: 'insensitive' } },
      });

      if (dbCard) {
        return {
          scryfallId: dbCard.scryfallId,
          oracleId: dbCard.oracleId ?? undefined,
          name: dbCard.name,
          manaCost: dbCard.manaCost ?? undefined,
          cmc: dbCard.cmc,
          typeLine: dbCard.typeLine,
          oracleText: dbCard.oracleText ?? undefined,
          colors: dbCard.colors as any,
          colorIdentity: dbCard.colorIdentity as any,
          power: dbCard.power ?? undefined,
          toughness: dbCard.toughness ?? undefined,
          imageUrlSmall: dbCard.imageUrlSmall ?? undefined,
          imageUrlNormal: dbCard.imageUrlNormal ?? undefined,
          imageUrlArtCrop: dbCard.imageUrlArtCrop ?? undefined,
        };
      }
    } catch {
      // Fallback
    }

    // 2. Query Scryfall directly
    try {
      return await scryfallService.getCardNamed(trimmed, exact);
    } catch {
      return null;
    }
  }
}

export const cardSearchService = new CardSearchService();
