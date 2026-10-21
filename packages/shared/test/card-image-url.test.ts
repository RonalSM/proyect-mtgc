import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCardImageUrl, CardDefinition } from '../src/index.js';

describe('Punto 5 (A.5) - getCardImageUrl unificado sin derivación por reemplazo de texto', () => {
  const cardWithBothImages: CardDefinition = {
    scryfallId: 'test-uuid-normal-in-name',
    oracleId: 'test-oracle-id',
    name: 'Normal Beast',
    cmc: 3,
    typeLine: 'Creature — Beast',
    colors: ['G'],
    colorIdentity: ['G'],
    imageUrlSmall: 'https://cards.scryfall.io/small/front/1/2/test-small-uuid.jpg?123',
    imageUrlNormal: 'https://cards.scryfall.io/normal/front/1/2/test-normal-uuid.jpg?456',
    imageUrlLarge: 'https://cards.scryfall.io/large/front/1/2/test-large-uuid.jpg?789',
    imageUrlArtCrop: 'https://cards.scryfall.io/art_crop/front/1/2/test-artcrop-uuid.jpg?101',
    locales: {
      es: {
        printedName: 'Bestia normal',
        imageUrlSmall: 'https://cards.scryfall.io/small/front/e/s/es-small.jpg?111',
        imageUrlNormal: 'https://cards.scryfall.io/normal/front/e/s/es-normal.jpg?222',
        imageUrlLarge: 'https://cards.scryfall.io/large/front/e/s/es-large.jpg?333',
        imageUrlArtCrop: 'https://cards.scryfall.io/art_crop/front/e/s/es-artcrop.jpg?444',
      },
    },
  };

  const cardTwoFaced: CardDefinition = {
    scryfallId: 'dfc-card-id',
    name: 'Front Face // Back Face',
    cmc: 2,
    typeLine: 'Artifact // Land',
    colors: [],
    colorIdentity: [],
    isTwoFaced: true,
    faces: [
      {
        name: 'Front Face',
        typeLine: 'Artifact',
        imageUrlSmall: 'https://cards.scryfall.io/small/front/f/r/front-small.jpg',
        imageUrlNormal: 'https://cards.scryfall.io/normal/front/f/r/front-normal.jpg',
      },
      {
        name: 'Back Face',
        typeLine: 'Land',
        imageUrlSmall: 'https://cards.scryfall.io/small/back/b/k/back-small.jpg',
        imageUrlNormal: 'https://cards.scryfall.io/normal/back/b/k/back-normal.jpg',
      },
    ],
  };

  it('1. Retorna URLs exactas guardadas según tamaño sin modificar texto ni timestamps', () => {
    const small = getCardImageUrl(cardWithBothImages, { size: 'small', lang: 'en' });
    assert.equal(small, 'https://cards.scryfall.io/small/front/1/2/test-small-uuid.jpg?123');

    const normal = getCardImageUrl(cardWithBothImages, { size: 'normal', lang: 'en' });
    assert.equal(normal, 'https://cards.scryfall.io/normal/front/1/2/test-normal-uuid.jpg?456');

    const large = getCardImageUrl(cardWithBothImages, { size: 'large', lang: 'en' });
    assert.equal(large, 'https://cards.scryfall.io/large/front/1/2/test-large-uuid.jpg?789');

    const artCrop = getCardImageUrl(cardWithBothImages, { size: 'art_crop', lang: 'en' });
    assert.equal(artCrop, 'https://cards.scryfall.io/art_crop/front/1/2/test-artcrop-uuid.jpg?101');
  });

  it('2. Retorna URLs en español si existen cuando lang === "es"', () => {
    const smallEs = getCardImageUrl(cardWithBothImages, { size: 'small', lang: 'es' });
    assert.equal(smallEs, 'https://cards.scryfall.io/small/front/e/s/es-small.jpg?111');

    const normalEs = getCardImageUrl(cardWithBothImages, { size: 'normal', lang: 'es' });
    assert.equal(normalEs, 'https://cards.scryfall.io/normal/front/e/s/es-normal.jpg?222');
  });

  it('3. Soporta cartas de dos caras devolviendo la cara solicitada (faceIndex)', () => {
    const frontUrl = getCardImageUrl(cardTwoFaced, { size: 'normal', faceIndex: 0 });
    assert.equal(frontUrl, 'https://cards.scryfall.io/normal/front/f/r/front-normal.jpg');

    const backUrl = getCardImageUrl(cardTwoFaced, { size: 'normal', faceIndex: 1 });
    assert.equal(backUrl, 'https://cards.scryfall.io/normal/back/b/k/back-normal.jpg');
  });

  it('4. Retorna undefined de forma segura ante cartas nulas o sin imagen', () => {
    assert.equal(getCardImageUrl(null), undefined);
    assert.equal(getCardImageUrl(undefined), undefined);

    const emptyCard: CardDefinition = {
      scryfallId: 'empty-1',
      name: 'No Image Card',
      cmc: 0,
      typeLine: 'Token',
      colors: [],
      colorIdentity: [],
    };
    assert.equal(getCardImageUrl(emptyCard), undefined);
  });
});
