import test from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
import { RoomState, CardDefinition, CardInstance } from '@mtgc/shared';
import { randomUUID } from 'crypto';

function createMockCard(name: string): CardDefinition {
  return {
    id: `card-${name}`,
    name,
    cmc: 3,
    typeLine: 'Creature',
    colors: ['U'],
    colorIdentity: ['U'],
    imageUrlNormal: 'https://cards.scryfall.io/normal/card.jpg',
  };
}

function createMockDeck(): { commanderCards: CardDefinition[]; maindeckCards: CardDefinition[] } {
  const commanderCards = [createMockCard('Urza, Lord High Artificer')];
  const maindeckCards: CardDefinition[] = [];
  for (let i = 1; i <= 99; i++) {
    maindeckCards.push(createMockCard(`Card #${i}`));
  }
  return { commanderCards, maindeckCards };
}

function createMock4PlayerRoom(): GameStateSession {
  const room: RoomState = {
    id: 'room-1',
    code: 'MULL01',
    name: 'Mesa Mulligan',
    hostId: 'pA',
    status: 'lobby',
    version: 1,
    settings: {
      maxPlayers: 4,
      startingLife: 40,
      turnTimerSeconds: 60,
      allowSpectators: true,
    },
    players: {
      pA: {
        id: 'pA',
        name: 'Alice (Host)',
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
      },
      pB: {
        id: 'pB',
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
      },
      pC: {
        id: 'pC',
        name: 'Charlie',
        isHost: false,
        isConnected: true,
        isSpectator: false,
        seatNumber: 2,
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
      },
      pD: {
        id: 'pD',
        name: 'Diana',
        isHost: false,
        isConnected: true,
        isSpectator: false,
        seatNumber: 3,
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
      },
    },
    playerZones: {},
    activePlayerId: null,
    turnOrder: ['pA', 'pB', 'pC', 'pD'],
    turnNumber: 0,
    logs: [],
  };

  const session = new GameStateSession(room);

  // Load 100-card decks for all 4 players (1 commander + 99 in library)
  for (const pid of ['pA', 'pB', 'pC', 'pD']) {
    const deck = createMockDeck();
    session.state.playerZones[pid] = {
      command: deck.commanderCards.map(c => ({
        instanceId: randomUUID(),
        definition: c,
        ownerId: pid,
        controllerId: pid,
        isCommander: true,
        isTapped: false,
        isFaceDown: false,
        rotation: 0,
        counters: {},
      })),
      library: deck.maindeckCards.map(c => ({
        instanceId: randomUUID(),
        definition: c,
        ownerId: pid,
        controllerId: pid,
        isCommander: false,
        isTapped: false,
        isFaceDown: false,
        rotation: 0,
        counters: {},
      })),
      hand: [],
      battlefield: [],
      graveyard: [],
      exile: [],
    };
    session.syncPlayerCounts(pid);
  }

  return session;
}

test('Punto 5: Flujo completo de Mulligan de Londres con 4 jugadores y regla de Commander', () => {
  const session = createMock4PlayerRoom();

  // 1. Iniciar fase de mulligan tras iniciativa
  session.startMulliganPhase();

  assert.strictEqual(session.state.status, 'mulligan');
  assert.ok(session.state.mulligan);
  assert.strictEqual(session.state.mulligan.currentDecidingPlayerId, 'pA');

  // Cada jugador tiene 7 cartas en mano inicial y 92 en biblioteca (99 - 7 = 92)
  for (const pid of ['pA', 'pB', 'pC', 'pD']) {
    const zones = session.state.playerZones[pid]!;
    assert.strictEqual(zones.hand.length, 7, `${pid} tiene 7 cartas en mano`);
    assert.strictEqual(zones.library.length, 92, `${pid} tiene 92 cartas en biblioteca`);
    assert.strictEqual(zones.command.length, 1, `${pid} tiene 1 comandante en zona de comando`);
  }

  // 2. Jugador A: se queda a la primera
  // Si Bob intenta decidir antes de tiempo, es rechazado
  assert.throws(() => session.keepHand('pB'), /No es tu turno de decidir/);

  session.keepHand('pA');
  assert.strictEqual(session.state.mulligan.players['pA']?.hasKept, true);
  assert.strictEqual(session.state.mulligan.currentDecidingPlayerId, 'pB');

  // 3. Jugador B: hace 1 mulligan (gratis de Commander, devuelve 0 cartas)
  session.takeMulligan('pB');
  assert.strictEqual(session.state.mulligan.players['pB']?.mulliganCount, 1);
  assert.strictEqual(session.state.mulligan.players['pB']?.cardsToBottomCount, 0);
  assert.strictEqual(session.state.playerZones['pB']!.hand.length, 7);
  assert.strictEqual(session.state.playerZones['pB']!.library.length, 92);

  // B se queda con su mano (devuelve 0)
  session.keepHand('pB');
  assert.strictEqual(session.state.mulligan.players['pB']?.hasKept, true);
  assert.strictEqual(session.state.mulligan.currentDecidingPlayerId, 'pC');

  // 4. Jugador C: hace 2 mulligans (el 1.º gratis, el 2.º devuelve 1 al fondo)
  // 1er mulligan de C
  session.takeMulligan('pC');
  assert.strictEqual(session.state.mulligan.players['pC']?.mulliganCount, 1);
  assert.strictEqual(session.state.mulligan.players['pC']?.cardsToBottomCount, 0);

  // 2do mulligan de C (k = 2 -> k - 1 = 1 carta al fondo)
  session.takeMulligan('pC');
  assert.strictEqual(session.state.mulligan.players['pC']?.mulliganCount, 2);
  assert.strictEqual(session.state.mulligan.players['pC']?.cardsToBottomCount, 1);
  assert.strictEqual(session.state.playerZones['pC']!.hand.length, 7);

  // Si C intenta quedarse sin elegir carta para el fondo, es rechazado
  assert.throws(() => session.keepHand('pC'), /Debes seleccionar exactamente 1 carta/);

  // C elige 1 carta de su mano para poner al fondo
  const cardToBottom = session.state.playerZones['pC']!.hand[0]!;
  const cardToBottomId = cardToBottom.instanceId;
  session.keepHand('pC', [cardToBottomId]);

  assert.strictEqual(session.state.mulligan.players['pC']?.hasKept, true);
  assert.strictEqual(
    session.state.playerZones['pC']!.hand.length,
    6,
    'C tiene 6 cartas en mano tras devolver 1',
  );
  assert.strictEqual(
    session.state.playerZones['pC']!.library.length,
    93,
    'C tiene 93 cartas en biblioteca (92 + 1 al fondo)',
  );

  // Comprobar que la carta devuelta está en el fondo de la biblioteca (índice library.length - 1)
  const cLib = session.state.playerZones['pC']!.library;
  const bottomCard = cLib[cLib.length - 1];
  assert.strictEqual(
    bottomCard?.instanceId,
    cardToBottomId,
    'La carta devuelta está al fondo de la biblioteca',
  );

  // 5. Jugador D: se desconecta y el anfitrión (A) fuerza su decisión
  assert.strictEqual(session.state.mulligan.currentDecidingPlayerId, 'pD');
  session.state.players['pD']!.isConnected = false;

  // Un jugador que no es host no puede forzar
  assert.throws(() => session.forceMulliganDecision('pB', 'pD'), /Solo el anfitrión puede forzar/);

  // Anfitrión fuerza la decisión de D
  session.forceMulliganDecision('pA', 'pD');
  assert.strictEqual(session.state.mulligan.players['pD']?.hasKept, true);
  assert.strictEqual(session.state.playerZones['pD']!.hand.length, 7);
  assert.strictEqual(session.state.playerZones['pD']!.library.length, 92);

  // 6. Al terminar todos los jugadores, la mesa pasa a estado 'playing'
  assert.strictEqual(session.state.status, 'playing');
  assert.strictEqual(session.state.activePlayerId, 'pA');
  assert.strictEqual(session.state.turnNumber, 1);

  // 7. Comprobación de fuga de información oculta (visibilidad estricta):
  // El jugador A solo ve sus propias cartas; las cartas de B, C y D están enmascaradas
  const stateForA = filterRoomStateForPlayer(session.state, 'pA');
  const handA = stateForA.playerZones['pA']!.hand;
  const handB = stateForA.playerZones['pB']!.hand;
  const handC = stateForA.playerZones['pC']!.hand;
  const handD = stateForA.playerZones['pD']!.hand;

  assert.notStrictEqual(
    handA[0]?.definition.name,
    'Carta Oculta',
    'A ve el nombre real de sus cartas',
  );
  assert.strictEqual(
    handB[0]?.definition.name,
    'Carta Oculta',
    'A ve la mano de B como Carta Oculta',
  );
  assert.strictEqual(
    handC[0]?.definition.name,
    'Carta Oculta',
    'A ve la mano de C como Carta Oculta',
  );
  assert.strictEqual(
    handD[0]?.definition.name,
    'Carta Oculta',
    'A ve la mano de D como Carta Oculta',
  );

  // Comprobar bibliotecas enmascaradas
  assert.strictEqual(stateForA.playerZones['pB']!.library[0]?.definition.name, 'Carta Oculta');
  assert.strictEqual(stateForA.playerZones['pC']!.library[0]?.definition.name, 'Carta Oculta');

  session.cleanup();
});
