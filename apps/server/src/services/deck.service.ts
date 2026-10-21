import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../db.js';
import { CardDefinition, CardColor, parseDecklist, ParsedDeckLine } from '@mtgc/shared';
import { randomUUID } from 'crypto';
import { cardLocaleService } from './card-locale.service.js';
import { tokenService } from './token.service.js';

export interface SavedDeck {
  id: string;
  userId?: string | null;
  name: string;
  format: string;
  commanderName?: string | null;
  colorIdentity: CardColor[];
  cardCount: number;
  rawDecklist?: string | null;
  commanderCards: CardDefinition[];
  maindeckCards: CardDefinition[];
  commanderImageUrl?: string | null;
  isPreset?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PresetMeta {
  filename: string;
  id: string;
  name: string;
  commander: string;
  colorIdentity: CardColor[];
  imageUrl: string;
}

const PRESET_METAS: PresetMeta[] = [
  {
    filename: '01-krenko-mob-boss.txt',
    id: 'preset-krenko-mob-boss',
    name: 'Krenko - Marea de Trasgos',
    commander: 'Krenko, Mob Boss',
    colorIdentity: ['R'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/c/d/cd9fec9d-23c8-4d35-97c1-9499527198fb.jpg',
  },
  {
    filename: '02-goreclaw-terror-of-qal-sisma.txt',
    id: 'preset-goreclaw-terror-of-qal-sisma',
    name: 'Goreclaw - Poder Titánico',
    commander: 'Goreclaw, Terror of Qal Sisma',
    colorIdentity: ['G'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/3/6/36d456c3-734b-4666-b85e-3405e758dd77.jpg',
  },
  {
    filename: '03-brago-king-eternal.txt',
    id: 'preset-brago-king-eternal',
    name: 'Brago - Parpadeo Eterno',
    commander: 'Brago, King Eternal',
    colorIdentity: ['W', 'U'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/0/a/0ac3fb08-741a-49e5-9fae-b26819677d24.jpg',
  },
  {
    filename: '04-meren-of-clan-nel-toth.txt',
    id: 'preset-meren-of-clan-nel-toth',
    name: 'Meren - Nigromancia Golgari',
    commander: 'Meren of Clan Nel Toth',
    colorIdentity: ['B', 'G'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/3/4/3485ec02-1d5c-45eb-a085-e33469292c2e.jpg',
  },
  {
    filename: '05-wyleth-soul-of-steel.txt',
    id: 'preset-wyleth-soul-of-steel',
    name: 'Wyleth - Armamento Boros',
    commander: 'Wyleth, Soul of Steel',
    colorIdentity: ['R', 'W'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/7/c/7c5ada8c-98f2-4f9c-bcb5-dfa4f804fbe6.jpg',
  },
  {
    filename: '06-niv-mizzet-parun.txt',
    id: 'preset-niv-mizzet-parun',
    name: 'Niv-Mizzet - Curiosidad Izzet',
    commander: 'Niv-Mizzet, Parun',
    colorIdentity: ['U', 'R'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/4/8/4825e7cb-53ae-4e4b-bb37-8d8eb414772c.jpg',
  },
  {
    filename: '07-alela-artful-provocateur.txt',
    id: 'preset-alela-artful-provocateur',
    name: 'Alela - Enjambre de Hadas Esper',
    commander: 'Alela, Artful Provocateur',
    colorIdentity: ['W', 'U', 'B'],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/a/b/abc9e41e-fd03-4b6f-8f44-17ba94fa44f5.jpg',
  },
  {
    filename: '08-kozilek-the-great-distortion.txt',
    id: 'preset-kozilek-the-great-distortion',
    name: 'Kozilek - Devorador Incoloro',
    commander: 'Kozilek, the Great Distortion',
    colorIdentity: [],
    imageUrl:
      'https://cards.scryfall.io/art_crop/front/f/0/f06fc6e0-b22c-40d3-bb53-d5ec400d921c.jpg',
  },
];

export class DeckService {
  // In-memory fallback for local dev & testing when PostgreSQL is offline
  private inMemoryDecks = new Map<string, SavedDeck>();
  private presetDecks: SavedDeck[] = [];

  /**
   * Loads preset decks from apps/server/prisma/seed/preset-decks/*.txt (Punto 8)
   */
  public async loadPresetDecks(): Promise<SavedDeck[]> {
    if (this.presetDecks.length > 0) {
      return this.presetDecks;
    }

    const presetDir = fs.existsSync(path.resolve('prisma/seed/preset-decks'))
      ? path.resolve('prisma/seed/preset-decks')
      : path.resolve('apps/server/prisma/seed/preset-decks');
    const loadedPresets: SavedDeck[] = [];

    for (const meta of PRESET_METAS) {
      const filePath = path.join(presetDir, meta.filename);
      let rawText = '';
      try {
        if (fs.existsSync(filePath)) {
          rawText = fs.readFileSync(filePath, 'utf-8');
        }
      } catch {
        // Fallback if file read fails
      }

      if (!rawText) continue;

      const parsed = parseDecklist(rawText);

      // Expand entries into individual CardDefinitions
      const commanderCards: CardDefinition[] = [];
      for (const entry of parsed.commanderEntries) {
        for (let q = 0; q < entry.quantity; q++) {
          commanderCards.push({
            scryfallId: `cmdr_${meta.id}_${q}`,
            name: entry.cardName,
            cmc: 4,
            typeLine: 'Legendary Creature',
            colorIdentity: meta.colorIdentity,
            colors: meta.colorIdentity,
            imageUrlNormal: meta.imageUrl.replace('/art_crop/', '/normal/'),
            imageUrlSmall: meta.imageUrl.replace('/art_crop/', '/small/'),
            imageUrlArtCrop: meta.imageUrl,
            legalities: { commander: 'legal' },
          });
        }
      }

      const maindeckCards: CardDefinition[] = [];
      for (const entry of parsed.maindeckEntries) {
        const isBasic =
          entry.cardName.includes('Plains') ||
          entry.cardName.includes('Island') ||
          entry.cardName.includes('Swamp') ||
          entry.cardName.includes('Mountain') ||
          entry.cardName.includes('Forest') ||
          entry.cardName.includes('Wastes');

        for (let q = 0; q < entry.quantity; q++) {
          maindeckCards.push({
            scryfallId: `main_${meta.id}_${entry.cardName.replace(/\s+/g, '_')}_${q}`,
            name: entry.cardName,
            cmc: isBasic ? 0 : 3,
            typeLine: isBasic ? 'Basic Land' : 'Spell',
            colorIdentity: meta.colorIdentity,
            colors: meta.colorIdentity,
            legalities: { commander: 'legal' },
          });
        }
      }

      // Enrich with Spanish locale (Punto 5) and pre-warm tokens (Punto 4)
      const enrichedCommanderCards = await cardLocaleService.enrichCards(commanderCards, 'es');
      const enrichedMaindeckCards = await cardLocaleService.enrichCards(maindeckCards, 'es');

      // Pre-warm token resolution in background
      tokenService.getTokensForCard(meta.commander).catch(() => {});

      const deckItem: SavedDeck = {
        id: meta.id,
        userId: null,
        name: meta.name,
        format: 'commander',
        commanderName: meta.commander,
        colorIdentity: meta.colorIdentity,
        cardCount: enrichedCommanderCards.length + enrichedMaindeckCards.length,
        rawDecklist: rawText,
        commanderCards: enrichedCommanderCards,
        maindeckCards: enrichedMaindeckCards,
        commanderImageUrl: meta.imageUrl,
        isPreset: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        if ((prisma as any).deck) {
          await (prisma as any).deck.upsert({
            where: { id: meta.id },
            update: {
              name: meta.name,
              commanderName: meta.commander,
              colorIdentity: meta.colorIdentity,
              cardCount: deckItem.cardCount,
              rawDecklist: rawText,
              isPreset: true,
            },
            create: {
              id: meta.id,
              name: meta.name,
              commanderName: meta.commander,
              colorIdentity: meta.colorIdentity,
              cardCount: deckItem.cardCount,
              rawDecklist: rawText,
              isPreset: true,
            },
          });
        }
      } catch {
        // Fallback to memory
      }

      loadedPresets.push(deckItem);
      this.inMemoryDecks.set(deckItem.id, deckItem);
    }

    // Support user dropping extra .txt decks into presetDir dynamically
    try {
      if (fs.existsSync(presetDir)) {
        const extraFiles = fs
          .readdirSync(presetDir)
          .filter(f => f.endsWith('.txt') && !PRESET_METAS.some(m => m.filename === f));
        for (const filename of extraFiles) {
          const filePath = path.join(presetDir, filename);
          const rawText = fs.readFileSync(filePath, 'utf-8');
          const parsed = parseDecklist(rawText);
          const cmdrName = parsed.commanderEntries[0]?.cardName || 'Comandante';
          const deckId = `preset-${filename
            .replace('.txt', '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')}`;
          const cleanName = filename.replace(/^\d+-/, '').replace('.txt', '').replace(/-/g, ' ');

          const cmdrCards: CardDefinition[] = parsed.commanderEntries.flatMap((e: ParsedDeckLine) =>
            Array.from({ length: e.quantity }, (_, q) => ({
              scryfallId: `cmdr_${deckId}_${q}`,
              name: e.cardName,
              cmc: 4,
              typeLine: 'Legendary Creature',
              colorIdentity: [],
              colors: [],
              legalities: { commander: 'legal' },
            })),
          );
          const mainCards: CardDefinition[] = parsed.maindeckEntries.flatMap((e: ParsedDeckLine) =>
            Array.from({ length: e.quantity }, (_, q) => ({
              scryfallId: `main_${deckId}_${e.cardName.replace(/\s+/g, '_')}_${q}`,
              name: e.cardName,
              cmc: 3,
              typeLine: 'Spell',
              colorIdentity: [],
              colors: [],
              legalities: { commander: 'legal' },
            })),
          );

          const enrichedCmdr = await cardLocaleService.enrichCards(cmdrCards, 'es');
          const enrichedMain = await cardLocaleService.enrichCards(mainCards, 'es');

          const extraDeck: SavedDeck = {
            id: deckId,
            userId: null,
            name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
            format: 'commander',
            commanderName: cmdrName,
            colorIdentity: [],
            cardCount: enrichedCmdr.length + enrichedMain.length,
            rawDecklist: rawText,
            commanderCards: enrichedCmdr,
            maindeckCards: enrichedMain,
            commanderImageUrl: undefined,
            isPreset: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          loadedPresets.push(extraDeck);
          this.inMemoryDecks.set(deckId, extraDeck);
        }
      }
    } catch {
      // In-memory fallback
    }

    this.presetDecks = loadedPresets;
    console.log(
      `✅ [DeckService] ${loadedPresets.length} mazos listos (presets) cargados exitosamente.`,
    );
    return loadedPresets;
  }

  /**
   * Retrieves all preset decks
   */
  public async getPresetDecks(): Promise<SavedDeck[]> {
    if (this.presetDecks.length === 0) {
      return await this.loadPresetDecks();
    }
    return this.presetDecks;
  }

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

  /**
   * Obtiene estadísticas de presencia en la base de datos local para cada mazo listo
   */
  public async getPresetDecksDbStats(): Promise<
    {
      id: string;
      name: string;
      filename: string;
      totalUniqueCards: number;
      existingInDb: number;
      missingInDb: string[];
    }[]
  > {
    const presetDir = fs.existsSync(path.resolve('apps/server/prisma/seed/preset-decks'))
      ? path.resolve('apps/server/prisma/seed/preset-decks')
      : path.resolve('prisma/seed/preset-decks');

    const stats: {
      id: string;
      name: string;
      filename: string;
      totalUniqueCards: number;
      existingInDb: number;
      missingInDb: string[];
    }[] = [];

    if (!fs.existsSync(presetDir)) {
      return stats;
    }

    for (const meta of PRESET_METAS) {
      const filePath = path.join(presetDir, meta.filename);
      if (!fs.existsSync(filePath)) continue;

      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const lines = raw
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('//') && !l.startsWith('#'));

        const names = lines.map(l => {
          const m = l.match(/^(\d+x?\s+)?(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+.*)?$/);
          return m && m[2] ? m[2].trim() : l;
        });
        const uniqueNames = [...new Set(names)];
        const missing: string[] = [];
        let found = 0;

        for (const name of uniqueNames) {
          try {
            const inDb = await prisma.card.findFirst({
              where: { name: { equals: name, mode: 'insensitive' } },
              select: { id: true },
            });
            if (inDb) {
              found++;
            } else {
              missing.push(name);
            }
          } catch {
            missing.push(name);
          }
        }

        stats.push({
          id: meta.id,
          name: meta.name,
          filename: meta.filename,
          totalUniqueCards: uniqueNames.length,
          existingInDb: found,
          missingInDb: missing,
        });
      } catch {
        // Ignorar fallos de lectura de archivo individual
      }
    }

    return stats;
  }
}

export const deckService = new DeckService();
