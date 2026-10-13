import test from 'node:test';
import assert from 'node:assert';
import { roomManager } from '../src/game/room-manager.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';

test('Integration Test - Lifecycle: Crear mesa -> unirse -> jugar -> reconectar', async () => {
  // 1. Host creates room
  const session = roomManager.createRoom({
    name: 'Partida Integración EDH',
    hostName: 'Alice',
    hostId: 'alice_host',
    maxPlayers: 4,
    startingLife: 40,
  });

  const roomCode = session.state.code;
  assert.ok(roomCode);
  assert.strictEqual(session.state.turnOrder.length, 1);
  assert.strictEqual(session.state.players['alice_host']?.life, 40);

  // 2. Bob joins room
  const { player: bob } = roomManager.joinRoom(roomCode, {
    playerId: 'bob_player',
    playerName: 'Bob',
  });
  assert.strictEqual(bob.seatNumber, 1);
  assert.strictEqual(session.state.turnOrder.length, 2);

  // 3. Alice loads deck & draws
  session.loadDeck(
    'alice_host',
    [
      {
        scryfallId: 'cmd_alice',
        name: 'Atraxa',
        cmc: 4,
        typeLine: 'Legendary Creature',
        colors: ['W', 'U', 'B', 'G'],
        colorIdentity: ['W', 'U', 'B', 'G'],
      },
    ],
    Array.from({ length: 99 }, (_, i) => ({
      scryfallId: `c_${i}`,
      name: `Carta #${i + 1}`,
      cmc: 2,
      typeLine: 'Artifact',
      colors: [],
      colorIdentity: [],
    })),
  );

  assert.strictEqual(session.state.playerZones['alice_host']?.hand.length, 7);
  assert.strictEqual(session.state.playerZones['alice_host']?.library.length, 92);

  // 4. Bob takes life and commander damage
  session.adjustLife({ playerId: 'bob_player', delta: -3 });
  assert.strictEqual(session.state.players['bob_player']?.life, 37);

  session.adjustCommanderDamage({
    targetPlayerId: 'bob_player',
    sourceCommanderInstanceId: 'cmd_alice',
    delta: 4,
  });
  assert.strictEqual(session.state.players['bob_player']?.commanderDamage['cmd_alice'], 4);

  // 5. Visibility check: Bob cannot see Alice's actual cards in hand
  const bobView = filterRoomStateForPlayer(session.state, 'bob_player');
  assert.strictEqual(bobView.playerZones['alice_host']?.hand[0]?.definition.name, 'Carta Oculta');

  // Alice sees her own cards in hand
  const aliceView = filterRoomStateForPlayer(session.state, 'alice_host');
  assert.notStrictEqual(
    aliceView.playerZones['alice_host']?.hand[0]?.definition.name,
    'Carta Oculta',
  );

  // 6. Bob disconnects (seat reserved)
  roomManager.handleDisconnect(roomCode, 'bob_player');
  assert.strictEqual(session.state.players['bob_player']?.isConnected, false);

  // 7. Bob reconnects
  const { player: bobReconnected } = roomManager.joinRoom(roomCode, {
    playerId: 'bob_player',
    playerName: 'Bob',
  });
  assert.strictEqual(bobReconnected.isConnected, true);
  assert.strictEqual(bobReconnected.life, 37); // Preserved state
  assert.strictEqual(bobReconnected.commanderDamage['cmd_alice'], 4);
});

import http from 'node:http';
import { ScryfallService } from '../src/services/scryfall.service.js';

test('Integration Test - Simulated Scryfall API (autocomplete, named, batch collection)', async () => {
  // 1. Setup local mock HTTP server
  const mockServer = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/cards/autocomplete') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: ['Sol Ring', 'Solemn Simulacrum', 'Solphim'] }));
      return;
    }

    if (url.pathname === '/cards/named') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'test-sol-ring-id',
          name: 'Sol Ring',
          cmc: 1,
          type_line: 'Artifact',
          oracle_text: '{T}: Add {C}{C}.',
          colors: [],
          color_identity: [],
          image_uris: {
            normal: 'https://cards.scryfall.io/normal/sol-ring.jpg',
          },
        }),
      );
      return;
    }

    if (url.pathname === '/cards/collection') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          data: [
            {
              id: 'c1',
              name: 'Card 1',
              cmc: 2,
              type_line: 'Instant',
              colors: ['U'],
              color_identity: ['U'],
            },
          ],
          not_found: [{ name: 'Nonexistent Card' }],
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>(resolve => mockServer.listen(0, '127.0.0.1', () => resolve()));
  const port = (mockServer.address() as any).port;
  const client = new ScryfallService(`http://127.0.0.1:${port}`);

  try {
    // 2. Test autocomplete
    const autocompleted = await client.autocomplete('Sol');
    assert.deepStrictEqual(autocompleted, ['Sol Ring', 'Solemn Simulacrum', 'Solphim']);

    // 3. Test getCardNamed
    const card = await client.getCardNamed('Sol Ring', true);
    assert.strictEqual(card.name, 'Sol Ring');
    assert.strictEqual(card.cmc, 1);
    assert.strictEqual(card.scryfallId, 'test-sol-ring-id');

    // 4. Test getCollection batch
    const batch = await client.getCollection([{ name: 'Card 1' }, { name: 'Nonexistent Card' }]);
    assert.strictEqual(batch.found.length, 1);
    assert.strictEqual(batch.found[0]?.name, 'Card 1');
    assert.strictEqual(batch.notFound.length, 1);
  } finally {
    mockServer.close();
  }
});
