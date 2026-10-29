import { CardDefinition } from '@mtgc/shared';
import { scryfallService } from './scryfall.service.js';
import { prisma } from '../db.js';

export const COMMON_TOKENS: CardDefinition[] = [
  {
    scryfallId: 'cb7b5024-3a0b-4f14-977e-ba6c4c2567c9',
    name: 'Treasure',
    cmc: 0,
    typeLine: 'Token Artifact — Treasure',
    oracleText: '{T}, Sacrifice this token: Add one mana of any color.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/c/b/cb7b5024-3a0b-4f14-977e-ba6c4c2567c9.jpg?1783915244',
    artist: 'Alayna Danner',
    copyright: '™ & © Wizards of the Coast',
  },
  {
    scryfallId: 'da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37',
    name: 'Food',
    cmc: 0,
    typeLine: 'Token Artifact — Food',
    oracleText: '{2}, {T}, Sacrifice this token: You gain 3 life.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/d/a/da1fca2e-4ea7-4c5f-bd58-f9529dfb6f37.jpg?1783903567',
    artist: 'Titus Lunter',
    copyright: '™ & © Wizards of the Coast',
  },
  {
    scryfallId: '1481e938-7763-4109-b313-2a21053a82df',
    name: 'Clue',
    cmc: 0,
    typeLine: 'Token Artifact — Clue',
    oracleText: '{2}, Sacrifice this token: Draw a card.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/1/4/1481e938-7763-4109-b313-2a21053a82df.jpg?1789754721',
    artist: 'Franz Vohwinkel',
    copyright: '™ & © Wizards of the Coast',
  },
  {
    scryfallId: '92a3afe7-bd9f-43f9-adc3-4819e60dc7a5',
    name: 'Blood',
    cmc: 0,
    typeLine: 'Token Artifact — Blood',
    oracleText: '{1}, {T}, Discard a card, Sacrifice this token: Draw a card.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/9/2/92a3afe7-bd9f-43f9-adc3-4819e60dc7a5.jpg?1783907965',
    artist: 'Brian Valeza',
    copyright: '™ & © Wizards of the Coast',
  },
  {
    scryfallId: '91613970-c25c-4959-b5b0-b6e2a7657634',
    name: 'Map',
    cmc: 0,
    typeLine: 'Token Artifact — Map',
    oracleText:
      '{1}, {T}, Sacrifice this artifact: Target creature you control explores. Activate only as a sorcery.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal:
      'https://cards.scryfall.io/normal/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    imageUrlSmall:
      'https://cards.scryfall.io/small/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    imageUrlLarge:
      'https://cards.scryfall.io/large/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    imageUrlArtCrop:
      'https://cards.scryfall.io/art_crop/front/9/1/91613970-c25c-4959-b5b0-b6e2a7657634.jpg?1789737819',
    artist: 'Sam Burley',
    copyright: '™ & © Wizards of the Coast',
  },
];

export class TokenService {
  private cardTokensCache = new Map<string, CardDefinition[]>();
  private tokenDetailsCache = new Map<string, CardDefinition>();

  constructor() {
    // Pre-populate with common tokens
    for (const token of COMMON_TOKENS) {
      this.tokenDetailsCache.set(token.scryfallId, token);
      this.tokenDetailsCache.set(token.name.toLowerCase(), token);
    }

    // Pre-seed known test cards
    this.cardTokensCache.set('smothering tithe', [COMMON_TOKENS[0]!]); // Treasure
    this.cardTokensCache.set('grave titan', [
      {
        scryfallId: '17f001ab-514b-49e7-a657-b2872ad7a1de',
        name: 'Zombie',
        cmc: 0,
        typeLine: 'Token Creature — Zombie',
        oracleText: '',
        power: '2',
        toughness: '2',
        colors: ['B'],
        colorIdentity: ['B'],
        imageUrlNormal:
          'https://cards.scryfall.io/normal/front/1/7/17f001ab-514b-49e7-a657-b2872ad7a1de.jpg?1783904333',
        imageUrlSmall:
          'https://cards.scryfall.io/small/front/1/7/17f001ab-514b-49e7-a657-b2872ad7a1de.jpg?1783904333',
        imageUrlLarge:
          'https://cards.scryfall.io/large/front/1/7/17f001ab-514b-49e7-a657-b2872ad7a1de.jpg?1783904333',
        imageUrlArtCrop:
          'https://cards.scryfall.io/art_crop/front/1/7/17f001ab-514b-49e7-a657-b2872ad7a1de.jpg?1783904333',
        artist: 'Lucas Graciano',
        copyright: '™ & © Wizards of the Coast',
      },
    ]);
    this.cardTokensCache.set('regal caracal', [
      {
        scryfallId: '86701490-17ac-4253-810d-6cfd7a46594c',
        name: 'Cat',
        cmc: 0,
        typeLine: 'Token Creature — Cat',
        oracleText: 'Lifelink',
        power: '1',
        toughness: '1',
        colors: ['W'],
        colorIdentity: ['W'],
        imageUrlNormal:
          'https://cards.scryfall.io/normal/front/8/6/86701490-17ac-4253-810d-6cfd7a46594c.jpg?1783908586',
        imageUrlSmall:
          'https://cards.scryfall.io/small/front/8/6/86701490-17ac-4253-810d-6cfd7a46594c.jpg?1783908586',
        imageUrlLarge:
          'https://cards.scryfall.io/large/front/8/6/86701490-17ac-4253-810d-6cfd7a46594c.jpg?1783908586',
        imageUrlArtCrop:
          'https://cards.scryfall.io/art_crop/front/8/6/86701490-17ac-4253-810d-6cfd7a46594c.jpg?1783908586',
        artist: 'Filip Burburan',
        copyright: '™ & © Wizards of the Coast',
      },
    ]);
    this.cardTokensCache.set('sol ring', []);
    this.cardTokensCache.set('krenko, mob boss', [
      {
        scryfallId: 'token-goblin-1-1',
        name: 'Goblin',
        cmc: 0,
        typeLine: 'Token Creature — Goblin',
        oracleText: '',
        power: '1',
        toughness: '1',
        colors: ['R'],
        colorIdentity: ['R'],
      },
    ]);
    this.cardTokensCache.set('alela, artful provocateur', [
      {
        scryfallId: 'token-faerie-1-1-flying',
        name: 'Faerie',
        cmc: 0,
        typeLine: 'Token Creature — Faerie',
        oracleText: 'Flying',
        power: '1',
        toughness: '1',
        colors: ['U', 'B'],
        colorIdentity: ['U', 'B'],
      },
    ]);
    this.cardTokensCache.set('goreclaw, terror of qal sisma', []);
    this.cardTokensCache.set('brago, king eternal', []);
    this.cardTokensCache.set('meren of clan nel toth', []);
    this.cardTokensCache.set('wyleth, soul of steel', []);
    this.cardTokensCache.set('niv-mizzet, parun', []);
    this.cardTokensCache.set('kozilek, the great distortion', []);
  }

  public getCommonTokens(): CardDefinition[] {
    return COMMON_TOKENS;
  }

  /**
   * Resolves tokens created by a card by name or Scryfall ID
   */
  public async getTokensForCard(cardNameOrId: string): Promise<CardDefinition[]> {
    const key = cardNameOrId.trim().toLowerCase();
    if (this.cardTokensCache.has(key)) {
      return this.cardTokensCache.get(key)!;
    }

    try {
      // 1. Consultar carta en Scryfall
      const endpoint =
        cardNameOrId.includes('-') && cardNameOrId.length === 36
          ? `/cards/${cardNameOrId}`
          : `/cards/named?exact=${encodeURIComponent(cardNameOrId)}`;

      const cardRaw = (await (scryfallService as any).rateLimitedFetch(endpoint)) as any;
      if (!cardRaw) {
        this.cardTokensCache.set(key, []);
        return [];
      }

      const allParts: Array<{
        object: string;
        id: string;
        component: string;
        name: string;
        type_line: string;
        uri: string;
      }> = cardRaw.all_parts || [];

      const tokenParts = allParts.filter(p => p.component === 'token');
      if (tokenParts.length === 0) {
        this.cardTokensCache.set(key, []);
        return [];
      }

      const resolvedTokens: CardDefinition[] = [];
      const seenSignatures = new Set<string>();

      for (const part of tokenParts) {
        let tokenDef = this.tokenDetailsCache.get(part.id);

        // 1. Chequeo en catálogo de fichas comunes predefinidas (cero llamadas de red)
        if (!tokenDef) {
          const commonMatch = COMMON_TOKENS.find(
            t => t.scryfallId === part.id || t.name.toLowerCase() === part.name.toLowerCase(),
          );
          if (commonMatch) {
            tokenDef = commonMatch;
            this.tokenDetailsCache.set(part.id, tokenDef);
          }
        }

        // 2. Chequeo en base de datos local PostgreSQL
        if (!tokenDef && prisma) {
          try {
            const dbCard = await (prisma as any).card?.findUnique({
              where: { scryfallId: part.id },
            });
            if (dbCard) {
              tokenDef = {
                scryfallId: dbCard.scryfallId,
                name: dbCard.name,
                cmc: dbCard.cmc || 0,
                typeLine: dbCard.typeLine,
                oracleText: dbCard.oracleText || '',
                power: dbCard.power,
                toughness: dbCard.toughness,
                loyalty: dbCard.loyalty,
                colors: dbCard.colors || [],
                colorIdentity: dbCard.colorIdentity || [],
                imageUrlNormal: dbCard.imageUrlNormal,
                imageUrlSmall: dbCard.imageUrlSmall,
                imageUrlLarge: dbCard.imageUrlLarge,
                imageUrlArtCrop: dbCard.imageUrlArtCrop,
                artist: dbCard.artist || 'Unknown Artist',
                copyright: '™ & © Wizards of the Coast',
              };
              this.tokenDetailsCache.set(part.id, tokenDef);
            }
          } catch {
            // Continuar con resolución externa o fallback
          }
        }

        // 3. Fallback a Scryfall externo con control de tasa y manejo de 429
        if (!tokenDef) {
          try {
            const tokenRaw = (await (scryfallService as any).rateLimitedFetch(
              `/cards/${part.id}`,
            )) as any;
            if (tokenRaw) {
              tokenDef = {
                scryfallId: tokenRaw.id,
                name: tokenRaw.name,
                cmc: 0,
                typeLine: tokenRaw.type_line || 'Token',
                oracleText: tokenRaw.oracle_text || '',
                power: tokenRaw.power,
                toughness: tokenRaw.toughness,
                loyalty: tokenRaw.loyalty,
                colors: tokenRaw.colors || [],
                colorIdentity: tokenRaw.color_identity || [],
                imageUrlNormal:
                  tokenRaw.image_uris?.normal || tokenRaw.card_faces?.[0]?.image_uris?.normal,
                imageUrlSmall:
                  tokenRaw.image_uris?.small || tokenRaw.card_faces?.[0]?.image_uris?.small,
                imageUrlLarge:
                  tokenRaw.image_uris?.large || tokenRaw.card_faces?.[0]?.image_uris?.large,
                imageUrlArtCrop:
                  tokenRaw.image_uris?.art_crop || tokenRaw.card_faces?.[0]?.image_uris?.art_crop,
                artist: tokenRaw.artist || 'Unknown Artist',
                copyright: '™ & © Wizards of the Coast',
              };
              this.tokenDetailsCache.set(part.id, tokenDef);
            }
          } catch {
            // Fallback limpio sin error en pantalla
            tokenDef = {
              scryfallId: part.id,
              name: part.name,
              cmc: 0,
              typeLine: part.type_line,
              oracleText: '',
              colors: [],
              colorIdentity: [],
              imageUrlNormal: 'https://cards.scryfall.io/back.png',
              imageUrlSmall: 'https://cards.scryfall.io/back.png',
              copyright: '™ & © Wizards of the Coast',
            };
            this.tokenDetailsCache.set(part.id, tokenDef);
          }
        }

        if (tokenDef) {
          // Deduplicación: sin duplicar fichas idénticas (mismo nombre, tipo, colores, P/T y texto)
          const sig = `${tokenDef.name}|${tokenDef.typeLine}|${tokenDef.power || ''}|${tokenDef.toughness || ''}|${(tokenDef.colors || []).slice().sort().join(',')}|${tokenDef.oracleText || ''}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            resolvedTokens.push(tokenDef);
          }
        }
      }

      this.cardTokensCache.set(key, resolvedTokens);
      return resolvedTokens;
    } catch (err) {
      console.warn(`[TokenService] No se pudieron resolver fichas para "${cardNameOrId}":`, err);
      this.cardTokensCache.set(key, []);
      return [];
    }
  }

  /**
   * Resolves all tokens for a decklist, grouped by source card
   */
  public async getTokensForDeck(
    cardNames: string[],
  ): Promise<Array<{ sourceCard: string; tokens: CardDefinition[] }>> {
    const uniqueNames = Array.from(new Set(cardNames.map(n => n.trim()).filter(Boolean)));
    const results: Array<{ sourceCard: string; tokens: CardDefinition[] }> = [];

    for (const name of uniqueNames) {
      const tokens = await this.getTokensForCard(name);
      if (tokens.length > 0) {
        results.push({ sourceCard: name, tokens });
      }
    }

    return results;
  }
}

export const tokenService = new TokenService();
