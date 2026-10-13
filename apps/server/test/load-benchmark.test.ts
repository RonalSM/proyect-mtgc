import test from 'node:test';
import assert from 'node:assert';
import { GameStateSession } from '../src/game/game-state.js';
import { filterRoomStateForPlayer } from '../src/game/visibility-filter.js';
import { CardDefinition } from '@mtgc/shared';

function generateMockDeck(playerName: string): {
  commander: CardDefinition[];
  maindeck: CardDefinition[];
} {
  const commander: CardDefinition[] = [
    {
      scryfallId: `cmdr_${playerName}`,
      name: `Commander of ${playerName}`,
      cmc: 4,
      typeLine: 'Legendary Creature — Dragon',
      oracleText: 'Flying, vigilance',
      colors: ['W', 'U'],
      colorIdentity: ['W', 'U'],
    },
  ];

  const maindeck: CardDefinition[] = Array.from({ length: 99 }, (_, i) => ({
    scryfallId: `card_${playerName}_${i}`,
    name: `Spell #${i} of ${playerName}`,
    cmc: (i % 6) + 1,
    typeLine: i % 3 === 0 ? 'Land' : i % 3 === 1 ? 'Creature' : 'Instant',
    colors: ['W'],
    colorIdentity: ['W'],
  }));

  return { commander, maindeck };
}

test('Load Benchmark - 500 concurrent tables (2000 players), measure p95 latency < 300ms', async () => {
  const NUM_ROOMS = 500;
  const sessions: GameStateSession[] = [];
  const latencies: number[] = [];

  console.log(`\n[Load Benchmark] Initializing ${NUM_ROOMS} concurrent tables...`);
  const initStartTime = performance.now();

  for (let i = 0; i < NUM_ROOMS; i++) {
    const session = new GameStateSession({
      id: `table_${i}`,
      code: `T${i.toString().padStart(5, '0')}`,
      name: `Mesa Concurrente #${i}`,
      hostId: `p_${i}_0`,
      status: 'in_progress',
      settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true },
      players: {
        [`p_${i}_0`]: {
          id: `p_${i}_0`,
          name: `Jugador 1`,
          seatNumber: 0,
          isHost: true,
          isSpectator: false,
          isConnected: true,
          life: 40,
          commanderDamage: {},
          counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
          isEliminated: false,
          deckLoaded: false,
          handCount: 0,
          libraryCount: 0,
          graveyardCount: 0,
          exileCount: 0,
        },
        [`p_${i}_1`]: {
          id: `p_${i}_1`,
          name: `Jugador 2`,
          seatNumber: 1,
          isHost: false,
          isSpectator: false,
          isConnected: true,
          life: 40,
          commanderDamage: {},
          counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
          isEliminated: false,
          deckLoaded: false,
          handCount: 0,
          libraryCount: 0,
          graveyardCount: 0,
          exileCount: 0,
        },
        [`p_${i}_2`]: {
          id: `p_${i}_2`,
          name: `Jugador 3`,
          seatNumber: 2,
          isHost: false,
          isSpectator: false,
          isConnected: true,
          life: 40,
          commanderDamage: {},
          counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
          isEliminated: false,
          deckLoaded: false,
          handCount: 0,
          libraryCount: 0,
          graveyardCount: 0,
          exileCount: 0,
        },
        [`p_${i}_3`]: {
          id: `p_${i}_3`,
          name: `Jugador 4`,
          seatNumber: 3,
          isHost: false,
          isSpectator: false,
          isConnected: true,
          life: 40,
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
      playerZones: {},
      turnOrder: [`p_${i}_0`, `p_${i}_1`, `p_${i}_2`, `p_${i}_3`],
      activePlayerId: `p_${i}_0`,
      turnNumber: 1,
      version: 1,
      logs: [],
    });

    sessions.push(session);
  }

  const initDuration = performance.now() - initStartTime;
  console.log(`[Load Benchmark] Created ${sessions.length} tables in ${initDuration.toFixed(2)}ms`);

  // Run a full simulated game turn across each of the 500 rooms
  for (let i = 0; i < NUM_ROOMS; i++) {
    const session = sessions[i]!;
    const p0 = `p_${i}_0`;
    const p1 = `p_${i}_1`;

    const deckP0 = generateMockDeck(p0);
    const deckP1 = generateMockDeck(p1);

    const actionStart = performance.now();

    // 1. Deck Load (Commander + 99 Maindeck + initial draw 7)
    session.loadDeck(p0, deckP0.commander, deckP0.maindeck);
    session.loadDeck(p1, deckP1.commander, deckP1.maindeck);

    // 2. Play card: move from hand to battlefield
    const handCard = session.state.playerZones[p0]?.hand[0];
    if (handCard) {
      session.moveCard(p0, {
        cardInstanceId: handCard.instanceId,
        fromZone: 'hand',
        toZone: 'battlefield',
        position: { x: 200, y: 300, zIndex: 1 },
      });
      // 3. Tap card
      session.tapCard(p0, { cardInstanceId: handCard.instanceId, isTapped: true });
    }

    // 4. Modify Life & Commander damage
    session.adjustLife({ playerId: p1, delta: -3 });
    session.adjustCommanderDamage({
      targetPlayerId: p1,
      sourceCommanderInstanceId: `cmdr_${p0}`,
      delta: 3,
    });

    // 5. Visibility Filter computation for all 4 players
    for (let seat = 0; seat < 4; seat++) {
      filterRoomStateForPlayer(session.state, `p_${i}_${seat}`);
    }

    // 6. Pass turn
    session.passTurn(p0);

    const elapsed = performance.now() - actionStart;
    latencies.push(elapsed);
  }

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)]!;
  const p90 = latencies[Math.floor(latencies.length * 0.9)]!;
  const p95 = latencies[Math.floor(latencies.length * 0.95)]!;
  const p99 = latencies[Math.floor(latencies.length * 0.99)]!;
  const max = latencies[latencies.length - 1]!;

  console.log(`[Load Benchmark Results]`);
  console.log(`  Total Tables:    ${NUM_ROOMS}`);
  console.log(`  Total Players:   ${NUM_ROOMS * 4}`);
  console.log(`  p50 Latency:     ${p50.toFixed(2)} ms`);
  console.log(`  p90 Latency:     ${p90.toFixed(2)} ms`);
  console.log(`  p95 Latency:     ${p95.toFixed(2)} ms (SLA Target: < 300 ms)`);
  console.log(`  p99 Latency:     ${p99.toFixed(2)} ms`);
  console.log(`  Max Latency:     ${max.toFixed(2)} ms`);

  // Verification against REQ-15: p95 must be < 300ms
  assert.ok(
    p95 < 300,
    `El percentil p95 (${p95.toFixed(2)}ms) supera el umbral requerido de 300ms para 500 mesas simultáneas`,
  );
});
