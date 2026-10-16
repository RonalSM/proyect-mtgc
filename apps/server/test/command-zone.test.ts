import test, { describe } from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import type { RoomState, CardInstance, CardDefinition } from '@mtgc/shared';

function createCommanderCard(id: string, name: string, ownerId: string): CardInstance {
  const def: CardDefinition = {
    scryfallId: `scry_${id}`,
    name,
    cmc: 4,
    typeLine: 'Legendary Creature — Dragon',
    colors: ['R'],
    colorIdentity: ['R'],
  };
  return {
    instanceId: id,
    definition: def,
    ownerId,
    controllerId: ownerId,
    isCommander: true,
    isTapped: false,
    isFaceDown: false,
    rotation: 0,
    counters: {},
  };
}

describe('Punto 6: Zona de comando e impuesto de comandante (commanderTax)', () => {
  function setupCommanderSession(): { session: GameStateSession; commander: CardInstance } {
    const commander = createCommanderCard('card_commander_ur-dragon', 'The Ur-Dragon', 'p_alice');

    const initialState: RoomState = {
      code: 'CMDTEST',
      name: 'Mesa Commander Test',
      hostId: 'p_alice',
      status: 'playing',
      version: 1,
      players: {
        p_alice: {
          id: 'p_alice',
          name: 'Alice',
          seatNumber: 0,
          isHost: true,
          isReady: true,
          life: 40,
          commanderDamage: {},
          counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0 },
          isConnected: true,
          isSpectator: false,
          isEliminated: false,
          deckLoaded: true,
          handCount: 0,
          libraryCount: 0,
          graveyardCount: 0,
          exileCount: 0,
        },
      },
      playerZones: {
        p_alice: {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          command: [commander],
        },
      },
      turnOrder: ['p_alice'],
      activePlayerId: 'p_alice',
      turnNumber: 1,
      logs: [],
      chatLog: [],
      settings: {
        format: 'commander',
        startingLife: 40,
        maxPlayers: 1,
        turnTimerSeconds: 0,
        allowSpectators: true,
      },
    };

    const session = new GameStateSession(initialState);
    return { session, commander };
  }

  test('Prueba oficial Punto 6: sacar comandante a la mesa (tax sigue en +0), devolverlo al comando (tax sube a +2), subir tax manualmente a +4, sacarlo de nuevo (tax se mantiene en +4)', () => {
    const { session, commander } = setupCommanderSession();

    // Estado inicial: tax es 0
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 0);

    // 1. Sacar comandante a la mesa: tax sigue en +0
    session.moveCard('p_alice', {
      cardInstanceId: commander.instanceId,
      fromZone: 'command',
      toZone: 'battlefield',
      position: { x: 0.25, y: 0.25, zIndex: 1 },
    });

    assert.strictEqual(session.state.playerZones.p_alice.command.length, 0);
    assert.strictEqual(session.state.playerZones.p_alice.battlefield.length, 1);
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 0, 'Sacar el comandante a la mesa no debe alterar el tax');

    // 2. Devolverlo al comando: tax sube a +2
    session.moveCard('p_alice', {
      cardInstanceId: commander.instanceId,
      fromZone: 'battlefield',
      toZone: 'command',
    });

    assert.strictEqual(session.state.playerZones.p_alice.command.length, 1);
    assert.strictEqual(session.state.playerZones.p_alice.battlefield.length, 0);
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 2, 'Devolver al comando debe auto-incrementar tax en +2');

    // 3. Subir tax manualmente a +4 (+2 vía SET_PLAYER_COUNTER)
    session.setPlayerCounter({
      playerId: 'p_alice',
      counterType: 'commanderTax',
      delta: 2,
    });

    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 4, 'Subir tax manualmente de 2 en 2 debe llegar a +4');

    // 4. Sacarlo de nuevo a la mesa: tax se mantiene en +4
    session.moveCard('p_alice', {
      cardInstanceId: commander.instanceId,
      fromZone: 'command',
      toZone: 'battlefield',
      position: { x: 0.3, y: 0.3, zIndex: 2 },
    });

    assert.strictEqual(session.state.playerZones.p_alice.battlefield.length, 1);
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 4, 'Sacarlo de nuevo debe mantener el tax en +4');
  });

  test('Undo revierte el incremento de commanderTax al devolver al comando', () => {
    const { session, commander } = setupCommanderSession();

    // Sacar a la mesa
    session.moveCard('p_alice', {
      cardInstanceId: commander.instanceId,
      fromZone: 'command',
      toZone: 'battlefield',
      position: { x: 0.2, y: 0.2, zIndex: 1 },
    });
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 0);

    // Devolver al comando -> tax = 2
    session.moveCard('p_alice', {
      cardInstanceId: commander.instanceId,
      fromZone: 'battlefield',
      toZone: 'command',
    });
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 2);

    // Undo -> revierte movimiento y tax vuelve a 0
    const undoSuccess = session.undoLast('p_alice');
    assert.strictEqual(undoSuccess, true);
    assert.strictEqual(session.state.players.p_alice.counters.commanderTax, 0, 'Deshacer debe revertir el impuesto de comandante');
    assert.strictEqual(session.state.playerZones.p_alice.battlefield.length, 1);
  });
});
