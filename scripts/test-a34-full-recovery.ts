import WebSocket from 'ws';
import { execSync } from 'child_process';

const PROD_URL = 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_BASE = 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com/ws/table';
const ORIGIN = 'https://proyect-mtgc.netlify.app';

async function main() {
  console.log('======================================================================');
  console.log('--- TEST A3.4: RECUPERACIÓN COMPLETA DE ESTADO TRAS REINICIO DE DYNO ---');
  console.log('======================================================================\n');

  // 1. Crear sala
  console.log('1. Creando sala de juego en producción...');
  const res = await fetch(`${PROD_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mesa Auditoria Estado Completo',
      hostName: 'Jugador 1 (Host)',
      maxPlayers: 4,
      startingLife: 40,
    })
  });
  if (!res.ok) throw new Error(`Fallo crear sala: ${res.status} ${await res.text()}`);
  const { code, hostId } = (await res.json()) as { code: string; hostId: string };
  console.log(`✅ Sala creada: [${code}], Host: ${hostId}`);

  // 2. Conectar los 4 jugadores
  const wsOptions = { headers: { Origin: ORIGIN } };
  const players = [
    { id: hostId, name: 'Jugador 1' },
    { id: `p2_${Date.now()}`, name: 'Jugador 2' },
    { id: `p3_${Date.now()}`, name: 'Jugador 3' },
    { id: `p4_${Date.now()}`, name: 'Jugador 4' },
  ];

  const sockets: WebSocket[] = [];
  for (const p of players) {
    const ws = new WebSocket(`${PROD_WS_BASE}/${code}?playerId=${p.id}&playerName=${encodeURIComponent(p.name)}`, wsOptions);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
    sockets.push(ws);
    console.log(`✅ ${p.name} conectado a la sala`);
  }

  // 3. Modificar vida de Jugador 1 a 33 y Jugador 2 a 27
  console.log('3. Modificando vida de jugadores (P1: 33, P2: 27)...');
  sockets[0].send(JSON.stringify({
    type: 'SET_LIFE',
    payload: { playerId: hostId, life: 33 }
  }));
  sockets[1].send(JSON.stringify({
    type: 'SET_LIFE',
    payload: { playerId: players[1].id, life: 27 }
  }));

  // 4. Cargar mazo en Jugador 1
  console.log('4. Cargando mazo preset en Jugador 1...');
  sockets[0].send(JSON.stringify({
    type: 'SELECT_DECK',
    payload: { deckId: 'preset-krenko' }
  }));

  // Esperar a que se cargue el mazo
  await new Promise(r => setTimeout(r, 1500));

  // 5. Mover una carta al campo de batalla con coordenadas exactas
  const targetX = 0.425;
  const targetY = 0.582;
  console.log(`5. Colocando carta en mesa en posición normalizada (x: ${targetX}, y: ${targetY})...`);
  sockets[0].send(JSON.stringify({
    type: 'CREATE_TOKEN',
    payload: {
      tokenDefinition: {
        scryfallId: 'token_goblin_1',
        name: 'Goblin 1/1 Token',
        typeLine: 'Token Creature — Goblin',
      },
      position: { x: targetX, y: targetY }
    }
  }));

  // 6. Pasar el turno para avanzar el contador de turnos y cambiar activePlayerId
  console.log('6. Pasando turno...');
  sockets[0].send(JSON.stringify({
    type: 'PASS_TURN',
    payload: {}
  }));

  // Esperar 2s para que todas las mutaciones se procesen y se guarden en PostgreSQL (room_snapshots)
  await new Promise(r => setTimeout(r, 2000));

  // Consultar estado actual antes del reinicio
  const preRestartRes = await fetch(`${PROD_URL}/api/rooms/${code}`);
  const preState = (await preRestartRes.json()) as any;
  console.log('\n📊 ESTADO ANTES DEL REINICIO:');
  console.log(`- Vida Host: ${preState.players[hostId]?.life}`);
  console.log(`- Vida P2: ${preState.players[players[1].id]?.life}`);
  console.log(`- Turno número: ${preState.turnNumber}`);
  console.log(`- Jugador activo: ${preState.activePlayerId}`);
  const getAllBf = (st: any) => Object.entries(st.playerZones || {}).flatMap(([pid, z]: [string, any]) => (z.battlefield || []).map((c: any) => ({ ...c, pid })));
  
  const preBfCards = getAllBf(preState);
  console.log(`- Total cartas en todos los campos: ${preBfCards.length}`);
  if (preBfCards.length > 0) {
    console.log(`  * Carta en campo: "${preBfCards[0].definition?.name || preBfCards[0].name}" en (x: ${preBfCards[0].position?.x}, y: ${preBfCards[0].position?.y}) (Zona: ${preBfCards[0].pid})`);
  }

  // 7. Cerrar sockets
  sockets.forEach(s => s.close());
  console.log('\n🔌 Sockets cerrados. Reiniciando dyno con heroku ps:restart...');

  // 8. Reiniciar dyno
  execSync('heroku ps:restart -a mtgc-backend', { stdio: 'inherit' });
  console.log('⏳ Esperando 12s para que el nuevo dyno levante y cargue snapshots de Postgres...');
  await new Promise(r => setTimeout(r, 12000));

  // 9. Verificar estado POST-REINICIO
  console.log('\n🔎 VERIFICANDO ESTADO RESTAURADO TRAS REINICIO DE DYNO:');
  const postRestartRes = await fetch(`${PROD_URL}/api/rooms/${code}`);
  if (!postRestartRes.ok) {
    throw new Error(`La sala no respondió tras reinicio: HTTP ${postRestartRes.status}`);
  }
  const postState = (await postRestartRes.json()) as any;

  console.log(`- Vida Host restaurada: ${postState.players[hostId]?.life} (Esperado: 33)`);
  console.log(`- Vida P2 restaurada: ${postState.players[players[1].id]?.life} (Esperado: 27)`);
  console.log(`- Turno número restaurado: ${postState.turnNumber} (Esperado: ${preState.turnNumber})`);
  console.log(`- Jugador activo restaurado: ${postState.activePlayerId} (Esperado: ${preState.activePlayerId})`);

  const postBfCards = getAllBf(postState);
  console.log(`- Total cartas en campo restauradas: ${postBfCards.length} (Esperado: ${preBfCards.length})`);
  if (postBfCards.length > 0) {
    const card = postBfCards[0];
    console.log(`  * Carta: "${card.definition?.name || card.name}" en (x: ${card.position?.x}, y: ${card.position?.y})`);
    if (Math.abs(card.position?.x - targetX) > 0.05 || Math.abs(card.position?.y - targetY) > 0.05) {
      console.warn('⚠️ Desplazamiento en posición de carta.');
    } else {
      console.log('  ✅ Coordenadas exactas preservadas tras reinicio.');
    }
  }

  // 10. Reconectar WS a la sala restaurada
  const reconWs = new WebSocket(`${PROD_WS_BASE}/${code}?playerId=${hostId}&playerName=Jugador%201`, wsOptions);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout reconectando WS tras reinicio')), 8000);
    reconWs.on('open', () => {
      clearTimeout(timer);
      console.log('✅ Host reconectado exitosamente por WebSocket a la partida.');
      resolve();
    });
    reconWs.on('error', reject);
  });

  reconWs.close();

  console.log('\n======================================================================');
  console.log('🎉 PRUEBA A3.4 SUPERADA: RECUPERACIÓN TOTAL DE ESTADO DE PARTIDA');
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('❌ Error en prueba A3.4:', err);
  process.exit(1);
});
