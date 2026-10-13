import test from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { roomManager } from '../src/game/room-manager.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
import { secureShuffle, secureRoll } from '../src/game/csprng.js';
import { RoomState, CardDefinition } from '@mtgc/shared';

function createMockRoomState(): RoomState {
  return {
    id: 'room_mock',
    code: 'TEST01',
    name: 'Test Room',
    hostId: 'p1',
    status: 'in_progress',
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
        deckLoaded: true,
        handCount: 7,
        libraryCount: 92,
        graveyardCount: 0,
        exileCount: 0,
      },
      p2: {
        id: 'p2',
        name: 'Player 2',
        seatNumber: 1,
        isHost: false,
        isSpectator: false,
        isConnected: true,
        life: 40,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        deckLoaded: true,
        handCount: 7,
        libraryCount: 92,
        graveyardCount: 0,
        exileCount: 0,
      },
    },
    playerZones: {
      p1: {
        library: [],
        hand: [
          {
            instanceId: 'c1',
            definition: {
              scryfallId: 'sol_ring',
              name: 'Sol Ring',
              cmc: 1,
              typeLine: 'Artifact',
              colors: [],
              colorIdentity: [],
            },
            ownerId: 'p1',
            controllerId: 'p1',
            isCommander: false,
            isTapped: false,
            isFaceDown: false,
            rotation: 0,
            counters: {},
          },
        ],
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
    turnOrder: ['p1', 'p2'],
    activePlayerId: 'p1',
    turnNumber: 1,
    version: 1,
    logs: [],
  };
}

test('GameStateSession - adjustLife modifies life and flags defeat at 0', () => {
  const session = new GameStateSession(createMockRoomState());

  session.adjustLife({ playerId: 'p1', delta: -10 });
  assert.strictEqual(session.state.players['p1']?.life, 30);
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);

  session.adjustLife({ playerId: 'p1', delta: -30 });
  assert.strictEqual(session.state.players['p1']?.life, 0);
  assert.strictEqual(session.state.players['p1']?.isEliminated, true);
  assert.strictEqual(session.state.players['p1']?.eliminationReason, 'life');

  // Test Undo
  session.undoLast('p1');
  assert.strictEqual(session.state.players['p1']?.life, 30);
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);
});

test('GameStateSession - commanderDamage triggers defeat at 21 damage', () => {
  const session = new GameStateSession(createMockRoomState());

  session.adjustCommanderDamage({
    targetPlayerId: 'p1',
    sourceCommanderInstanceId: 'cmdr_opponent',
    delta: 15,
  });
  assert.strictEqual(session.state.players['p1']?.commanderDamage['cmdr_opponent'], 15);
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);

  session.adjustCommanderDamage({
    targetPlayerId: 'p1',
    sourceCommanderInstanceId: 'cmdr_opponent',
    delta: 6,
  });
  assert.strictEqual(session.state.players['p1']?.commanderDamage['cmdr_opponent'], 21);
  assert.strictEqual(session.state.players['p1']?.isEliminated, true);
  assert.strictEqual(session.state.players['p1']?.eliminationReason, 'commander_damage');
});

test('VisibilityFilter - masks opponent hand while leaving owner hand intact', () => {
  const state = createMockRoomState();

  // P1 views the state: sees Sol Ring
  const p1View = filterRoomStateForPlayer(state, 'p1');
  assert.strictEqual(p1View.playerZones['p1']?.hand[0]?.definition.name, 'Sol Ring');

  // P2 views the state: sees "Carta Oculta"
  const p2View = filterRoomStateForPlayer(state, 'p2');
  assert.strictEqual(p2View.playerZones['p1']?.hand[0]?.definition.name, 'Carta Oculta');
  assert.strictEqual(p2View.playerZones['p1']?.hand[0]?.definition.scryfallId, 'hidden_card');
});

test('CSPRNG - secureShuffle preserves array length and elements', () => {
  const original = Array.from({ length: 99 }, (_, i) => `card_${i}`);
  const shuffled = secureShuffle(original);

  assert.strictEqual(shuffled.length, 99);
  assert.strictEqual(new Set(shuffled).size, 99);
  // Unbiased permutation check (extremely high probability order differs)
  assert.notDeepStrictEqual(original, shuffled);
});

test('RoomManager - creates room with 6-char code and manages seats', () => {
  const session = roomManager.createRoom({
    name: 'Casual EDH',
    hostName: 'Alice',
    hostId: 'alice_1',
    maxPlayers: 3,
  });

  assert.match(session.state.code, /^[A-Z0-9]{6}$/);
  assert.strictEqual(session.state.players['alice_1']?.seatNumber, 0);

  // Bob joins
  const { player: bob } = roomManager.joinRoom(session.state.code, {
    playerId: 'bob_2',
    playerName: 'Bob',
  });
  assert.strictEqual(bob.seatNumber, 1);

  // Charlie joins
  const { player: charlie } = roomManager.joinRoom(session.state.code, {
    playerId: 'charlie_3',
    playerName: 'Charlie',
  });
  assert.strictEqual(charlie.seatNumber, 2);

  // 4th player should fail (maxPlayers: 3)
  assert.throws(() => {
    roomManager.joinRoom(session.state.code, {
      playerId: 'david_4',
      playerName: 'David',
    });
  }, /llena/);
});

test('GameStateSession - moveCard, tap, counters, flip, untapAll, and undo', () => {
  const session = new GameStateSession(createMockRoomState());

  // 1. Move card from hand to battlefield
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'hand',
    toZone: 'battlefield',
    position: { x: 100, y: 150, zIndex: 2 },
  });

  const zones = session.state.playerZones['p1'];
  assert.strictEqual(zones.hand.length, 0);
  assert.strictEqual(zones.battlefield.length, 1);
  const cardOnBf = zones.battlefield[0];
  assert.strictEqual(cardOnBf?.instanceId, 'c1');
  assert.deepStrictEqual(cardOnBf?.position, { x: 100, y: 150, zIndex: 2 });

  // 2. Tap card
  session.tapCard('p1', { cardInstanceId: 'c1', isTapped: true });
  assert.strictEqual(cardOnBf.isTapped, true);
  assert.strictEqual(cardOnBf.rotation, 90);

  // 3. Counters (+1/+1)
  session.setCardCounter('p1', { cardInstanceId: 'c1', counterType: '+1/+1', delta: 2 });
  assert.strictEqual(cardOnBf.counters['+1/+1'], 2);

  // 4. Flip card face down
  session.flipCard('p1', { cardInstanceId: 'c1', isFaceDown: true });
  assert.strictEqual(cardOnBf.isFaceDown, true);

  // 5. Untap all
  session.untapAll('p1');
  assert.strictEqual(cardOnBf.isTapped, false);
  assert.strictEqual(cardOnBf.rotation, 0);

  // 6. Undo the move to battlefield
  // We have undo records. Let's undo last undoable action (moveCard was registered on undo stack)
  const undone = session.undoLast('p1');
  assert.strictEqual(undone, true);
  assert.strictEqual(zones.battlefield.length, 0);
  assert.strictEqual(zones.hand.length, 1);
});

test('GameStateSession - drag & drop repositioning and zone transfers', () => {
  const session = new GameStateSession(createMockRoomState());
  const zones = session.state.playerZones['p1'];

  // 1. Move card from hand to battlefield with position { x, y } (no zIndex provided)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'hand',
    toZone: 'battlefield',
    position: { x: 220, y: 180 },
  });

  assert.strictEqual(zones.hand.length, 0);
  assert.strictEqual(zones.battlefield.length, 1);
  const card = zones.battlefield[0];
  assert.strictEqual(card?.instanceId, 'c1');
  assert.strictEqual(card?.position?.x, 220);
  assert.strictEqual(card?.position?.y, 180);
  assert.strictEqual(card?.position?.zIndex, 1); // default zIndex applied

  // 2. Reposition card freely on the battlefield (battlefield -> battlefield)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'battlefield',
    toZone: 'battlefield',
    position: { x: 350, y: 400, zIndex: 10 },
  });

  assert.strictEqual(zones.battlefield.length, 1);
  assert.strictEqual(zones.battlefield[0]?.position?.x, 350);
  assert.strictEqual(zones.battlefield[0]?.position?.y, 400);
  assert.strictEqual(zones.battlefield[0]?.position?.zIndex, 10);

  // 3. Move card from battlefield to graveyard (destroy/sacrifice via drag)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'battlefield',
    toZone: 'graveyard',
  });

  assert.strictEqual(zones.battlefield.length, 0);
  assert.strictEqual(zones.graveyard.length, 1);
  assert.strictEqual(zones.graveyard[0]?.instanceId, 'c1');
  assert.strictEqual(zones.graveyard[0]?.position, undefined);

  // 4. Move card from graveyard back to hand (recursion via drag)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'graveyard',
    toZone: 'hand',
  });

  assert.strictEqual(zones.graveyard.length, 0);
  assert.strictEqual(zones.hand.length, 1);
  assert.strictEqual(zones.hand[0]?.instanceId, 'c1');

  // 5. Move card from hand to exile (exile via drag)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'hand',
    toZone: 'exile',
  });

  assert.strictEqual(zones.hand.length, 0);
  assert.strictEqual(zones.exile.length, 1);
  assert.strictEqual(zones.exile[0]?.instanceId, 'c1');

  // 6. Move card from exile to battlefield (reanimate/cast from exile via drag)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'exile',
    toZone: 'battlefield',
    position: { x: 120, y: 150, zIndex: 12 },
  });

  assert.strictEqual(zones.exile.length, 0);
  assert.strictEqual(zones.battlefield.length, 1);
  assert.strictEqual(zones.battlefield[0]?.instanceId, 'c1');
  assert.deepStrictEqual(zones.battlefield[0]?.position, { x: 120, y: 150, zIndex: 12 });

  // 7. Move card from battlefield to library (tuck via drag)
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'battlefield',
    toZone: 'library',
    destinationIndex: 0,
  });

  assert.strictEqual(zones.battlefield.length, 0);
  assert.strictEqual(zones.library.length, 1);
  assert.strictEqual(zones.library[0]?.instanceId, 'c1');

  // 8. Setup commander card and test command -> battlefield -> command
  zones.command.push({
    instanceId: 'cmd_1',
    definition: {
      scryfallId: 'cmd_scryfall_1',
      name: 'Atraxa, Praetors Voice',
      cmc: 4,
      typeLine: 'Legendary Creature',
      colors: ['W', 'U', 'B', 'G'],
      colorIdentity: ['W', 'U', 'B', 'G'],
    },
    ownerId: 'p1',
    controllerId: 'p1',
    isCommander: true,
    isTapped: false,
    isFaceDown: false,
    rotation: 0,
    counters: {},
  });

  // Drag commander from command zone to battlefield
  session.moveCard('p1', {
    cardInstanceId: 'cmd_1',
    fromZone: 'command',
    toZone: 'battlefield',
    position: { x: 250, y: 250, zIndex: 15 },
  });

  assert.strictEqual(zones.command.length, 0);
  assert.strictEqual(zones.battlefield.length, 1);
  assert.strictEqual(zones.battlefield[0]?.instanceId, 'cmd_1');
  assert.strictEqual(zones.battlefield[0]?.isCommander, true);

  // Drag commander from battlefield back to command zone
  session.moveCard('p1', {
    cardInstanceId: 'cmd_1',
    fromZone: 'battlefield',
    toZone: 'command',
  });

  assert.strictEqual(zones.battlefield.length, 0);
  assert.strictEqual(zones.command.length, 1);
  assert.strictEqual(zones.command[0]?.instanceId, 'cmd_1');
  assert.strictEqual(zones.command[0]?.isCommander, true);
});

test('GameStateSession - drawCards, undo draw, and mulligan', () => {
  const session = new GameStateSession(createMockRoomState());
  const zones = session.state.playerZones['p1'];

  // Put 10 dummy cards into library
  for (let i = 0; i < 10; i++) {
    zones.library.push({
      instanceId: `lib_${i}`,
      definition: {
        scryfallId: `card_${i}`,
        name: `Card ${i}`,
        cmc: 2,
        typeLine: 'Creature',
        colors: [],
        colorIdentity: [],
      },
      ownerId: 'p1',
      controllerId: 'p1',
      isCommander: false,
      isTapped: false,
      isFaceDown: false,
      rotation: 0,
      counters: {},
    });
  }
  session.syncPlayerCounts('p1');
  assert.strictEqual(zones.library.length, 10);
  assert.strictEqual(zones.hand.length, 1);

  // Draw 2 cards
  session.drawCards('p1', 2);
  assert.strictEqual(zones.hand.length, 3);
  assert.strictEqual(zones.library.length, 8);

  // Undo draw
  session.undoLast('p1');
  assert.strictEqual(zones.hand.length, 1);
  assert.strictEqual(zones.library.length, 10);

  // Mulligan: puts hand in library, shuffles and draws 7
  session.mulligan('p1');
  assert.strictEqual(zones.hand.length, 7);
  assert.strictEqual(zones.library.length, 4); // 11 total - 7 drawn = 4
});

test('GameStateSession - passTurn skips eliminated players and increments turnNumber', () => {
  const session = new GameStateSession(createMockRoomState());
  // Active player is p1. Turn number is 1.
  assert.strictEqual(session.state.activePlayerId, 'p1');
  assert.strictEqual(session.state.turnNumber, 1);

  // Eliminate p2
  session.state.players['p2']!.isEliminated = true;

  // Add p3 to turn order
  session.state.turnOrder.push('p3');
  session.state.players['p3'] = {
    id: 'p3',
    name: 'Player 3',
    seatNumber: 2,
    isHost: false,
    isSpectator: false,
    isConnected: true,
    life: 40,
    commanderDamage: {},
    counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
    isEliminated: false,
    deckLoaded: true,
    handCount: 7,
    libraryCount: 92,
    graveyardCount: 0,
    exileCount: 0,
  };

  // Pass turn: should skip p2 and land on p3
  session.passTurn('p1');
  assert.strictEqual(session.state.activePlayerId, 'p3');
  assert.strictEqual(session.state.turnNumber, 2);
});

test('GameStateSession - rollDice produces valid bounds and logs results', () => {
  const session = new GameStateSession(createMockRoomState());
  const d20 = session.rollDice('p1', 20);
  assert.ok(d20 >= 1 && d20 <= 20);

  const d6 = session.rollDice('p1', 6);
  assert.ok(d6 >= 1 && d6 <= 6);

  const d2 = session.rollDice('p1', 2);
  assert.ok(d2 === 1 || d2 === 2);

  const lastLog = session.state.logs[session.state.logs.length - 1];
  assert.ok(lastLog?.actionText.includes('🎲'));
});
