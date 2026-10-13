import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RedisSnapshotService } from '../src/services/redis-snapshot.service.js';
import { RoomManager } from '../src/game/room-manager.js';
import { RoomState } from '@mtgc/shared';

describe('RedisSnapshotService & Table Recovery (COMP-7 / Paso 2A.6)', () => {
  it('guarda, recupera y elimina instantáneas de estado de mesa', async () => {
    const snapshotService = new RedisSnapshotService();
    const mockState: Partial<RoomState> = {
      id: 'test-room-id',
      code: 'SNAP01',
      name: 'Mesa Recuperable',
      version: 5,
      status: 'playing',
      players: {
        p1: {
          id: 'p1',
          name: 'Nero',
          life: 38,
          seatNumber: 0,
          commanderDamageReceived: {},
          counters: { poison: 2, energy: 0, experience: 0 },
          isConnected: true,
          isHost: true,
          isReady: true,
          handCount: 7,
          libraryCount: 92,
          graveyardCount: 0,
          exileCount: 0,
        },
      },
      playerZones: {
        p1: {
          hand: [],
          library: [],
          graveyard: [],
          exile: [],
          command: [],
        },
      },
      battlefield: [],
      turnOrder: ['p1'],
      activePlayerIndex: 0,
      turnNumber: 3,
      currentPhase: 'main1',
      logs: [],
      settings: {
        startingLife: 40,
        maxPlayers: 4,
        allowSpectators: true,
        enableUndo: true,
      },
    };

    // 1. Guardar instantánea
    await snapshotService.save('SNAP01', mockState as RoomState);

    // 2. Verificar que se lista entre las mesas activas
    const active = await snapshotService.listActiveCodes();
    assert.ok(active.includes('SNAP01'), 'SNAP01 debería estar en active_tables');

    // 3. Cargar instantánea
    const loaded = await snapshotService.load('SNAP01');
    assert.ok(loaded !== null, 'Loaded state no debe ser null');
    assert.equal(loaded?.code, 'SNAP01');
    assert.equal(loaded?.version, 5);
    assert.equal(loaded?.players['p1']?.life, 38);
    assert.equal(loaded?.players['p1']?.counters.poison, 2);

    // 4. Eliminar instantánea
    await snapshotService.delete('SNAP01');
    const afterDelete = await snapshotService.load('SNAP01');
    assert.equal(afterDelete, null);
  });

  it('restaura sesiones en RoomManager al reiniciar el proceso', async () => {
    const customSnapshotService = new RedisSnapshotService();
    const manager = new RoomManager();

    // Crear una sala
    const session = manager.createRoom({
      name: 'Mesa Reinicio',
      hostName: 'Urza',
      settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true, enableUndo: true },
    });
    const code = session.state.code;

    // Modificar estado e incrementar versión
    session.adjustLife({ playerId: session.state.hostId, delta: -5 });
    assert.equal(session.state.players[session.state.hostId].life, 35);

    // Guardar snapshot explícitamente en el snapshot service de prueba
    await customSnapshotService.save(code, session.state);

    // Simular un reinicio: nuevo RoomManager sin salas en memoria
    const freshManager = new RoomManager();
    assert.equal(freshManager.getSession(code), undefined);

    // Restaurar desde snapshots
    const allSnapshots = await customSnapshotService.restoreAllActiveRooms();
    for (const [c, st] of allSnapshots.entries()) {
      freshManager['sessions'].set(c, new (session.constructor as any)(st));
    }

    const restoredSession = freshManager.getSession(code);
    assert.ok(restoredSession !== undefined, 'Restored session debe existir');
    assert.equal(restoredSession?.state.code, code);
    assert.equal(restoredSession?.state.players[session.state.hostId].life, 35);
  });
});
