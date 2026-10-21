import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { deckService } from '../src/services/deck.service.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/db.js';

describe('Punto 1 (A.1) - Diagnóstico y Telemetría GET /api/health/cards', () => {
  after(async () => {
    await disconnectDatabase();
  });
  it('1. connectDatabase asegura esquemas y permite consultas a cards, rulings y cardLocales', async () => {
    await connectDatabase();
    const cardCount = await prisma.card.count();
    const rulingCount = await prisma.ruling.count();
    const localeCount = await prisma.cardLocale.count();

    assert.equal(typeof cardCount, 'number');
    assert.equal(typeof rulingCount, 'number');
    assert.equal(typeof localeCount, 'number');
    assert.ok(cardCount >= 0);
    assert.ok(rulingCount >= 0);
    assert.ok(localeCount >= 0);
  });

  it('2. getPresetDecksDbStats retorna estadísticas por mazo listo sin fallar', async () => {
    const stats = await deckService.getPresetDecksDbStats();
    assert.ok(Array.isArray(stats));
    assert.ok(stats.length > 0, 'Debe incluir al menos un mazo listo');

    for (const s of stats) {
      assert.ok(s.id, 'Debe tener id de mazo');
      assert.ok(s.name, 'Debe tener nombre de mazo');
      assert.ok(s.filename, 'Debe tener nombre de archivo');
      assert.equal(typeof s.totalUniqueCards, 'number');
      assert.equal(typeof s.existingInDb, 'number');
      assert.ok(Array.isArray(s.missingInDb), 'Debe listar cartas faltantes');
      assert.equal(s.totalUniqueCards, s.existingInDb + s.missingInDb.length);
    }
  });
});
