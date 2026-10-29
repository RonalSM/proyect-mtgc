import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, connectDatabase, disconnectDatabase } from '../src/db.js';

describe('Punto 2 (A.2) - Poblar la Base con Sincronización Real', () => {
  after(async () => {
    await disconnectDatabase();
  });

  it('1. La base de datos local contiene decenas de miles de cartas reales de Scryfall', async () => {
    await connectDatabase();
    const cardCount = await prisma.card.count();
    console.log(`[Test A.2] Recuento de cartas en DB: ${cardCount}`);
    assert.ok(
      cardCount >= 30000,
      `Debe contener decenas de miles de cartas (actual: ${cardCount})`,
    );
  });

  it('2. Contiene fichas (tokens) identificables por layout o typeLine', async () => {
    const tokenCount = await prisma.card.count({
      where: {
        OR: [{ layout: 'token' }, { typeLine: { contains: 'Token', mode: 'insensitive' } }],
      },
    });
    console.log(`[Test A.2] Recuento de fichas en DB: ${tokenCount}`);
    assert.ok(tokenCount > 500, `Debe contener fichas (actual: ${tokenCount})`);
  });

  it('3. Contiene decenas de miles de dictámenes oficiales de Scryfall (rulings)', async () => {
    const rulingCount = await prisma.ruling.count();
    console.log(`[Test A.2] Recuento de dictámenes en DB: ${rulingCount}`);
    assert.ok(
      rulingCount >= 70000,
      `Debe contener dictámenes de Scryfall (actual: ${rulingCount})`,
    );
  });

  it('4. Contiene decenas de miles de traducciones oficiales en español (card_locales)', async () => {
    const localeCount = await prisma.cardLocale.count({
      where: { lang: 'es' },
    });
    console.log(`[Test A.2] Recuento de card_locales en DB: ${localeCount}`);
    assert.ok(
      localeCount >= 20000,
      `Debe contener traducciones en español (actual: ${localeCount})`,
    );
  });
});
