import test from 'node:test';
import assert from 'node:assert';
import { parseDecklist } from '../src/utils/deck-parser.js';
import { validateCommanderDeck, DeckCardWithQuantity } from '../src/utils/commander-validator.js';
import { CardDefinition } from '../src/types/card.js';

test('parseDecklist extracts commander and maindeck correctly', () => {
  const sampleDecklist = `
// Commander
1 Atraxa, Praetors' Voice (C16) 28 *F*

// Mainboard
1 Sol Ring (CMR) 350
1 Arcane Signet
1 Command Tower
3 Plains
2 Island
  `;

  const parsed = parseDecklist(sampleDecklist);

  assert.strictEqual(parsed.commanderEntries.length, 1);
  assert.strictEqual(parsed.commanderEntries[0]?.cardName, "Atraxa, Praetors' Voice");
  assert.strictEqual(parsed.commanderEntries[0]?.set, 'C16');
  assert.strictEqual(parsed.commanderEntries[0]?.collectorNumber, '28');

  assert.strictEqual(parsed.maindeckEntries.length, 5);
  assert.strictEqual(parsed.totalCards, 9); // 1 + 1 + 1 + 1 + 3 + 2 = 9
});

test('parseDecklist supports *CMDR* inline annotation', () => {
  const sample = `
1 The Ur-Dragon *CMDR*
1 Sol Ring
  `;

  const parsed = parseDecklist(sample);
  assert.strictEqual(parsed.commanderEntries.length, 1);
  assert.strictEqual(parsed.commanderEntries[0]?.cardName, 'The Ur-Dragon');
  assert.strictEqual(parsed.maindeckEntries.length, 1);
});

test('validateCommanderDeck flags illegal deck sizes and color identity violations', () => {
  const commander: CardDefinition = {
    scryfallId: 'cmd-1',
    name: 'Baral, Chief of Compliance',
    cmc: 2,
    typeLine: 'Legendary Creature — Human Wizard',
    colors: ['U'],
    colorIdentity: ['U'], // Only Blue
    imageUrlNormal: 'http://example.com/baral.jpg',
  };

  const blueCard: CardDefinition = {
    scryfallId: 'c-1',
    name: 'Counterspell',
    cmc: 2,
    typeLine: 'Instant',
    colors: ['U'],
    colorIdentity: ['U'],
  };

  const redCard: CardDefinition = {
    scryfallId: 'c-2',
    name: 'Lightning Bolt',
    cmc: 1,
    typeLine: 'Instant',
    colors: ['R'],
    colorIdentity: ['R'], // Red is NOT in Baral's identity!
  };

  const commanderEntry: DeckCardWithQuantity[] = [
    { card: commander, quantity: 1, isCommander: true },
  ];
  const maindeckEntries: DeckCardWithQuantity[] = [
    { card: blueCard, quantity: 1, isCommander: false },
    { card: redCard, quantity: 1, isCommander: false },
  ];

  const result = validateCommanderDeck(commanderEntry, maindeckEntries);

  assert.strictEqual(result.isValid, false);
  // Should have deck size error (3 != 100)
  assert.ok(result.errors.some(e => e.includes('exactamente 100 cartas')));
  // Should have color identity error for Lightning Bolt
  assert.ok(result.errors.some(e => e.includes('Lightning Bolt') && e.includes('no permitida')));
});

test('validateCommanderDeck permits basic lands in multiples', () => {
  const commander: CardDefinition = {
    scryfallId: 'cmd-mono-g',
    name: 'Omnath, Locus of Mana',
    cmc: 3,
    typeLine: 'Legendary Creature — Elemental',
    colors: ['G'],
    colorIdentity: ['G'],
  };

  const forest: CardDefinition = {
    scryfallId: 'forest-1',
    name: 'Forest',
    cmc: 0,
    typeLine: 'Basic Land — Forest',
    colors: [],
    colorIdentity: ['G'],
  };

  const commanderEntry: DeckCardWithQuantity[] = [
    { card: commander, quantity: 1, isCommander: true },
  ];
  const maindeckEntries: DeckCardWithQuantity[] = [
    { card: forest, quantity: 99, isCommander: false },
  ];

  const result = validateCommanderDeck(commanderEntry, maindeckEntries);

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.totalCards, 100);
  assert.strictEqual(result.errors.length, 0);
});

test('validateCommanderDeck validates a complete 100-card Commander deck', () => {
  const commander: CardDefinition = {
    scryfallId: 'cmd-atraxa',
    name: "Atraxa, Praetors' Voice",
    cmc: 4,
    typeLine: 'Legendary Creature — Phyrexian Angel Horror',
    colors: ['W', 'U', 'B', 'G'],
    colorIdentity: ['W', 'U', 'B', 'G'], // No Red
  };

  const commanderEntry: DeckCardWithQuantity[] = [
    { card: commander, quantity: 1, isCommander: true },
  ];

  // 99 unique legal cards (35 basic lands + 64 unique cards)
  const maindeck: DeckCardWithQuantity[] = [
    {
      card: {
        scryfallId: 'l1',
        name: 'Plains',
        cmc: 0,
        typeLine: 'Basic Land',
        colors: [],
        colorIdentity: ['W'],
      },
      quantity: 10,
      isCommander: false,
    },
    {
      card: {
        scryfallId: 'l2',
        name: 'Island',
        cmc: 0,
        typeLine: 'Basic Land',
        colors: [],
        colorIdentity: ['U'],
      },
      quantity: 10,
      isCommander: false,
    },
    {
      card: {
        scryfallId: 'l3',
        name: 'Swamp',
        cmc: 0,
        typeLine: 'Basic Land',
        colors: [],
        colorIdentity: ['B'],
      },
      quantity: 10,
      isCommander: false,
    },
    {
      card: {
        scryfallId: 'l4',
        name: 'Forest',
        cmc: 0,
        typeLine: 'Basic Land',
        colors: [],
        colorIdentity: ['G'],
      },
      quantity: 5,
      isCommander: false,
    },
  ];

  // Add 64 distinct singleton cards
  for (let i = 1; i <= 64; i++) {
    maindeck.push({
      card: {
        scryfallId: `staple-${i}`,
        name: `Staple Card #${i}`,
        cmc: (i % 6) + 1,
        typeLine: 'Artifact',
        colors: [],
        colorIdentity: ['U', 'W'], // Subset of Atraxa's identity
      },
      quantity: 1,
      isCommander: false,
    });
  }

  const result = validateCommanderDeck(commanderEntry, maindeck);

  assert.strictEqual(result.totalCards, 100);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.deepStrictEqual(result.commanderColorIdentity.sort(), ['B', 'G', 'U', 'W']);
});

test('validateCommanderDeck flags banned cards with warnings according to legalities.commander (REQ-8.3)', () => {
  const commander: CardDefinition = {
    scryfallId: 'cmd-golos',
    name: 'Golos, Tireless Pilgrim',
    cmc: 5,
    typeLine: 'Legendary Artifact Creature',
    colors: [],
    colorIdentity: ['W', 'U', 'B', 'R', 'G'],
    legalities: { commander: 'banned' },
  };

  const blackLotus: CardDefinition = {
    scryfallId: 'black-lotus',
    name: 'Black Lotus',
    cmc: 0,
    typeLine: 'Artifact',
    colors: [],
    colorIdentity: [],
    legalities: { commander: 'banned' },
  };

  const forest: CardDefinition = {
    scryfallId: 'forest-1',
    name: 'Forest',
    cmc: 0,
    typeLine: 'Basic Land — Forest',
    colors: [],
    colorIdentity: ['G'],
    legalities: { commander: 'legal' },
  };

  const commanderEntry: DeckCardWithQuantity[] = [
    { card: commander, quantity: 1, isCommander: true },
  ];
  const maindeck: DeckCardWithQuantity[] = [
    { card: blackLotus, quantity: 1, isCommander: false },
    { card: forest, quantity: 98, isCommander: false },
  ];

  const result = validateCommanderDeck(commanderEntry, maindeck);

  // REQ-8.4: Doesn't block valid structure, but reports warnings
  assert.strictEqual(result.totalCards, 100);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.bannedCards.length, 2);
  assert.ok(result.bannedCards.includes('Golos, Tireless Pilgrim'));
  assert.ok(result.bannedCards.includes('Black Lotus'));
  assert.strictEqual(result.warnings.length, 2);
});
