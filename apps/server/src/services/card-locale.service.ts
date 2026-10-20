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

// Pre-seeded Spanish prints for prominent Commander staples and test cards
export const PRESEEDED_SPANISH_LOCALES: Record<string, CardLocaleRecord> = {
  // Sol Ring
  '6ad8011d-3471-4369-9d68-b264cc027487': {
    oracleId: '6ad8011d-3471-4369-9d68-b264cc027487',
    lang: 'es',
    printingId: '17726514-6296-4171-b6a3-2287f394c86b',
    printedName: 'Anillo solar',
    printedTypeLine: 'Artefacto',
    printedText: '{T}: Agrega {C}{C}.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
  },
  'b320d044-301b-4395-a841-be80e0c03d52': {
    oracleId: 'b320d044-301b-4395-a841-be80e0c03d52',
    lang: 'es',
    printingId: '17726514-6296-4171-b6a3-2287f394c86b',
    printedName: 'Anillo solar',
    printedTypeLine: 'Artefacto',
    printedText: '{T}: Agrega {C}{C}.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg?1789754701',
  },
  // Smothering Tithe
  'a9e144f8-1976-4d0d-95cf-0f135b376d29': {
    oracleId: 'a9e144f8-1976-4d0d-95cf-0f135b376d29',
    lang: 'es',
    printingId: '3c46e165-274e-4f08-b7f3-b78d21226021',
    printedName: 'Diezmo asfixiante',
    printedTypeLine: 'Encantamiento',
    printedText:
      'Siempre que un oponente robe una carta, ese jugador puede pagar {2}. Si no lo hace, tú creas una ficha de Tesoro.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/3/c/3c46e165-274e-4f08-b7f3-b78d21226021.jpg?1789754801',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/3/c/3c46e165-274e-4f08-b7f3-b78d21226021.jpg?1789754801',
  },
  // Grave Titan
  '4622b794-52d3-4903-82a1-ff59f518e225': {
    oracleId: '4622b794-52d3-4903-82a1-ff59f518e225',
    lang: 'es',
    printingId: 'ea8e3535-97df-4822-b286-90f772fe4f44',
    printedName: 'Titán de la tumba',
    printedTypeLine: 'Criatura — Gigante',
    printedText:
      'Toque mortal. Siempre que el Titán de la tumba entre al campo de batalla o ataque, crea dos fichas de criatura Zombie negras 2/2.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/e/a/ea8e3535-97df-4822-b286-90f772fe4f44.jpg?1789754901',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/e/a/ea8e3535-97df-4822-b286-90f772fe4f44.jpg?1789754901',
  },
  // Regal Caracal
  '9211df67-ee24-4dc2-8dc5-39257e84a51e': {
    oracleId: '9211df67-ee24-4dc2-8dc5-39257e84a51e',
    lang: 'es',
    printingId: 'cd919b62-97fc-4e6f-9988-5dcbf6e0c694',
    printedName: 'Caracal regio',
    printedTypeLine: 'Criatura — Felino',
    printedText:
      'Los otros Felinos que controlas obtienen +1/+1 y tienen la habilidad de vínculo vital. Cuando el Caracal regio entre al campo de batalla, crea dos fichas de criatura Felino blancas 1/1 con la habilidad de vínculo vital.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/c/d/cd919b62-97fc-4e6f-9988-5dcbf6e0c694.jpg?1789755001',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/c/d/cd919b62-97fc-4e6f-9988-5dcbf6e0c694.jpg?1789755001',
  },
  // Kenrith, the Returned King
  'd209b948-9afb-4fd1-a961-72c87282878c': {
    oracleId: 'd209b948-9afb-4fd1-a961-72c87282878c',
    lang: 'es',
    printingId: '9b84be9a-7c98-4c28-bb7b-87b6a48f76d9',
    printedName: 'Kenrith, el rey devuelto',
    printedTypeLine: 'Criatura legendaria — Noble humano',
    printedText:
      '{R}: Todas las criaturas ganan las habilidades de arrollar y prisa hasta el final del turno.\n{1}{G}: Pon un contador +1/+1 sobre la criatura objetivo.\n{2}{W}: El jugador objetivo gana 5 vidas.\n{3}{U}: El jugador objetivo roba una carta.\n{4}{B}: Regresa la carta de criatura objetivo de un cementerio al campo de batalla bajo el control de su propietario.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/b/9b84be9a-7c98-4c28-bb7b-87b6a48f76d9.jpg?1789755101',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/b/9b84be9a-7c98-4c28-bb7b-87b6a48f76d9.jpg?1789755101',
  },
  'e6b9a896-16a2-4a7b-a328-98e36e6ea344': {
    oracleId: 'e6b9a896-16a2-4a7b-a328-98e36e6ea344',
    lang: 'es',
    printingId: '9b84be9a-7c98-4c28-bb7b-87b6a48f76d9',
    printedName: 'Kenrith, el rey devuelto',
    printedTypeLine: 'Criatura legendaria — Noble humano',
    printedText:
      '{R}: Todas las criaturas ganan las habilidades de arrollar y prisa hasta el final del turno.\n{1}{G}: Pon un contador +1/+1 sobre la criatura objetivo.\n{2}{W}: El jugador objetivo gana 5 vidas.\n{3}{U}: El jugador objetivo roba una carta.\n{4}{B}: Regresa la carta de criatura objetivo de un cementerio al campo de batalla bajo el control de su propietario.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/b/9b84be9a-7c98-4c28-bb7b-87b6a48f76d9.jpg?1789755101',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/b/9b84be9a-7c98-4c28-bb7b-87b6a48f76d9.jpg?1789755101',
  },
  // Arcane Signet
  '34302633-85f2-4f05-8774-6019a8684bbd': {
    oracleId: '34302633-85f2-4f05-8774-6019a8684bbd',
    lang: 'es',
    printingId: '5b492372-8820-410a-b363-d1f855263641',
    printedName: 'Sello arcano',
    printedTypeLine: 'Artefacto',
    printedText:
      '{T}: Agrega un maná de cualquier color en la identidad de color de tu comandante.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/5/b/5b492372-8820-410a-b363-d1f855263641.jpg?1789755201',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/5/b/5b492372-8820-410a-b363-d1f855263641.jpg?1789755201',
  },
  // Cultivate
  'f9b08df4-9724-42b7-a3cf-2cf9f76a5242': {
    oracleId: 'f9b08df4-9724-42b7-a3cf-2cf9f76a5242',
    lang: 'es',
    printingId: '98a44d03-e837-4a0b-9ef1-f3b146200df1',
    printedName: 'Cultivar',
    printedTypeLine: 'Conjuro',
    printedText:
      'Busca en tu biblioteca hasta dos cartas de tierra básica, muéstralas, pon una de ellas en el campo de batalla girada y la otra en tu mano. Luego baraja.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/8/98a44d03-e837-4a0b-9ef1-f3b146200df1.jpg?1789755301',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/8/98a44d03-e837-4a0b-9ef1-f3b146200df1.jpg?1789755301',
  },
  // Counterspell
  'cc960965-0a91-4e78-98e7-ff4c514782bb': {
    oracleId: 'cc960965-0a91-4e78-98e7-ff4c514782bb',
    lang: 'es',
    printingId: 'c2865529-6720-48e0-a92c-02cfd37e58a7',
    printedName: 'Contrahechizo',
    printedTypeLine: 'Instantáneo',
    printedText: 'Contrarresta el hechizo objetivo.',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/c/2/c2865529-6720-48e0-a92c-02cfd37e58a7.jpg?1789755401',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/c/2/c2865529-6720-48e0-a92c-02cfd37e58a7.jpg?1789755401',
  },
  // Plains
  'bc71ebf6-2056-41f7-be35-b2e5c34afa99': {
    oracleId: 'bc71ebf6-2056-41f7-be35-b2e5c34afa99',
    lang: 'es',
    printingId: 'e8ba514b-6101-49e0-82d8-55fae2d78772',
    printedName: 'Llanura',
    printedTypeLine: 'Tierra básica — Llanura',
    printedText: '({T}: Agrega {W}.)',
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/e/8/e8ba514b-6101-49e0-82d8-55fae2d78772.jpg?1789755501',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/e/8/e8ba514b-6101-49e0-82d8-55fae2d78772.jpg?1789755501',
  },
};

export class CardLocaleService {
  private cache = new Map<string, CardLocaleRecord>();
  private nameToOracle = new Map<string, string>();
  private englishNameToLocale = new Map<string, CardLocaleRecord>();

  constructor() {
    for (const [oracleId, record] of Object.entries(PRESEEDED_SPANISH_LOCALES)) {
      this.cache.set(`${oracleId}_${record.lang}`, record);
      this.nameToOracle.set(record.printedName.toLowerCase(), oracleId);
    }

    this.englishNameToLocale.set(
      'sol ring',
      PRESEEDED_SPANISH_LOCALES['6ad8011d-3471-4369-9d68-b264cc027487']!,
    );
    this.englishNameToLocale.set(
      'kenrith, the returned king',
      PRESEEDED_SPANISH_LOCALES['d209b948-9afb-4fd1-a961-72c87282878c']!,
    );
    this.englishNameToLocale.set(
      'smothering tithe',
      PRESEEDED_SPANISH_LOCALES['a9e144f8-1976-4d0d-95cf-0f135b376d29']!,
    );
    this.englishNameToLocale.set(
      'grave titan',
      PRESEEDED_SPANISH_LOCALES['4622b794-52d3-4903-82a1-ff59f518e225']!,
    );
    this.englishNameToLocale.set(
      'regal caracal',
      PRESEEDED_SPANISH_LOCALES['9211df67-ee24-4dc2-8dc5-39257e84a51e']!,
    );
    this.englishNameToLocale.set(
      'cultivate',
      PRESEEDED_SPANISH_LOCALES['f9b08df4-9724-42b7-a3cf-2cf9f76a5242']!,
    );
    this.englishNameToLocale.set(
      'arcane signet',
      PRESEEDED_SPANISH_LOCALES['34302633-85f2-4f05-8774-6019a8684bbd']!,
    );
    this.englishNameToLocale.set(
      'counterspell',
      PRESEEDED_SPANISH_LOCALES['cc960965-0a91-4e78-98e7-ff4c514782bb']!,
    );
    this.englishNameToLocale.set(
      'plains',
      PRESEEDED_SPANISH_LOCALES['bc71ebf6-2056-41f7-be35-b2e5c34afa99']!,
    );
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
      const dbLocale = await (prisma as any).cardLocale?.findUnique({
        where: {
          oracleId_lang: {
            oracleId,
            lang,
          },
        },
      });

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
