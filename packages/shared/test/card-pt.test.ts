import { test } from 'node:test';
import assert from 'node:assert';
import { computeCardPT } from '../src/utils/card-pt.js';
import type { CardInstance } from '../src/types/card.js';

function createMockCard(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: 'card_pt_1',
    definition: {
      scryfallId: 'sf_bear',
      name: 'Grizzly Bears',
      cmc: 2,
      typeLine: 'Creature — Bear',
      colors: ['G'],
      colorIdentity: ['G'],
      power: '2',
      toughness: '2',
    },
    ownerId: 'p1',
    controllerId: 'p1',
    isCommander: false,
    isTapped: false,
    isFaceDown: false,
    rotation: 0,
    counters: {},
    ...overrides,
  };
}

test('Punto 2: computeCardPT calcula P/T efectivo base sin contadores y reporta estado neutro', () => {
  const card = createMockCard();
  const pt = computeCardPT(card);

  assert.ok(pt);
  assert.strictEqual(pt.hasPT, true);
  assert.strictEqual(pt.effectiveP, 2);
  assert.strictEqual(pt.effectiveT, 2);
  assert.strictEqual(pt.baseP, 2);
  assert.strictEqual(pt.baseT, 2);
  assert.strictEqual(pt.overallStatus, 'neutral');
  assert.strictEqual(pt.text, '2/2');
});

test('Punto 2: computeCardPT con contadores +1/+1 aumenta P/T y reporta estado up (verde)', () => {
  const card = createMockCard({
    counters: { '+1/+1': 2 },
  });
  const pt = computeCardPT(card);

  assert.ok(pt);
  assert.strictEqual(pt.effectiveP, 4);
  assert.strictEqual(pt.effectiveT, 4);
  assert.strictEqual(pt.pStatus, 'up');
  assert.strictEqual(pt.tStatus, 'up');
  assert.strictEqual(pt.overallStatus, 'up');
  assert.strictEqual(pt.text, '4/4');
});

test('Punto 2: computeCardPT con contadores -1/-1 disminuye P/T, permite valores 0 o negativos y reporta estado down (rojo)', () => {
  const card = createMockCard({
    counters: { '-1/-1': 3 },
  });
  const pt = computeCardPT(card);

  assert.ok(pt);
  assert.strictEqual(pt.effectiveP, -1);
  assert.strictEqual(pt.effectiveT, -1);
  assert.strictEqual(pt.pStatus, 'down');
  assert.strictEqual(pt.tStatus, 'down');
  assert.strictEqual(pt.overallStatus, 'down');
  assert.strictEqual(pt.text, '-1/-1');
});

test('Punto 2: computeCardPT soporta tanto "-1/-1" como "−1/−1" (guion Unicode)', () => {
  const card = createMockCard({
    counters: { '−1/−1': 1 },
  });
  const pt = computeCardPT(card);

  assert.ok(pt);
  assert.strictEqual(pt.effectiveP, 1);
  assert.strictEqual(pt.effectiveT, 1);
  assert.strictEqual(pt.overallStatus, 'down');
});

test('Punto 2: computeCardPT permite basePower y baseToughness personalizados en CardInstance', () => {
  const card = createMockCard({
    basePower: 4,
    baseToughness: 1,
    counters: { '+1/+1': 1 },
  });
  const pt = computeCardPT(card);

  assert.ok(pt);
  assert.strictEqual(pt.baseP, 4);
  assert.strictEqual(pt.baseT, 1);
  assert.strictEqual(pt.effectiveP, 5);
  assert.strictEqual(pt.effectiveT, 2);
  assert.strictEqual(pt.overallStatus, 'up');
  assert.strictEqual(pt.text, '5/2');
});

test('Punto 2: Cartas con "*" o expresiones en P/T muestran "*" hasta que el jugador defina un valor base', () => {
  const starCard = createMockCard({
    definition: {
      scryfallId: 'sf_tarmogoyf',
      name: 'Tarmogoyf',
      cmc: 2,
      typeLine: 'Creature — Lhurgoyf',
      colors: ['G'],
      colorIdentity: ['G'],
      power: '*',
      toughness: '1+*',
    },
    counters: { '+1/+1': 2 },
  });

  const ptBefore = computeCardPT(starCard);
  assert.ok(ptBefore);
  assert.strictEqual(ptBefore.effectiveP, '*');
  assert.strictEqual(ptBefore.effectiveT, '*');
  assert.strictEqual(ptBefore.text, '*/*');

  // El jugador define el valor base numérico en mesa
  starCard.basePower = 3;
  starCard.baseToughness = 4;
  const ptAfter = computeCardPT(starCard);
  assert.ok(ptAfter);
  assert.strictEqual(ptAfter.baseP, 3);
  assert.strictEqual(ptAfter.baseT, 4);
  assert.strictEqual(ptAfter.effectiveP, 5); // 3 + 2
  assert.strictEqual(ptAfter.effectiveT, 6); // 4 + 2
  assert.strictEqual(ptAfter.text, '5/6');
  assert.strictEqual(ptAfter.overallStatus, 'up');
});

test('Punto 2: Cartas sin P/T (tierras, artefactos sin base) retornan null', () => {
  const landCard = createMockCard({
    definition: {
      scryfallId: 'sf_forest',
      name: 'Forest',
      cmc: 0,
      typeLine: 'Basic Land — Forest',
      colors: [],
      colorIdentity: ['G'],
    },
  });

  const pt = computeCardPT(landCard);
  assert.strictEqual(pt, null);

  // Si el jugador la anima definiendo base P/T:
  landCard.basePower = 3;
  landCard.baseToughness = 3;
  const ptAnimated = computeCardPT(landCard);
  assert.ok(ptAnimated);
  assert.strictEqual(ptAnimated.effectiveP, 3);
  assert.strictEqual(ptAnimated.effectiveT, 3);
  assert.strictEqual(ptAnimated.text, '3/3');
});
