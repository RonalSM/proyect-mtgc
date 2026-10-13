import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';

interface BulkDataResponse {
  data: Array<{
    id: string;
    type: string;
    updated_at: string;
    download_uri: string;
    content_type: string;
  }>;
}

export class BulkSyncService {
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  /**
   * Triggers synchronization of Scryfall Oracle Cards bulk data
   */
  public async syncOracleCards(
    limit?: number,
  ): Promise<{ syncedCount: number; durationMs: number }> {
    if (this.isSyncing) {
      throw new Error('La sincronización de bulk data ya está en curso.');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let syncedCount = 0;

    try {
      console.log('🔄 [BulkSync] Consultando catálogo de bulk data de Scryfall...');
      const response = await fetch('https://api.scryfall.com/bulk-data', {
        headers: {
          'User-Agent':
            process.env.SCRYFALL_USER_AGENT || 'MTGCommanderVirtualTable/1.0.0 (admin@mtgc.local)',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error al consultar Scryfall bulk-data: ${response.statusText}`);
      }

      const bulkMeta = (await response.json()) as BulkDataResponse;
      const oracleDataInfo = bulkMeta.data.find(item => item.type === 'oracle_cards');

      if (!oracleDataInfo?.download_uri) {
        throw new Error('No se encontró el archivo bulk "oracle_cards" en Scryfall.');
      }

      console.log(`⬇️ [BulkSync] Descargando Oracle Cards desde: ${oracleDataInfo.download_uri}`);
      const cardsResponse = await fetch(oracleDataInfo.download_uri);
      if (!cardsResponse.ok) {
        throw new Error(`Error al descargar el archivo bulk: ${cardsResponse.statusText}`);
      }

      const cards = (await cardsResponse.json()) as any[];
      const totalToProcess = limit ? Math.min(cards.length, limit) : cards.length;
      console.log(`📦 [BulkSync] Procesando ${totalToProcess} cartas...`);

      const batchSize = 100;
      for (let i = 0; i < totalToProcess; i += batchSize) {
        const batch = cards.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async rawCard => {
            try {
              const def = scryfallService.toCardDefinition(rawCard);
              await prisma.card.upsert({
                where: { scryfallId: def.scryfallId },
                update: {
                  name: def.name,
                  manaCost: def.manaCost,
                  cmc: def.cmc,
                  typeLine: def.typeLine,
                  oracleText: def.oracleText,
                  colors: def.colors,
                  colorIdentity: def.colorIdentity,
                  power: def.power,
                  toughness: def.toughness,
                  imageUrlSmall: def.imageUrlSmall,
                  imageUrlNormal: def.imageUrlNormal,
                  imageUrlArtCrop: def.imageUrlArtCrop,
                  layout: rawCard.layout,
                  legalities: rawCard.legalities,
                },
                create: {
                  scryfallId: def.scryfallId,
                  oracleId: def.oracleId,
                  name: def.name,
                  manaCost: def.manaCost,
                  cmc: def.cmc,
                  typeLine: def.typeLine,
                  oracleText: def.oracleText,
                  colors: def.colors,
                  colorIdentity: def.colorIdentity,
                  power: def.power,
                  toughness: def.toughness,
                  imageUrlSmall: def.imageUrlSmall,
                  imageUrlNormal: def.imageUrlNormal,
                  imageUrlArtCrop: def.imageUrlArtCrop,
                  layout: rawCard.layout,
                  legalities: rawCard.legalities,
                },
              });
              syncedCount++;
            } catch (cardErr) {
              // Si la base de datos no está conectada o hay error puntual, continuar
            }
          }),
        );
      }

      this.lastSyncTime = new Date();
      const durationMs = Date.now() - startTime;
      console.log(
        `✅ [BulkSync] Sincronización completada: ${syncedCount} cartas en ${durationMs}ms`,
      );
      return { syncedCount, durationMs };
    } finally {
      this.isSyncing = false;
    }
  }

  public getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

export const bulkSyncService = new BulkSyncService();
