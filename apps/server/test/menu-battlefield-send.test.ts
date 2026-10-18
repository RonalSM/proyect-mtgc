import test, { describe } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import type { RoomState, CardInstance, CardDefinition } from '@mtgc/shared';

function createDummyCard(id: string, name: string, ownerId: string): CardInstance {
  const def: CardDefinition = {
    scryfallId: `scry_${id}`,
    name,
    cmc: 2,
    typeLine: 'Creature',
    colors: ['G'],
    colorIdentity: ['G'],
  };
  return {
    instanceId: id,
    definition: def,
    ownerId,
    controllerId: ownerId,
    isCommander: false,
    isTapped: false,
    isFaceDown: false,
    rotation: 0,
    counters: {},
  };
}

function createRoomWithPlayers(numPlayers: 2 | 4 | 6): GameStateSession {
  const players: RoomState['players'] = {};
  const playerZones: RoomState['playerZones'] = {};

  for (let i = 0; i < numPlayers; i++) {
    const pId = `player_${i}`;
    players[pId] = {
      id: pId,
      name: `Player ${i}`,
      seatNumber: i,
      isHost: i === 0,
      isReady: true,
      life: 40,
      commanderDamage: {},
      counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0 },
      isConnected: true,
      isSpectator: false,
      isEliminated: false,
      deckLoaded: true,
      handCount: 5,
      libraryCount: 90,
      graveyardCount: 2,
      exileCount: 1,
    };

    playerZones[pId] = {
      library: [
        createDummyCard(`lib_${i}_1`, `Lib Card 1 of ${i}`, pId),
        createDummyCard(`lib_${i}_2`, `Lib Card 2 of ${i}`, pId),
      ],
      hand: [
        createDummyCard(`hand_${i}_1`, `Hand Card 1 of ${i}`, pId),
        createDummyCard(`hand_${i}_2`, `Hand Card 2 of ${i}`, pId),
      ],
      battlefield: [],
      graveyard: [
        createDummyCard(`gy_${i}_1`, `GY Card 1 of ${i}`, pId),
      ],
      exile: [
        createDummyCard(`ex_${i}_1`, `Exile Card 1 of ${i}`, pId),
      ],
      command: [
        createDummyCard(`cmd_${i}`, `Commander ${i}`, pId),
      ],
    };
  }

  const initialState: RoomState = {
    code: `TEST${numPlayers}P`,
    name: `Mesa ${numPlayers}P Test`,
    hostId: 'player_0',
    status: 'playing',
    version: 1,
    players,
    playerZones,
    activePlayerId: 'player_0',
    turnNumber: 1,
    turnOrder: Object.keys(players),
    undoStack: [],
    logs: [],
  };

  return new GameStateSession(initialState);
}

describe('Punto 2: Enviar al campo desde el menú con clic derecho (2, 4 y 6 jugadores)', () => {
  test('2 Jugadores: cartas enviadas desde el menú van al centro de su sección con cascada, ownerId y holderId', () => {
    const session = createRoomWithPlayers(2);

    // Player 0 envía 3 cartas desde la mano / cementerio a la mesa
    session.moveCard('player_0', {
      cardInstanceId: 'hand_0_1',
      fromZone: 'hand',
      toZone: 'battlefield',
      toPlayerId: 'player_0',
    });
    session.moveCard('player_0', {
      cardInstanceId: 'hand_0_2',
      fromZone: 'hand',
      toZone: 'battlefield',
      toPlayerId: 'player_0',
    });
    session.moveCard('player_0', {
      cardInstanceId: 'gy_0_1',
      fromZone: 'graveyard',
      toZone: 'battlefield',
      toPlayerId: 'player_0',
    });

    const c1 = session.findBattlefieldCard('hand_0_1')?.card;
    const c2 = session.findBattlefieldCard('hand_0_2')?.card;
    const c3 = session.findBattlefieldCard('gy_0_1')?.card;

    assert.ok(c1 && c2 && c3, 'Las 3 cartas deben estar en el campo de batalla');

    // Player 0 está en la mitad izquierda (x in [0, 0.5])
    assert.ok(c1.position!.x >= 0.15 && c1.position!.x <= 0.35, `c1 x (${c1.position!.x}) debe estar cerca del centro de player 0 (0.25)`);
    assert.ok(c1.position!.y >= 0.40 && c1.position!.y <= 0.60, `c1 y (${c1.position!.y}) debe estar cerca del centro de player 0 (0.50)`);
    assert.strictEqual(c1.ownerId, 'player_0');
    assert.strictEqual(c1.holderId, 'player_0');

    // Cascada: c2 y c3 deben tener desplazamientos distintos (no apiladas en el mismo punto)
    assert.notStrictEqual(c1.position!.x, c2.position!.x);
    assert.notStrictEqual(c2.position!.x, c3.position!.x);
    assert.strictEqual(c2.holderId, 'player_0');
    assert.strictEqual(c3.holderId, 'player_0');

    // Player 1 envía carta a la mesa
    session.moveCard('player_1', {
      cardInstanceId: 'hand_1_1',
      fromZone: 'hand',
      toZone: 'battlefield',
      toPlayerId: 'player_1',
    });
    const cBob = session.findBattlefieldCard('hand_1_1')?.card;
    assert.ok(cBob);
    // Player 1 está en la mitad derecha (x in [0.5, 1.0])
    assert.ok(cBob.position!.x >= 0.65 && cBob.position!.x <= 0.85, `cBob x (${cBob.position!.x}) debe estar cerca del centro de player 1 (0.75)`);
    assert.strictEqual(cBob.ownerId, 'player_1');
    assert.strictEqual(cBob.holderId, 'player_1');
  });

  test('4 Jugadores: cartas enviadas desde el menú van al centro de su división (2 filas x 2 cols) con cascada', () => {
    const session = createRoomWithPlayers(4);

    for (let i = 0; i < 4; i++) {
      const pId = `player_${i}`;
      session.moveCard(pId, {
        cardInstanceId: `hand_${i}_1`,
        fromZone: 'hand',
        toZone: 'battlefield',
        toPlayerId: pId,
      });

      const card = session.findBattlefieldCard(`hand_${i}_1`)?.card;
      assert.ok(card, `Carta de ${pId} debe estar en el campo`);
      assert.strictEqual(card.ownerId, pId);
      assert.strictEqual(card.holderId, pId);

      // Comprobar cuadrícula 2x2
      const expectedCol = i % 2;
      const expectedRow = Math.floor(i / 2);
      const expectedCenterX = (expectedCol + 0.5) / 2;
      const expectedCenterY = (expectedRow + 0.5) / 2;

      assert.ok(
        Math.abs(card.position!.x - (expectedCenterX - 0.0225)) < 0.05,
        `Posición X de ${pId} debe coincidir con su cuadrante`,
      );
      assert.ok(
        Math.abs(card.position!.y - (expectedCenterY - 0.0475)) < 0.05,
        `Posición Y de ${pId} debe coincidir con su cuadrante`,
      );
    }
  });

  test('6 Jugadores: cartas enviadas desde el menú van al centro de su división (2 filas x 3 cols) con cascada', () => {
    const session = createRoomWithPlayers(6);

    for (let i = 0; i < 6; i++) {
      const pId = `player_${i}`;
      session.moveCard(pId, {
        cardInstanceId: `hand_${i}_1`,
        fromZone: 'hand',
        toZone: 'battlefield',
        toPlayerId: pId,
      });

      const card = session.findBattlefieldCard(`hand_${i}_1`)?.card;
      assert.ok(card, `Carta de ${pId} debe estar en el campo`);
      assert.strictEqual(card.ownerId, pId);
      assert.strictEqual(card.holderId, pId);

      // Comprobar cuadrícula 2x3
      const expectedCol = i % 3;
      const expectedRow = Math.floor(i / 3);
      const expectedCenterX = (expectedCol + 0.5) / 3;
      const expectedCenterY = (expectedRow + 0.5) / 2;

      assert.ok(
        Math.abs(card.position!.x - (expectedCenterX - 0.0225)) < 0.05,
        `Posición X de ${pId} (${card.position!.x}) debe coincidir con centro col ${expectedCol} (${expectedCenterX})`,
      );
      assert.ok(
        Math.abs(card.position!.y - (expectedCenterY - 0.0475)) < 0.05,
        `Posición Y de ${pId} (${card.position!.y}) debe coincidir con centro row ${expectedRow} (${expectedCenterY})`,
      );
    }
  });
});
