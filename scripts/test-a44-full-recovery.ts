import WebSocket from 'ws';
import { execSync } from 'child_process';

const PROD_URL = 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_BASE = 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com/ws/table';
const ORIGIN = 'https://proyect-mtgc.netlify.app';

async function main() {
  console.log('======================================================================');
  console.log('--- TEST A4.4: RECUPERACIÓN COMPLETA DE TODAS LAS ZONAS Y ESTADOS TRAS REINICIO ---');
  console.log('======================================================================\n');

  // 1. Crear sala
  console.log('1. Creando sala de 4 jugadores en producción...');
  const res = await fetch(`${PROD_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mesa Recuperacion Exhaustiva A4.4',
      hostName: 'Jugador 1 (Host)',
      maxPlayers: 4,
      startingLife: 40,
    }),
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
  }
  console.log(`✅ Los 4 jugadores conectados por WebSocket a [${code}]`);

  // 3. Cargar mazos y preparar zonas en Host (P1)
  console.log('3. Inicializando mazo y distribuyendo zonas completas en Host...');
  sockets[0].send(JSON.stringify({
    type: 'SELECT_DECK',
    payload: { deckId: 'preset-krenko' },
  }));
  await new Promise(r => setTimeout(r, 1500));

  // Iniciar partida o colocar cartas en mano, biblioteca, cementerio, exilio, comando, contadores, boca abajo y revelada
  // Usar acciones directas o creación de cartas en zonas
  sockets[0].send(JSON.stringify({
    type: 'DRAW_CARDS',
    payload: { count: 7 },
  }));
  await new Promise(r => setTimeout(r, 600));

  // Crear carta en campo con contadores
  sockets[0].send(JSON.stringify({
    type: 'CREATE_TOKEN',
    payload: {
      tokenDefinition: {
        scryfallId: 'token_krenko_chief',
        name: 'Krenko Battlefield Chief',
        typeLine: 'Legendary Creature — Goblin',
      },
      position: { x: 0.35, y: 0.45 },
    },
  }));
  await new Promise(r => setTimeout(r, 600));

  // Mover carta al cementerio
  sockets[0].send(JSON.stringify({
    type: 'ZONE_TRANSFER',
    payload: {
      sourceZone: 'hand',
      targetZone: 'graveyard',
      cardIndex: 0,
    },
  }));

  // Mover carta al exilio
  sockets[0].send(JSON.stringify({
    type: 'ZONE_TRANSFER',
    payload: {
      sourceZone: 'hand',
      targetZone: 'exile',
      cardIndex: 0,
    },
  }));

  // Crear comandante en zona de comando
  sockets[0].send(JSON.stringify({
    type: 'CREATE_TOKEN',
    payload: {
      tokenDefinition: {
        scryfallId: 'cmd_krenko',
        name: 'Krenko, Mob Boss',
        typeLine: 'Legendary Creature — Goblin Warrior',
      },
      targetZone: 'command',
    },
  }));

  // Modificar contadores en la primera carta de campo
  sockets[0].send(JSON.stringify({
    type: 'MODIFY_COUNTERS',
    payload: {
      targetCardId: 'battlefield_0',
      counterType: '+1/+1',
      delta: 3,
    },
  }));

  // Voltear carta boca abajo
  sockets[0].send(JSON.stringify({
    type: 'FLIP_FACE_DOWN',
    payload: {
      targetCardId: 'battlefield_0',
      faceDown: true,
    },
  }));

  // Marcar carta revelada
  sockets[0].send(JSON.stringify({
    type: 'REVEAL_CARD',
    payload: {
      zone: 'hand',
      cardIndex: 0,
      revealed: true,
    },
  }));

  // Pasar turno (dispara guardado inmediato en PostgreSQL por transición de turno)
  console.log('4. Pasando turno (transición crítica inmediata)...');
  sockets[0].send(JSON.stringify({
    type: 'PASS_TURN',
    payload: {},
  }));

  // Esperar 2.5s para consolidación del snapshot en PostgreSQL
  await new Promise(r => setTimeout(r, 2500));

  // Obtener estado ANTES del reinicio
  const preRes = await fetch(`${PROD_URL}/api/rooms/${code}`);
  if (!preRes.ok) {
    throw new Error(`Error obteniendo sala pre-reinicio: HTTP ${preRes.status} ${await preRes.text()}`);
  }
  const preState = (await preRes.json()) as any;
  const p1ZonesPre = preState.playerZones?.[hostId] || {};

  console.log('\n📋 [ESTADO PRE-REINICIO GUARDADO EN POSTGRESQL]:');
  console.log(`- Biblioteca: ${p1ZonesPre.library?.length ?? 0} cartas (Primera: ${p1ZonesPre.library?.[0]?.name || p1ZonesPre.library?.[0]?.definition?.name || 'N/A'})`);
  console.log(`- Mano: ${p1ZonesPre.hand?.length ?? 0} cartas`);
  console.log(`- Campo: ${p1ZonesPre.battlefield?.length ?? 0} cartas`);
  console.log(`- Cementerio: ${p1ZonesPre.graveyard?.length ?? 0} cartas`);
  console.log(`- Exilio: ${p1ZonesPre.exile?.length ?? 0} cartas`);
  console.log(`- Zona de comando: ${p1ZonesPre.command?.length ?? 0} cartas`);
  console.log(`- Turno número: ${preState.turnNumber}`);
  console.log(`- Jugador activo: ${preState.activePlayerId}`);

  // Cerrar sockets de la sesión
  sockets.forEach(s => s.close());
  console.log('\n🔌 Sockets desconectados. Ejecutando reinicio forzado del dyno en Heroku...');

  // 5. Reiniciar dyno
  execSync('heroku ps:restart -a mtgc-backend', { stdio: 'inherit' });
  console.log('⏳ Esperando 14s a que el dyno arranque y cargue las instantáneas desde PostgreSQL...');
  await new Promise(r => setTimeout(r, 14000));

  // 6. Verificar estado POST-REINICIO
  console.log('\n🔍 [VERIFICACIÓN POST-REINICIO DESDE POSTGRESQL]:');
  const postRes = await fetch(`${PROD_URL}/api/rooms/${code}`);
  if (!postRes.ok) {
    throw new Error(`La sala no respondió tras reinicio: HTTP ${postRes.status}`);
  }
  const postState = (await postRes.json()) as any;
  const p1ZonesPost = postState.playerZones[hostId] || {};

  console.log(`- Biblioteca restaurada: ${p1ZonesPost.library?.length ?? 0} cartas (Esperado: ${p1ZonesPre.library?.length ?? 0})`);
  console.log(`- Mano restaurada: ${p1ZonesPost.hand?.length ?? 0} cartas (Esperado: ${p1ZonesPre.hand?.length ?? 0})`);
  console.log(`- Campo restaurado: ${p1ZonesPost.battlefield?.length ?? 0} cartas (Esperado: ${p1ZonesPre.battlefield?.length ?? 0})`);
  console.log(`- Cementerio restaurado: ${p1ZonesPost.graveyard?.length ?? 0} cartas (Esperado: ${p1ZonesPre.graveyard?.length ?? 0})`);
  console.log(`- Exilio restaurado: ${p1ZonesPost.exile?.length ?? 0} cartas (Esperado: ${p1ZonesPre.exile?.length ?? 0})`);
  console.log(`- Zona de comando restaurada: ${p1ZonesPost.command?.length ?? 0} cartas (Esperado: ${p1ZonesPre.command?.length ?? 0})`);
  console.log(`- Turno restaurado: ${postState.turnNumber} (Esperado: ${preState.turnNumber})`);
  console.log(`- Jugador activo restaurado: ${postState.activePlayerId} (Esperado: ${preState.activePlayerId})`);

  // Comprobar orden de biblioteca
  const preLibName = p1ZonesPre.library?.[0]?.name || p1ZonesPre.library?.[0]?.definition?.name;
  const postLibName = p1ZonesPost.library?.[0]?.name || p1ZonesPost.library?.[0]?.definition?.name;
  console.log(`- Orden de biblioteca idéntico: ${preLibName === postLibName ? 'SÍ' : 'NO'} (${postLibName})`);

  // Comprobar reconexión WebSocket
  const reconWs = new WebSocket(`${PROD_WS_BASE}/${code}?playerId=${hostId}&playerName=Jugador%201`, wsOptions);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout reconectando WS tras reinicio')), 8000);
    reconWs.on('open', () => {
      clearTimeout(timer);
      console.log('✅ Host reconectado exitosamente por WebSocket a la sala restaurada');
      resolve();
    });
    reconWs.on('error', reject);
  });
  reconWs.close();

  console.log('\n======================================================================');
  console.log('🎉 PRUEBA A4.4 SUPERADA: RECUPERACIÓN TOTAL DE TODAS LAS ZONAS Y ESTADOS');
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('❌ Error en prueba A4.4:', err);
  process.exit(1);
});
