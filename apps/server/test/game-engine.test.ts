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
        isAtRisk: false,
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
        isAtRisk: false,
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

test('GameStateSession - adjustLife & setLife flag defeat risk without automatic elimination (REQ-3.3, 3.4)', () => {
  const session = new GameStateSession(createMockRoomState());

  session.adjustLife({ playerId: 'p1', delta: -10 });
  assert.strictEqual(session.state.players['p1']?.life, 30);
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, false);

  session.adjustLife({ playerId: 'p1', delta: -30 });
  assert.strictEqual(session.state.players['p1']?.life, 0);
  // No se elimina automáticamente: queda en riesgo de derrota
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, true);
  assert.strictEqual(session.state.players['p1']?.riskReason, 'life');

  // Test manual elimination and revival
  session.setPlayerStatus({ playerId: 'p1', isEliminated: true, reason: 'life' });
  assert.strictEqual(session.state.players['p1']?.isEliminated, true);
  session.setPlayerStatus({ playerId: 'p1', isEliminated: false });
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);

  // Test setLife (REQ-3.4)
  session.setLife({ playerId: 'p1', life: 25 });
  assert.strictEqual(session.state.players['p1']?.life, 25);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, false);

  // Test Undo on setLife
  session.undoLast('p1');
  assert.strictEqual(session.state.players['p1']?.life, 0);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, true);
});

test('GameStateSession - commanderDamage triggers defeat risk at 21 damage without auto eliminate (REQ-4.2)', () => {
  const session = new GameStateSession(createMockRoomState());

  session.adjustCommanderDamage({
    targetPlayerId: 'p1',
    sourceCommanderInstanceId: 'cmdr_opponent',
    delta: 15,
  });
  assert.strictEqual(session.state.players['p1']?.commanderDamage['cmdr_opponent'], 15);
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, false);

  session.adjustCommanderDamage({
    targetPlayerId: 'p1',
    sourceCommanderInstanceId: 'cmdr_opponent',
    delta: 6,
  });
  assert.strictEqual(session.state.players['p1']?.commanderDamage['cmdr_opponent'], 21);
  // En riesgo de derrota, no eliminado automáticamente
  assert.strictEqual(session.state.players['p1']?.isEliminated, false);
  assert.strictEqual(session.state.players['p1']?.isAtRisk, true);
  assert.strictEqual(session.state.players['p1']?.riskReason, 'commander_damage');
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

test('GameStateSession - custom named player counters and token cloning (REQ-5.3, REQ-9.4)', () => {
  const session = new GameStateSession(createMockRoomState());
  const zones = session.state.playerZones['p1'];

  // REQ-5.3: Custom named player counters
  session.setPlayerCounter({ playerId: 'p1', counterType: 'rads', delta: 3 });
  assert.strictEqual(session.state.players['p1']?.counters.custom['rads'], 3);

  session.setPlayerCounter({ playerId: 'p1', counterType: 'rads', delta: -1 });
  assert.strictEqual(session.state.players['p1']?.counters.custom['rads'], 2);

  // Undo custom counter
  session.undoLast('p1');
  assert.strictEqual(session.state.players['p1']?.counters.custom['rads'], 3);

  // REQ-9.4: Token cloning on battlefield
  session.moveCard('p1', {
    cardInstanceId: 'c1',
    fromZone: 'hand',
    toZone: 'battlefield',
    position: { x: 0.3, y: 0.4 },
  });
  assert.strictEqual(zones.battlefield.length, 1);

  session.cloneToken('p1', { cardInstanceId: 'c1' });
  assert.strictEqual(zones.battlefield.length, 2);
  const cloned = zones.battlefield[1];
  assert.ok(cloned.instanceId !== 'c1');
  assert.ok(cloned.definition.name.includes('(Token)'));
  assert.strictEqual(cloned.ownerId, 'p1');

  // Undo clone
  session.undoLast('p1');
  assert.strictEqual(zones.battlefield.length, 1);
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

  // Mulligan suelta rechazada durante la partida (Punto 5)
  assert.throws(
    () => session.mulligan('p1'),
    /La acción de mulligan solo está permitida durante la fase inicial de mulligan/,
  );
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

  // Pass turn: should skip p2 and land on p3. Turn stays 1 until full circle completes.
  session.passTurn('p1');
  assert.strictEqual(session.state.activePlayerId, 'p3');
  assert.strictEqual(session.state.turnNumber, 1);

  // Pass turn from p3: completes the circle back to p1 -> turnNumber increments to 2
  session.passTurn('p3');
  assert.strictEqual(session.state.activePlayerId, 'p1');
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

test('GameStateSession - table confirmation when undoing actions affecting opponents (REQ-11.3)', () => {
  const session = new GameStateSession(createMockRoomState());

  // P1 inflicts commander damage to P2 (affects opponent)
  session.adjustCommanderDamage(
    {
      targetPlayerId: 'p2',
      sourceCommanderInstanceId: 'cmdr_p1',
      delta: 5,
    },
    'p1',
  );
  assert.strictEqual(session.state.players['p2']?.commanderDamage['cmdr_p1'], 5);

  // P1 requests undo: requires table confirmation
  const undoneDirect = session.undoLast('p1');
  assert.strictEqual(undoneDirect, false, 'No debe deshacer inmediatamente');
  assert.ok(session.state.pendingUndoProposal !== undefined);
  assert.strictEqual(session.state.pendingUndoProposal?.proposerId, 'p1');
  assert.deepStrictEqual(session.state.pendingUndoProposal?.targetPlayerIds, ['p2']);
  assert.strictEqual(session.state.players['p2']?.commanderDamage['cmdr_p1'], 5); // Still not reverted

  // P2 confirms and approves
  const proposalId = session.state.pendingUndoProposal!.id;
  const approved = session.confirmUndo('p2', { proposalId, approved: true });
  assert.strictEqual(approved, true);
  assert.strictEqual(session.state.players['p2']?.commanderDamage['cmdr_p1'], 0); // Reverted!
  assert.strictEqual(session.state.pendingUndoProposal, undefined);

  // Test rejection:
  session.adjustCommanderDamage(
    {
      targetPlayerId: 'p2',
      sourceCommanderInstanceId: 'cmdr_p1',
      delta: 7,
    },
    'p1',
  );
  session.undoLast('p1');
  assert.ok(session.state.pendingUndoProposal !== undefined);

  // P2 rejects the proposal
  const proposalId2 = session.state.pendingUndoProposal!.id;
  const rejected = session.confirmUndo('p2', { proposalId: proposalId2, approved: false });
  assert.strictEqual(rejected, false);
  assert.strictEqual(session.state.players['p2']?.commanderDamage['cmdr_p1'], 7); // Not reverted!
  assert.strictEqual(session.state.pendingUndoProposal, undefined);
});

test('GameStateSession - host can adjust turn order before/at turn 1 (REQ-6.4 / Paso 2B.7)', () => {
  const session = new GameStateSession(createMockRoomState());
  // Mock has p1 (host) and p2, turnNumber = 1, turnOrder = ['p1', 'p2'], activePlayerId = 'p1'
  assert.strictEqual(session.state.turnOrder[0], 'p1');
  assert.strictEqual(session.state.turnOrder[1], 'p2');
  assert.strictEqual(session.state.activePlayerId, 'p1');

  // Non-host (p2) tries to set turn order -> should throw
  assert.throws(() => {
    session.setTurnOrder('p2', ['p2', 'p1']);
  }, /Solo el anfitrión/);

  // Incomplete list of players -> should throw
  assert.throws(() => {
    session.setTurnOrder('p1', ['p2']);
  }, /debe incluir a todos los jugadores/);

  // Host (p1) inverts turn order before turn 1 advances
  session.setTurnOrder('p1', ['p2', 'p1']);
  assert.deepStrictEqual(session.state.turnOrder, ['p2', 'p1']);
  assert.strictEqual(session.state.activePlayerId, 'p2');

  const log = session.state.logs[session.state.logs.length - 1];
  assert.ok(log?.actionText.includes('corrigió el orden de turnos'));

  // Once game advances past turn 1, host can no longer alter turn order
  session.state.turnNumber = 2;
  assert.throws(() => {
    session.setTurnOrder('p1', ['p1', 'p2']);
  }, /solo puede corregirse antes o durante el primer turno/);
});

test('LobbyManager - deck selection, privacy, ready toggle and start validation (REQ-20 / Paso 3 / 8.2)', () => {
  const room = createMockRoomState();
  room.status = 'lobby';
  const session = new GameStateSession(room);
  const lobby = session.lobbyManager;

  // 1. Ready without deck throws
  assert.throws(() => {
    lobby.setReady('p1', true);
  }, /Debes seleccionar un mazo/);

  // 2. Select deck stores full list in private pendingDecks and only public metadata on player (REQ-20.9)
  const dummyCommander = {
    scryfallId: 'scry_cmd',
    name: 'Atraxa, Praetors Voice',
    cmc: 4,
    typeLine: 'Legendary Creature',
    colors: ['W', 'U', 'B', 'G'] as any,
    colorIdentity: ['W', 'U', 'B', 'G'] as any,
    imageUrlNormal: 'https://cards.scryfall.io/cmd.jpg',
  };
  const dummyCard = {
    scryfallId: 'scry_sol',
    name: 'Sol Ring',
    cmc: 1,
    typeLine: 'Artifact',
    colors: [] as any,
    colorIdentity: [] as any,
  };

  session.selectDeck('p1', {
    deckName: 'Atraxa Proliferate',
    commanderName: 'Atraxa, Praetors Voice',
    commanderImageUrl: 'https://cards.scryfall.io/cmd.jpg',
    commanderCards: [dummyCommander],
    maindeckCards: [dummyCard],
  });

  // Verify public state has only metadata (no cards)
  const p1PublicDeck = session.state.players['p1']?.selectedDeck;
  assert.ok(p1PublicDeck);
  assert.strictEqual(p1PublicDeck.name, 'Atraxa Proliferate');
  assert.strictEqual(p1PublicDeck.commanderName, 'Atraxa, Praetors Voice');
  assert.strictEqual((p1PublicDeck as any).maindeckCards, undefined); // Cards are NOT exposed publicly!

  // Verify private pending deck exists
  const privateDeck = lobby.getPendingDeck('p1');
  assert.ok(privateDeck);
  assert.strictEqual(privateDeck.maindeckCards.length, 1);
  assert.strictEqual(privateDeck.maindeckCards[0]?.name, 'Sol Ring');

  // 3. Mark P1 ready
  session.setReady('p1', { isReady: true });
  assert.strictEqual(session.state.players['p1']?.isReady, true);

  // 4. Can start game is false because P2 is not ready yet
  const canStart1 = lobby.canStartGame('p1');
  assert.strictEqual(canStart1.canStart, false);
  assert.ok(canStart1.reason?.includes('Pendientes:'));

  // 5. Select deck and ready for P2
  session.selectDeck('p2', {
    deckName: 'Urza Artifacts',
    commanderName: 'Urza, Lord High Artificer',
    commanderCards: [dummyCommander],
    maindeckCards: [dummyCard],
  });
  session.setReady('p2', { isReady: true });

  // 6. Non-host cannot start
  const canStartNonHost = lobby.canStartGame('p2');
  assert.strictEqual(canStartNonHost.canStart, false);

  // 7. Host can now start game
  const canStartHost = lobby.canStartGame('p1');
  assert.strictEqual(canStartHost.canStart, true);
});

test('GameStarter - starts game, deals 7 cards, commanders to command zone and transitions to initiative (REQ-20.11 / 8.3)', () => {
  const room = createMockRoomState();
  room.status = 'lobby';
  const session = new GameStateSession(room);

  const dummyCommander = {
    scryfallId: 'scry_cmd',
    name: 'Atraxa, Praetors Voice',
    cmc: 4,
    typeLine: 'Legendary Creature',
    colors: ['W', 'U', 'B', 'G'] as any,
    colorIdentity: ['W', 'U', 'B', 'G'] as any,
  };

  // Build a dummy 99-card maindeck
  const dummyMaindeck = Array.from({ length: 99 }, (_, i) => ({
    scryfallId: `scry_${i}`,
    name: `Card ${i}`,
    cmc: (i % 6) + 1,
    typeLine: 'Spell',
    colors: ['U'] as any,
    colorIdentity: ['U'] as any,
  }));

  session.selectDeck('p1', {
    deckName: 'P1 EDH',
    commanderName: 'Atraxa',
    commanderCards: [dummyCommander],
    maindeckCards: dummyMaindeck,
  });
  session.setReady('p1', { isReady: true });

  session.selectDeck('p2', {
    deckName: 'P2 EDH',
    commanderName: 'Atraxa',
    commanderCards: [dummyCommander],
    maindeckCards: dummyMaindeck,
  });
  session.setReady('p2', { isReady: true });

  // Host starts the game
  session.startGame('p1');

  // Verify room status transitioned to initiative
  assert.strictEqual(session.state.status, 'initiative');
  assert.ok(session.state.initiative);
  assert.strictEqual(session.state.initiative?.round, 1);
  assert.ok(session.state.initiative?.deadlineTimestamp > Date.now());

  // Verify zones for P1
  const p1Zones = session.state.playerZones['p1'];
  assert.ok(p1Zones);
  assert.strictEqual(p1Zones.command.length, 1);
  assert.strictEqual(p1Zones.command[0]?.definition.name, 'Atraxa, Praetors Voice');
  assert.strictEqual(p1Zones.command[0]?.isCommander, true);
  assert.strictEqual(p1Zones.hand.length, 7); // Exactly 7 opening cards
  assert.strictEqual(p1Zones.library.length, 92); // 99 - 7 = 92
  assert.strictEqual(session.state.players['p1']?.handCount, 7);
  assert.strictEqual(session.state.players['p1']?.libraryCount, 92);

  // Verify zones for P2
  const p2Zones = session.state.playerZones['p2'];
  assert.ok(p2Zones);
  assert.strictEqual(p2Zones.command.length, 1);
  assert.strictEqual(p2Zones.hand.length, 7);
  assert.strictEqual(p2Zones.library.length, 92);
  session.cleanup();
});

test('InitiativeService - authoritative D20 roll, descending order and tie breaking (REQ-21 / 8.4)', () => {
  const room = createMockRoomState();
  room.status = 'initiative';
  room.initiative = {
    round: 1,
    deadlineTimestamp: Date.now() + 15000,
    rolls: {},
  };
  const session = new GameStateSession(room);
  const initiativeSvc = session.initiativeService;

  // 1. Rolls are within 1..20
  const roll1 = session.rollD20Initiative('p1');
  assert.ok(roll1 >= 1 && roll1 <= 20);
  assert.strictEqual(session.state.initiative?.rolls['p1'], roll1);
  assert.strictEqual(session.state.players['p1']?.initiativeRoll, roll1);

  // Repeat roll returns same value
  const repeatRoll = session.rollD20Initiative('p1');
  assert.strictEqual(repeatRoll, roll1);

  // 2. Mock a tie: both players roll 18
  session.state.initiative!.rolls['p1'] = 18;
  session.state.players['p1']!.initiativeRoll = 18;
  session.state.initiative!.rolls['p2'] = 18;
  session.state.players['p2']!.initiativeRoll = 18;

  // Resolving round with tie should trigger round 2
  initiativeSvc.resolveRound();
  assert.strictEqual(session.state.status, 'initiative');
  assert.strictEqual(session.state.initiative?.round, 2);
  assert.deepStrictEqual(session.state.initiative?.activeTiedPlayerIds, ['p1', 'p2']);

  // 3. Round 2: P1 rolls 15, P2 rolls 10 -> P1 plays first!
  session.state.initiative!.rolls['p1'] = 15;
  session.state.players['p1']!.initiativeRoll = 15;
  session.state.initiative!.rolls['p2'] = 10;
  session.state.players['p2']!.initiativeRoll = 10;

  initiativeSvc.resolveRound();
  assert.strictEqual(session.state.status, 'mulligan');
  session.keepHand('p1');
  session.keepHand('p2');
  assert.strictEqual(session.state.status, 'playing');
  assert.deepStrictEqual(session.state.turnOrder, ['p1', 'p2']);
  assert.strictEqual(session.state.activePlayerId, 'p1');
  assert.strictEqual(session.state.players['p1']?.initiativeOrder, 1);
  assert.strictEqual(session.state.players['p2']?.initiativeOrder, 2);

  // 4. Test tie persistence up to round 5 breaking by seat number ascending (REQ-21.6)
  room.status = 'initiative';
  room.initiative = {
    round: 5, // 5th round!
    deadlineTimestamp: Date.now() + 15000,
    rolls: { p1: 17, p2: 17 },
    activeTiedPlayerIds: ['p1', 'p2'],
  };
  session.state.players['p1']!.seatNumber = 0;
  session.state.players['p2']!.seatNumber = 1;
  session.state.players['p1']!.initiativeRoll = 17;
  session.state.players['p2']!.initiativeRoll = 17;

  initiativeSvc.resolveRound();
  assert.strictEqual(session.state.status, 'mulligan');
  session.keepHand('p1');
  session.keepHand('p2');
  assert.strictEqual(session.state.status, 'playing');
  assert.strictEqual(session.state.turnOrder[0], 'p1'); // Seat 0 plays before Seat 1
  assert.strictEqual(session.state.turnOrder[1], 'p2');

  // 5. Auto-roll on timeout / unrolled players (REQ-21.4)
  room.status = 'initiative';
  room.initiative = {
    round: 1,
    deadlineTimestamp: Date.now() - 1000,
    rolls: {},
  };
  session.state.players['p1']!.initiativeRoll = undefined;
  session.state.players['p2']!.initiativeRoll = undefined;

  initiativeSvc.resolveCurrentRoundWithAutoRolls();
  // If random roll resulted in a tie, resolve subsequent tiebreak rounds up to completion (REQ-21.6)
  while (session.state.status === 'initiative') {
    initiativeSvc.resolveCurrentRoundWithAutoRolls();
  }
  assert.strictEqual(session.state.status, 'mulligan');
  session.state.turnOrder.forEach(pid => session.keepHand(pid));
  assert.strictEqual(session.state.status, 'playing');
  assert.ok(session.state.players['p1']?.initiativeRoll !== undefined);
  assert.ok(session.state.players['p2']?.initiativeRoll !== undefined);
  assert.strictEqual(session.state.turnOrder.length, 2);

  session.cleanup();
});
