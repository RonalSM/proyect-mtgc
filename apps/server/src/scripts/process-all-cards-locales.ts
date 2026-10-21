import fs from 'node:fs';
import readline from 'node:readline';
import { prisma } from '../db.js';

interface RawScryfallCard {
  id: string;
  oracle_id?: string;
  lang: string;
  printed_name?: string;
  name: string;
  printed_text?: string;
  oracle_text?: string;
  printed_type_line?: string;
  type_line?: string;
  released_at?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    art_crop?: string;
  };
  card_faces?: Array<{
    name: string;
    printed_name?: string;
    printed_text?: string;
    oracle_text?: string;
    printed_type_line?: string;
    type_line?: string;
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
      art_crop?: string;
    };
  }>;
}

interface LocaleCandidate {
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
  releasedAt?: string;
  hasImage: boolean;
}

/**
 * Offline streaming processor for Scryfall "All Cards" bulk export.
 * Filters lang="es" prints, picks the latest printing with image per oracle_id,
 * and saves to CardLocale table.
 *
 * Usage:
 *   npx tsx src/scripts/process-all-cards-locales.ts --file path/to/all-cards.json
 */
export async function processAllCardsLocales(
  filePathOrUrl?: string,
  targetLang = 'es',
): Promise<{ processed: number; upserted: number }> {
  let stream: any;

  if (filePathOrUrl && fs.existsSync(filePathOrUrl)) {
    console.log(
      `[LocaleSync] Iniciando procesamiento streaming de archivo local ${filePathOrUrl} para idioma "${targetLang}"...`,
    );
    stream = fs.createReadStream(filePathOrUrl, { encoding: 'utf-8' });
  } else {
    console.log(
      `[LocaleSync] Consultando catálogo de Scryfall para streaming de All Cards ("${targetLang}")...`,
    );
    const userAgent =
      process.env.SCRYFALL_USER_AGENT || 'MTGCommanderVirtualTable/1.0.0 (admin@mtgc.local)';
    const metaRes = await fetch('https://api.scryfall.com/bulk-data', {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
    });
    if (!metaRes.ok) throw new Error(`Error en bulk-data: ${metaRes.statusText}`);
    const meta = (await metaRes.json()) as any;
    const allCardsInfo = meta.data.find((d: any) => d.type === 'all_cards');
    const downloadUri = allCardsInfo?.jsonl_download_uri || allCardsInfo?.download_uri;
    if (!downloadUri) throw new Error('No se encontró archivo bulk all_cards en Scryfall');

    console.log(`[LocaleSync] Descargando y procesando streaming desde: ${downloadUri}`);
    const response = await fetch(downloadUri, { headers: { 'User-Agent': userAgent } });
    if (!response.ok || !response.body) {
      throw new Error(`Error descargando all_cards: ${response.statusText}`);
    }

    const { Readable } = await import('node:stream');
    const zlib = await import('node:zlib');
    stream = Readable.fromWeb(response.body as any);
    if (downloadUri.endsWith('.gz')) {
      stream = stream.pipe(zlib.createGunzip());
    }
  }

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  const bestCandidates = new Map<string, LocaleCandidate>();
  let totalLines = 0;
  let spanishCount = 0;
  let currentBuffer = '';

  for await (const line of rl) {
    totalLines++;
    const trimmed = line.trim();
    if (trimmed === '[' || trimmed === ']') continue;

    const cleanLine = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
    currentBuffer += cleanLine;

    // Try parsing as single JSON card object
    try {
      const card = JSON.parse(currentBuffer) as RawScryfallCard;
      currentBuffer = '';

      if (card.lang === targetLang && card.oracle_id) {
        spanishCount++;
        const normalImg = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
        const smallImg = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
        const largeImg = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large;
        const artCropImg = card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop;
        const hasImg = Boolean(normalImg || smallImg);

        const candidate: LocaleCandidate = {
          oracleId: card.oracle_id,
          lang: targetLang,
          printingId: card.id,
          printedName: card.printed_name || card.card_faces?.[0]?.printed_name || card.name,
          printedText: card.printed_text || card.card_faces?.[0]?.printed_text || card.oracle_text,
          printedTypeLine:
            card.printed_type_line || card.card_faces?.[0]?.printed_type_line || card.type_line,
          imageUrlSmall: smallImg,
          imageUrlNormal: normalImg,
          imageUrlLarge: largeImg,
          imageUrlArtCrop: artCropImg,
          releasedAt: card.released_at,
          hasImage: hasImg,
        };

        const existing = bestCandidates.get(card.oracle_id);
        if (!existing) {
          bestCandidates.set(card.oracle_id, candidate);
        } else {
          // Rule: Prioritize prints with images, then latest release date
          if (!existing.hasImage && candidate.hasImage) {
            bestCandidates.set(card.oracle_id, candidate);
          } else if (
            candidate.hasImage === existing.hasImage &&
            candidate.releasedAt &&
            existing.releasedAt &&
            candidate.releasedAt > existing.releasedAt
          ) {
            bestCandidates.set(card.oracle_id, candidate);
          }
        }
      }
    } catch {
      // Line is not a complete JSON object yet; accumulate until next line
      continue;
    }

    if (totalLines % 100000 === 0) {
      console.log(
        `[LocaleSync] Líneas leídas: ${totalLines}, impresiones ${targetLang} encontradas: ${spanishCount}, oracles únicos: ${bestCandidates.size}`,
      );
    }
  }

  console.log(
    `[LocaleSync] Lectura completa. Guardando ${bestCandidates.size} registros en CardLocale...`,
  );

  let upserted = 0;
  const batchSize = 1000;
  const candidatesArray = Array.from(bestCandidates.values());

  for (let i = 0; i < candidatesArray.length; i += batchSize) {
    const batch = candidatesArray.slice(i, i + batchSize).map(item => ({
      oracleId: item.oracleId,
      lang: item.lang,
      printingId: item.printingId,
      printedName: item.printedName,
      printedText: item.printedText || null,
      printedTypeLine: item.printedTypeLine || null,
      imageUrlSmall: item.imageUrlSmall || null,
      imageUrlNormal: item.imageUrlNormal || null,
      imageUrlLarge: item.imageUrlLarge || null,
      imageUrlArtCrop: item.imageUrlArtCrop || null,
      releasedAt: item.releasedAt ? new Date(item.releasedAt) : null,
    }));

    try {
      await (prisma as any).cardLocale?.createMany({
        data: batch,
        skipDuplicates: true,
      });
      upserted += batch.length;
    } catch (err: any) {
      console.warn(`[LocaleSync] Error insertando lote:`, err?.message || err);
    }
  }

  console.log(`[LocaleSync] Completado exitosamente: ${upserted} registros guardados.`);
  return { processed: spanishCount, upserted };
}

// Standalone execution if called directly
const args = process.argv.slice(2);
const fileArgIndex = args.indexOf('--file');
if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
  const filePath = args[fileArgIndex + 1]!;
  processAllCardsLocales(filePath)
    .then(res => {
      console.log('Resultado:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error procesando archivo:', err);
      process.exit(1);
    });
}
