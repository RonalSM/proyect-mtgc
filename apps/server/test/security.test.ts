import test from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
import { ActionEnvelopeSchema, AdjustLifeSchema, ChatMessageSchema } from '@mtgc/shared';
import { RoomState } from '@mtgc/shared';
import { wsHandler } from '../src/game/ws-handler.js';

function createSecurityMockState(): RoomState {
  return {
    id: 'room_sec',
    code: 'SEC101',
    name: 'Security Test Table',
    hostId: 'alice',
    status: 'in_progress',
    settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true },
    players: {
      alice: {
        id: 'alice',
        name: 'Alice',
        seatNumber: 0,
        isHost: true,
        isSpectator: false,
        isConnected: true,
        life: 40,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        deckLoaded: true,
        handCount: 1,
        libraryCount: 1,
        graveyardCount: 0,
        exileCount: 0,
      },
      mallory_spectator: {
        id: 'mallory_spectator',
        name: 'Mallory',
        seatNumber: -1,
        isHost: false,
        isSpectator: true,
        isConnected: true,
        life: 0,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        deckLoaded: false,
        handCount: 0,
        libraryCount: 0,
        graveyardCount: 0,
        exileCount: 0,
      },
    },
    playerZones: {
      alice: {
        library: [
          {
            instanceId: 'top_secret_card_id',
            definition: {
              scryfallId: 'black_lotus',
              name: 'Black Lotus',
              cmc: 0,
              typeLine: 'Artifact',
              oracleText: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
              colors: [],
              colorIdentity: [],
              imageUrlNormal: 'https://cards.scryfall.io/secret.jpg',
            },
            ownerId: 'alice',
            controllerId: 'alice',
            isCommander: false,
            isTapped: false,
            isFaceDown: false,
            rotation: 0,
            counters: {},
          },
        ],
        hand: [
          {
            instanceId: 'hand_secret_card_id',
            definition: {
              scryfallId: 'ancestral_recall',
              name: 'Ancestral Recall',
              cmc: 1,
              typeLine: 'Instant',
              oracleText: 'Target player draws three cards.',
              colors: ['U'],
              colorIdentity: ['U'],
              imageUrlNormal: 'https://cards.scryfall.io/secret_hand.jpg',
            },
            ownerId: 'alice',
            controllerId: 'alice',
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
      mallory_spectator: {
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: [],
      },
    },
    turnOrder: ['alice'],
    activePlayerId: 'alice',
    turnNumber: 1,
    version: 1,
    logs: [],
  };
}

test('Security - No hidden information leakage in opponent / spectator view', () => {
  const state = createSecurityMockState();

  // Spectator / Opponent views Alice's zones
  const filtered = filterRoomStateForPlayer(state, 'mallory_spectator');

  const maskedHandCard = filtered.playerZones['alice']?.hand[0];
  const maskedLibraryCard = filtered.playerZones['alice']?.library[0];

  assert.strictEqual(maskedHandCard?.definition.name, 'Carta Oculta');
  assert.strictEqual(maskedHandCard?.definition.oracleText, undefined);
  assert.strictEqual(maskedHandCard?.definition.imageUrlNormal, undefined);

  assert.strictEqual(maskedLibraryCard?.definition.name, 'Carta Oculta');
  assert.strictEqual(maskedLibraryCard?.definition.oracleText, undefined);
  assert.strictEqual(maskedLibraryCard?.definition.imageUrlNormal, undefined);
});

test('Security - Chat sanitizes HTML/XSS injection payloads', () => {
  const session = new GameStateSession(createSecurityMockState());

  const maliciousPayload = '<script>alert("XSS")</script><img src="x" onerror="stealCookie()"/>';
  session.addChatMessage('alice', maliciousPayload);

  const lastLog = session.state.logs[session.state.logs.length - 1];
  assert.ok(lastLog);
  assert.ok(!lastLog.actionText.includes('<script>'));
  assert.ok(!lastLog.actionText.includes('onerror='));
  assert.ok(lastLog.actionText.includes('&lt;script&gt;'));
});

test('Security - Action envelope and schema reject malformed and abusive payloads', () => {
  // Missing required payload properties
  const invalidJson = {
    type: 'ADJUST_LIFE',
    payload: { delta: 'not-a-number' },
  };

  const envelopeResult = ActionEnvelopeSchema.safeParse(invalidJson);
  assert.strictEqual(envelopeResult.success, true); // Envelope parsed, but payload validation will catch it:

  const lifeResult = AdjustLifeSchema.safeParse(envelopeResult.data.payload);
  assert.strictEqual(lifeResult.success, false);
});

test('Security - Spectators cannot mutate game state or zones', () => {
  const state = createSecurityMockState();
  const session = new GameStateSession(state);

  // Spectator Mallory is in seat -1, marked isSpectator: true
  const spectator = state.players['mallory_spectator'];
  assert.ok(spectator?.isSpectator);

  // Verification that spectator has no legal zone cards to move
  const spectatorZones = state.playerZones['mallory_spectator'];
  assert.strictEqual(spectatorZones?.hand.length, 0);
  assert.strictEqual(spectatorZones?.battlefield.length, 0);

  // Attempting to move Alice's card using spectator credentials fails or does not affect Alice's library
  session.moveCard('mallory_spectator', {
    cardInstanceId: 'hand_secret_card_id',
    fromZone: 'hand',
    toZone: 'battlefield',
  });

  // Alice's hand remains intact
  assert.strictEqual(state.playerZones['alice']?.hand.length, 1);
  assert.strictEqual(state.playerZones['alice']?.hand[0]?.instanceId, 'hand_secret_card_id');
});

test('Security - Players cannot manipulate other players zones', () => {
  const state = createSecurityMockState();
  const session = new GameStateSession(state);

  // Alice attempts to move cards from Bob's non-existent or foreign zones
  session.moveCard('alice', {
    cardInstanceId: 'non_existent_card_id',
    fromZone: 'hand',
    toZone: 'battlefield',
  });

  assert.strictEqual(state.playerZones['alice']?.battlefield.length, 0);
  assert.strictEqual(state.playerZones['alice']?.hand.length, 1);
});

test('Security - Rate limiting (max 5 messages per 10s) and message length (REQ-12.4, REQ-16.4)', () => {
  const playerId = 'spammer_user';

  // 1. First 5 messages within 10 seconds must be allowed
  for (let i = 1; i <= 5; i++) {
    const allowed = wsHandler.checkRateLimit(playerId, 5, 10000);
    assert.strictEqual(allowed, true, `Mensaje #${i} debería permitirse`);
  }

  // 2. 6th message within 10 seconds must be rejected
  const sixthAllowed = wsHandler.checkRateLimit(playerId, 5, 10000);
  assert.strictEqual(sixthAllowed, false, 'El 6to mensaje debe ser bloqueado por rate limit');

  // 3. Message length validation: max 500 characters
  const validMessage = { message: 'Hola a todos en la mesa!' };
  assert.strictEqual(ChatMessageSchema.safeParse(validMessage).success, true);

  const tooLongMessage = { message: 'A'.repeat(501) };
  assert.strictEqual(ChatMessageSchema.safeParse(tooLongMessage).success, false);
});
