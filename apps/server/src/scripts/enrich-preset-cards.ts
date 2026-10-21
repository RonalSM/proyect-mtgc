import fs from 'node:fs';
import path from 'node:path';
import { connectDatabase, disconnectDatabase, prisma } from '../db.js';
import { parseDecklist } from '@mtgc/shared';

async function main() {
  console.log('🚀 [enrich-preset-cards] Iniciando enriquecimiento de metadatos reales de Scryfall...');
  await connectDatabase();

  const presetDir = fs.existsSync(path.resolve('prisma/seed/preset-decks'))
    ? path.resolve('prisma/seed/preset-decks')
    : path.resolve('apps/server/prisma/seed/preset-decks');

  const files = fs.readdirSync(presetDir).filter(f => f.endsWith('.txt'));
  const cardNamesSet = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(presetDir, file), 'utf-8');
    const parsed = parseDecklist(content);
    for (const e of [...parsed.commanderEntries, ...parsed.maindeckEntries]) {
      cardNamesSet.add(e.cardName.trim());
    }
  }

  const allNames = Array.from(cardNamesSet);
  console.log(`📋 Encontradas ${allNames.length} cartas únicas en los 8 mazos listos.`);

  // Buscar cartas que necesiten set o artist
  const cardsToEnrich: string[] = [];
  for (const name of allNames) {
    const dbCard = await prisma.card.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true, set: true, artist: true },
    });
    if (dbCard && (!dbCard.set || !dbCard.artist)) {
      cardsToEnrich.push(name);
    }
  }

  console.log(`🔍 Cartas a enriquecer con datos reales de Scryfall: ${cardsToEnrich.length}`);

  if (cardsToEnrich.length === 0) {
    console.log('✅ Todas las cartas de los mazos listos ya cuentan con metadatos completos.');
    await disconnectDatabase(true);
    return;
  }

  const batchSize = 75;
  let updatedCount = 0;

  for (let i = 0; i < cardsToEnrich.length; i += batchSize) {
    const chunk = cardsToEnrich.slice(i, i + batchSize);
    console.log(`⬇️ Consultando lote ${Math.floor(i / batchSize) + 1} (${chunk.length} cartas)...`);

    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MTGCommanderVirtualTable/1.0.0 (admin@mtgc.local)',
        },
        body: JSON.stringify({
          identifiers: chunk.map(name => ({ name })),
        }),
      });

      if (!res.ok) {
        console.warn(`⚠️ Error HTTP ${res.status} al consultar colección`);
        continue;
      }

      const data: any = await res.json();
      const scryfallCards = data.data || [];

      for (const sc of scryfallCards) {
        const primaryFace = sc.card_faces?.[0];
        const artist = sc.artist || primaryFace?.artist || undefined;
        const loyalty = sc.loyalty || primaryFace?.loyalty || undefined;

        const updateRes = await prisma.card.updateMany({
          where: { name: { equals: sc.name, mode: 'insensitive' } },
          data: {
            set: sc.set || undefined,
            setName: sc.set_name || undefined,
            rarity: sc.rarity || undefined,
            collectorNumber: sc.collector_number || undefined,
            artist,
            loyalty,
          },
        });

        if (updateRes.count > 0) {
          updatedCount += updateRes.count;
        }
      }

      // Respetar límite de tasa de Scryfall (100ms)
      await new Promise(r => setTimeout(r, 120));
    } catch (err: any) {
      console.error('❌ Error procesando lote:', err?.message || err);
    }
  }

  console.log(`\n🎉 Enriquecimiento completado: ${updatedCount} cartas actualizadas con metadatos reales.`);
  await disconnectDatabase(true);
}

main().catch(err => {
  console.error('❌ Error en script de enriquecimiento:', err);
  process.exit(1);
});
