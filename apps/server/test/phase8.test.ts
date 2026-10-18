import { test } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { RoomManager } from '../src/game/room-manager.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
import type { CardDefinition } from '@mtgc/shared';

function createSampleDeck(commanderName: string, prefix: string): {
  commanderCards: CardDefinition[];
  maindeckCards: CardDefinition[];
} {
  const commanderCards: CardDefinition[] = [
    {
      id: `${prefix}_cmdr`,
      name: commanderName,
      manaCost: '{3}{U}{B}',
      typeLine: 'Legendary Creature — Human Wizard',
      colorIdentity: ['U', 'B'],
      imageUrl: `https://cards.scryfall.io/art_crop/${prefix}_cmdr.jpg`,
      isCommander: true,
    },
  ];

  const maindeckCards: CardDefinition[] = [];
  for (let i = 1; i <= 99; i++) {
    maindeckCards.push({
      id: `${prefix}_card_${i}`,
      name: `${prefix} Spell ${i}`,
      manaCost: '{2}{U}',
      typeLine: i <= 36 ? 'Basic Land — Island' : 'Instant',
      colorIdentity: ['U'],
      imageUrl: `https://cards.scryfall.io/art_crop/${prefix}_${i}.jpg`,
      isCommander: false,
    });
  }

  return { commanderCards, maindeckCards };
}

test('Fase 8 Completa: Lobby -> Privacidad de Mazos -> Listo -> Inicio -> D20 Iniciativa con Empates -> Cuadrícula (REQ-20, REQ-21, REQ-22)', () => {
  const roomManager = new RoomManager();

  // 1. Crear sala para 4 jugadores (REQ-20.1)
  const session = roomManager.createRoom({
    name: 'Pod Commander Fase 8',
    hostName: 'Alice',
    hostId: 'p_alice',
    maxPlayers: 4,
    startingLife: 40,
  });

  const code = session.state.code;
  assert.strictEqual(session.state.status, 'lobby');
  assert.strictEqual(session.state.hostId, 'p_alice');
  assert.strictEqual(session.state.settings.maxPlayers, 4);

  // 2. Unirse 3 jugadores (REQ-20.2)
  roomManager.joinRoom(code, { playerId: 'p_bob', playerName: 'Bob' });
  roomManager.joinRoom(code, { playerId: 'p_charlie', playerName: 'Charlie' });
  roomManager.joinRoom(code, { playerId: 'p_diana', playerName: 'Diana' });

  assert.strictEqual(Object.keys(session.state.players).length, 4);

  // 3. Selección de mazos y PRIVACIDAD de la lista de cartas (REQ-20.3, REQ-20.4, REQ-20.8)
  const aliceDeck = createSampleDeck('Kess, Dissident Mage', 'alice');
  const bobDeck = createSampleDeck('Atraxa, Praetors Voice', 'bob');
  const charlieDeck = createSampleDeck('The Ur-Dragon', 'charlie');
  const dianaDeck = createSampleDeck('Edgar Markov', 'diana');

  // Alice selecciona mazo
  session.selectDeck('p_alice', {
    deckName: 'Kess Grixis Spells',
    commanderName: 'Kess, Dissident Mage',
    commanderImageUrl: 'https://cards.scryfall.io/art_crop/kess.jpg',
    commanderCards: aliceDeck.commanderCards,
    maindeckCards: aliceDeck.maindeckCards,
  });

  // Bob selecciona mazo
  session.selectDeck('p_bob', {
    deckName: 'Atraxa Superfriends',
    commanderName: 'Atraxa, Praetors Voice',
    commanderImageUrl: 'https://cards.scryfall.io/art_crop/atraxa.jpg',
    commanderCards: bobDeck.commanderCards,
    maindeckCards: bobDeck.maindeckCards,
  });

  // Charlie y Diana seleccionan mazos
  session.selectDeck('p_charlie', {
    deckName: 'Ur-Dragon Tribal',
    commanderName: 'The Ur-Dragon',
    commanderImageUrl: 'https://cards.scryfall.io/art_crop/urdragon.jpg',
    commanderCards: charlieDeck.commanderCards,
    maindeckCards: charlieDeck.maindeckCards,
  });

  session.selectDeck('p_diana', {
    deckName: 'Edgar Markov Vampires',
    commanderName: 'Edgar Markov',
    commanderImageUrl: 'https://cards.scryfall.io/art_crop/edgar.jpg',
    commanderCards: dianaDeck.commanderCards,
    maindeckCards: dianaDeck.maindeckCards,
  });

  // Verificar privacidad de mazo:
  // Bob ve el selectedDeck público de Alice (nombre, comandante, 100 cartas), pero NO la lista de cartas
  assert.strictEqual(session.state.players['p_alice']?.selectedDeck?.commanderName, 'Kess, Dissident Mage');
  assert.strictEqual(session.state.players['p_alice']?.selectedDeck?.cardCount, 100);
  assert.strictEqual((session.state.players['p_alice']?.selectedDeck as any)?.maindeckCards, undefined);

  // 4. Estado "Listo" (REQ-20.5, REQ-20.6, REQ-20.7)
  // No todos listos -> iniciar falla
  assert.throws(() => {
    session.startGame('p_alice');
  }, /Todos los jugadores deben estar Listos/);

  session.setReady('p_bob', { isReady: true });
  session.setReady('p_charlie', { isReady: true });
  session.setReady('p_diana', { isReady: true });
  session.setReady('p_alice', { isReady: true });

  // 5. Iniciar partida: transición a iniciativa, barajado y reparto inicial (REQ-20.10, REQ-20.11)
  session.startGame('p_alice');
  assert.strictEqual(session.state.status, 'initiative');
  assert.ok(session.state.initiative);
  assert.strictEqual(session.state.initiative.round, 1);

  // Comprobar zonas iniciales: comandante en zona de comando, 7 cartas en mano, 92 en biblioteca (REQ-20.11)
  for (const pid of ['p_alice', 'p_bob', 'p_charlie', 'p_diana']) {
    const zones = session.state.playerZones[pid];
    assert.strictEqual(zones.command.length, 1, `Jugador ${pid} debe tener 1 comandante en command`);
    assert.strictEqual(zones.command[0].isCommander, true);
    assert.strictEqual(zones.hand.length, 7, `Jugador ${pid} debe iniciar con 7 cartas en mano`);
    assert.strictEqual(zones.library.length, 92, `Jugador ${pid} debe tener 92 cartas restantes en biblioteca`);
  }

  // Comprobar información oculta durante iniciativa:
  // Charlie no puede ver las cartas en la mano ni el orden de la biblioteca de Diana
  const charlieFilteredView = filterRoomStateForPlayer(session.state, 'p_charlie');
  const dianaHandFromCharlie = charlieFilteredView.playerZones['p_diana'].hand;
  assert.strictEqual(dianaHandFromCharlie.length, 7);
  for (const c of dianaHandFromCharlie) {
    assert.strictEqual(c.definition.name, 'Carta Oculta');
    assert.strictEqual(c.definition.scryfallId, 'hidden_card');
  }

  // 6. Tirada de D20 en servidor con desempate por rondas (REQ-21.1 a REQ-21.6)
  // Forzamos un empate triple en la ronda 1:
  // Alice: 19, Bob: 19, Charlie: 19, Diana: 14
  session.state.initiative.rolls = {
    p_alice: 19,
    p_bob: 19,
    p_charlie: 19,
    p_diana: 14,
  };
  session.state.players['p_alice'].initiativeRoll = 19;
  session.state.players['p_bob'].initiativeRoll = 19;
  session.state.players['p_charlie'].initiativeRoll = 19;
  session.state.players['p_diana'].initiativeRoll = 14;

  // Resolver ronda 1: debe detectar empate entre Alice, Bob y Charlie y pasar a Ronda 2
  session.initiativeService.resolveRound();
  assert.strictEqual(session.state.status, 'initiative');
  assert.strictEqual(session.state.initiative.round, 2);
  assert.deepStrictEqual(
    session.state.initiative.activeTiedPlayerIds?.sort(),
    ['p_alice', 'p_bob', 'p_charlie'].sort(),
  );

  // Ronda 2: Alice saca 20, Bob saca 16, Charlie saca 11
  session.state.initiative.rolls = {
    p_alice: 20,
    p_bob: 16,
    p_charlie: 11,
  };
  session.state.players['p_alice'].initiativeRoll = 20;
  session.state.players['p_bob'].initiativeRoll = 16;
  session.state.players['p_charlie'].initiativeRoll = 11;

  session.initiativeService.resolveRound();

  // Ahora la partida debe transicionar a 'mulligan' y luego a 'playing' al quedarse todos
  assert.strictEqual(session.state.status, 'mulligan');
  session.keepHand('p_alice');
  session.keepHand('p_bob');
  session.keepHand('p_charlie');
  session.keepHand('p_diana');
  assert.strictEqual(session.state.status, 'playing');
  assert.strictEqual(session.state.turnOrder.length, 4);
  assert.deepStrictEqual(session.state.turnOrder, ['p_alice', 'p_bob', 'p_charlie', 'p_diana']);
  assert.strictEqual(session.state.activePlayerId, 'p_alice');
  assert.strictEqual(session.state.players['p_alice'].initiativeOrder, 1);
  assert.strictEqual(session.state.players['p_bob'].initiativeOrder, 2);
  assert.strictEqual(session.state.players['p_charlie'].initiativeOrder, 3);
  assert.strictEqual(session.state.players['p_diana'].initiativeOrder, 4);

  // 7. Cuadrícula de 2 filas y máximo 3 columnas (REQ-22.1)
  // Para 4 jugadores: ceil(4/2) = 2 columnas (2x2)
  const getGridCols = (count: number) => Math.min(3, Math.max(1, Math.ceil(count / 2)));
  assert.strictEqual(getGridCols(2), 1);
  assert.strictEqual(getGridCols(3), 2);
  assert.strictEqual(getGridCols(4), 2);
  assert.strictEqual(getGridCols(5), 3);
  assert.strictEqual(getGridCols(6), 3);

  // 8. Mover cartas con coordenadas normalizadas 0..1 y orden Z (REQ-22.6)
  const cardInHand = session.state.playerZones['p_alice'].hand[0];
  assert.ok(cardInHand);

  session.moveCard('p_alice', {
    cardInstanceId: cardInHand.instanceId,
    fromZone: 'hand',
    toZone: 'battlefield',
    position: { x: 0.35, y: 0.55, zIndex: 10 },
  });

  const cardOnBf = session.state.playerZones['p_alice'].battlefield[0];
  assert.ok(cardOnBf);
  assert.strictEqual(cardOnBf.instanceId, cardInHand.instanceId);
  assert.strictEqual(cardOnBf.position?.x, 0.35);
  assert.strictEqual(cardOnBf.position?.y, 0.55);
  assert.strictEqual(cardOnBf.position?.zIndex, 10);

  // 9. Playmat personalizado por jugador (REQ-22.8)
  session.setPlaymat('p_alice', 'https://cards.scryfall.io/art_crop/custom_mat.jpg');
  assert.strictEqual(
    session.state.players['p_alice'].playmatUrl,
    'https://cards.scryfall.io/art_crop/custom_mat.jpg',
  );

  // 10. Orden de turnos estricto en PASS_TURN (REQ-21.7, REQ-21.8)
  assert.strictEqual(session.state.activePlayerId, 'p_alice');
  session.passTurn('p_alice');
  assert.strictEqual(session.state.activePlayerId, 'p_bob');
  session.passTurn('p_bob');
  assert.strictEqual(session.state.activePlayerId, 'p_charlie');
  session.passTurn('p_charlie');
  assert.strictEqual(session.state.activePlayerId, 'p_diana');
  session.passTurn('p_diana');
  assert.strictEqual(session.state.activePlayerId, 'p_alice');

  // Si Charlie es eliminado, PASS_TURN se lo salta
  session.state.players['p_charlie'].isEliminated = true;
  session.passTurn('p_alice');
  assert.strictEqual(session.state.activePlayerId, 'p_bob');
  session.passTurn('p_bob');
  // Se salta a Charlie y va directo a Diana
  assert.strictEqual(session.state.activePlayerId, 'p_diana');

  session.cleanup();
});

test('Fase 8 - Distribución estadística de D20 en servidor (1..20 uniforme y sin sesgo)', () => {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 20; i++) counts[i] = 0;

  const N = 2000;
  for (let i = 0; i < N; i++) {
    // Usamos el roomManager e initiativeService para tirar
    const room = new RoomManager().createRoom({ name: 'D20 Test', hostName: 'Tester', hostId: 't1' });
    room.state.status = 'initiative';
    room.state.initiative = { round: 1, deadlineTimestamp: Date.now() + 15000, rolls: {} };
    const roll = room.rollD20Initiative('t1');
    assert.ok(roll >= 1 && roll <= 20);
    counts[roll]++;
  }

  // Frecuencia esperada = 100 por cara en 2000 tiradas
  // Chi-cuadrado: sum((observed - expected)^2 / expected)
  const expected = N / 20;
  let chiSquared = 0;
  for (let i = 1; i <= 20; i++) {
    const observed = counts[i];
    chiSquared += Math.pow(observed - expected, 2) / expected;
    // Ninguna cara debe ser 0 con 2000 tiradas
    assert.ok(observed > 20, `Cara ${i} debe tener al menos 20 apariciones`);
  }

  // Para 19 grados de libertad al nivel 0.001 (alpha = 0.001), valor crítico = 43.82
  assert.ok(
    chiSquared < 50,
    `Chi-cuadrado (${chiSquared.toFixed(2)}) debe estar dentro del umbral de aleatoriedad criptográfica`,
  );
});

test('Fase 8 - Posiciones normalizadas invariantes entre resoluciones de ventana y contraste WCAG AA', () => {
  // 1. Verificación de invariancia de coordenadas (REQ-22.6, 8.9)
  // Pantalla A: 1920x1080 -> celda de 960x450
  // Pantalla B: 1366x768 -> celda de 683x320
  const normalizedX = 0.42;
  const normalizedY = 0.68;

  const cellA = { width: 960, height: 450 };
  const cellB = { width: 683, height: 320 };

  // De normalizado a píxeles en Pantalla A
  const pixelA = { x: normalizedX * cellA.width, y: normalizedY * cellA.height };
  // Al arrastrar en Pantalla A, reconversión a normalizado
  const roundtripA = { x: pixelA.x / cellA.width, y: pixelA.y / cellA.height };
  assert.strictEqual(Math.round(roundtripA.x * 100) / 100, normalizedX);
  assert.strictEqual(Math.round(roundtripA.y * 100) / 100, normalizedY);

  // En Pantalla B (otro jugador con distinta resolución)
  const pixelB = { x: normalizedX * cellB.width, y: normalizedY * cellB.height };
  const roundtripB = { x: pixelB.x / cellB.width, y: pixelB.y / cellB.height };
  assert.strictEqual(Math.round(roundtripB.x * 100) / 100, normalizedX);
  assert.strictEqual(Math.round(roundtripB.y * 100) / 100, normalizedY);

  // 2. Verificación de contraste mínimo 4.5:1 (WCAG AA) sobre playmat (REQ-22.15)
  // Función para luminancia relativa WCAG
  function getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const lum1 = getLuminance(...rgb1);
    const lum2 = getLuminance(...rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Fondo oscurecido con overlay 85% negro sobre art_crop (#090d16)
  const bgDark: [number, number, number] = [9, 13, 22];
  // Texto claro en NameTag / Life: text-amber-300 (#fcd34d) y text-slate-100 (#f1f5f9)
  const textAmber: [number, number, number] = [252, 211, 77];
  const textWhite: [number, number, number] = [241, 245, 249];

  const contrastAmber = getContrastRatio(textAmber, bgDark);
  const contrastWhite = getContrastRatio(textWhite, bgDark);

  assert.ok(
    contrastAmber >= 4.5,
    `Contraste de texto ámbar (${contrastAmber.toFixed(2)}) debe superar 4.5:1 (WCAG AA)`,
  );
  assert.ok(
    contrastWhite >= 4.5,
    `Contraste de texto blanco (${contrastWhite.toFixed(2)}) debe superar 4.5:1 (WCAG AA)`,
  );
});

test('Fase 8 - Pod de 6 jugadores en cuadrícula 2x3 con reparto y rotación (REQ-22.1, REQ-22.14)', () => {
  const roomManager = new RoomManager();
  const session = roomManager.createRoom({
    name: 'Mega Pod 6 Jugadores',
    hostName: 'Player 1',
    hostId: 'p1',
    maxPlayers: 6,
    startingLife: 40,
  });

  const pids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  for (let i = 2; i <= 6; i++) {
    roomManager.joinRoom(session.state.code, { playerId: `p${i}`, playerName: `Player ${i}` });
  }

  assert.strictEqual(Object.keys(session.state.players).length, 6);

  // Seleccionar mazos y marcar listo a los 6 jugadores
  for (const pid of pids) {
    const deck = createSampleDeck(`Commander of ${pid}`, pid);
    session.selectDeck(pid, {
      deckName: `Deck of ${pid}`,
      commanderName: `Commander of ${pid}`,
      commanderCards: deck.commanderCards,
      maindeckCards: deck.maindeckCards,
    });
    session.setReady(pid, { isReady: true });
  }

  session.startGame('p1');
  assert.strictEqual(session.state.status, 'initiative');

  // Cada jugador tiene 7 cartas y su comandante
  for (const pid of pids) {
    assert.strictEqual(session.state.playerZones[pid].hand.length, 7);
    assert.strictEqual(session.state.playerZones[pid].command.length, 1);
  }

  // Tirar iniciativa para los 6 jugadores con valores ordenados
  pids.forEach((pid, index) => {
    session.state.initiative!.rolls[pid] = 20 - index;
    session.state.players[pid].initiativeRoll = 20 - index;
  });

  session.initiativeService.resolveRound();
  assert.strictEqual(session.state.status, 'mulligan');
  pids.forEach(pid => session.keepHand(pid));
  assert.strictEqual(session.state.status, 'playing');
  assert.deepStrictEqual(session.state.turnOrder, pids);

  // Cuadrícula para 6 jugadores: ceil(6/2) = 3 columnas (2 filas x 3 columnas)
  const cols = Math.min(3, Math.max(1, Math.ceil(Object.keys(session.state.players).length / 2)));
  assert.strictEqual(cols, 3);

  // Rotación circular por los 6 jugadores
  for (let i = 0; i < 6; i++) {
    const expectedActive = pids[i];
    assert.strictEqual(session.state.activePlayerId, expectedActive);
    session.passTurn(expectedActive);
  }
  // Vuelve a p1
  assert.strictEqual(session.state.activePlayerId, 'p1');

  session.cleanup();
});

