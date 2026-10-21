import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cardSearchService } from '../src/services/card-search.service.js';
import { connectDatabase } from '../src/db.js';

describe('Punto 4 (A.4) - Resolvedor por Lotes POST /api/cards/resolve', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    setTimeout(() => process.exit(0), 100).unref();
  });

  it('1. resolveCards resuelve lote de cartas por nombres en inglés y español con tipos canónicos', async () => {
    const res = await cardSearchService.resolveCards({
      names: ['Sol Ring', 'Anillo solar', 'Krenko, Mob Boss', 'Goreclaw, Terror of Qal Sisma'],
      lang: 'es',
    });

    assert.equal(res.count, 4, 'Debe resolver las 4 consultas');
    assert.ok(res.byQuery['Sol Ring'], 'Debe resolver Sol Ring');
    assert.ok(res.byQuery['Anillo solar'], 'Debe resolver Anillo solar');
    assert.ok(res.byQuery['Krenko, Mob Boss'], 'Debe resolver Krenko');
    assert.ok(res.byQuery['Goreclaw, Terror of Qal Sisma'], 'Debe resolver Goreclaw');

    // Sol Ring
    const solRing = res.byQuery['Sol Ring']!;
    assert.equal(solRing.name, 'Sol Ring');
    assert.equal(solRing.typeLine, 'Artifact', 'typeLine canónico en inglés');
    assert.ok(solRing.oracleText?.includes('Add {C}{C}'), 'oracleText oficial');
    assert.equal(solRing.cmc, 1);
    assert.ok(solRing.imageUrlNormal, 'imageUrlNormal real de Scryfall');
    assert.ok(!solRing.imageUrlNormal.includes('178975'), 'No debe contener URLs falsas con sufijo 178975');
    // Krenko (P/T para criaturas y rulings oficiales)
    const krenko = res.byQuery['Krenko, Mob Boss']!;
    assert.equal(krenko.power, '3');
    assert.equal(krenko.toughness, '3');
    assert.ok(krenko.typeLine.includes('Goblin'));
    assert.ok(krenko.rulings && krenko.rulings.length > 0, 'Debe incluir rulings oficiales de Scryfall');
    assert.ok(krenko.rulings[0].comment.includes('Goblin'));
  });

  it('2. resolveCards resuelve cartas de dos caras (DFC / Aventura) con caras completas', async () => {
    const res = await cardSearchService.resolveCards({
      names: ['Lovestruck Beast', 'Dowsing Dagger'],
      lang: 'es',
    });

    assert.ok(res.byQuery['Lovestruck Beast']);
    const lovestruck = res.byQuery['Lovestruck Beast']!;
    assert.equal(lovestruck.isTwoFaced, true);
    assert.ok(lovestruck.faces && lovestruck.faces.length === 2);
    assert.equal(lovestruck.faces[0].name, 'Lovestruck Beast');
    assert.equal(lovestruck.faces[1].name, "Heart's Desire");
    assert.ok(lovestruck.faces[0].typeLine.includes('Creature'));
    assert.ok(lovestruck.faces[1].typeLine.includes('Adventure'));

    const dagger = res.byQuery['Dowsing Dagger']!;
    assert.equal(dagger.isTwoFaced, true);
    assert.ok(dagger.faces && dagger.faces.length === 2);
    assert.equal(dagger.faces[0].name, 'Dowsing Dagger');
    assert.equal(dagger.faces[1].name, 'Lost Vale');
  });

  it('3. Servidor decide cadena de respaldo: español si existe con imagen real, si no inglés', async () => {
    const res = await cardSearchService.resolveCards({
      names: ['Sol Ring', 'UniqueCardWithNoSpanishPrintingEver12345'],
      lang: 'es',
    });

    const solRing = res.byQuery['Sol Ring']!;
    assert.ok(solRing.locales?.es, 'Sol Ring tiene impresión real en español');
    assert.equal(solRing.locales?.es?.printedName, 'Anillo solar');
    assert.ok(solRing.imageUrlNormal?.includes('cards.scryfall.io'), 'URL de imagen de Scryfall real');

    assert.equal(
      res.byQuery['UniqueCardWithNoSpanishPrintingEver12345'],
      null,
      'Cartas inexistentes retornan null sin inventar datos',
    );
  });
});
