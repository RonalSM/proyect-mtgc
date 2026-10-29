import { CardDefinition, CardLocaleData } from '@mtgc/shared';
import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';

export interface CardLocaleRecord {
  oracleId: string;
  lang: string;
  printingId: string;
  printedName: string;
  printedText?: string;
  printedTypeLine?: string;
  imageUrlSmall?: string;
  imageUrlNormal?: string;
  imageUrlLarge?: string;
  imageUrlArtCrop?: string;
}

export class CardLocaleService {
  private cache = new Map<string, CardLocaleRecord>();
  private nameToOracle = new Map<string, string>();
  private englishNameToLocale = new Map<string, CardLocaleRecord>();

  constructor() {
    // Inicialización limpia: datos reales desde PostgreSQL (Punto 3)
  }

  /**
   * Synchronous lookup in memory cache (preseeded + previously resolved)
   */
  public getLocaleSync(oracleIdOrName: string, lang = 'es'): CardLocaleRecord | null {
    return (
      this.cache.get(`${oracleIdOrName}_${lang}`) ||
      this.englishNameToLocale.get(oracleIdOrName.toLowerCase()) ||
      null
    );
  }

  /**
   * Retrieves Spanish localization by oracleId
   */
  public async getLocale(oracleId: string, lang = 'es'): Promise<CardLocaleRecord | null> {
    const key = `${oracleId}_${lang}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      // 1. Check PostgreSQL Prisma CardLocale table
      const dbLocale =
        (await (prisma as any).cardLocale?.findUnique({
          where: {
            oracleId_lang: {
              oracleId,
              lang,
            },
          },
        })) ||
        (await (prisma as any).cardLocale?.findFirst({
          where: {
            oracleId,
            lang,
          },
        }));

      if (dbLocale) {
        const record: CardLocaleRecord = {
          oracleId: dbLocale.oracleId,
          lang: dbLocale.lang,
          printingId: dbLocale.printingId,
          printedName: dbLocale.printedName,
          printedText: dbLocale.printedText,
          printedTypeLine: dbLocale.printedTypeLine,
          imageUrlSmall: dbLocale.imageUrlSmall,
          imageUrlNormal: dbLocale.imageUrlNormal,
          imageUrlLarge: dbLocale.imageUrlLarge,
          imageUrlArtCrop: dbLocale.imageUrlArtCrop,
        };
        this.cache.set(key, record);
        this.nameToOracle.set(record.printedName.toLowerCase(), oracleId);
        return record;
      }

      // 2. Fallback on demand via Scryfall API (rate limited)
      if (oracleId && oracleId.length === 36) {
        const scryfallRes = (await (scryfallService as any).rateLimitedFetch(
          `/cards/search?q=oracleid%3A${oracleId}+lang%3A${lang}&order=released&dir=desc`,
        )) as any;

        if (scryfallRes && Array.isArray(scryfallRes.data) && scryfallRes.data.length > 0) {
          // Choose most recent print with images
          const print =
            scryfallRes.data.find(
              (p: any) => p.image_uris?.normal || p.card_faces?.[0]?.image_uris?.normal,
            ) || scryfallRes.data[0];
          const record: CardLocaleRecord = {
            oracleId,
            lang,
            printingId: print.id,
            printedName: print.printed_name || print.name,
            printedText: print.printed_text || print.oracle_text,
            printedTypeLine: print.printed_type_line || print.type_line,
            imageUrlNormal: print.image_uris?.normal || print.card_faces?.[0]?.image_uris?.normal,
            imageUrlSmall: print.image_uris?.small || print.card_faces?.[0]?.image_uris?.small,
            imageUrlLarge: print.image_uris?.large || print.card_faces?.[0]?.image_uris?.large,
            imageUrlArtCrop:
              print.image_uris?.art_crop || print.card_faces?.[0]?.image_uris?.art_crop,
          };

          this.cache.set(key, record);
          this.nameToOracle.set(record.printedName.toLowerCase(), oracleId);

          // Save to DB asynchronously
          try {
            await (prisma as any).cardLocale?.upsert({
              where: { oracleId_lang: { oracleId, lang } },
              create: record,
              update: record,
            });
          } catch {
            // Ignore DB error if offline
          }

          return record;
        }
      }
    } catch {
      // Card doesn't have a Spanish print
    }

    return null;
  }

  /**
   * Enriches a CardDefinition with Spanish locale if available
   */
  public async enrichCardWithLocale(card: CardDefinition, lang = 'es'): Promise<CardDefinition> {
    let locale: CardLocaleRecord | null = null;
    if (card.oracleId) {
      locale = await this.getLocale(card.oracleId, lang);
    }
    if (!locale && card.name) {
      locale = this.englishNameToLocale.get(card.name.toLowerCase()) || null;
    }
    if (!locale) return card;

    const localeData: CardLocaleData = {
      printedName: locale.printedName,
      printedTypeLine: locale.printedTypeLine,
      printedText: locale.printedText,
      imageUrlSmall: locale.imageUrlSmall,
      imageUrlNormal: locale.imageUrlNormal,
      imageUrlLarge: locale.imageUrlLarge,
      imageUrlArtCrop: locale.imageUrlArtCrop,
    };

    return {
      ...card,
      locales: {
        ...(card.locales || {}),
        [lang]: localeData,
      },
    };
  }

  /**
   * Enriches a list of CardDefinitions
   */
  public async enrichCards(cards: CardDefinition[], lang = 'es'): Promise<CardDefinition[]> {
    return Promise.all(cards.map(c => this.enrichCardWithLocale(c, lang)));
  }

  /**
   * Checks if a card name matches either English name or Spanish printed name
   */
  public matchesName(card: CardDefinition, query: string): boolean {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    if (card.name.toLowerCase().includes(q)) return true;
    const esName = card.locales?.es?.printedName?.toLowerCase();
    if (esName && esName.includes(q)) return true;
    return false;
  }
}

export const cardLocaleService = new CardLocaleService();
