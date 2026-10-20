import test from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { RoomState } from '@mtgc/shared';

function createMockRoomState(): RoomState {
  return {
    code: 'AUTO01',
    hostId: 'p1',
    status: 'lobby',
    version: 1,
    settings: {
      maxPlayers: 4,
      startingLife: 40,
      turnTimerSeconds: 60,
    },
    players: {
      p1: {
        id: 'p1',
        name: 'Alice',
        isHost: true,
        isConnected: true,
        isSpectator: false,
        seatNumber: 0,
        life: 40,
        poisonCounters: 0,
        experienceCounters: 0,
        energyCounters: 0,
        ticketCounters: 0,
        commanderTax: 0,
        counters: { poison: 0, energy: 0, experience: 0, custom: {} },
        commanderDamage: {},
        deckLoaded: true,
        isReady: true,
        selectedDeck: {
          id: 'deck-1',
          name: 'Atraxa EDH',
          commanderName: "Atraxa, Praetors' Voice",
          isValid: true,
          warnings: [],
          cardCount: 100,
        },
      },
      p2: {
        id: 'p2',
        name: 'Bob',
        isHost: false,
        isConnected: true,
        isSpectator: false,
        seatNumber: 1,
        life: 40,
        poisonCounters: 0,
        experienceCounters: 0,
        energyCounters: 0,
        ticketCounters: 0,
        commanderTax: 0,
        counters: { poison: 0, energy: 0, experience: 0, custom: {} },
        commanderDamage: {},
        deckLoaded: true,
        isReady: true,
        selectedDeck: {
          id: 'deck-2',
          name: 'Urza EDH',
          commanderName: 'Urza, Lord High Artificer',
          isValid: true,
          warnings: [],
          cardCount: 100,
        },
      },
    },
    playerZones: {
      p1: { library: [], hand: [], battlefield: [], graveyard: [], exile: [], command: [] },
      p2: { library: [], hand: [], battlefield: [], graveyard: [], exile: [], command: [] },
    },
    activePlayerId: null,
    turnOrder: [],
    turnNumber: 0,
    logs: [],
  };
}

test('Punto 4: Tirada de iniciativa automatica en servidor sin accion de cliente', () => {
  const room = createMockRoomState();
  room.status = 'initiative';
  room.initiative = {
    round: 1,
    deadlineTimestamp: Date.now() + 3500,
    rolls: {},
  };
  const session = new GameStateSession(room);

  // 1. startAutomaticInitiative rolls for all seated players automatically
  session.initiativeService.startAutomaticInitiative({
    rollDisplayMs: 0,
    tieDisplayMs: 0,
    resolveDisplayMs: 0,
    autoAdvance: false,
  });

  assert.strictEqual(session.state.status, 'initiative');
  assert.ok(session.state.initiative);
  assert.strictEqual(session.state.initiative.round, 1);

  // Both players received a valid D20 roll
  const rollP1 = session.state.initiative.rolls['p1'];
  const rollP2 = session.state.initiative.rolls['p2'];
  assert.ok(rollP1 !== undefined && rollP1 >= 1 && rollP1 <= 20);
  assert.ok(rollP2 !== undefined && rollP2 >= 1 && rollP2 <= 20);
  assert.strictEqual(session.state.players['p1']?.initiativeRoll, rollP1);
  assert.strictEqual(session.state.players['p2']?.initiativeRoll, rollP2);

  // Logs recorded the rolls
  const p1Log = session.state.logs.find(
    l => l.playerId === 'p1' && l.actionText.includes('tiró un D20 de iniciativa'),
  );
  const p2Log = session.state.logs.find(
    l => l.playerId === 'p2' && l.actionText.includes('tiró un D20 de iniciativa'),
  );
  assert.ok(p1Log, 'Alice log recorded D20 roll');
  assert.ok(p2Log, 'Bob log recorded D20 roll');

  session.cleanup();
});

test('Punto 4: Desempate automatico en servidor sin intervencion de ningun jugador', () => {
  const room = createMockRoomState();
  room.status = 'initiative';
  room.initiative = {
    round: 1,
    deadlineTimestamp: Date.now() + 3500,
    rolls: { p1: 18, p2: 18 }, // Forzar empate
  };
  room.players['p1']!.initiativeRoll = 18;
  room.players['p2']!.initiativeRoll = 18;

  const session = new GameStateSession(room);

  // Resolving round with tie triggers round 2 automatically
  session.initiativeService.resolveRound({
    rollDisplayMs: 0,
    tieDisplayMs: 0,
    resolveDisplayMs: 0,
    autoAdvance: false,
  });

  assert.strictEqual(session.state.status, 'initiative');
  assert.strictEqual(session.state.initiative?.round, 2);
  assert.deepStrictEqual(session.state.initiative?.activeTiedPlayerIds, ['p1', 'p2']);

  // Server automatically generated new rolls for round 2 for both tied players
  const round2RollP1 = session.state.initiative?.rolls['p1'];
  const round2RollP2 = session.state.initiative?.rolls['p2'];
  assert.ok(round2RollP1 !== undefined && round2RollP1 >= 1 && round2RollP1 <= 20);
  assert.ok(round2RollP2 !== undefined && round2RollP2 >= 1 && round2RollP2 <= 20);

  // Final resolution
  session.state.initiative!.rolls['p1'] = 20;
  session.state.players['p1']!.initiativeRoll = 20;
  session.state.initiative!.rolls['p2'] = 12;
  session.state.players['p2']!.initiativeRoll = 12;

  session.initiativeService.resolveRound({ autoAdvance: false });

  assert.strictEqual(session.state.status, 'mulligan');
  session.keepHand('p1');
  session.keepHand('p2');
  assert.strictEqual(session.state.status, 'playing');
  assert.deepStrictEqual(session.state.turnOrder, ['p1', 'p2']);
  assert.strictEqual(session.state.activePlayerId, 'p1');
  assert.strictEqual(session.state.players['p1']?.initiativeOrder, 1);
  assert.strictEqual(session.state.players['p2']?.initiativeOrder, 2);

  session.cleanup();
});

test('Punto 4: Boton de dados libres en la barra continua siendo tirado por el servidor', () => {
  const room = createMockRoomState();
  room.status = 'playing';
  const session = new GameStateSession(room);

  const rollD20 = session.rollDice('p1', 20);
  assert.ok(rollD20 >= 1 && rollD20 <= 20);

  const rollD6 = session.rollDice('p1', 6);
  assert.ok(rollD6 >= 1 && rollD6 <= 6);

  const rollCoin = session.rollDice('p1', 2);
  assert.ok(rollCoin === 1 || rollCoin === 2);

  const diceLog = session.state.logs.find(
    l => l.playerId === 'p1' && l.actionText.includes('tiró un D20'),
  );
  assert.ok(diceLog);

  session.cleanup();
});
