import WebSocket from 'ws';

const PROD_URL = 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_BASE = 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com/ws/table';

async function verify(roomCode: string) {
  console.log(`--- VERIFICANDO RECUPERACIÓN DE SALA ${roomCode} TRAS REINICIO ---`);
  
  // 1. Verificar vía REST si la sala se restauró desde Postgres
  const res = await fetch(`${PROD_URL}/api/rooms/${roomCode}`);
  console.log(`Respuesta GET /api/rooms/${roomCode}: status ${res.status}`);
  if (!res.ok) {
    throw new Error(`La sala no fue restaurada: status ${res.status} ${await res.text()}`);
  }
  const roomData = await res.json() as any;
  console.log(`✅ Sala restaurada en memoria desde Postgres:`);
  console.log(`- Nombre: ${roomData.name}`);
  console.log(`- Código: ${roomData.code}`);
  const playersList = Object.values(roomData.players || {});
  console.log(`- Jugadores registrados: ${playersList.length}`);
  for (const p of playersList as any[]) {
    console.log(`  * ${p.name} (id: ${p.id}, vida: ${p.life})`);
  }

  // 2. Reconectar WS como uno de los jugadores existentes (Host)
  const hostId = roomData.hostId;
  const wsOptions = { headers: { Origin: 'https://proyect-mtgc.netlify.app' } };
  const reconWs = new WebSocket(`${PROD_WS_BASE}/${roomCode}?playerId=${hostId}&playerName=Jugador%201`, wsOptions);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout esperando conexión WS')), 8000);
    reconWs.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ Cliente reconectado por WebSocket exitosamente.');
      resolve();
    });
    reconWs.on('error', reject);
  });

  const statePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout esperando ROOM_STATE')), 8000);
    reconWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ROOM_STATE_SYNC' || msg.type === 'ROOM_STATE' || msg.type === 'SYNC_STATE' || msg.type === 'STATE_UPDATE') {
          clearTimeout(timeout);
          resolve(msg);
        }
      } catch (e) {}
    });
  });

  const state: any = await statePromise;
  console.log(`✅ Mensaje inicial recibido tras reconectar: [${state.type}]`);
  reconWs.close();

  console.log('\n======================================================');
  console.log('🎉 PRUEBA DE RECUPERACIÓN TRAS REINICIO DE DYNO: SUPERADA');
  console.log('======================================================\n');
}

const code = process.argv[2];
if (!code) {
  console.error('Uso: npx tsx scripts/test-a24-verify.ts <CODIGO_SALA>');
  process.exit(1);
}

verify(code).catch(err => {
  console.error('❌ Error en verificación:', err);
  process.exit(1);
});
