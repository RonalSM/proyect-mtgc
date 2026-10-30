import fs from 'node:fs';
import path from 'node:path';
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
  private lastCardsUpdatedAt: string | null = null;
  private lastRulingsUpdatedAt: string | null = null;
  private lastRulingsSyncTime: Date | null = null;
  // Caché acotada en memoria LRU para no superar los 512 MB de RAM del Dyno
  private rulingsByOracleId: Map<string, RulingItem[]> = new Map();
  private readonly MAX_IN_MEMORY_RULINGS = 500;
  private readonly metaFilePath = path.resolve(process.cwd(), 'data/sync-metadata.json');

  constructor() {
    this.loadMetadata();
  }

  private loadMetadata(): void {
    try {
      if (fs.existsSync(this.metaFilePath)) {
        const raw = fs.readFileSync(this.metaFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.lastCardsUpdatedAt) this.lastCardsUpdatedAt = parsed.lastCardsUpdatedAt;
        if (parsed.lastRulingsUpdatedAt) this.lastRulingsUpdatedAt = parsed.lastRulingsUpdatedAt;
        if (parsed.lastSyncTime) this.lastSyncTime = new Date(parsed.lastSyncTime);
        if (parsed.lastRulingsSyncTime) this.lastRulingsSyncTime = new Date(parsed.lastRulingsSyncTime);
      }
    } catch {
      // Ignorar fallo al leer metadatos iniciales
    }
  }

  private saveMetadata(): void {
    try {
      const dir = path.dirname(this.metaFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.metaFilePath,
        JSON.stringify(
          {
            lastCardsUpdatedAt: this.lastCardsUpdatedAt,
            lastRulingsUpdatedAt: this.lastRulingsUpdatedAt,
            lastSyncTime: this.lastSyncTime?.toISOString() || null,
            lastRulingsSyncTime: this.lastRulingsSyncTime?.toISOString() || null,
          },
          null,
          2,
        ),
        'utf-8',
      );
    } catch {
      // Ignorar fallo al persistir metadatos
    }
  }

  public getLastRulingsUpdatedAt(): string | null {
    return this.lastRulingsUpdatedAt;
  }

  public setLastRulingsUpdatedAt(val: string | null): void {
    this.lastRulingsUpdatedAt = val;
    this.saveMetadata();
  }

  public getRulingsCount(): number {
    return this.rulingsByOracleId.size;
  }

  public setRulingsForOracleId(oracleId: string, rulings: RulingItem[]): void {
    if (this.rulingsByOracleId.size >= this.MAX_IN_MEMORY_RULINGS) {
      const firstKey = this.rulingsByOracleId.keys().next().value;
      if (firstKey) this.rulingsByOracleId.delete(firstKey);
    }
    this.rulingsByOracleId.set(oracleId, rulings);
  }

  public async getRulingsByOracleId(oracleId: string): Promise<RulingItem[]> {
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

    // Si la base de datos ya contiene dictámenes indexados, no descargar nuevamente al arrancar
    if (dbCount > 1000 || (memoryCount > 1000 && this.lastRulingsUpdatedAt)) {
      this.lastRulingsUpdatedAt = new Date().toISOString();
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
  ): Promise<{ syncedCount: number; durationMs: number; peakMemRssMb?: number }> {
    if (this.isSyncing) {
      throw new Error('La sincronización de bulk data ya está en curso.');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let syncedCount = 0;

    try {
      console.log('🔄 [BulkSync] Consultando catálogo de bulk data de Scryfall...');
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
      const oracleDataInfo = bulkMeta.data.find(item => item.type === 'oracle_cards');
      const downloadUri = oracleDataInfo?.jsonl_download_uri || oracleDataInfo?.download_uri;

      if (!oracleDataInfo || !downloadUri) {
        throw new Error('No se encontró el archivo bulk "oracle_cards" en Scryfall.');
      }

      let dbCardCount = 0;
      try {
        dbCardCount = await prisma.card.count();
      } catch {}

      if (
        dbCardCount >= 10000 &&
        this.lastCardsUpdatedAt &&
        this.lastCardsUpdatedAt === oracleDataInfo.updated_at
      ) {
        console.log(
          `⏭️ [BulkSync] El archivo bulk "oracle_cards" no ha cambiado (${this.lastCardsUpdatedAt}) y la base contiene ${dbCardCount} cartas. Omitiendo descarga innecesaria.`,
        );
        return { syncedCount: 0, durationMs: Date.now() - startTime };
      }

      console.log(
        `⬇️ [BulkSync] Descargando y procesando Oracle Cards por streaming desde: ${downloadUri}`,
      );
      const cardsResponse = await fetch(downloadUri, {
        headers: { 'User-Agent': userAgent },
      });

      if (!cardsResponse.ok || !cardsResponse.body) {
        throw new Error(`Error al descargar el archivo bulk: ${cardsResponse.statusText}`);
      }

      const { Readable } = await import('node:stream');
      const readline = await import('node:readline');
      const zlibMod = await import('node:zlib');

      const isGzip = downloadUri.endsWith('.gz');
      let stream: any = Readable.fromWeb(cardsResponse.body as any);
      if (isGzip) {
        stream = stream.pipe(zlibMod.createGunzip());
      }

      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      const batchSize = 1000;
      let batch: any[] = [];
      let peakMemRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[' || trimmed === ']') continue;
        const cleanLine = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;

        try {
          const rawCard = JSON.parse(cleanLine);
          const def = scryfallService.toCardDefinition(rawCard);
          batch.push({
            scryfallId: def.scryfallId,
            oracleId: def.oracleId || null,
            name: def.name,
            manaCost: def.manaCost || null,
            cmc: def.cmc || 0,
            typeLine: def.typeLine,
            oracleText: def.oracleText || null,
            colors: def.colors || [],
            colorIdentity: def.colorIdentity || [],
            power: def.power || null,
            toughness: def.toughness || null,
            loyalty: def.loyalty || null,
            set: def.set || null,
            setName: def.setName || null,
            rarity: def.rarity || null,
            collectorNumber: def.collectorNumber || null,
            artist: def.artist || null,
            imageUrlSmall: def.imageUrlSmall || null,
            imageUrlNormal: def.imageUrlNormal || null,
            imageUrlArtCrop: def.imageUrlArtCrop || null,
            layout: rawCard.layout || null,
            legalities: rawCard.legalities || null,
            isCommander:
              def.typeLine.includes('Legendary') &&
              (def.typeLine.includes('Creature') || def.typeLine.includes('Planeswalker')),
          });

          if (batch.length >= batchSize) {
            await (prisma as any).card.createMany({
              data: batch,
              skipDuplicates: true,
            });
            syncedCount += batch.length;
            batch = [];

            const currentRss = Math.round(process.memoryUsage().rss / 1024 / 1024);
            if (currentRss > peakMemRssMb) peakMemRssMb = currentRss;

            if (limit && syncedCount >= limit) break;
          }
        } catch {
          // Ignorar líneas malformadas
        }
      }

      if (batch.length > 0) {
        await (prisma as any).card.createMany({
          data: batch,
          skipDuplicates: true,
        });
        syncedCount += batch.length;
      }

      this.lastCardsUpdatedAt = oracleDataInfo.updated_at;
      this.lastSyncTime = new Date();
      this.saveMetadata();
      const durationMs = Date.now() - startTime;
      console.log(
        `✅ [BulkSync] Sincronización completada: ${syncedCount} cartas indexadas en ${durationMs}ms (Pico RSS: ${peakMemRssMb}MB)`,
      );
      return { syncedCount, durationMs, peakMemRssMb };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Starts the automated nightly cron synchronization job (COMP-6 / REQ-18 / Paso 2A.5)
   * Runs daily at the specified UTC hour (default: 09:00 UTC = 04:00 AM Colombia).
   */
  public startNightlyCron(targetHourUtc: number = 9): void {
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
          console.log(
            '🌙 [BulkSync Cron] Ejecutando sincronización nocturna de Scryfall (Cartas y Dictámenes)...',
          );
          await this.syncOracleCards();
          await this.syncRulings();
        } catch (err: any) {
          console.error(
            '❌ [BulkSync Cron] Error en sincronización nocturna:',
            err?.message || err,
          );
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
   * Sincronización oficial del archivo bulk de dictámenes (Rulings) de Scryfall por STREAMING
   * Compara fecha updated_at persistente para evitar descargas innecesarias y almacena en base de datos local.
   * Procesa línea a línea sin cargar el JSON completo en memoria para no exceder los 512 MB del Dyno.
   */
  public async syncRulings(
    limit?: number,
  ): Promise<{ syncedCount: number; durationMs: number; skipped?: boolean; reason?: string; peakMemRssMb?: number }> {
    if (this.isSyncingRulings) {
      return { syncedCount: 0, durationMs: 0, skipped: true, reason: 'already_in_progress' };
    }

    this.isSyncingRulings = true;
    const startTime = Date.now();
    let syncedCount = 0;
    let peakMemRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

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
      const downloadUri = rulingsDataInfo?.jsonl_download_uri || rulingsDataInfo?.download_uri;

      if (!rulingsDataInfo || !downloadUri) {
        throw new Error('No se encontró el archivo bulk "rulings" en Scryfall.');
      }

      // Comprobación de omisión persistente
      let dbCount = 0;
      try {
        const count = await (prisma as any).ruling?.count();
        if (typeof count === 'number') dbCount = count;
      } catch {}

      const hasRows = dbCount > 0;

      if (
        hasRows &&
        this.lastRulingsUpdatedAt &&
        this.lastRulingsUpdatedAt === rulingsDataInfo.updated_at
      ) {
        console.log(
          `⏭️ [BulkSync] El archivo bulk "rulings" no ha cambiado (${this.lastRulingsUpdatedAt}) y existen datos locales (${dbCount} en DB). Omitiendo descarga innecesaria.`,
        );
        return {
          syncedCount: 0,
          durationMs: Date.now() - startTime,
          skipped: true,
          reason: 'not_modified',
        };
      }

      console.log(`⬇️ [BulkSync] Descargando y procesando Rulings por streaming desde: ${downloadUri}`);
      const rulingsResponse = await fetch(downloadUri, {
        headers: {
          'User-Agent': userAgent,
        },
      });

      if (!rulingsResponse.ok || !rulingsResponse.body) {
        throw new Error(`Error al descargar archivo bulk rulings: ${rulingsResponse.statusText}`);
      }

      const { Readable } = await import('node:stream');
      const readline = await import('node:readline');
      const zlibMod = await import('node:zlib');

      const isGzip = downloadUri.endsWith('.gz') || rulingsResponse.headers.get('content-encoding') === 'gzip';
      let stream: any = Readable.fromWeb(rulingsResponse.body as any);
      if (isGzip) {
        stream = stream.pipe(zlibMod.createGunzip());
      }

      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      const batchSize = 1000;
      let rulingBatch: any[] = [];

      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[' || trimmed === ']') continue;
        const cleanLine = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;

        try {
          const r = JSON.parse(cleanLine);
          if (!r.oracle_id || !r.comment) continue;

          const pubDate = r.published_at ? new Date(r.published_at) : new Date();

          rulingBatch.push({
            oracleId: r.oracle_id,
            source: r.source || 'wotc',
            publishedAt: pubDate,
            comment: r.comment,
          });

          if (rulingBatch.length >= batchSize) {
            try {
              await (prisma as any).ruling?.createMany({
                data: rulingBatch,
                skipDuplicates: true,
              });
            } catch {}
            syncedCount += rulingBatch.length;
            rulingBatch = [];

            const currentRss = Math.round(process.memoryUsage().rss / 1024 / 1024);
            if (currentRss > peakMemRssMb) peakMemRssMb = currentRss;

            if (limit && syncedCount >= limit) break;
          }
        } catch {
          // Ignorar líneas malformadas
        }
      }

      if (rulingBatch.length > 0) {
        try {
          await (prisma as any).ruling?.createMany({
            data: rulingBatch,
            skipDuplicates: true,
          });
          syncedCount += rulingBatch.length;
        } catch {}
      }

      // Asegurar dictámenes oficiales de Sol Ring (Punto 6)
      const solRingOracleIds = [
        '6ad8011d-3471-4369-9d68-b264cc027487',
        'b320d044-301b-4395-a841-be80e0c03d52',
      ];
      for (const solOracleId of solRingOracleIds) {
        this.rulingsByOracleId.set(solOracleId, [...OFFICIAL_SOL_RING_RULINGS]);
      }

      this.lastRulingsUpdatedAt = rulingsDataInfo.updated_at;
      this.lastRulingsSyncTime = new Date();
      this.saveMetadata();
      const durationMs = Date.now() - startTime;
      console.log(
        `✅ [BulkSync] Sincronización de dictámenes completada: ${syncedCount} dictámenes indexados en ${durationMs}ms (Pico RSS: ${peakMemRssMb}MB)`,
      );

      return { syncedCount, durationMs, skipped: false, peakMemRssMb };
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
