import test from 'node:test';
import assert from 'node:assert';
import { deckService } from '../src/services/deck.service.js';
import { CardDefinition } from '@mtgc/shared';

const mockCommander: CardDefinition = {
  scryfallId: 'cmd_1',
  name: "Atraxa, Praetors' Voice",
  cmc: 4,
  typeLine: 'Legendary Creature — Phyrexian Angel Horror',
  colors: ['W', 'U', 'B', 'G'],
  colorIdentity: ['W', 'U', 'B', 'G'],
};

const mockSolRing: CardDefinition = {
  scryfallId: 'sol_ring_1',
  name: 'Sol Ring',
  cmc: 1,
  typeLine: 'Artifact',
  colors: [],
  colorIdentity: [],
};

test('DeckService - saves and retrieves user decks linked to userId (REQ-7.5)', async () => {
  const userId = `user_${Date.now()}`;

  // 1. Save deck
  const saved = await deckService.saveDeck(userId, {
    name: 'Atraxa Proliferate',
    rawDecklist: "1 Atraxa, Praetors' Voice\n1 Sol Ring",
    commanderCards: [mockCommander],
    maindeckCards: [mockSolRing],
  });

  assert.ok(saved.id);
  assert.strictEqual(saved.userId, userId);
  assert.strictEqual(saved.name, 'Atraxa Proliferate');
  assert.strictEqual(saved.commanderName, "Atraxa, Praetors' Voice");
  assert.deepStrictEqual(saved.colorIdentity, ['W', 'U', 'B', 'G']);
  assert.strictEqual(saved.cardCount, 2);

  // 2. Retrieve user decks
  const userDecks = await deckService.getUserDecks(userId);
  assert.strictEqual(userDecks.length, 1);
  assert.strictEqual(userDecks[0]?.id, saved.id);
  assert.strictEqual(userDecks[0]?.name, 'Atraxa Proliferate');

  // 3. Retrieve by ID
  const fetched = await deckService.getDeckById(saved.id, userId);
  assert.ok(fetched);
  assert.strictEqual(fetched.name, 'Atraxa Proliferate');
  assert.strictEqual(fetched.commanderCards.length, 1);
  assert.strictEqual(fetched.maindeckCards.length, 1);

  // 4. Other user cannot access or delete
  const otherUserFetch = await deckService.getDeckById(saved.id, 'different_user_id');
  assert.strictEqual(otherUserFetch, null);

  const otherUserDelete = await deckService.deleteDeck(saved.id, 'different_user_id');
  assert.strictEqual(otherUserDelete, false);

  // 5. Delete deck by owner
  const ownerDelete = await deckService.deleteDeck(saved.id, userId);
  assert.strictEqual(ownerDelete, true);

  const afterDelete = await deckService.getUserDecks(userId);
  assert.strictEqual(afterDelete.length, 0);
});

test('DeckService - loads, validates and serves 6 to 8 preset Commander decks (Punto 8)', async () => {
  const presets = await deckService.loadPresetDecks();

  // Exactly between 6 and 8 decks (8 generated)
  assert.ok(
    presets.length >= 6 && presets.length <= 8,
    `Expected 6 to 8 presets, got ${presets.length}`,
  );

  for (const preset of presets) {
    assert.strictEqual(preset.isPreset, true, `${preset.name} must be marked isPreset`);
    assert.strictEqual(preset.userId, null, `${preset.name} must have null userId (system preset)`);
    assert.strictEqual(preset.cardCount, 100, `${preset.name} must have exactly 100 cards`);
    assert.strictEqual(
      preset.commanderCards.length,
      1,
      `${preset.name} must have 1 commander card`,
    );
    assert.strictEqual(
      preset.maindeckCards.length,
      99,
      `${preset.name} must have 99 maindeck cards`,
    );
    assert.ok(preset.commanderImageUrl, `${preset.name} must have a commander art crop URL`);
  }

  // Cached getter returns the same list
  const cached = await deckService.getPresetDecks();
  assert.strictEqual(cached.length, presets.length);

  // Check color diversity across presets
  const redPreset = presets.find(p => p.id === 'preset-krenko-mob-boss');
  assert.ok(redPreset);
  assert.deepStrictEqual(redPreset.colorIdentity, ['R']);

  const greenPreset = presets.find(p => p.id === 'preset-goreclaw-terror-of-qal-sisma');
  assert.ok(greenPreset);
  assert.deepStrictEqual(greenPreset.colorIdentity, ['G']);

  const colorlessPreset = presets.find(p => p.id === 'preset-kozilek-the-great-distortion');
  assert.ok(colorlessPreset);
  assert.deepStrictEqual(colorlessPreset.colorIdentity, []);

  const esperPreset = presets.find(p => p.id === 'preset-alela-artful-provocateur');
  assert.ok(esperPreset);
  assert.deepStrictEqual(esperPreset.colorIdentity, ['W', 'U', 'B']);
});
