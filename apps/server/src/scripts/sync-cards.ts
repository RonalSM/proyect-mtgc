import { connectDatabase, disconnectDatabase, prisma } from '../db.js';
import { bulkSyncService } from '../services/bulk-sync.service.js';
import { roomManager } from '../game/room-manager.js';
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
  const force = args.includes('--force');
  const test100Rooms = args.includes('--test-100-rooms');

  let peakRss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  let peakHeap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  const memMonitor = setInterval(() => {
    const mem = process.memoryUsage();
    const curRss = Math.round(mem.rss / 1024 / 1024);
    const curHeap = Math.round(mem.heapUsed / 1024 / 1024);
    if (curRss > peakRss) peakRss = curRss;
    if (curHeap > peakHeap) peakHeap = curHeap;
  }, 1000);
  if (memMonitor.unref) memMonitor.unref();

  // Si se solicita, crear 100 salas activas para medir consumo concurrente de heap (Punto A4.1)
  if (test100Rooms) {
    console.log('\n🏠 [Test A4.1] Creando 100 salas activas concurrentes en memoria...');
    for (let i = 1; i <= 100; i++) {
      const session = roomManager.createRoom({
        name: `Mesa Concurrente #${i}`,
        hostName: `Host_${i}`,
        hostId: `host_${i}`,
        maxPlayers: 4,
        startingLife: 40,
      });
      const code = session.state.code;
      for (let p = 2; p <= 4; p++) {
        roomManager.joinRoom(code, {
          playerId: `p_${i}_${p}`,
          playerName: `Jugador ${p} Mesa ${i}`,
        });
      }
    }
    const mem100 = process.memoryUsage();
    console.log(
      `✅ 100 salas creadas en memoria. Heap con 100 salas: ${Math.round(mem100.heapUsed / 1024 / 1024)} MB | RSS: ${Math.round(mem100.rss / 1024 / 1024)} MB`,
    );
  }

  // 1. Sincronizar Oracle Cards (decenas de miles de cartas reales)
  console.log('\n--- 1. Sincronización de Oracle Cards ---');
  const oracleResult = await bulkSyncService.syncOracleCards(undefined, force);
  console.log(
    `✅ Oracle Cards: ${oracleResult.syncedCount} cartas sincronizadas en ${oracleResult.durationMs}ms (Pico RSS: ${oracleResult.peakMemRssMb || peakRss} MB).`,
  );

  // 2. Sincronizar Rulings (79,000+ dictámenes oficiales)
  console.log('\n--- 2. Sincronización de Rulings ---');
  const rulingsResult = await bulkSyncService.syncRulings(undefined, force);
  console.log(
    `✅ Rulings: ${rulingsResult.syncedCount} dictámenes indexados en ${rulingsResult.durationMs}ms (Pico RSS: ${rulingsResult.peakMemRssMb || peakRss} MB).`,
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

  clearInterval(memMonitor);

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
  console.log(`- Pico RSS medido: ${peakRss} MB (Objetivo < 300 MB)`);
  console.log(`- Pico Heap medido: ${peakHeap} MB (Límite Procfile: 280 MB)`);
  console.log('========================================\n');

  await disconnectDatabase();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error en sync:cards:', err);
  process.exit(1);
});
