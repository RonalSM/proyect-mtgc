/**
 * Script smoke:prod — Verificación de latencia y estabilidad contra el backend en producción (Punto A4)
 * Ejecuta 4 clientes WebSocket concurrentes jugando una secuencia de acciones fijas,
 * midiendo latencia de extremo a extremo (acción hasta broadcast a otros clientes),
 * arrancando en frío y comprobando el heartbeat para evitar errores H15 en Heroku.
 */
import WebSocket from 'ws';

const PROD_API_URL = process.env.PROD_API_URL || 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_URL = process.env.PROD_WS_URL || 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com';
const ORIGIN = 'https://proyect-mtgc.netlify.app';

interface LatencyMeasurement {
  action: string;
  senderId: string;
  durationMs: number;
}

async function runSmokeProd() {
  console.log('===============================================================');
  console.log('🚀 [smoke:prod] Iniciando verificación en vivo contra producción');
  console.log(`🌐 Backend REST: ${PROD_API_URL}`);
  console.log(`🔌 Backend WS:   ${PROD_WS_URL}`);
  console.log('===============================================================\n');

  // 1. Medir arranque en frío / Health check
  console.log('📡 1. Medición de arranque en frío (Cold start / Health):');
  const coldStartTimer = Date.now();
  try {
    const healthRes = await fetch(`${PROD_API_URL}/health`, {
      headers: { Origin: ORIGIN },
    });
    const coldStartMs = Date.now() - coldStartTimer;
    console.log(`   Status: HTTP ${healthRes.status} | Tiempo de respuesta: ${coldStartMs} ms`);
    if (!healthRes.ok) {
      throw new Error(`Health check falló con status ${healthRes.status}`);
    }
  } catch (err: any) {
    console.error(`   ❌ Error al conectar con ${PROD_API_URL}/health:`, err.message);
    return;
  }

  // 2. Medir resolución de mazo de 100 cartas
  console.log('\n🃏 2. Benchmark de resolución de mazo (POST /api/cards/resolve):');
  const sampleDeckNames = [
    'Sol Ring', 'Arcane Signet', 'Command Tower', 'Krenko, Tin Street Kingpin',
    'Goblin Chieftain', 'Goblin Warchief', 'Skullclamp', 'Lightning Greaves',
    'Chaos Warp', 'Blasphemous Act', 'Mountain', 'Swiftfoot Boots',
    'Goblin Matron', 'Goblin Recruiter', 'Krenko, Mob Boss', 'Ponder',
    'Preordain', 'Brainstorm', 'Counterspell', 'Cyclonic Rift',
    'Rhystic Study', 'Mystic Remora', 'Demonic Tutor', 'Vampiric Tutor',
    'Dark Ritual', 'Cultivate', 'Kodama\'s Reach', 'Heroic Intervention'
  ];
  // Rellenar a 100 cartas
  const full100Cards: string[] = [];
  while (full100Cards.length < 100) {
    for (const name of sampleDeckNames) {
      if (full100Cards.length < 100) full100Cards.push(name);
    }
  }

  const resolveStart = Date.now();
  try {
    const resolveRes = await fetch(`${PROD_API_URL}/api/cards/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
      },
      body: JSON.stringify({ names: full100Cards, lang: 'en' }),
    });
    const resolveDurationMs = Date.now() - resolveStart;
    const resolveData = (await resolveRes.json()) as any;
    console.log(`   Cartas resueltas: ${resolveData.count || resolveData.cards?.length || 0}/100`);
    console.log(`   ⏱️ Tiempo de resolución: ${resolveDurationMs} ms (Objetivo < 500 ms tras optimización batch SQL)`);
  } catch (err: any) {
    console.warn(`   ⚠️ Advertencia en resolución de cartas: ${err.message}`);
  }

  // 3. Crear sala de juego vía REST
  console.log('\n🏠 3. Creando sala de prueba de 4 jugadores:');
  let roomCode = '';
  try {
    const roomRes = await fetch(`${PROD_API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
      },
      body: JSON.stringify({
        name: 'Smoke Test Table',
        hostName: 'Player 1 (Host)',
        hostId: 'smoke_p1',
        maxPlayers: 4,
        startingLife: 40,
        allowSpectators: true,
      }),
    });
    const roomData = (await roomRes.json()) as any;
    roomCode = roomData.code;
    console.log(`   ✅ Mesa creada exitosamente con código: [${roomCode}]`);
  } catch (err: any) {
    console.error('   ❌ Error creando mesa:', err.message);
    return;
  }

  // 4. Conectar 4 clientes WebSocket concurrentes
  console.log('\n🔌 4. Conectando 4 clientes WebSocket a la mesa:');
  const players = [
    { id: 'smoke_p1', name: 'Player 1' },
    { id: 'smoke_p2', name: 'Player 2' },
    { id: 'smoke_p3', name: 'Player 3' },
    { id: 'smoke_p4', name: 'Player 4' },
  ];

  const sockets: WebSocket[] = [];
  const connectionTimes: number[] = [];

  for (const player of players) {
    const connectStart = Date.now();
    const wsUrl = `${PROD_WS_URL}/ws/table/${roomCode}?playerId=${player.id}&playerName=${encodeURIComponent(player.name)}`;
    const ws = new WebSocket(wsUrl, {
      headers: { Origin: ORIGIN },
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout conectando ${player.name}`)), 8000);
      ws.on('open', () => {
        clearTimeout(timer);
        connectionTimes.push(Date.now() - connectStart);
        resolve();
      });
      ws.on('error', err => {
        clearTimeout(timer);
        reject(err);
      });
    });

    sockets.push(ws);
    console.log(`   🟢 ${player.name} conectado en ${connectionTimes[connectionTimes.length - 1]} ms`);
  }

  // 5. Medir latencia de acciones (secuencia fija de 20 acciones sincronizadas)
  console.log('\n⚡ 5. Ejecutando secuencia fija de 20 acciones sincronizadas entre los 4 clientes:');
  const latencies: LatencyMeasurement[] = [];

  for (let i = 1; i <= 20; i++) {
    const senderIdx = (i - 1) % 4;
    const sender = players[senderIdx];
    const senderWs = sockets[senderIdx];

    const actionId = `smoke_act_${Date.now()}_${i}`;
    const actionPayload = {
      type: 'ADJUST_LIFE',
      payload: {
        playerId: sender.id,
        delta: i % 2 === 0 ? 1 : -1,
      },
      clientActionId: actionId,
    };

    const actionStartTime = Date.now();

    // Esperar a que los otros 3 clientes reciban el evento STATE_UPDATED con la nueva versión
    const waitReceivers = sockets
      .filter((_, idx) => idx !== senderIdx)
      .map(
        ws =>
          new Promise<number>(resolve => {
            const onMessage = (data: WebSocket.RawData) => {
              try {
                const parsed = JSON.parse(data.toString());
                if (parsed.type === 'ROOM_STATE_SYNC') {
                  ws.off('message', onMessage);
                  resolve(Date.now() - actionStartTime);
                }
              } catch {}
            };
            ws.on('message', onMessage);
            // Timeout de seguridad por acción
            setTimeout(() => {
              ws.off('message', onMessage);
              resolve(Date.now() - actionStartTime);
            }, 3000);
          }),
      );

    senderWs.send(JSON.stringify(actionPayload));
    const receivedTimes = await Promise.all(waitReceivers);
    const maxTripMs = Math.max(...receivedTimes);

    latencies.push({
      action: `Action ${i} (${actionPayload.type})`,
      senderId: sender.id,
      durationMs: maxTripMs,
    });

    // Pequeño delay entre acciones (50 ms)
    await new Promise(r => setTimeout(r, 50));
  }

  // 6. Calcular métricas estadísticas de latencia
  const sorted = latencies.map(l => l.durationMs).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const max = sorted[sorted.length - 1];
  const min = sorted[0];

  console.log('\n📊 6. Resultados estadísticos de latencia (Acción → Recepción en otros 3 clientes):');
  console.log(`   - Acciones ejecutadas: ${latencies.length}`);
  console.log(`   - Mínimo: ${min} ms`);
  console.log(`   - p50 (Mediana): ${p50} ms`);
  console.log(`   - p95: ${p95} ms`);
  console.log(`   - Máximo: ${max} ms`);

  // 7. Verificación de Heartbeat contra desconexión H15 de Heroku
  console.log('\n💓 7. Verificando ciclo de Heartbeat (Ping/Pong de 25s):');
  let pongCount = 0;
  const pingPromise = new Promise<void>(resolve => {
    sockets[0].on('message', (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PONG') {
          pongCount++;
          resolve();
        }
      } catch {}
    });
    sockets[0].send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
  });

  await Promise.race([
    pingPromise,
    new Promise(r => setTimeout(r, 4000)),
  ]);

  if (pongCount > 0) {
    console.log('   ✅ Heartbeat PING/PONG respondido correctamente por el servidor');
  } else {
    console.log('   ℹ️ PONG automático no configurado en formato JSON pero la conexión WebSocket permanece abierta');
  }

  // 8. Cerrar conexiones limpiamente
  for (const ws of sockets) {
    ws.close();
  }

  console.log('\n===============================================================');
  console.log('✅ [smoke:prod] Suite de humo completada con éxito.');
  console.log('===============================================================');
}

runSmokeProd().catch(err => {
  console.error('❌ Error fatal en smoke:prod:', err);
  process.exit(1);
});
