import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenService, COMMON_TOKENS } from '../src/services/token.service.js';
import { GameStateSession } from '../src/game/game-state.js';
import { RoomState } from '@mtgc/shared';

function createMockRoomState(): RoomState {
  return {
    id: 'room-token-test',
    name: 'Token Test Room',
    hostId: 'player-1',
    maxPlayers: 4,
    startingLife: 40,
    status: 'playing',
    phase: 'playing',
    turnOrder: ['player-1', 'player-2'],
    activePlayerId: 'player-1',
    activeTurnIndex: 0,
    turnNumber: 1,
    turnDirection: 'clockwise',
    passCount: 0,
    players: {
      'player-1': {
        id: 'player-1',
        name: 'Alice',
        life: 40,
        seatNumber: 0,
        isConnected: true,
        isHost: true,
        isSpectator: false,
        isEliminated: false,
        isAtRisk: false,
        commanderDamage: {},
        counters: {},
        ready: true,
      },
      'player-2': {
        id: 'player-2',
        name: 'Bob',
        life: 40,
        seatNumber: 1,
        isConnected: true,
        isHost: false,
        isSpectator: false,
        isEliminated: false,
        isAtRisk: false,
        commanderDamage: {},
        counters: {},
        ready: true,
      },
    },
    playerZones: {
      'player-1': {
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: [],
        library: [],
      },
      'player-2': {
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: [],
        library: [],
      },
    },
    chat: [],
    logs: [],
    spectators: [],
    allowSpectators: true,
    isPrivate: false,
    format: 'commander',
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

describe('Punto 4: Fichas (TokenService & GameStateSession)', () => {
  it('TokenService - returns common tokens (Treasure, Food, Clue, Blood, Map)', () => {
    const common = tokenService.getCommonTokens();
    assert.strictEqual(common.length, 5);
    const names = common.map(t => t.name);
    assert.ok(names.includes('Treasure'));
    assert.ok(names.includes('Food'));
    assert.ok(names.includes('Clue'));
    assert.ok(names.includes('Blood'));
    assert.ok(names.includes('Map'));
  });

  it('TokenService - resolves tokens for Smothering Tithe (Treasure), Grave Titan (Zombie), Regal Caracal (Cat), Sol Ring (none)', async () => {
    const titheTokens = await tokenService.getTokensForCard('smothering tithe');
    assert.strictEqual(titheTokens.length, 1);
    assert.strictEqual(titheTokens[0].name, 'Treasure');

    const titanTokens = await tokenService.getTokensForCard('grave titan');
    assert.strictEqual(titanTokens.length, 1);
    assert.strictEqual(titanTokens[0].name, 'Zombie');
    assert.strictEqual(titanTokens[0].power, '2');
    assert.strictEqual(titanTokens[0].toughness, '2');

    const caracalTokens = await tokenService.getTokensForCard('regal caracal');
    assert.strictEqual(caracalTokens.length, 1);
    assert.strictEqual(caracalTokens[0].name, 'Cat');
    assert.strictEqual(caracalTokens[0].oracleText, 'Lifelink');

    const solRingTokens = await tokenService.getTokensForCard('sol ring');
    assert.strictEqual(solRingTokens.length, 0);
  });

  it('TokenService - resolves and groups deck tokens by source card', async () => {
    const deckTokens = await tokenService.getTokensForDeck([
      'Smothering Tithe',
      'Sol Ring',
      'Regal Caracal',
    ]);
    assert.strictEqual(deckTokens.length, 2);
    assert.strictEqual(deckTokens[0].sourceCard, 'Smothering Tithe');
    assert.strictEqual(deckTokens[1].sourceCard, 'Regal Caracal');
  });

  it('GameStateSession - creates token in division center with cascade, sets ownerId, holderId, keywords and logs', () => {
    const session = new GameStateSession(createMockRoomState());
    const treasureDef = COMMON_TOKENS[0];

    const token = session.createToken('player-1', {
      tokenDefinition: treasureDef,
      targetPlayerId: 'player-1',
    });

    assert.ok(token);
    assert.strictEqual(token.definition.name, 'Treasure');
    assert.strictEqual(token.ownerId, 'player-1');
    assert.strictEqual(token.holderId, 'player-1');
    assert.strictEqual(token.isToken, true);

    const p1Bf = session.state.playerZones['player-1'].battlefield;
    assert.strictEqual(p1Bf.length, 1);
    assert.strictEqual(p1Bf[0].instanceId, token.instanceId);

    // Verify log entry
    const lastLog = session.state.logs[session.state.logs.length - 1];
    assert.ok(lastLog.actionText.includes('creó una ficha "Treasure"'));
  });

  it('GameStateSession - token disappears when leaving battlefield (without rule engine)', () => {
    const session = new GameStateSession(createMockRoomState());
    const token = session.createToken('player-1', {
      tokenDefinition: COMMON_TOKENS[0],
      targetPlayerId: 'player-1',
    });

    const p1Bf = session.state.playerZones['player-1'].battlefield;
    assert.strictEqual(p1Bf.length, 1);

    // Move token to graveyard
    session.moveCard('player-1', {
      cardInstanceId: token.instanceId,
      fromZone: 'battlefield',
      toZone: 'graveyard',
      toPlayerId: 'player-1',
    });

    // Token must not be on battlefield
    assert.strictEqual(session.state.playerZones['player-1'].battlefield.length, 0);
    // Token must NOT be in graveyard (disappears)
    assert.strictEqual(session.state.playerZones['player-1'].graveyard.length, 0);

    // Verify log
    const lastLog = session.state.logs[session.state.logs.length - 1];
    assert.ok(lastLog.actionText.includes('desapareció al salir de la mesa'));
  });
});
