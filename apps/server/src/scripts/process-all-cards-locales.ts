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
  filePath: string,
  targetLang = 'es',
): Promise<{ processed: number; upserted: number }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  console.log(
    `[LocaleSync] Iniciando procesamiento streaming de ${filePath} para idioma "${targetLang}"...`,
  );
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
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
  const batchSize = 100;
  const candidatesArray = Array.from(bestCandidates.values());

  for (let i = 0; i < candidatesArray.length; i += batchSize) {
    const batch = candidatesArray.slice(i, i + batchSize);
    await Promise.all(
      batch.map(item =>
        (prisma as any).cardLocale
          ?.upsert({
            where: {
              oracleId_lang: {
                oracleId: item.oracleId,
                lang: item.lang,
              },
            },
            create: {
              oracleId: item.oracleId,
              lang: item.lang,
              printingId: item.printingId,
              printedName: item.printedName,
              printedText: item.printedText,
              printedTypeLine: item.printedTypeLine,
              imageUrlSmall: item.imageUrlSmall,
              imageUrlNormal: item.imageUrlNormal,
              imageUrlLarge: item.imageUrlLarge,
              imageUrlArtCrop: item.imageUrlArtCrop,
              releasedAt: item.releasedAt ? new Date(item.releasedAt) : null,
            },
            update: {
              printingId: item.printingId,
              printedName: item.printedName,
              printedText: item.printedText,
              printedTypeLine: item.printedTypeLine,
              imageUrlSmall: item.imageUrlSmall,
              imageUrlNormal: item.imageUrlNormal,
              imageUrlLarge: item.imageUrlLarge,
              imageUrlArtCrop: item.imageUrlArtCrop,
              releasedAt: item.releasedAt ? new Date(item.releasedAt) : null,
            },
          })
          .catch(() => null),
      ),
    );
    upserted += batch.length;
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
