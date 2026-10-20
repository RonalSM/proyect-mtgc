import { test } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
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

  // Deshacer movimiento para probar Aleatoria
  session.undoLast('p1');
  lib = session.state.playerZones['p1']!.library;
  assert.strictEqual(lib.length, 3);
  assert.strictEqual(session.state.playerZones['p1']!.hand.length, 1);

  // B2. Enviar a biblioteca Aleatoria (Punto 2)
  session.moveCard('p1', {
    cardInstanceId: 'hand_c',
    fromZone: 'hand',
    toZone: 'library',
    randomPosition: true,
  });

  lib = session.state.playerZones['p1']!.library;
  assert.strictEqual(lib.length, 4);
  assert.ok(lib.some(c => c.instanceId === 'hand_c'), 'hand_c debe estar en la biblioteca');
  const lastLog = session.state.logs[session.state.logs.length - 1];
  assert.strictEqual(lastLog?.actionText, 'envió una carta a su biblioteca');

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

test('Corrección A.1: Revelación persistente en mano, filtrado de destinatarios en VisibilityFilter, unreveal y limpieza al salir de la mano o barajar', () => {
  const roomState = createMockRoomState();
  // Añadir un tercer jugador para verificar que el no destinatario no recibe nada
  roomState.players['p3'] = {
    id: 'p3',
    name: 'Charlie',
    seatNumber: 2,
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
  };
  roomState.playerZones['p3'] = {
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command: [],
  };

  const session = new GameStateSession(roomState);

  const card1: CardInstance = {
    instanceId: 'c1',
    definition: { scryfallId: 'sf1', name: 'Sol Ring', cmc: 1, typeLine: 'Artifact', colors: [], colorIdentity: [] },
    ownerId: 'p1',
    controllerId: 'p1',
  };
  const card2: CardInstance = {
    instanceId: 'c2',
    definition: { scryfallId: 'sf2', name: 'Mana Crypt', cmc: 0, typeLine: 'Artifact', colors: [], colorIdentity: [] },
    ownerId: 'p1',
    controllerId: 'p1',
  };

  session.state.playerZones['p1']!.hand = [card1, card2];
  session.syncPlayerCounts('p1');

  // 1. Alice (p1) revela card1 exclusivamente a Bob (p2)
  session.revealCard('p1', {
    cardInstanceId: 'c1',
    targetPlayerId: 'p2',
  });

  assert.deepStrictEqual(card1.revealedTo, ['p2']);
  assert.strictEqual(card2.revealedTo, undefined);

  // Comprobar visibilidad:
  // Alice (propietaria p1) ve ambas cartas completas y card1 tiene revealedTo
  const stateAlice = filterRoomStateForPlayer(session.state, 'p1');
  const aliceHand = stateAlice.playerZones['p1']!.hand;
  assert.strictEqual(aliceHand[0]!.definition.name, 'Sol Ring');
  assert.deepStrictEqual(aliceHand[0]!.revealedTo, ['p2']);
  assert.strictEqual(aliceHand[1]!.definition.name, 'Mana Crypt');

  // Bob (destinatario p2) ve card1 con su identidad real y revealedTo, pero card2 está enmascarada
  const stateBob = filterRoomStateForPlayer(session.state, 'p2');
  const bobViewOfHand = stateBob.playerZones['p1']!.hand;
  assert.strictEqual(bobViewOfHand[0]!.definition.name, 'Sol Ring');
  assert.deepStrictEqual(bobViewOfHand[0]!.revealedTo, ['p2']);
  assert.strictEqual(bobViewOfHand[1]!.definition.scryfallId, 'hidden_card');
  assert.strictEqual(bobViewOfHand[1]!.definition.name, 'Carta Oculta');
  assert.strictEqual(bobViewOfHand[1]!.revealedTo, undefined);

  // Charlie (p3, no destinatario) NO ve card1 (está enmascarada) ni card2, y revealedTo no existe
  const stateCharlie = filterRoomStateForPlayer(session.state, 'p3');
  const charlieViewOfHand = stateCharlie.playerZones['p1']!.hand;
  assert.strictEqual(charlieViewOfHand[0]!.definition.scryfallId, 'hidden_card');
  assert.strictEqual(charlieViewOfHand[0]!.revealedTo, undefined);
  assert.strictEqual(charlieViewOfHand[1]!.definition.scryfallId, 'hidden_card');
  assert.strictEqual(charlieViewOfHand[1]!.revealedTo, undefined);

  // 2. Deshacer revelación con unrevealCard (Dejar de revelar)
  const unrevealed = session.unrevealCard('p1', { cardInstanceId: 'c1', fromZone: 'hand' });
  assert.strictEqual(unrevealed, true);
  assert.strictEqual(card1.revealedTo, undefined);

  // Ahora Bob ya no ve card1
  const stateBobAfterUnreveal = filterRoomStateForPlayer(session.state, 'p2');
  assert.strictEqual(stateBobAfterUnreveal.playerZones['p1']!.hand[0]!.definition.scryfallId, 'hidden_card');

  // 3. Revelar a todos
  session.revealCard('p1', {
    cardInstanceId: 'c1',
  });
  assert.strictEqual(card1.revealedTo, 'all');

  const stateBobAll = filterRoomStateForPlayer(session.state, 'p2');
  assert.strictEqual(stateBobAll.playerZones['p1']!.hand[0]!.definition.name, 'Sol Ring');
  const stateCharlieAll = filterRoomStateForPlayer(session.state, 'p3');
  assert.strictEqual(stateCharlieAll.playerZones['p1']!.hand[0]!.definition.name, 'Sol Ring');

  // 4. Terminar revelación cuando la carta sale de la mano (jugar al campo de batalla)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'hand',
    toZone: 'battlefield',
    position: { x: 0.5, y: 0.5 },
  });
  const bfCard = session.state.playerZones['p1']!.battlefield.find(c => c.instanceId === 'c1');
  assert.ok(bfCard);
  assert.strictEqual(bfCard.revealedTo, undefined);

  // 5. Revelar card2 y comprobar que al barajar la biblioteca se cancela la revelación en mano
  session.revealCard('p1', { cardInstanceId: 'c2' });
  assert.strictEqual(card2.revealedTo, 'all');

  session.state.playerZones['p1']!.library = [
    { instanceId: 'l1', definition: { scryfallId: 'sl1', name: 'Forest', cmc: 0, typeLine: 'Basic Land', colors: [], colorIdentity: ['G'] }, ownerId: 'p1' },
    { instanceId: 'l2', definition: { scryfallId: 'sl2', name: 'Forest', cmc: 0, typeLine: 'Basic Land', colors: [], colorIdentity: ['G'] }, ownerId: 'p1' },
  ];
  session.shuffleLibrary('p1');
  assert.strictEqual(card2.revealedTo, undefined);
});

test('Punto 2 & Punto 3: Reseteo de contadores y P/T al salir la carta del campo de batalla', () => {
  const roomState = createMockRoomState();
  const session = new GameStateSession(roomState);

  const creatureCard: CardInstance = {
    instanceId: 'creature_pt_1',
    definition: {
      scryfallId: 'sf_creature',
      name: 'Tarmogoyf',
      cmc: 2,
      typeLine: 'Creature — Lhurgoyf',
      colors: ['G'],
      colorIdentity: ['G'],
      power: '*',
      toughness: '1+*',
    },
    ownerId: 'p1',
    controllerId: 'p1',
    counters: { '+1/+1': 3, '−1/−1': 1, charge: 2 },
    basePower: 4,
    baseToughness: 5,
    keywords: ['Vuela (Flying)'],
    position: { x: 0.5, y: 0.5, zIndex: 10 },
  };

  session.state.playerZones['p1']!.battlefield = [creatureCard];
  session.syncPlayerCounts('p1');

  // Mover al cementerio
  session.moveCard('p1', {
    cardInstanceId: 'creature_pt_1',
    fromZone: 'battlefield',
    toZone: 'graveyard',
  });

  const gyCard = session.state.playerZones['p1']!.graveyard.find(c => c.instanceId === 'creature_pt_1');
  assert.ok(gyCard, 'La carta debe estar en el cementerio');
  assert.deepStrictEqual(gyCard.counters, {}, 'Los contadores deben reiniciarse a {}');
  assert.strictEqual(gyCard.basePower, undefined, 'basePower debe ser eliminado');
  assert.strictEqual(gyCard.baseToughness, undefined, 'baseToughness debe ser eliminado');
  assert.strictEqual(gyCard.keywords, undefined, 'keywords debe ser eliminado');
  assert.strictEqual(gyCard.position, undefined, 'position debe ser eliminada');
});

test('Punto 3: setCardPT permite a cualquier jugador modificar basePower, baseToughness y contadores en carta visible, registrando en bitácora', () => {
  const roomState = createMockRoomState();
  const session = new GameStateSession(roomState);

  const bearCard: CardInstance = {
    instanceId: 'bear_1',
    definition: {
      scryfallId: 'sf_bear',
      name: 'Grizzly Bears',
      cmc: 2,
      typeLine: 'Creature — Bear',
      colors: ['G'],
      colorIdentity: ['G'],
      power: '2',
      toughness: '2',
    },
    ownerId: 'p1',
    controllerId: 'p1',
    isFaceDown: false,
    counters: {},
    position: { x: 0.5, y: 0.5, zIndex: 5 },
  };

  session.state.playerZones['p1']!.battlefield = [bearCard];
  session.syncPlayerCounts('p1');

  // Bob (p2, rival) modifica el P/T de los osos de Alice (p1): base 3/1, dos +1/+1 y un -1/-1
  session.setCardPT('p2', {
    cardInstanceId: 'bear_1',
    basePower: 3,
    baseToughness: 1,
    plusCounters: 2,
    minusCounters: 1,
  });

  const card = session.state.playerZones['p1']!.battlefield[0]!;
  assert.strictEqual(card.basePower, 3);
  assert.strictEqual(card.baseToughness, 1);
  assert.strictEqual(card.counters['+1/+1'], 2);
  assert.strictEqual(card.counters['−1/−1'], 1);

  // Bitácora registra la acción con autor Bob (p2)
  const lastLog = session.state.logs[session.state.logs.length - 1];
  assert.ok(lastLog);
  assert.strictEqual(lastLog.playerName, 'Bob');
  assert.ok(lastLog.actionText.includes('modificó poder/resistencia de "Grizzly Bears"'));
  assert.ok(lastLog.actionText.includes('4/2')); // (3+1)/(1+1) = 4/2
});
