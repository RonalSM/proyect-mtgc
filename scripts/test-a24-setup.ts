import WebSocket from 'ws';

const PROD_URL = 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_BASE = 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com/ws/table';

async function main() {
  console.log('--- TEST A2.4: RECUPERACIÓN TRAS REINICIO DE DYNO ---');
  
  // 1. Crear sala
  console.log('1. Creando sala en producción...');
  const res = await fetch(`${PROD_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mesa Recuperacion Dyno',
      hostName: 'Jugador 1'
    })
  });
  if (!res.ok) throw new Error(`Error al crear sala: ${res.status} ${await res.text()}`);
  const { code, hostId } = await res.json() as { code: string, hostId: string };
  console.log(`✅ Sala creada: código ${code}, Host ID: ${hostId}`);

  // 2. Conectar Host por WebSocket
  const wsOptions = { headers: { Origin: 'https://proyect-mtgc.netlify.app' } };
  const ws1 = new WebSocket(`${PROD_WS_BASE}/${code}?playerId=${hostId}&playerName=Jugador%201`, wsOptions);
  await new Promise<void>((resolve, reject) => {
    ws1.on('open', () => resolve());
    ws1.on('error', reject);
  });
  console.log('✅ Host conectado a WS');

  // 3. Conectar 3 jugadores más
  const players = [
    { name: 'Jugador 2', id: `p2_${Date.now()}` },
    { name: 'Jugador 3', id: `p3_${Date.now()}` },
    { name: 'Jugador 4', id: `p4_${Date.now()}` }
  ];
  const sockets: WebSocket[] = [ws1];

  for (const p of players) {
    const ws = new WebSocket(`${PROD_WS_BASE}/${code}?playerId=${p.id}&playerName=${encodeURIComponent(p.name)}`, wsOptions);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
    sockets.push(ws);
    console.log(`✅ ${p.name} conectado a WS`);
  }

  // 4. Modificar estado: fijar vida de Host en 37
  ws1.send(JSON.stringify({
    type: 'UPDATE_LIFE',
    payload: { playerId: hostId, life: 37 }
  }));
  console.log('✅ Estado modificado vía WS: Vida de Host fijada en 37');

  // Esperar 2.5s para que roomManager procese y guarde la instantánea en Postgres
  await new Promise(r => setTimeout(r, 2500));

  // Cerrar sockets para preparar el reinicio
  sockets.forEach(s => s.close());
  console.log('🔌 Conexiones de los 4 jugadores cerradas.');

  console.log(`\n========================================`);
  console.log(`LISTO PARA REINICIAR DYNO:`);
  console.log(`Código de sala: ${code}`);
  console.log(`Jugadores conectados: 4`);
  console.log(`Estado: Host life = 37`);
  console.log(`========================================\n`);
  process.stdout.write(`ROOM_CODE:${code}\n`);
}

main().catch(err => {
  console.error('❌ Error en setup A2.4:', err);
  process.exit(1);
});
