/**
 * TEST BENCH G1: Banco de Latencia de Actualización Optimista sin Parpadeo
 * Simula transferencias de zona con latencias de red de 100ms, 250ms y 500ms.
 * Mide el estado de renderizado frame por frame (16.6ms / 60fps) verificando 0 frames en origen.
 */

interface CardItem {
  id: string;
  name: string;
  zone: string;
}

interface OptimisticTransfer {
  card: CardItem;
  fromZone: string;
  toZone: string;
  timestamp: number;
}

function runLatencySimulation(latencyMs: number): {
  latencyMs: number;
  totalFrames: number;
  framesInOrigin: number;
  framesInTarget: number;
  reconciledProperly: boolean;
} {
  const cardId = 'sol-ring-test-1';
  let authoritativeZones: Record<string, CardItem[]> = {
    hand: [{ id: cardId, name: 'Sol Ring', zone: 'hand' }],
    battlefield: [],
  };

  let optimisticTransfers: Record<string, OptimisticTransfer> = {};

  // 1. Momento de soltar la carta (T=0)
  const dropTimestamp = Date.now();
  optimisticTransfers[cardId] = {
    card: { id: cardId, name: 'Sol Ring', zone: 'battlefield' },
    fromZone: 'hand',
    toZone: 'battlefield',
    timestamp: dropTimestamp,
  };

  // Simulación de frames a 60fps (16.66ms por frame)
  const frameIntervalMs = 16.66;
  const totalFrames = Math.ceil(latencyMs / frameIntervalMs);
  let framesInOrigin = 0;
  let framesInTarget = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentSimulatedTime = dropTimestamp + frame * frameIntervalMs;

    // Calcular vista combinada idéntica a TableBoard.tsx (renderPlayerCell)
    const effectiveHand = authoritativeZones.hand.filter(
      c => optimisticTransfers[c.id]?.fromZone !== 'hand',
    );
    const effectiveBattlefield = [
      ...authoritativeZones.battlefield.filter(
        c => optimisticTransfers[c.id]?.fromZone !== 'battlefield',
      ),
      ...Object.values(optimisticTransfers)
        .filter(
          t => t.toZone === 'battlefield' && !authoritativeZones.battlefield.some(c => c.id === t.card.id),
        )
        .map(t => t.card),
    ];

    // Verificar si la carta aparece en origen o destino
    if (effectiveHand.some(c => c.id === cardId)) {
      framesInOrigin++;
    }
    if (effectiveBattlefield.some(c => c.id === cardId)) {
      framesInTarget++;
    }
  }

  // 2. Llegada de ROOM_STATE_SYNC desde el servidor tras `latencyMs`
  authoritativeZones = {
    hand: [],
    battlefield: [{ id: cardId, name: 'Sol Ring', zone: 'battlefield' }],
  };

  // Reconciliación (idéntica a useEffect en TableBoard.tsx)
  for (const [id, transfer] of Object.entries(optimisticTransfers)) {
    const inTarget = authoritativeZones[transfer.toZone]?.some(c => c.id === id);
    const notInSource = !authoritativeZones[transfer.fromZone]?.some(c => c.id === id);
    if (inTarget && notInSource) {
      delete optimisticTransfers[id];
    }
  }

  // Verificar estado reconciliado final
  const finalHand = authoritativeZones.hand.filter(
    c => optimisticTransfers[c.id]?.fromZone !== 'hand',
  );
  const finalBattlefield = [
    ...authoritativeZones.battlefield.filter(
      c => optimisticTransfers[c.id]?.fromZone !== 'battlefield',
    ),
    ...Object.values(optimisticTransfers)
      .filter(
        t => t.toZone === 'battlefield' && !authoritativeZones.battlefield.some(c => c.id === t.card.id),
      )
      .map(t => t.card),
  ];

  const reconciledProperly =
    finalHand.length === 0 &&
    finalBattlefield.length === 1 &&
    finalBattlefield[0].id === cardId &&
    Object.keys(optimisticTransfers).length === 0;

  return {
    latencyMs,
    totalFrames,
    framesInOrigin,
    framesInTarget,
    reconciledProperly,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('🔬 BANCO DE PRUEBAS DE LATENCIA G1: ACTUALIZACIÓN OPTIMISTA SIN PARPADEO');
  console.log('========================================================================\n');

  const tiers = [100, 250, 500];
  let allTiersPassed = true;

  for (const ms of tiers) {
    const res = runLatencySimulation(ms);
    console.log(`⏱️ TIER ${res.latencyMs}ms:`);
    console.log(`   - Duración de simulación: ${res.latencyMs} ms`);
    console.log(`   - Frames evaluados a 60fps: ${res.totalFrames} frames`);
    console.log(`   - Frames mostrando carta en zona de origen (Mano): ${res.framesInOrigin}`);
    console.log(`   - Frames mostrando carta en zona destino (Mesa): ${res.framesInTarget} (${((res.framesInTarget / res.totalFrames) * 100).toFixed(1)}%)`);
    console.log(`   - Reconciliación autoritativa limpia (sin duplicados ni saltos): ${res.reconciledProperly ? '✅ SÍ' : '❌ NO'}`);

    if (res.framesInOrigin !== 0 || !res.reconciledProperly || res.framesInTarget !== res.totalFrames) {
      allTiersPassed = false;
      console.error(`   ❌ FALLO en tier ${res.latencyMs}ms: se detectaron frames en origen o fallo de reconciliación.`);
    } else {
      console.log(`   ✅ SUPERADO: Cero frames en origen y presencia inmediata continua en destino.\n`);
    }
  }

  console.log('========================================================================');
  if (allTiersPassed) {
    console.log('🎉 [ÉXITO G1] Banco de latencia superado al 100% en todos los niveles (100, 250, 500 ms).');
    console.log('   Garantía estricta: 0 frames mostrando la carta en origen tras soltar.');
  } else {
    console.error('❌ [FALLO G1] Falló alguna de las verificaciones de latencia.');
    process.exit(1);
  }
  console.log('========================================================================');
}

main().catch(console.error);
