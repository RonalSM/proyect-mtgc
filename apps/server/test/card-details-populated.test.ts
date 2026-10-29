import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cardSearchService } from '../src/services/card-search.service.js';
import { connectDatabase } from '../src/db.js';
import { parseDecklist, type CardDefinition } from '@mtgc/shared';

describe('Punto 8 (B.8) - Ver Carta Completo con Datos Reales y 10 Cartas al Azar por Mazo Listo', () => {
  let useHttp = false;

  before(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/health');
      if (res.ok) {
        useHttp = true;
      }
    } catch {
      useHttp = false;
    }

    if (!useHttp) {
      await connectDatabase();
    }
  });

  after(async () => {
    setTimeout(() => process.exit(0), 100).unref();
  });

  async function resolveBatch(
    names: string[],
    lang = 'es',
  ): Promise<{ count: number; byQuery: Record<string, CardDefinition | null> }> {
    if (useHttp) {
      const res = await fetch('http://localhost:3001/api/cards/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, lang }),
      });
      return await res.json();
    }
    return await cardSearchService.resolveCards({ names, lang });
  }

  it('1. Prueba con 10 cartas al azar de cada uno de los 8 mazos listos (80 cartas en total)', async () => {
    const presetDir = fs.existsSync(path.resolve('prisma/seed/preset-decks'))
      ? path.resolve('prisma/seed/preset-decks')
      : path.resolve('apps/server/prisma/seed/preset-decks');

    const files = fs
      .readdirSync(presetDir)
      .filter(f => f.endsWith('.txt'))
      .sort();
    assert.equal(files.length, 8, 'Deben existir los 8 archivos de mazos listos');

    const totalEvaluatedCards: Array<{ deck: string; card: CardDefinition }> = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(presetDir, file), 'utf-8');
      const parsed = parseDecklist(content);
      const uniqueNames = Array.from(
        new Set(
          [...parsed.commanderEntries, ...parsed.maindeckEntries].map(e => e.cardName.trim()),
        ),
      );

      assert.ok(uniqueNames.length >= 10, `El mazo ${file} debe tener al menos 10 cartas únicas`);

      // Seleccionar 10 cartas al azar del mazo
      const shuffled = [...uniqueNames].sort(() => 0.5 - Math.random());
      const selectedNames = shuffled.slice(0, 10);

      // Resolver las 10 cartas usando resolveCards (Punto 4 y 8)
      const resolution = await resolveBatch(selectedNames, 'es');

      assert.equal(resolution.count, 10, `Debe resolver las 10 cartas para el mazo ${file}`);

      for (const name of selectedNames) {
        const card = resolution.byQuery[name];
        assert.ok(
          card,
          `La carta "${name}" del mazo "${file}" debe resolverse desde la base local`,
        );
        totalEvaluatedCards.push({ deck: file, card });

        // 1. Nombre
        assert.ok(card.name && card.name.length > 0, `[${name}] Debe tener nombre no vacío`);

        // 2. Coste de maná (no aplica a tierras)
        const isLand = card.typeLine.toLowerCase().includes('land');
        if (!isLand) {
          assert.ok(
            card.manaCost !== undefined && card.manaCost !== null && card.manaCost.length > 0,
            `[${name}] No-tierra debe tener manaCost poblado (obtenido: ${card.manaCost})`,
          );
        }

        // 3. Tipo (canónico en inglés)
        assert.ok(
          card.typeLine && card.typeLine.length > 0,
          `[${name}] Debe tener typeLine no vacío`,
        );

        // 4. Texto Oracle
        const isBasicLand = /^(Plains|Island|Swamp|Mountain|Forest)$/i.test(card.name);
        if (!isBasicLand) {
          assert.ok(
            card.oracleText !== undefined && card.oracleText !== null,
            `[${name}] Debe tener oracleText poblado`,
          );
        }

        // 5. Poder y Resistencia (Criaturas) o Lealtad (Planeswalkers)
        const isCreature = card.typeLine.toLowerCase().includes('creature');
        const isPlaneswalker = card.typeLine.toLowerCase().includes('planeswalker');

        if (isCreature) {
          assert.ok(
            card.power !== undefined && card.power !== null,
            `[${name}] Criatura debe tener power impreso poblado`,
          );
          assert.ok(
            card.toughness !== undefined && card.toughness !== null,
            `[${name}] Criatura debe tener toughness impreso poblado`,
          );
        }
        if (isPlaneswalker) {
          assert.ok(
            card.loyalty !== undefined && card.loyalty !== null,
            `[${name}] Planeswalker debe tener loyalty poblado`,
          );
        }

        // 6. Set y Nombre de Set (Edición)
        assert.ok(
          card.set !== undefined && card.set !== null && card.set.length > 0,
          `[${name}] Debe tener set (código de edición) poblado`,
        );
        assert.ok(
          card.setName !== undefined && card.setName !== null && card.setName.length > 0,
          `[${name}] Debe tener setName poblado`,
        );

        // 7. Rareza
        assert.ok(
          card.rarity !== undefined && card.rarity !== null && card.rarity.length > 0,
          `[${name}] Debe tener rarity poblado (obtenido: ${card.rarity})`,
        );

        // 8. Artista
        assert.ok(
          card.artist !== undefined && card.artist !== null && card.artist.length > 0,
          `[${name}] Debe tener artista real poblado`,
        );
        assert.notEqual(card.artist, 'Unknown Artist', `[${name}] No debe ser 'Unknown Artist'`);

        // 9. Copyright
        assert.ok(
          card.copyright !== undefined && card.copyright !== null,
          `[${name}] Debe tener copyright poblado`,
        );
        assert.ok(
          card.copyright.includes('Wizards of the Coast'),
          `[${name}] Debe tener copyright de WotC`,
        );

        // 10. Legalidad (Commander)
        assert.ok(card.legalities, `[${name}] Debe tener mapa de legalities`);
        assert.equal(
          card.legalities.commander,
          'legal',
          `[${name}] Debe ser legal en formato Commander`,
        );

        // 11. Dictámenes (rulings)
        assert.ok(Array.isArray(card.rulings), `[${name}] rulings debe ser un arreglo`);
      }
    }

    assert.equal(
      totalEvaluatedCards.length,
      80,
      'Deben haberse evaluado exactamente 80 cartas (10 por cada uno de los 8 mazos)',
    );
    console.log(
      `✅ [Test Punto 8] 80 cartas evaluadas con éxito en los 8 mazos listos. Todos los 11 campos verificados.`,
    );
  });

  it('2. Si una carta no está en la base local, resolveCards devuelve null y no inventa datos', async () => {
    const res = await resolveBatch(['Carta Inexistente Jamas Impresa 99999']);

    assert.equal(res.count, 0, 'No debe resolver cartas inexistentes');
    assert.equal(res.byQuery['Carta Inexistente Jamas Impresa 99999'], null);
  });

  it('3. Las cartas con traducción al español tienen texto y nombre en español disponibles', async () => {
    const res = await resolveBatch(
      ['Krenko, Mob Boss', 'Sol Ring', 'Goreclaw, Terror of Qal Sisma'],
      'es',
    );

    const krenko = res.byQuery['Krenko, Mob Boss']!;
    assert.ok(krenko.locales?.es, 'Krenko debe tener traducción al español');
    assert.equal(krenko.locales.es.printedName, 'Krenko, jefe de turba');
    assert.ok(krenko.locales.es.printedTypeLine?.includes('Guerrero trasgo'));

    const goreclaw = res.byQuery['Goreclaw, Terror of Qal Sisma']!;
    assert.ok(goreclaw.locales?.es, 'Goreclaw debe tener traducción al español');
    assert.equal(goreclaw.locales.es.printedName, 'Zarpasangrienta, Terror de Qal Sisma');

    const solRing = res.byQuery['Sol Ring']!;
    assert.ok(solRing.locales?.es, 'Sol Ring debe tener traducción al español');
    assert.equal(solRing.locales.es.printedName, 'Anillo solar');
  });
});
