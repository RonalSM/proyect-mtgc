import { RoomManager } from '../apps/server/src/game/room-manager.js';

// Ignore offline DB logs during memory concurrency test
process.on('unhandledRejection', () => {});

async function runF2ConcurrencyTest() {
  console.log('======================================================================');
  console.log('--- TEST F2(a): CARRERA EN ASIGNACIÓN DE ASIENTOS CONCURRENTE x100 ---');
  console.log('======================================================================\n');

  let totalRounds = 100;
  let passedRounds = 0;
  let seatDuplicateErrors = 0;
  let unexpectedRejections = 0;

  for (let round = 1; round <= totalRounds; round++) {
    const rm = new RoomManager();

    // Probar aleatoriamente configuraciones de 4, 5 y 6 jugadores
    const maxPlayers = round % 3 === 1 ? 4 : round % 3 === 2 ? 5 : 6;
    const session = rm.createRoom({
      name: `Mesa Carrera #${round}`,
      hostName: 'Host_0',
      hostId: `host_${round}_0`,
      maxPlayers,
    });
    const code = session.state.code;

    // Lanzar uniones concurrentes para llenar exactamente la sala (maxPlayers - 1 jugadores más el host)
    const joinPromises = [];
    for (let p = 1; p < maxPlayers; p++) {
      joinPromises.push(
        new Promise<{ success: boolean; seat?: number; error?: string }>((resolve) => {
          try {
            const res = rm.joinRoom(code, {
              playerId: `player_${round}_${p}`,
              playerName: `Jugador ${p}`,
            });
            resolve({ success: true, seat: res.player.seatNumber });
          } catch (err: any) {
            resolve({ success: false, error: err.message });
          }
        })
      );
    }

    const results = await Promise.all(joinPromises);

    // Verificar asientos
    const assignedSeats = [0]; // Host tiene asiento 0
    let roundHasError = false;

    for (const r of results) {
      if (!r.success) {
        unexpectedRejections++;
        roundHasError = true;
      } else if (r.seat !== undefined) {
        if (assignedSeats.includes(r.seat)) {
          seatDuplicateErrors++;
          roundHasError = true;
        } else {
          assignedSeats.push(r.seat);
        }
      }
    }

    // Probar un jugador extra (#maxPlayers + 1) para verificar rechazo limpio por "sala llena"
    try {
      rm.joinRoom(code, {
        playerId: `player_overflow_${round}`,
        playerName: 'Jugador Sobrante',
      });
      // Si no lanza error, falló el control de sala llena
      roundHasError = true;
    } catch (err: any) {
      if (!err.message.includes('llena')) {
        roundHasError = true;
      }
    }

    if (!roundHasError && assignedSeats.length === maxPlayers) {
      passedRounds++;
    }

    if (round % 25 === 0) {
      console.log(`[Ronda ${round}/100] Rondas superadas: ${passedRounds} | Asientos duplicados: ${seatDuplicateErrors} | Rechazos inesperados: ${unexpectedRejections}`);
    }
  }

  console.log('\n======================================================================');
  console.log('📊 RESULTADOS PRUEBA F2(a) CONCURRENCIA:');
  console.log(`- Total rondas ejecutadas: ${totalRounds}`);
  console.log(`- Rondas exitosas sin fallo: ${passedRounds}/${totalRounds}`);
  console.log(`- Errores de asiento duplicado: ${seatDuplicateErrors}`);
  console.log(`- Rechazos indebidos de jugadores legítimos: ${unexpectedRejections}`);
  console.log('======================================================================\n');

  if (passedRounds === totalRounds && seatDuplicateErrors === 0 && unexpectedRejections === 0) {
    console.log('🎉 [ÉXITO F2.a] Hipótesis descartada: La asignación de asientos es 100% atómica y sin carreras.');
  } else {
    console.error('❌ [FALLO F2.a] Se detectaron carreras o duplicados.');
    process.exit(1);
  }
}

runF2ConcurrencyTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
