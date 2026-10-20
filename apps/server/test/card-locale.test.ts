import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCardDisplayData, CardDefinition } from '@mtgc/shared';
import {
  cardLocaleService,
  PRESEEDED_SPANISH_LOCALES,
} from '../src/services/card-locale.service.js';

describe('Punto 5 (C.5) - Idioma Español Prioritario y Fallback en Inglés', () => {
  const sampleCardWithSpanish: CardDefinition = {
    scryfallId: '17726514-6296-4171-b6a3-2287f394c86b',
    oracleId: 'b320d044-301b-4395-a841-be80e0c03d52',
    name: 'Sol Ring',
    cmc: 1,
    typeLine: 'Artifact',
    oracleText: '{T}: Add {C}{C}.',
    colors: [],
    colorIdentity: [],
    imageUrlNormal: 'https://cards.scryfall.io/normal/en/sol-ring.jpg',
    locales: {
      es: {
        printedName: 'Anillo solar',
        printedTypeLine: 'Artefacto',
        printedText: '{T}: Agrega {C}{C}.',
        imageUrlNormal:
          'https://cards.scryfall.io/normal/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg',
      },
    },
  };

  const sampleCardEnglishOnly: CardDefinition = {
    scryfallId: 'custom-english-only-123',
    oracleId: 'english-only-oracle-456',
    name: 'Unique English Card',
    cmc: 3,
    typeLine: 'Creature — Beast',
    oracleText: 'When this creature enters, draw a card.',
    colors: ['G'],
    colorIdentity: ['G'],
    imageUrlNormal: 'https://cards.scryfall.io/normal/en/beast.jpg',
  };

  it('1. Retorna datos en español si lang === "es" y la carta tiene traducción', () => {
    const display = getCardDisplayData(sampleCardWithSpanish, 'es');
    assert.equal(display.name, 'Anillo solar');
    assert.equal(display.typeLine, 'Artefacto');
    assert.equal(display.oracleText, '{T}: Agrega {C}{C}.');
    assert.equal(
      display.imageUrlNormal,
      'https://cards.scryfall.io/normal/front/1/7/17726514-6296-4171-b6a3-2287f394c86b.jpg',
    );
    assert.equal(display.isSpanish, true);
  });

  it('2. Si la carta no tiene impresión en español, cae a inglés automáticamente (fallback)', () => {
    const display = getCardDisplayData(sampleCardEnglishOnly, 'es');
    assert.equal(display.name, 'Unique English Card');
    assert.equal(display.typeLine, 'Creature — Beast');
    assert.equal(display.oracleText, 'When this creature enters, draw a card.');
    assert.equal(display.imageUrlNormal, 'https://cards.scryfall.io/normal/en/beast.jpg');
    assert.equal(display.isSpanish, false);
  });

  it('3. Si el usuario selecciona idioma inglés ("en"), muestra los campos originales en inglés', () => {
    const display = getCardDisplayData(sampleCardWithSpanish, 'en');
    assert.equal(display.name, 'Sol Ring');
    assert.equal(display.typeLine, 'Artifact');
    assert.equal(display.oracleText, '{T}: Add {C}{C}.');
    assert.equal(display.imageUrlNormal, 'https://cards.scryfall.io/normal/en/sol-ring.jpg');
    assert.equal(display.isSpanish, false);
  });

  it('4. CardLocaleService reconoce grapas Commander presembradas en español', () => {
    const solRingLocale = cardLocaleService.getLocaleSync('b320d044-301b-4395-a841-be80e0c03d52');
    assert.ok(solRingLocale);
    assert.equal(solRingLocale.printedName, 'Anillo solar');
    assert.equal(solRingLocale.printedTypeLine, 'Artefacto');

    const titheLocale = cardLocaleService.getLocaleSync('a9e144f8-1976-4d0d-95cf-0f135b376d29');
    assert.ok(titheLocale);
    assert.equal(titheLocale.printedName, 'Diezmo asfixiante');
  });

  it('5. enrichCardWithLocale añade locales.es correctamente a una CardDefinition', async () => {
    const rawSolRing: CardDefinition = {
      scryfallId: 'test-sol-ring',
      oracleId: 'b320d044-301b-4395-a841-be80e0c03d52',
      name: 'Sol Ring',
      cmc: 1,
      typeLine: 'Artifact',
      colors: [],
      colorIdentity: [],
    };

    const enriched = await cardLocaleService.enrichCardWithLocale(rawSolRing, 'es');
    assert.ok(enriched.locales?.es);
    assert.equal(enriched.locales.es.printedName, 'Anillo solar');
    assert.equal(enriched.locales.es.printedTypeLine, 'Artefacto');
  });

  it('6. matchesName valida concordancia tanto en inglés como en español', () => {
    assert.equal(cardLocaleService.matchesName(sampleCardWithSpanish, 'Sol Ring'), true);
    assert.equal(cardLocaleService.matchesName(sampleCardWithSpanish, 'sol'), true);
    assert.equal(cardLocaleService.matchesName(sampleCardWithSpanish, 'Anillo'), true);
    assert.equal(cardLocaleService.matchesName(sampleCardWithSpanish, 'solar'), true);
    assert.equal(cardLocaleService.matchesName(sampleCardWithSpanish, 'dragón'), false);
  });
});
