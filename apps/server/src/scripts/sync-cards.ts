import { connectDatabase, disconnectDatabase, prisma } from '../db.js';
import { bulkSyncService } from '../services/bulk-sync.service.js';
import { processAllCardsLocales } from './process-all-cards-locales.js';

async function main() {
  console.log(
    '🚀 [sync:cards] Iniciando sincronización integral de cartas Scryfall en base local...',
  );
  await connectDatabase();

  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  const localFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : undefined;
  const skipLocales = args.includes('--skip-locales');

  // 1. Sincronizar Oracle Cards (decenas de miles de cartas reales)
  console.log('\n--- 1. Sincronización de Oracle Cards ---');
  const oracleResult = await bulkSyncService.syncOracleCards();
  console.log(
    `✅ Oracle Cards: ${oracleResult.syncedCount} cartas sincronizadas en ${oracleResult.durationMs}ms.`,
  );

  // 2. Sincronizar Rulings (79,000+ dictámenes oficiales)
  console.log('\n--- 2. Sincronización de Rulings ---');
  const rulingsResult = await bulkSyncService.syncRulings();
  console.log(
    `✅ Rulings: ${rulingsResult.syncedCount} dictámenes indexados en ${rulingsResult.durationMs}ms.`,
  );

  // 3. Sincronizar CardLocale (Español)
  if (!skipLocales) {
    console.log('\n--- 3. Sincronización de CardLocales en Español ---');
    try {
      await processAllCardsLocales(localFile, 'es');
    } catch (err: any) {
      console.warn('⚠️ Nota sobre All Cards locales:', err?.message || err);
    }
  }

  // 4. Verificación y telemetría final de la base de datos
  const finalCards = await prisma.card.count();
  const finalTokens = await prisma.card.count({
    where: {
      OR: [{ layout: 'token' }, { typeLine: { contains: 'Token', mode: 'insensitive' } }],
    },
  });
  const finalRulings = await prisma.ruling.count();
  const finalLocales = await prisma.cardLocale.count();

  console.log('\n========================================');
  console.log('📊 ESTADO FINAL DE LA BASE DE DATOS LOCAL:');
  console.log(`- Cartas (cards): ${finalCards}`);
  console.log(`- Fichas (tokens): ${finalTokens}`);
  console.log(`- Dictámenes (rulings): ${finalRulings}`);
  console.log(`- Locales ES (card_locales): ${finalLocales}`);
  console.log('========================================\n');

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error en sync:cards:', err);
  process.exit(1);
});
