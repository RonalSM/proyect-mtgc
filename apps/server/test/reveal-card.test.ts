import { test } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import type { RoomState, CardInstance } from '@mtgc/shared';

function createMockRoomState(): RoomState {
  return {
    id: 'room_reveal_mock',
    code: 'REV001',
    name: 'Reveal Test Room',
    hostId: 'p1',
    status: 'playing',
    settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true },
    players: {
      p1: {
        id: 'p1',
        name: 'Alice',
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
        handCount: 1,
        libraryCount: 3,
        graveyardCount: 0,
        exileCount: 0,
      },
      p2: {
        id: 'p2',
        name: 'Bob',
        seatNumber: 1,
        isHost: false,
        isSpectator: false,
        isConnected: true,
        life: 40,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        isAtRisk: false,
        deckLoaded: true,
        handCount: 0,
        libraryCount: 0,
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
      p2: {
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
    turnOrder: ['p1', 'p2'],
    logs: [],
    version: 1,
  };
}

test('Punto 7: Revelar carta no la mueve, registra en bitácora según destino y entrega datos para filtro de visibilidad', () => {
  const roomState = createMockRoomState();
  const session = new GameStateSession(roomState);

  const secretCard: CardInstance = {
    instanceId: 'secret_1',
    definition: {
      scryfallId: 's_black_lotus',
      name: 'Black Lotus',
      cmc: 0,
      typeLine: 'Artifact',
      colors: [],
      colorIdentity: [],
    },
    ownerId: 'p1',
    controllerId: 'p1',
  };

  session.state.playerZones['p1']!.hand = [secretCard];
  session.syncPlayerCounts('p1');

  // 1. Revelar a un jugador específico (Bob - p2)
  const resultTargeted = session.revealCard('p1', {
    cardInstanceId: 'secret_1',
    targetPlayerId: 'p2',
  });

  assert.ok(resultTargeted, 'revealCard debe retornar datos de la carta');
  assert.strictEqual(resultTargeted.card.definition.name, 'Black Lotus');
  assert.strictEqual(resultTargeted.fromPlayerId, 'p1');
  assert.strictEqual(resultTargeted.fromPlayerName, 'Alice');
  assert.strictEqual(resultTargeted.targetPlayerId, 'p2');

  // La carta NO se movió de la mano
  assert.strictEqual(session.state.playerZones['p1']!.hand.length, 1);
  assert.strictEqual(session.state.playerZones['p1']!.hand[0]!.instanceId, 'secret_1');

  // En la bitácora dice "Alice reveló una carta a Bob" SIN decir el nombre de la carta
  const lastLog1 = session.state.logs[session.state.logs.length - 1];
  assert.ok(lastLog1);
  assert.strictEqual(`${lastLog1.playerName} ${lastLog1.actionText}`, 'Alice reveló una carta a Bob');

  // 2. Revelar a todos los jugadores
  const resultAll = session.revealCard('p1', {
    cardInstanceId: 'secret_1',
    targetPlayerId: undefined,
  });

  assert.ok(resultAll);
  assert.strictEqual(resultAll.card.definition.name, 'Black Lotus');
  assert.strictEqual(resultAll.targetPlayerId, undefined);

  // La carta sigue en la mano
  assert.strictEqual(session.state.playerZones['p1']!.hand.length, 1);

  // En la bitácora dice "Alice reveló \"Black Lotus\" a todos"
  const lastLog2 = session.state.logs[session.state.logs.length - 1];
  assert.ok(lastLog2);
  assert.strictEqual(`${lastLog2.playerName} ${lastLog2.actionText}`, 'Alice reveló "Black Lotus" a todos');
});

test('Punto 7: Submenú Biblioteca (Arriba, Abajo, Posición N) e inserción en Cementerio/Exilio siempre arriba', () => {
  const roomState = createMockRoomState();
  const session = new GameStateSession(roomState);

  const lib0: CardInstance = {
    instanceId: 'lib_0',
    definition: { scryfallId: 's0', name: 'Plains', cmc: 0, typeLine: 'Basic Land', colors: [], colorIdentity: ['W'] },
    ownerId: 'p1',
  };
  const lib1: CardInstance = {
    instanceId: 'lib_1',
    definition: { scryfallId: 's1', name: 'Island', cmc: 0, typeLine: 'Basic Land', colors: [], colorIdentity: ['U'] },
    ownerId: 'p1',
  };
  const lib2: CardInstance = {
    instanceId: 'lib_2',
    definition: { scryfallId: 's2', name: 'Swamp', cmc: 0, typeLine: 'Basic Land', colors: [], colorIdentity: ['B'] },
    ownerId: 'p1',
  };

  const handCard: CardInstance = {
    instanceId: 'hand_c',
    definition: { scryfallId: 'sh', name: 'Brainstorm', cmc: 1, typeLine: 'Instant', colors: ['U'], colorIdentity: ['U'] },
    ownerId: 'p1',
  };

  session.state.playerZones['p1']!.library = [lib0, lib1, lib2];
  session.state.playerZones['p1']!.hand = [handCard];
  session.syncPlayerCounts('p1');

  // A. Enviar a biblioteca en Posición 2 (1-based en UI = 1 en 0-based index)
  // [lib0, hand_c, lib1, lib2]
  session.moveCard('p1', {
    cardInstanceId: 'hand_c',
    fromZone: 'hand',
    toZone: 'library',
    destinationIndex: 1,
  });

  let lib = session.state.playerZones['p1']!.library;
  assert.strictEqual(lib.length, 4);
  assert.strictEqual(lib[0]!.instanceId, 'lib_0');
  assert.strictEqual(lib[1]!.instanceId, 'hand_c');
  assert.strictEqual(lib[2]!.instanceId, 'lib_1');
  assert.strictEqual(lib[3]!.instanceId, 'lib_2');

  // Deshacer movimiento
  session.undoLast('p1');
  lib = session.state.playerZones['p1']!.library;
  assert.strictEqual(lib.length, 3);
  assert.strictEqual(session.state.playerZones['p1']!.hand.length, 1);

  // B. Enviar a biblioteca Abajo (destinationIndex = lib.length)
  session.moveCard('p1', {
    cardInstanceId: 'hand_c',
    fromZone: 'hand',
    toZone: 'library',
    destinationIndex: 3,
  });

  lib = session.state.playerZones['p1']!.library;
  assert.strictEqual(lib.length, 4);
  assert.strictEqual(lib[3]!.instanceId, 'hand_c');

  // C. Enviar al Cementerio siempre queda arriba (unshift al índice 0)
  session.moveCard('p1', {
    cardInstanceId: 'hand_c',
    fromZone: 'library',
    toZone: 'graveyard',
  });

  const grave = session.state.playerZones['p1']!.graveyard;
  assert.strictEqual(grave.length, 1);
  assert.strictEqual(grave[0]!.instanceId, 'hand_c');

  // D. Enviar al Exilio siempre queda arriba (unshift al índice 0)
  session.moveCard('p1', {
    cardInstanceId: 'hand_c',
    fromZone: 'graveyard',
    toZone: 'exile',
  });

  const exile = session.state.playerZones['p1']!.exile;
  assert.strictEqual(exile.length, 1);
  assert.strictEqual(exile[0]!.instanceId, 'hand_c');
  assert.strictEqual(session.state.playerZones['p1']!.graveyard.length, 0);
});
