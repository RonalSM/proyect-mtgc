import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';
import { CardDefinition } from '@mtgc/shared';
import { cardLocaleService } from './card-locale.service.js';

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

    // 2.5. Include Spanish matches from CardLocale table
    try {
      const dbLocales = await (prisma as any).cardLocale?.findMany({
        where: {
          printedName: {
            contains: trimmed,
            mode: 'insensitive',
          },
        },
        select: { printedName: true },
        distinct: ['printedName'],
        take: 10,
      });

      if (dbLocales && dbLocales.length > 0) {
        const spanishNames = dbLocales.map((l: any) => l.printedName);
        results = Array.from(new Set([...results, ...spanishNames]));
      }
    } catch {
      // Continuar con los resultados encontrados
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
   * Resuelve una carta desde la base de datos local por nombre, scryfallId o oracleId (Punto 4),
   * adjuntando tipos canónicos en inglés, texto Oracle, P/T, caras, rulings y
   * resolviendo en el servidor la cadena de respaldo (español si existe en impresiones reales, si no inglés).
   */
  public async resolveSingleCard(
    query: string | { name?: string; id?: string; oracleId?: string },
    lang = 'es',
  ): Promise<CardDefinition | null> {
    const cleanQuery =
      typeof query === 'string'
        ? query.trim()
        : (query.name || query.id || query.oracleId || '').trim();
    if (!cleanQuery) return null;

    const isId = typeof query === 'object' && query.id;
    const isOracleId = typeof query === 'object' && query.oracleId;
    const cleanName = cleanQuery.replace(/\s*\*CMDR\*\s*$/, '').trim();

    let dbCard: any = null;

    if (isId || isOracleId) {
      const targetId = (isId ? query.id : query.oracleId)!.trim();
      try {
        dbCard = await prisma.card.findFirst({
          where: {
            OR: [{ scryfallId: targetId }, { id: targetId }, { oracleId: targetId }],
          },
        });
      } catch { dbCard = null; }
    }

    if (!dbCard) {
      // 1. Coincidencia exacta por nombre en inglés
      try {
        dbCard = await prisma.card.findFirst({
          where: { name: { equals: cleanName, mode: 'insensitive' } },
        });
      } catch { dbCard = null; }
    }

    // 2. Coincidencia de cara frontal para cartas dobles (DFC / Aventuras / Split)
    if (!dbCard) {
      try {
        dbCard = await prisma.card.findFirst({
          where: { name: { startsWith: `${cleanName} //`, mode: 'insensitive' } },
        });
      } catch { dbCard = null; }
    }

    // 3. Buscar en traducciones al español en card_locales
    if (!dbCard) {
      try {
        const loc = await (prisma as any).cardLocale?.findFirst({
          where: { printedName: { equals: cleanName, mode: 'insensitive' } },
        });
        if (loc?.oracleId) {
          dbCard = await prisma.card.findFirst({
            where: { oracleId: loc.oracleId },
          });
        }
      } catch { dbCard = null; }
    }

    // 4. Coincidencia por contención como respaldo
    if (!dbCard) {
      try {
        dbCard = await prisma.card.findFirst({
          where: { name: { contains: cleanName, mode: 'insensitive' } },
        });
      } catch { dbCard = null; }
    }

    // 5. Fallback a Scryfall si aún no existe en base local — solo si no es una cadena claramente
    //    sin sentido (menos de 3 palabras y parece un nombre real de carta)
    if (!dbCard) {
      try {
        const scryfallCard = await scryfallService.getCardNamed(cleanName, true);
        if (scryfallCard) {
          return await cardLocaleService.enrichCardWithLocale(scryfallCard, lang as any);
        }
      } catch {
        // Si Scryfall falla, retornar null sin propagar el error
      }
      return null;
    }

    // Buscar si existe traducción e impresión en español en la tabla card_locales
    let locales: CardDefinition['locales'] = undefined;
    let spanishLocale: any = null;

    if (dbCard.oracleId) {
      spanishLocale = await (prisma as any).cardLocale?.findUnique({
        where: {
          oracleId_lang: {
            oracleId: dbCard.oracleId,
            lang: 'es',
          },
        },
      });

      if (spanishLocale) {
        locales = {
          es: {
            printedName: spanishLocale.printedName,
            printedTypeLine: spanishLocale.printedTypeLine || undefined,
            printedText: spanishLocale.printedText || undefined,
            imageUrlSmall: spanishLocale.imageUrlSmall || undefined,
            imageUrlNormal: spanishLocale.imageUrlNormal || undefined,
            imageUrlLarge: spanishLocale.imageUrlLarge || undefined,
            imageUrlArtCrop: spanishLocale.imageUrlArtCrop || undefined,
          },
        };
      }
    }

    // Buscar rulings oficiales si tiene oracleId
    let rulings: any[] = [];
    if (dbCard.oracleId) {
      try {
        rulings =
          (await (prisma as any).ruling?.findMany({
            where: { oracleId: dbCard.oracleId },
            orderBy: { publishedAt: 'desc' },
          })) || [];
      } catch {
        // Fallback
      }
    }

    // Decisión de URLs por el servidor: si lang === 'es' y existe en español con imagen real, usarla; si no, inglés.
    const useSpanish =
      lang === 'es' &&
      spanishLocale &&
      (spanishLocale.imageUrlNormal || spanishLocale.imageUrlSmall);

    const imageUrlSmall = useSpanish
      ? spanishLocale.imageUrlSmall || dbCard.imageUrlSmall
      : dbCard.imageUrlSmall;
    const imageUrlNormal = useSpanish
      ? spanishLocale.imageUrlNormal || dbCard.imageUrlNormal
      : dbCard.imageUrlNormal;
    const imageUrlLarge = useSpanish
      ? spanishLocale.imageUrlLarge ||
        (dbCard.imageUrlNormal ? dbCard.imageUrlNormal.replace('/normal/', '/large/') : undefined)
      : dbCard.imageUrlNormal
        ? dbCard.imageUrlNormal.replace('/normal/', '/large/')
        : undefined;
    const imageUrlArtCrop = useSpanish
      ? spanishLocale.imageUrlArtCrop || dbCard.imageUrlArtCrop
      : dbCard.imageUrlArtCrop;

    // Manejo de caras (faces) si es carta DFC, transform, modal_dfc, adventure, split
    const isTwoFaced =
      dbCard.name.includes(' // ') ||
      ['transform', 'modal_dfc', 'reversible_card', 'adventure', 'split', 'flip'].includes(
        dbCard.layout || '',
      );

    let faces: any[] | undefined = undefined;
    if (isTwoFaced && dbCard.name.includes(' // ')) {
      const faceNames = dbCard.name.split(' // ');
      const faceTypes = (dbCard.typeLine || '').split(' // ');
      const faceManas = (dbCard.manaCost || '').split(' // ');
      const faceTexts = (dbCard.oracleText || '').split(/\n\s*---\s*\n|\n\s*\/\/\s*\n/);

      const hasSeparateBackImage = ['transform', 'modal_dfc', 'reversible_card'].includes(
        dbCard.layout || '',
      );

      faces = [
        {
          name: faceNames[0].trim(),
          manaCost: faceManas[0]?.trim() || undefined,
          typeLine: faceTypes[0]?.trim() || dbCard.typeLine,
          oracleText: faceTexts[0]?.trim() || dbCard.oracleText || '',
          power: dbCard.power || undefined,
          toughness: dbCard.toughness || undefined,
          imageUrlSmall: imageUrlSmall || undefined,
          imageUrlNormal: imageUrlNormal || undefined,
          imageUrlLarge: imageUrlLarge || undefined,
          imageUrlArtCrop: imageUrlArtCrop || undefined,
        },
        {
          name: faceNames[1]?.trim() || faceNames[0].trim(),
          manaCost: faceManas[1]?.trim() || undefined,
          typeLine: faceTypes[1]?.trim() || faceTypes[0]?.trim() || dbCard.typeLine,
          oracleText: faceTexts[1]?.trim() || '',
          power: undefined,
          toughness: undefined,
          imageUrlSmall:
            hasSeparateBackImage && imageUrlSmall
              ? imageUrlSmall.replace('/front/', '/back/')
              : imageUrlSmall || undefined,
          imageUrlNormal:
            hasSeparateBackImage && imageUrlNormal
              ? imageUrlNormal.replace('/front/', '/back/')
              : imageUrlNormal || undefined,
          imageUrlLarge:
            hasSeparateBackImage && imageUrlLarge
              ? imageUrlLarge.replace('/front/', '/back/')
              : imageUrlLarge || undefined,
          imageUrlArtCrop:
            hasSeparateBackImage && imageUrlArtCrop
              ? imageUrlArtCrop.replace('/front/', '/back/')
              : imageUrlArtCrop || undefined,
        },
      ];
    }

    // Enriquecer con metadatos reales de Scryfall si aún no están en la fila de la base (Punto 8)
    if (dbCard && (!dbCard.set || !dbCard.artist || !dbCard.rarity)) {
      try {
        const scryfallCard = await scryfallService.getCardNamed(dbCard.name, true);
        if (scryfallCard) {
          dbCard.set = scryfallCard.set || dbCard.set || undefined;
          dbCard.setName = scryfallCard.setName || dbCard.setName || undefined;
          dbCard.rarity = scryfallCard.rarity || dbCard.rarity || undefined;
          dbCard.collectorNumber = scryfallCard.collectorNumber || dbCard.collectorNumber || undefined;
          dbCard.artist = scryfallCard.artist || dbCard.artist || undefined;
          dbCard.loyalty = scryfallCard.loyalty || dbCard.loyalty || undefined;

          // Guardar de forma persistente en la base de datos local
          (prisma as any).card.update({
            where: { id: dbCard.id },
            data: {
              set: dbCard.set,
              setName: dbCard.setName,
              rarity: dbCard.rarity,
              collectorNumber: dbCard.collectorNumber,
              artist: dbCard.artist,
              loyalty: dbCard.loyalty,
            },
          }).catch(() => {});
        }
      } catch {
        // En caso de fallo de red, se devolverán los datos locales
      }
    }

    return {
      scryfallId: dbCard.scryfallId,
      oracleId: dbCard.oracleId || undefined,
      name: dbCard.name,
      manaCost: dbCard.manaCost || faces?.[0]?.manaCost || undefined,
      cmc: dbCard.cmc,
      typeLine: dbCard.typeLine,
      oracleText: dbCard.oracleText || undefined,
      colors: (dbCard.colors || []) as any,
      colorIdentity: (dbCard.colorIdentity || []) as any,
      power: dbCard.power || faces?.[0]?.power || undefined,
      toughness: dbCard.toughness || faces?.[0]?.toughness || undefined,
      loyalty: dbCard.loyalty || faces?.[0]?.loyalty || undefined,
      set: dbCard.set || undefined,
      setName: dbCard.setName || undefined,
      rarity: dbCard.rarity || undefined,
      collectorNumber: dbCard.collectorNumber || undefined,
      artist: dbCard.artist || undefined,
      copyright: '© Wizards of the Coast',
      legalities: (dbCard.legalities as any) || { commander: 'legal' },
      imageUrlSmall: imageUrlSmall || undefined,
      imageUrlNormal: imageUrlNormal || undefined,
      imageUrlLarge: imageUrlLarge || undefined,
      imageUrlArtCrop: imageUrlArtCrop || undefined,
      isTwoFaced,
      faces,
      locales,
      rulings: rulings.map((r: any) => ({
        oracleId: r.oracleId,
        source: r.source,
        publishedAt: r.publishedAt.toISOString().split('T')[0],
        comment: r.comment,
      })),
    };
  }

  /**
   * Resuelve un lote de cartas por nombres o IDs (Punto 4 - POST /api/cards/resolve)
   */
  public async resolveCards(params: {
    names?: string[];
    ids?: string[];
    cards?: Array<string | { name?: string; id?: string; oracleId?: string }>;
    lang?: string;
  }): Promise<{
    cards: CardDefinition[];
    byQuery: Record<string, CardDefinition | null>;
    count: number;
  }> {
    const lang = (params.lang || 'es').toLowerCase();
    const queryItems: Array<string | { name?: string; id?: string; oracleId?: string }> = [];

    if (params.names) {
      for (const n of params.names) {
        if (n) queryItems.push(n);
      }
    }
    if (params.ids) {
      for (const id of params.ids) {
        if (id) queryItems.push({ id });
      }
    }
    if (params.cards) {
      for (const c of params.cards) {
        if (c) queryItems.push(c);
      }
    }

    const cards: CardDefinition[] = [];
    const byQuery: Record<string, CardDefinition | null> = {};
    const resolvedMap = new Map<string, CardDefinition | null>();

    for (const item of queryItems) {
      const key =
        typeof item === 'string'
          ? item.trim()
          : (item.name || item.id || item.oracleId || '').trim();
      const lowerKey = key.toLowerCase();

      let resolved: CardDefinition | null = null;
      if (resolvedMap.has(lowerKey)) {
        resolved = resolvedMap.get(lowerKey)!;
      } else {
        resolved = await this.resolveSingleCard(item, lang);
        resolvedMap.set(lowerKey, resolved);
      }

      byQuery[key] = resolved;
      byQuery[lowerKey] = resolved;
      if (resolved) {
        cards.push(resolved);
      }
    }

    return {
      cards,
      byQuery,
      count: cards.length,
    };
  }

  /**
   * Find a card by exact or fuzzy name (supports English and Spanish names)
   */
  public async findCardByName(
    name: string,
    _exact = false,
    lang = 'es',
  ): Promise<CardDefinition | null> {
    return await this.resolveSingleCard(name, lang);
  }
}

export const cardSearchService = new CardSearchService();
