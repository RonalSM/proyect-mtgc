import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';
import { CardDefinition } from '@mtgc/shared';
import { cardLocaleService, PRESEEDED_SPANISH_LOCALES } from './card-locale.service.js';

export class CardSearchService {
  // Simple in-memory LRU cache for recent autocomplete searches
  private autocompleteCache = new Map<string, { timestamp: number; results: string[] }>();
  private readonly cacheTtlMs = 1000 * 60 * 30; // 30 minutes

  /**
   * Fast autocomplete search with local DB priority, Spanish locales and Scryfall fallback
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

    // 2. Query local database if available (English names)
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

    // 2.5. Include Spanish matches from preseeded and DB locales
    const spanishMatches = Object.values(PRESEEDED_SPANISH_LOCALES)
      .filter(l => l.printedName.toLowerCase().includes(trimmed))
      .map(l => l.printedName);
    results = Array.from(new Set([...results, ...spanishMatches]));

    try {
      const dbLocales = await (prisma as any).cardLocale?.findMany({
        where: {
          printedName: {
            contains: trimmed,
            mode: 'insensitive',
          },
        },
        select: { printedName: true },
        take: 5,
      });
      if (dbLocales) {
        results = Array.from(new Set([...results, ...dbLocales.map((l: any) => l.printedName)]));
      }
    } catch {
      // Ignore if DB not ready
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
   * Find a card by exact or fuzzy name (supports English and Spanish names)
   */
  public async findCardByName(name: string, exact = false): Promise<CardDefinition | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    // 1. Try local database by English name
    try {
      const dbCard = await prisma.card.findFirst({
        where: exact
          ? { name: { equals: trimmed, mode: 'insensitive' } }
          : { name: { contains: trimmed, mode: 'insensitive' } },
      });

      if (dbCard) {
        const cardDef: CardDefinition = {
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
        return await cardLocaleService.enrichCardWithLocale(cardDef, 'es');
      }
    } catch {
      // Fallback
    }

    // 2. Check if name is in Spanish (preseeded or DB locales)
    const lowerTrimmed = trimmed.toLowerCase();
    const preseededLocale = Object.values(PRESEEDED_SPANISH_LOCALES).find(l =>
      exact
        ? l.printedName.toLowerCase() === lowerTrimmed
        : l.printedName.toLowerCase().includes(lowerTrimmed),
    );

    let spanishOracleId: string | undefined = preseededLocale?.oracleId;
    if (!spanishOracleId) {
      try {
        const dbLocale = await (prisma as any).cardLocale?.findFirst({
          where: exact
            ? { printedName: { equals: trimmed, mode: 'insensitive' } }
            : { printedName: { contains: trimmed, mode: 'insensitive' } },
        });
        if (dbLocale) {
          spanishOracleId = dbLocale.oracleId;
        }
      } catch {
        // Fallback
      }
    }

    if (spanishOracleId) {
      // Try to find the English card in DB by oracleId
      try {
        const dbCard = await prisma.card.findFirst({
          where: { oracleId: spanishOracleId },
        });
        if (dbCard) {
          const cardDef: CardDefinition = {
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
          return await cardLocaleService.enrichCardWithLocale(cardDef, 'es');
        }
      } catch {
        // Fallback
      }
    }

    // 3. Query Scryfall directly
    try {
      const card = await scryfallService.getCardNamed(trimmed, exact);
      if (card) {
        return await cardLocaleService.enrichCardWithLocale(card, 'es');
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const cardSearchService = new CardSearchService();
