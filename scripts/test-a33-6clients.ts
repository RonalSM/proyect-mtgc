import WebSocket from 'ws';

const PROD_URL = 'https://mtgc-backend-caf950eaa8b4.herokuapp.com';
const PROD_WS_BASE = 'wss://mtgc-backend-caf950eaa8b4.herokuapp.com/ws/table';

async function main() {
  console.log('--- TEST A3.3: 6 CLIENTES CONCURRENTES DESDE LA MISMA IP ---');

  // 1. Crear sala para 6 jugadores
  console.log('1. Creando sala de 6 jugadores en producción...');
  const res = await fetch(`${PROD_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Mesa 6 Jugadores Misma IP',
      hostName: 'Jugador 1',
      maxPlayers: 6,
      startingLife: 40,
    })
  });

  if (!res.ok) {
    throw new Error(`Fallo al crear sala: ${res.status} ${await res.text()}`);
  }

  const { code, hostId } = (await res.json()) as { code: string; hostId: string };
  console.log(`✅ Sala creada con código [${code}], host: ${hostId}`);

  // 2. Conectar 6 clientes simultáneamente desde la misma IP
  const wsOptions = { headers: { Origin: 'https://proyect-mtgc.netlify.app' } };
  const players = [
    { name: 'Jugador 1 (Host)', id: hostId },
    { name: 'Jugador 2', id: `p2_${Date.now()}` },
    { name: 'Jugador 3', id: `p3_${Date.now()}` },
    { name: 'Jugador 4', id: `p4_${Date.now()}` },
    { name: 'Jugador 5', id: `p5_${Date.now()}` },
    { name: 'Jugador 6', id: `p6_${Date.now()}` },
  ];

  const sockets: WebSocket[] = [];
  const errors: string[] = [];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const ws = new WebSocket(
      `${PROD_WS_BASE}/${code}?playerId=${p.id}&playerName=${encodeURIComponent(p.name)}`,
      wsOptions
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ERROR' || msg.type === 'RATE_LIMIT_EXCEEDED') {
          errors.push(`[${p.name}] ${msg.message || msg.error}`);
        }
      } catch {}
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout conectando ${p.name}`)), 8000);
      ws.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    sockets.push(ws);
    console.log(`   🟢 [${i + 1}/6] Conectado exitosamente: ${p.name} (IP compartida)`);
  }

  // 3. Probar acciones simultáneas de los 6 jugadores
  console.log('3. Ejecutando acciones concurrentes desde los 6 clientes...');
  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    s.send(JSON.stringify({
      type: 'ADJUST_LIFE',
      payload: { playerId: players[i].id, delta: -i }
    }));
  }

  await new Promise(r => setTimeout(r, 2000));

  console.log(`Sockets abiertos: ${sockets.filter(s => s.readyState === WebSocket.OPEN).length}/6`);
  console.log(`Errores o bloqueos registrados: ${errors.length}`);

  // Cerrar sockets
  sockets.forEach(s => s.close());

  if (errors.length > 0) {
    throw new Error(`Se recibieron errores durante la prueba: ${errors.join(', ')}`);
  }

  console.log('\n===============================================================');
  console.log('🎉 PRUEBA A3.3 SUPERADA: 6 CLIENTES CONECTADOS DESDE LA MISMA IP');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('❌ Error en test A3.3:', err);
  process.exit(1);
});
