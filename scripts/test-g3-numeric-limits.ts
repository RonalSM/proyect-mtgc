import {
  AdjustLifeSchema,
  SetLifeSchema,
  CommanderDamageSchema,
  SetPlayerCounterSchema,
  SetCardCounterSchema,
  SetCardPTSchema,
  CloneTokenSchema,
} from '../packages/shared/src/schemas/actions.schema';
import { GameStateSession } from '../apps/server/src/game/game-state';

async function runG3Tests() {
  console.log('--- INICIANDO BANCO DE PRUEBAS G3: LÍMITES NUMÉRICOS Y BITÁCORA CON DESHACER ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Zod Schema Testing for out-of-bounds, scientific notation, NaN, string values
  console.log('\n[1/3] Verificando validación Zod de límites estrictos:');

  // Vida: [-10000, 10000]
  assert(!AdjustLifeSchema.safeParse({ delta: 1e180 }).success, 'Zod rechaza delta de vida enorme (1e180)');
  assert(!AdjustLifeSchema.safeParse({ delta: 25000 }).success, 'Zod rechaza delta de vida > 10000');
  assert(!AdjustLifeSchema.safeParse({ delta: -15000 }).success, 'Zod rechaza delta de vida < -10000');
  assert(!AdjustLifeSchema.safeParse({ delta: NaN }).success, 'Zod rechaza delta de vida NaN');
  assert(!AdjustLifeSchema.safeParse({ delta: '100' }).success, 'Zod rechaza delta de vida como string');
  assert(AdjustLifeSchema.safeParse({ delta: 5 }).success, 'Zod acepta delta de vida válido (+5)');
  assert(AdjustLifeSchema.safeParse({ delta: -20 }).success, 'Zod acepta delta de vida válido (-20)');

  assert(!SetLifeSchema.safeParse({ life: 1e180 }).success, 'Zod rechaza setLife con 1e180');
  assert(!SetLifeSchema.safeParse({ life: -20000 }).success, 'Zod rechaza setLife < -10000');
  assert(SetLifeSchema.safeParse({ life: 40 }).success, 'Zod acepta setLife válido (40)');

  // Daño de comandante: [0, 999] (delta [-999, 999])
  assert(!CommanderDamageSchema.safeParse({ targetPlayerId: 'p1', sourceCommanderInstanceId: 'cmd1', delta: 5000 }).success, 'Zod rechaza daño comandante > 999');
  assert(!CommanderDamageSchema.safeParse({ targetPlayerId: 'p1', sourceCommanderInstanceId: 'cmd1', delta: 1e50 }).success, 'Zod rechaza daño comandante 1e50');
  assert(CommanderDamageSchema.safeParse({ targetPlayerId: 'p1', sourceCommanderInstanceId: 'cmd1', delta: 7 }).success, 'Zod acepta daño comandante válido (7)');

  // Contadores jugador: delta [-999, 999]
  assert(!SetPlayerCounterSchema.safeParse({ counterType: 'poison', delta: 1000 }).success, 'Zod rechaza contador jugador > 999');
  assert(SetPlayerCounterSchema.safeParse({ counterType: 'poison', delta: 1 }).success, 'Zod acepta contador jugador válido (+1)');

  // P/T y contadores de carta: [-999, 999] y [0, 999]
  assert(!SetCardPTSchema.safeParse({ cardInstanceId: 'c1', basePower: 5000 }).success, 'Zod rechaza basePower > 999');
  assert(!SetCardPTSchema.safeParse({ cardInstanceId: 'c1', baseToughness: -2000 }).success, 'Zod rechaza baseToughness < -999');
  assert(!SetCardPTSchema.safeParse({ cardInstanceId: 'c1', plusCounters: -1 }).success, 'Zod rechaza plusCounters negativo');
  assert(!SetCardPTSchema.safeParse({ cardInstanceId: 'c1', plusCounters: 10000 }).success, 'Zod rechaza plusCounters > 999');
  assert(SetCardPTSchema.safeParse({ cardInstanceId: 'c1', basePower: 4, baseToughness: 4, plusCounters: 2 }).success, 'Zod acepta P/T y contadores válidos');

  // Copias / fichas: [1, 20]
  assert(!CloneTokenSchema.safeParse({ cardInstanceId: 't1', count: 0 }).success, 'Zod rechaza clonar 0 copias');
  assert(!CloneTokenSchema.safeParse({ cardInstanceId: 't1', count: 50 }).success, 'Zod rechaza clonar 50 copias (máx 20)');
  assert(!CloneTokenSchema.safeParse({ cardInstanceId: 't1', count: 1e10 }).success, 'Zod rechaza clonar 1e10 copias');
  assert(CloneTokenSchema.safeParse({ cardInstanceId: 't1', count: 5 }).success, 'Zod acepta clonar 5 copias');

  // 2. Server GameStateSession Clamping, Logging & Undo
  console.log('\n[2/3] Verificando acotamiento defensivo, bitácora y pila de deshacer en servidor:');
  const mockInitialState: any = {
    id: 'room_g3',
    code: 'TESTG3',
    name: 'Mesa G3 Test',
    hostId: 'p1',
    status: 'playing',
    settings: { startingLife: 40, maxPlayers: 4, allowSpectators: true },
    players: {
      p1: {
        id: 'p1',
        name: 'Jugador 1',
        life: 40,
        seatNumber: 1,
        isHost: true,
        isReady: true,
        isSpectator: false,
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        commanderDamage: {},
      },
    },
    playerZones: {
      p1: { library: [], hand: [], battlefield: [], graveyard: [], exile: [], command: [] },
    },
    turnOrder: ['p1'],
    activePlayerId: 'p1',
    turnNumber: 1,
    version: 1,
    targetingArrows: [],
    logs: [],
  };

  const session = new GameStateSession(mockInitialState);

  // Adjust Life + Undo
  session.adjustLife({ playerId: 'p1', delta: 15 });
  assert(session.state.players['p1'].life === 55, 'adjustLife aplica delta correctamente (55 vidas)');
  const lastLog = session.state.logs[session.state.logs.length - 1];
  assert(lastLog && lastLog.playerId === 'p1' && lastLog.actionText.includes('+15') && lastLog.actionText.includes('55'), 'Bitácora registra autoría y delta exacto de vida');

  // Undo Life
  session.undoLast('p1');
  assert(session.state.players['p1'].life === 40, 'Deshacer restaura el total exacto de vidas (40)');

  // Adjust Life Clamp extreme positive and negative
  session.adjustLife({ playerId: 'p1', delta: 50000 });
  assert(session.state.players['p1'].life === 10000, 'adjustLife acota vida al tope máximo de 10000');
  session.adjustLife({ playerId: 'p1', delta: -50000 });
  assert(session.state.players['p1'].life === -10000, 'adjustLife acota vida al tope mínimo de -10000');
  assert(session.state.players['p1'].isAtRisk === true, 'Jugador marcado en riesgo de derrota con vida negativa');

  // Set Life Clamp
  session.setLife({ playerId: 'p1', life: 99999 });
  assert(session.state.players['p1'].life === 10000, 'setLife acota vida al tope máximo de 10000');
  session.undoLast('p1');
  assert(session.state.players['p1'].life === -10000, 'Deshacer de setLife restaura estado anterior');

  // Poison Clamp [0, 99]
  session.setPlayerCounter({ playerId: 'p1', counterType: 'poison', delta: 500 });
  assert(session.state.players['p1'].counters.poison === 99, 'Veneno acotado a 99 máximo');
  session.undoLast('p1');
  assert(session.state.players['p1'].counters.poison === 0, 'Deshacer de veneno restaura a 0');

  // Commander Damage Clamp [0, 999]
  session.adjustCommanderDamage({ targetPlayerId: 'p1', sourceCommanderInstanceId: 'cmd1', delta: 1500 }, 'p1');
  assert(session.state.players['p1'].commanderDamage['cmd1'] === 999, 'Daño de comandante acotado a 999 máximo');
  session.undoLast('p1');
  assert(session.state.players['p1'].commanderDamage['cmd1'] === 0, 'Deshacer de daño de comandante restaura a 0');

  // 3. Client Filter simulation
  console.log('\n[3/3] Verificando filtrado de strings, notación científica y pegado de texto:');
  function simulateClientInput(inputStr: string): number {
    const cleaned = inputStr.replace(/[^0-9-]/g, '');
    const sliced = cleaned.slice(0, 6);
    const parsed = parseInt(sliced, 10);
    if (isNaN(parsed)) return 0;
    return Math.max(-10000, Math.min(10000, parsed));
  }

  assert(simulateClientInput('1e+180') === 1180, 'Notación científica "1e+180" es desarmada a dígitos limpios');
  assert(simulateClientInput('abc') === 0, 'Texto puro "abc" resulta en 0/vacío sin colapsar');
  assert(simulateClientInput('999999999') === 10000, 'Número gigante "999999999" acotado a 10000');
  assert(simulateClientInput('-50000') === -10000, 'Negativo extremo "-50000" acotado a -10000');
  assert(simulateClientInput('NaN') === 0, 'String "NaN" neutralizado a 0');

  console.log(`\n========================================`);
  console.log(`TOTAL PRUEBAS G3: ${passed} PASADAS | ${failed} FALLIDAS`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runG3Tests().catch(err => {
  console.error('Error en pruebas G3:', err);
  process.exit(1);
});
