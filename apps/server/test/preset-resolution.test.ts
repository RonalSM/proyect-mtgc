import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { deckService } from '../src/services/deck.service.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/db.js';

describe('Punto 3 (A.3) - Mazos Listos con Resolución Real contra DB', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await disconnectDatabase(true);
  });

  it('1. loadPresetDecks carga los 8 mazos listos con cartas reales de la base de datos', async () => {
    await connectDatabase();
    const presets = await deckService.loadPresetDecks();
    assert.equal(presets.length, 8, 'Debe cargar exactamente 8 mazos listos');

    for (const deck of presets) {
      assert.equal(deck.cardCount, 100, `El mazo ${deck.name} debe tener 100 cartas`);
      assert.ok(deck.commanderCards.length >= 1, `Debe tener al menos 1 comandante`);

      // Verificar que ninguna carta tenga IDs sintéticos inventados
      for (const c of deck.commanderCards) {
        assert.ok(!c.scryfallId.startsWith('cmdr_'), `No debe tener ID sintético: ${c.scryfallId}`);
        assert.ok(!c.scryfallId.startsWith('id_'), `No debe tener ID sintético: ${c.scryfallId}`);
        assert.ok(c.scryfallId.length > 10, `Debe tener un scryfallId real: ${c.scryfallId}`);
        if (c.imageUrlNormal) {
          assert.ok(
            !c.imageUrlNormal.includes('178975'),
            `No debe contener URLs fake con timestamp 178975`,
          );
        }
      }

      for (const c of deck.maindeckCards) {
        assert.ok(!c.scryfallId.startsWith('main_'), `No debe tener ID sintético: ${c.scryfallId}`);
        assert.ok(!c.scryfallId.startsWith('id_'), `No debe tener ID sintético: ${c.scryfallId}`);
        assert.ok(c.scryfallId.length > 10, `Debe tener un scryfallId real: ${c.scryfallId}`);
        if (c.imageUrlNormal) {
          assert.ok(
            !c.imageUrlNormal.includes('178975'),
            `No debe contener URLs fake con timestamp 178975`,
          );
        }
      }
    }
  });

  it('2. resolveCardFromDb resuelve cartas normales y DFC con datos reales', async () => {
    const solRing = await deckService.resolveCardFromDb('Sol Ring');
    assert.ok(solRing, 'Sol Ring debe resolverse desde la base');
    assert.equal(solRing.name, 'Sol Ring');
    assert.equal(solRing.cmc, 1);
    assert.ok(solRing.locales?.es, 'Sol Ring debe tener locale en español');
    assert.equal(solRing.locales?.es?.printedName, 'Anillo solar');

    // Carta DFC / Aventura
    const lovestruck = await deckService.resolveCardFromDb('Lovestruck Beast');
    assert.ok(lovestruck, 'Lovestruck Beast debe resolverse como DFC/Aventura');
    assert.ok(lovestruck.name.includes('Lovestruck Beast'));
  });

  it('3. resolveCardFromDb retorna null ante nombres inexistentes y no inventa datos', async () => {
    const fake = await deckService.resolveCardFromDb('NonExistentCardXYZ12345');
    assert.equal(fake, null, 'No debe inventar cartas inexistentes');
  });
});
