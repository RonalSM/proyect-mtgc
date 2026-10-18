import { test } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import type { RoomState, CardInstance } from '@mtgc/shared';

function createMockRoomState(): RoomState {
  return {
    id: 'room_mock',
    code: 'TEST01',
    name: 'Test Room',
    hostId: 'p1',
    status: 'playing',
    settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true },
    players: {
      p1: {
        id: 'p1',
        name: 'Player 1',
        seatNumber: 0,
        isHost: true,
        isSpectator: false,
        isConnected: true,
        life: 40,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        isAtRisk: false,
        deckLoaded: true,
        handCount: 0,
        libraryCount: 2,
        graveyardCount: 0,
        exileCount: 0,
      },
    },
    playerZones: {
      p1: {
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: [],
      },
    },
    currentTurnPlayerId: 'p1',
    turnNumber: 1,
    turnOrder: ['p1'],
    logs: [],
    version: 1,
  };
}

test('Punto 6: Arrastrar una carta a la biblioteca la deja ARRIBA y es la próxima que se roba', () => {
  const roomState = createMockRoomState();
  const session = new GameStateSession(roomState);

  const c1: CardInstance = {
    instanceId: 'c1',
    definition: {
      scryfallId: 's1',
      name: 'Island',
      cmc: 0,
      typeLine: 'Basic Land — Island',
      colors: [],
      colorIdentity: ['U'],
    },
    ownerId: 'p1',
    controllerId: 'p1',
  };

  const c2: CardInstance = {
    instanceId: 'c2',
    definition: {
      scryfallId: 's2',
      name: 'Swamp',
      cmc: 0,
      typeLine: 'Basic Land — Swamp',
      colors: [],
      colorIdentity: ['B'],
    },
    ownerId: 'p1',
    controllerId: 'p1',
  };

  const specialCard: CardInstance = {
    instanceId: 'special_1',
    definition: {
      scryfallId: 's_special',
      name: 'Demonic Tutor',
      cmc: 2,
      typeLine: 'Sorcery',
      colors: ['B'],
      colorIdentity: ['B'],
    },
    ownerId: 'p1',
    controllerId: 'p1',
    position: { x: 0.25, y: 0.25, zIndex: 5 },
    isTapped: true,
  };

  session.state.playerZones['p1'] = {
    library: [c1, c2], // Biblioteca inicial con 2 cartas
    hand: [],
    battlefield: [specialCard],
    graveyard: [],
    exile: [],
    command: [],
  };

  session.syncPlayerCounts('p1');
  assert.strictEqual(session.state.playerZones['p1']!.library.length, 2);
  assert.strictEqual(session.state.playerZones['p1']!.battlefield.length, 1);

  // 1. Arrastrar specialCard de la mesa a la biblioteca SIN destinationIndex (emula el drag & drop directo)
  session.moveCard('p1', {
    cardInstanceId: 'special_1',
    fromZone: 'battlefield',
    toZone: 'library',
  });

  const zones = session.state.playerZones['p1']!;
  assert.strictEqual(zones.battlefield.length, 0);
  assert.strictEqual(zones.library.length, 3);

  // Comprobar que specialCard quedó ARRIBA (índice 0)
  assert.strictEqual(zones.library[0]!.instanceId, 'special_1');
  assert.strictEqual(zones.library[0]!.definition.name, 'Demonic Tutor');
  assert.strictEqual(zones.library[1]!.instanceId, 'c1');
  assert.strictEqual(zones.library[2]!.instanceId, 'c2');
  // Se limpian posición y estado tapped
  assert.strictEqual(zones.library[0]!.position, undefined);
  assert.strictEqual(zones.library[0]!.isTapped, false);

  // 2. Comprobar que es la PRÓXIMA carta que se roba
  session.drawCards('p1', 1);

  assert.strictEqual(zones.library.length, 2);
  assert.strictEqual(zones.hand.length, 1);
  assert.strictEqual(zones.hand[0]!.instanceId, 'special_1');
  assert.strictEqual(zones.hand[0]!.definition.name, 'Demonic Tutor');

  // 3. Comprobar deshacer del robo
  session.undoLast('p1');
  assert.strictEqual(zones.hand.length, 0);
  assert.strictEqual(zones.library.length, 3);
  assert.strictEqual(zones.library[0]!.instanceId, 'special_1');

  // 4. Comprobar deshacer del movimiento a biblioteca
  session.undoLast('p1');
  assert.strictEqual(zones.library.length, 2);
  assert.strictEqual(zones.battlefield.length, 1);
  assert.strictEqual(zones.battlefield[0]!.instanceId, 'special_1');
  assert.strictEqual(zones.battlefield[0]!.position?.x, 0.25);
});
