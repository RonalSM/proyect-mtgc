import { connectDatabase, disconnectDatabase, prisma } from '../apps/server/src/db.js';
import { bulkSyncService } from '../apps/server/src/services/bulk-sync.service.js';
import { roomManager } from '../apps/server/src/game/room-manager.js';

async function main() {
  console.log('======================================================================');
  console.log('--- TEST A4.1: 100 SALAS ACTIVAS + SINCRONIZACIÓN COMPLETA (RSS Y HEAP) ---');
  console.log('======================================================================\n');

  await connectDatabase();

  const initialMem = process.memoryUsage();
  console.log(`[Memoria Inicial] RSS: ${Math.round(initialMem.rss / 1024 / 1024)} MB | HeapUsed: ${Math.round(initialMem.heapUsed / 1024 / 1024)} MB`);

  // 1. Simular 100 salas activas en memoria
  console.log('\n🏠 1. Creando 100 salas activas simultáneas con 4 jugadores cada una...');
  for (let i = 1; i <= 100; i++) {
    const session = roomManager.createRoom({
      name: `Mesa de Prueba #${i}`,
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

    // Agregar cartas en zonas
    const hostZones = session.state.playerZones[`host_${i}`];
    if (hostZones) {
      hostZones.battlefield.push({
        instanceId: `card_${i}_1`,
        definition: {
          scryfallId: `scry_${i}_1`,
          name: `Sol Ring Mock ${i}`,
          typeLine: 'Artifact',
          cmc: 1,
          colors: [],
          colorIdentity: [],
        },
        ownerId: `host_${i}`,
        controllerId: `host_${i}`,
        holderId: `host_${i}`,
        isCommander: false,
        isTapped: false,
        isFaceDown: false,
        isToken: false,
        rotation: 0,
        counters: { '+1/+1': 2 },
        position: { x: 0.5, y: 0.5, zIndex: 1 },
      });
    }
  }

  const memWith100Rooms = process.memoryUsage();
  const heap100Rooms = Math.round(memWith100Rooms.heapUsed / 1024 / 1024);
  const rss100Rooms = Math.round(memWith100Rooms.rss / 1024 / 1024);
  console.log(`✅ 100 salas creadas en memoria.`);
  console.log(`📊 [Memoria con 100 salas] Heap: ${heap100Rooms} MB | RSS: ${rss100Rooms} MB (Tope de Procfile: 280 MB Heap)`);

  if (heap100Rooms >= 280) {
    console.error(`❌ El heap con 100 salas superó los 280 MB: ${heap100Rooms} MB`);
    process.exit(1);
  }

  // 2. Sincronizar Oracle Cards y Rulings con contrapresión
  console.log('\n🔄 2. Iniciando sincronización COMPLETA con contrapresión y 100 salas activas...');
  let peakRss = rss100Rooms;
  let peakHeap = heap100Rooms;

  const monitor = setInterval(() => {
    const mem = process.memoryUsage();
    const curRss = Math.round(mem.rss / 1024 / 1024);
    const curHeap = Math.round(mem.heapUsed / 1024 / 1024);
    if (curRss > peakRss) peakRss = curRss;
    if (curHeap > peakHeap) peakHeap = curHeap;
  }, 500);

  try {
    const cardRes = await bulkSyncService.syncOracleCards(undefined, true);
    console.log(`✅ Oracle Cards sincronizadas: ${cardRes.syncedCount} cartas (Pico RSS: ${cardRes.peakMemRssMb} MB)`);

    const rulingRes = await bulkSyncService.syncRulings(undefined, true);
    console.log(`✅ Rulings sincronizados: ${rulingRes.syncedCount} dictámenes (Pico RSS: ${rulingRes.peakMemRssMb} MB)`);
  } finally {
    clearInterval(monitor);
  }

  console.log('\n======================================================================');
  console.log('📊 TELEMETRÍA FINAL TEST A4.1:');
  console.log(`- Pico RSS global medido: ${peakRss} MB (Objetivo < 300 MB)`);
  console.log(`- Pico Heap medido: ${peakHeap} MB (Límite Procfile: 280 MB)`);
  console.log(`- Salas activas en memoria al terminar: ${roomManager.getActiveRoomsCount()}`);
  console.log('======================================================================\n');

  if (peakRss <= 300 && peakHeap <= 280) {
    console.log('🎉 [ÉXITO A4.1] Memoria dentro de los límites estrictos (< 300 MB RSS y < 280 MB Heap).');
  } else {
    console.warn(`⚠️ [REVISAR A4.1] RSS: ${peakRss} MB, Heap: ${peakHeap} MB`);
  }

  await disconnectDatabase();
}

main().catch(err => {
  console.error('Error en Test A4.1:', err);
  process.exit(1);
});
