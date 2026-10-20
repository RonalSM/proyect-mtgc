import zlib from 'node:zlib';
import { prisma } from '../db.js';
import { scryfallService } from './scryfall.service.js';

interface BulkDataResponse {
  data: Array<{
    id: string;
    type: string;
    updated_at: string;
    download_uri?: string;
    jsonl_download_uri?: string;
    content_type?: string;
  }>;
}

export interface RulingItem {
  publishedAt: string;
  source: string;
  comment: string;
}

// Dictámenes oficiales de WotC para Sol Ring (Punto 6)
export const OFFICIAL_SOL_RING_RULINGS: RulingItem[] = [
  {
    publishedAt: '2023-09-01',
    source: 'wotc',
    comment: '{T}: Add {C}{C}. Mana abilities do not use the stack and cannot be responded to.',
  },
  {
    publishedAt: '2021-02-05',
    source: 'wotc',
    comment: 'Sol Ring is legal in Commander, Vintage, and Oathbreaker formats.',
  },
];

export class BulkSyncService {
  private isSyncing = false;
  private isSyncingRulings = false;
  private lastSyncTime: Date | null = null;
  private cronTimer: NodeJS.Timeout | null = null;
  private isNightlyCronActive = false;
  private lastRulingsUpdatedAt: string | null = null;
  private lastRulingsSyncTime: Date | null = null;
  private rulingsByOracleId: Map<string, RulingItem[]> = new Map();

  public getLastRulingsUpdatedAt(): string | null {
    return this.lastRulingsUpdatedAt;
  }

  public setLastRulingsUpdatedAt(val: string | null): void {
    this.lastRulingsUpdatedAt = val;
  }

  public getRulingsCount(): number {
    return this.rulingsByOracleId.size;
  }

  public setRulingsForOracleId(
    oracleId: string,
    rulings: RulingItem[],
  ): void {
    this.rulingsByOracleId.set(oracleId, rulings);
  }

  public async getRulingsByOracleId(
    oracleId: string,
  ): Promise<RulingItem[]> {
    // Si la caché en memoria y la base de datos están vacías, sincronizar de inmediato (Punto 6)
    if (this.rulingsByOracleId.size === 0) {
      await this.syncRulingsIfEmpty().catch(() => {});
    }

    const cached = this.rulingsByOracleId.get(oracleId);
    if (cached) return cached;

    try {
      const dbRulings = await (prisma as any).ruling?.findMany({
        where: { oracleId },
        orderBy: { publishedAt: 'desc' },
      });
      if (dbRulings && dbRulings.length > 0) {
        const mapped: RulingItem[] = dbRulings.map((r: any) => ({
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
   * Sincroniza al arrancar si la tabla está vacía o desactualizada (Punto 6).
   * Omite solo si hay filas/datos locales y la fecha coincide.
   */
  public async syncRulingsIfEmpty(): Promise<{
    syncedCount: number;
    durationMs: number;
    skipped?: boolean;
    reason?: string;
  }> {
    let dbCount = 0;
    try {
      const count = await (prisma as any).ruling?.count();
      if (typeof count === 'number') {
        dbCount = count;
      }
    } catch {
      // DB no disponible
    }

    const memoryCount = this.rulingsByOracleId.size;
    const hasData = dbCount > 0 || memoryCount > 0;

    // Si ya hay datos y ya tenemos la marca de actualización previa, no hace falta descargar
    if (hasData && this.lastRulingsUpdatedAt) {
      return {
        syncedCount: dbCount || memoryCount,
        durationMs: 0,
        skipped: true,
        reason: 'already_populated',
      };
    }

    console.log('🔄 [BulkSync] Verificando dictámenes al inicio (vacío o desactualizado)...');
    return await this.syncRulings();
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
   * Sincronización oficial del archivo bulk de dictámenes (Rulings) de Scryfall (Punto 5 / 6 / REQ-7.28)
   * Compara fecha updated_at para evitar descargas innecesarias y almacena en base de datos local / memoria.
   * Omite descarga ÚNICAMENTE si existen filas/datos locales y la fecha coincide con el catálogo.
   */
  public async syncRulings(
    limit?: number,
  ): Promise<{ syncedCount: number; durationMs: number; skipped?: boolean; reason?: string }> {
    if (this.isSyncingRulings) {
      return { syncedCount: 0, durationMs: 0, skipped: true, reason: 'already_in_progress' };
    }

    this.isSyncingRulings = true;
    const startTime = Date.now();
    let syncedCount = 0;

    try {
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
      const downloadUri = rulingsDataInfo?.download_uri || rulingsDataInfo?.jsonl_download_uri;

      if (!rulingsDataInfo || !downloadUri) {
        throw new Error('No se encontró el archivo bulk "rulings" en Scryfall.');
      }

      // Comprobación de omisión: SOLO si hay filas/datos locales y la fecha coincide (Punto 6)
      let dbCount = 0;
      try {
        const count = await (prisma as any).ruling?.count();
        if (typeof count === 'number') dbCount = count;
      } catch {}

      const hasRows = dbCount > 0 || this.rulingsByOracleId.size > 0;

      if (hasRows && this.lastRulingsUpdatedAt && this.lastRulingsUpdatedAt === rulingsDataInfo.updated_at) {
        console.log(
          `⏭️ [BulkSync] El archivo bulk "rulings" no ha cambiado (${this.lastRulingsUpdatedAt}) y existen datos locales (${dbCount} en DB, ${this.rulingsByOracleId.size} en memoria). Omitiendo descarga innecesaria.`,
        );
        return {
          syncedCount: 0,
          durationMs: Date.now() - startTime,
          skipped: true,
          reason: 'not_modified',
        };
      }

      console.log(`⬇️ [BulkSync] Descargando Rulings desde: ${downloadUri}`);
      const rulingsResponse = await fetch(downloadUri, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      });

      if (!rulingsResponse.ok) {
        throw new Error(`Error al descargar archivo bulk rulings: ${rulingsResponse.statusText}`);
      }

      const arrayBuf = await rulingsResponse.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      let text: string;
      if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        text = zlib.gunzipSync(buf).toString('utf-8');
      } else {
        text = buf.toString('utf-8');
      }

      let rawRulings: any[] = [];
      const trimmedText = text.trim();
      if (trimmedText.startsWith('[')) {
        rawRulings = JSON.parse(trimmedText);
      } else {
        const lines = trimmedText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              rawRulings.push(JSON.parse(trimmed));
            } catch {
              // omitir línea malformada
            }
          }
        }
      }

      const totalToProcess = limit ? Math.min(rawRulings.length, limit) : rawRulings.length;
      console.log(`📦 [BulkSync] Procesando ${totalToProcess} dictámenes oficiales de Scryfall...`);

      for (let i = 0; i < totalToProcess; i++) {
        const r = rawRulings[i];
        if (!r.oracle_id || !r.comment) continue;

        const rulingItem: RulingItem = {
          publishedAt: r.published_at || new Date().toISOString().slice(0, 10),
          source: r.source || 'wotc',
          comment: r.comment,
        };

        const existing = this.rulingsByOracleId.get(r.oracle_id) || [];
        existing.push(rulingItem);
        this.rulingsByOracleId.set(r.oracle_id, existing);
        syncedCount++;
      }

      // Asegurar dictámenes oficiales de Sol Ring (Punto 6)
      const solRingOracleIds = [
        '6ad8011d-3471-4369-9d68-b264cc027487',
        'b320d044-301b-4395-a841-be80e0c03d52',
      ];
      for (const solOracleId of solRingOracleIds) {
        const existingSol = this.rulingsByOracleId.get(solOracleId) || [];
        if (existingSol.length === 0) {
          this.rulingsByOracleId.set(solOracleId, [...OFFICIAL_SOL_RING_RULINGS]);
        }
      }

      this.lastRulingsUpdatedAt = rulingsDataInfo.updated_at;
      this.lastRulingsSyncTime = new Date();
      const durationMs = Date.now() - startTime;
      console.log(
        `✅ [BulkSync] Sincronización de dictámenes completada: ${syncedCount} dictámenes indexados en ${durationMs}ms`,
      );

      return { syncedCount, durationMs, skipped: false };
    } finally {
      this.isSyncingRulings = false;
    }
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
