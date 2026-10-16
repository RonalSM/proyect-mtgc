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
    colors: ['U'],
    colorIdentity: ['U'],
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

describe('Punto 5: Propietario original (ownerId) y temporal (holderId)', () => {
  function setup2PlayerSession(): { session: GameStateSession; cardA: CardInstance } {
    const cardA = createDummyCard('card_sol_ring', 'Sol Ring', 'p_alice');

    const initialState: RoomState = {
      code: 'TEST2P',
      name: 'Mesa 2P Test',
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
        p_bob: {
          id: 'p_bob',
          name: 'Bob',
          seatNumber: 1,
          isHost: false,
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
          battlefield: [cardA],
          graveyard: [],
          exile: [],
          command: [],
        },
        p_bob: {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          command: [],
        },
      },
      turnOrder: ['p_alice', 'p_bob'],
      activePlayerId: 'p_alice',
      turnNumber: 1,
      logs: [],
      settings: {
        format: 'commander',
        startingLife: 40,
        maxPlayers: 2,
        turnTimerSeconds: 0,
        allowSpectators: true,
      },
    };

    const session = new GameStateSession(initialState);
    return { session, cardA };
  }

  test('Alice mueve su carta al campo de Bob (holderId = Bob); Bob ahora puede moverla', () => {
    const { session, cardA } = setup2PlayerSession();

    // 1. Inicialmente en el campo de Alice (x in [0, 0.5])
    cardA.position = { x: 0.15, y: 0.3, zIndex: 1 };
    cardA.holderId = 'p_alice';

    // Bob intenta mover la carta de Alice que está en el campo de Alice -> RECHAZADO
    assert.throws(
      () => {
        session.moveCard('p_bob', {
          cardInstanceId: cardA.instanceId,
          fromZone: 'battlefield',
          toZone: 'battlefield',
          position: { x: 0.2, y: 0.35, zIndex: 2 },
        });
      },
      /Acción no autorizada/,
      'Bob no debe poder mover la carta de Alice si no es holder ni owner',
    );

    // 2. Alice (ownerId) mueve su carta al campo de Bob (x in [0.5, 1.0], 100% dentro)
    session.moveCard('p_alice', {
      cardInstanceId: cardA.instanceId,
      fromZone: 'battlefield',
      toZone: 'battlefield',
      position: { x: 0.65, y: 0.4, zIndex: 2 },
    });

    const foundCard = session.findBattlefieldCard(cardA.instanceId)?.card;
    assert.ok(foundCard);
    assert.strictEqual(foundCard.ownerId, 'p_alice', 'El ownerId debe ser inmutable');
    assert.strictEqual(foundCard.holderId, 'p_bob', 'El holderId debe ser Bob al estar 100% en su celda');

    // 3. Bob ahora puede mover la carta dentro de su campo porque es su holderId
    session.moveCard('p_bob', {
      cardInstanceId: cardA.instanceId,
      fromZone: 'battlefield',
      toZone: 'battlefield',
      position: { x: 0.75, y: 0.5, zIndex: 3 },
    });

    const updatedCard = session.findBattlefieldCard(cardA.instanceId)?.card;
    assert.ok(updatedCard);
    assert.strictEqual(updatedCard.position?.x, 0.75);
    assert.strictEqual(updatedCard.holderId, 'p_bob');
  });

  test('Alice recupera su carta a su propio campo; Bob ya no puede moverla', () => {
    const { session, cardA } = setup2PlayerSession();

    // Colocar inicialmente en campo de Bob
    cardA.position = { x: 0.7, y: 0.4, zIndex: 1 };
    cardA.holderId = 'p_bob';

    // Alice (ownerId) recupera la carta llevándola a su propio campo (x = 0.2 < 0.5)
    session.moveCard('p_alice', {
      cardInstanceId: cardA.instanceId,
      fromZone: 'battlefield',
      toZone: 'battlefield',
      position: { x: 0.2, y: 0.4, zIndex: 2 },
    });

    const recoveredCard = session.findBattlefieldCard(cardA.instanceId)?.card;
    assert.ok(recoveredCard);
    assert.strictEqual(recoveredCard.ownerId, 'p_alice');
    assert.strictEqual(recoveredCard.holderId, 'p_alice', 'El holderId ahora debe ser Alice');

    // Bob intenta mover la carta recuperada por Alice -> RECHAZADO
    assert.throws(
      () => {
        session.moveCard('p_bob', {
          cardInstanceId: cardA.instanceId,
          fromZone: 'battlefield',
          toZone: 'battlefield',
          position: { x: 0.7, y: 0.4, zIndex: 3 },
        });
      },
      /Acción no autorizada/,
      'Bob no debe poder volver a mover la carta recuperada por Alice',
    );
  });

  test('Carta entre dos divisiones deja holderId vacío; solo ownerId puede moverla', () => {
    const { session, cardA } = setup2PlayerSession();

    // Colocar carta straddling la división central x = 0.5 (ej. x = 0.48, con ancho 0.045 sobrepasa a 0.525)
    session.moveCard('p_alice', {
      cardInstanceId: cardA.instanceId,
      fromZone: 'battlefield',
      toZone: 'battlefield',
      position: { x: 0.48, y: 0.4, zIndex: 1 },
    });

    const straddlingCard = session.findBattlefieldCard(cardA.instanceId)?.card;
    assert.ok(straddlingCard);
    assert.strictEqual(straddlingCard.holderId, undefined, 'holderId debe quedar vacío al estar entre dos divisiones');

    // Bob no puede moverla
    assert.throws(
      () => {
        session.moveCard('p_bob', {
          cardInstanceId: cardA.instanceId,
          fromZone: 'battlefield',
          toZone: 'battlefield',
          position: { x: 0.7, y: 0.4, zIndex: 2 },
        });
      },
      /Acción no autorizada/,
    );

    // Alice (ownerId) sí puede moverla
    assert.doesNotThrow(() => {
      session.moveCard('p_alice', {
        cardInstanceId: cardA.instanceId,
        fromZone: 'battlefield',
        toZone: 'battlefield',
        position: { x: 0.2, y: 0.4, zIndex: 2 },
      });
    });
  });
});
