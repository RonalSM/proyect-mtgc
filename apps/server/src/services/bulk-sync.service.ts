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
  private cronTimer: NodeJS.Timeout | null = null;
  private isNightlyCronActive = false;
  private lastRulingsUpdatedAt: string | null = null;
  private lastRulingsSyncTime: Date | null = null;
  private rulingsByOracleId: Map<
    string,
    Array<{ publishedAt: string; source: string; comment: string }>
  > = new Map();

  public getLastRulingsUpdatedAt(): string | null {
    return this.lastRulingsUpdatedAt;
  }

  public setLastRulingsUpdatedAt(val: string | null): void {
    this.lastRulingsUpdatedAt = val;
  }

  public setRulingsForOracleId(
    oracleId: string,
    rulings: Array<{ publishedAt: string; source: string; comment: string }>,
  ): void {
    this.rulingsByOracleId.set(oracleId, rulings);
  }

  public async getRulingsByOracleId(
    oracleId: string,
  ): Promise<Array<{ publishedAt: string; source: string; comment: string }>> {
    const cached = this.rulingsByOracleId.get(oracleId);
    if (cached) return cached;

    try {
      const dbRulings = await (prisma as any).ruling?.findMany({
        where: { oracleId },
        orderBy: { publishedAt: 'desc' },
      });
      if (dbRulings && dbRulings.length > 0) {
        const mapped = dbRulings.map((r: any) => ({
          publishedAt:
            typeof r.publishedAt === 'string'
              ? r.publishedAt
              : r.publishedAt.toISOString().slice(0, 10),
          source: r.source || 'wotc',
          comment: r.comment,
        }));
        this.rulingsByOracleId.set(oracleId, mapped);
        return mapped;
      }
    } catch {
      // DB offline or table not present
    }

    return [];
  }

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
            } catch {
              // Gracefully continue if DB is offline or item error
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

  /**
   * Starts the automated nightly cron synchronization job (COMP-6 / REQ-18 / Paso 2A.5)
   * Runs daily at the specified UTC hour (default: 03:00 UTC).
   */
  public startNightlyCron(targetHourUtc: number = 3): void {
    if (this.isNightlyCronActive) return;

    this.isNightlyCronActive = true;

    const scheduleNext = () => {
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setUTCHours(targetHourUtc, 0, 0, 0);

      // If already passed today, schedule for tomorrow
      if (nextRun.getTime() <= now.getTime()) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      }

      const msUntilNext = nextRun.getTime() - now.getTime();
      console.log(
        `⏰ [BulkSync Cron] Próxima sincronización nocturna programada para: ${nextRun.toISOString()} (en ${Math.round(
          msUntilNext / 1000 / 60,
        )} min)`,
      );

      this.cronTimer = setTimeout(async () => {
        try {
          console.log('🌙 [BulkSync Cron] Ejecutando sincronización nocturna de Scryfall (Cartas y Dictámenes)...');
          await this.syncOracleCards();
          await this.syncRulings();
        } catch (err: any) {
          console.error('❌ [BulkSync Cron] Error en sincronización nocturna:', err?.message || err);
        } finally {
          if (this.isNightlyCronActive) {
            scheduleNext();
          }
        }
      }, msUntilNext);
    };

    scheduleNext();
  }

  /**
   * Sincronización oficial del archivo bulk de dictámenes (Rulings) de Scryfall (Punto 5 / REQ-7.28)
   * Compara fecha updated_at para evitar descargas innecesarias y almacena en base de datos local / memoria.
   */
  public async syncRulings(
    limit?: number,
  ): Promise<{ syncedCount: number; durationMs: number; skipped?: boolean; reason?: string }> {
    const startTime = Date.now();
    let syncedCount = 0;

    console.log('🔄 [BulkSync] Consultando catálogo de bulk data para dictámenes (rulings)...');
    const userAgent =
      process.env.SCRYFALL_USER_AGENT || 'MTGCommanderVirtualTable/1.0.0 (admin@mtgc.local)';

    const response = await fetch('https://api.scryfall.com/bulk-data', {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error al consultar Scryfall bulk-data: ${response.statusText}`);
    }

    const bulkMeta = (await response.json()) as BulkDataResponse;
    const rulingsDataInfo = bulkMeta.data.find(item => item.type === 'rulings');

    if (!rulingsDataInfo?.download_uri) {
      throw new Error('No se encontró el archivo bulk "rulings" en Scryfall.');
    }

    // Comprobación de fecha: si no ha cambiado desde la última sincronización, omitir descarga
    if (this.lastRulingsUpdatedAt && this.lastRulingsUpdatedAt === rulingsDataInfo.updated_at) {
      console.log(
        `⏭️ [BulkSync] El archivo bulk "rulings" no ha cambiado (${this.lastRulingsUpdatedAt}). Omitiendo descarga innecesaria.`,
      );
      return {
        syncedCount: 0,
        durationMs: Date.now() - startTime,
        skipped: true,
        reason: 'not_modified',
      };
    }

    console.log(`⬇️ [BulkSync] Descargando Rulings desde: ${rulingsDataInfo.download_uri}`);
    const rulingsResponse = await fetch(rulingsDataInfo.download_uri, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });

    if (!rulingsResponse.ok) {
      throw new Error(`Error al descargar archivo bulk rulings: ${rulingsResponse.statusText}`);
    }

    const rawRulings = (await rulingsResponse.json()) as any[];
    const totalToProcess = limit ? Math.min(rawRulings.length, limit) : rawRulings.length;
    console.log(`📦 [BulkSync] Procesando ${totalToProcess} dictámenes oficiales de Scryfall...`);

    for (let i = 0; i < totalToProcess; i++) {
      const r = rawRulings[i];
      if (!r.oracle_id || !r.comment) continue;

      const rulingItem = {
        publishedAt: r.published_at || new Date().toISOString().slice(0, 10),
        source: r.source || 'wotc',
        comment: r.comment,
      };

      // Inserción en memoria local
      const existing = this.rulingsByOracleId.get(r.oracle_id) || [];
      existing.push(rulingItem);
      this.rulingsByOracleId.set(r.oracle_id, existing);

      // Inserción en Prisma PostgreSQL si está activo
      try {
        await (prisma as any).ruling?.create({
          data: {
            oracleId: r.oracle_id,
            source: rulingItem.source,
            publishedAt: new Date(rulingItem.publishedAt),
            comment: rulingItem.comment,
          },
        });
      } catch {
        // Fallback tolerante en memoria
      }
      syncedCount++;
    }

    this.lastRulingsUpdatedAt = rulingsDataInfo.updated_at;
    this.lastRulingsSyncTime = new Date();
    const durationMs = Date.now() - startTime;
    console.log(
      `✅ [BulkSync] Sincronización de dictámenes completada: ${syncedCount} dictámenes en ${durationMs}ms`,
    );

    return { syncedCount, durationMs, skipped: false };
  }

  /**
   * Stops the automated nightly cron job
   */
  public stopNightlyCron(): void {
    if (this.cronTimer) {
      clearTimeout(this.cronTimer);
      this.cronTimer = null;
    }
    this.isNightlyCronActive = false;
    console.log('⏹️ [BulkSync Cron] Tarea cron nocturna detenida.');
  }

  public isCronActive(): boolean {
    return this.isNightlyCronActive;
  }

  public getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastRulingsSyncTime: this.lastRulingsSyncTime,
      lastRulingsUpdatedAt: this.lastRulingsUpdatedAt,
      nightlyCronActive: this.isNightlyCronActive,
    };
  }
}

export const bulkSyncService = new BulkSyncService();
