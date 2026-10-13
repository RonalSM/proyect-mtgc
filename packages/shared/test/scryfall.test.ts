import test from 'node:test';
import assert from 'node:assert';
import { toArtCropUrl } from '../src/utils/scryfall.js';

test('toArtCropUrl transforms scryfall image URLs correctly', () => {
  // Normal to art_crop
  const normalUrl = 'https://cards.scryfall.io/normal/front/8/b/8ba9f61b-9964-4214-b31f-0e0a446a00ab.jpg';
  assert.strictEqual(
    toArtCropUrl(normalUrl),
    'https://cards.scryfall.io/art_crop/front/8/b/8ba9f61b-9964-4214-b31f-0e0a446a00ab.jpg'
  );

  // Large to art_crop
  const largeUrl = 'https://cards.scryfall.io/large/front/1/2/1234.jpg';
  assert.strictEqual(
    toArtCropUrl(largeUrl),
    'https://cards.scryfall.io/art_crop/front/1/2/1234.jpg'
  );

  // Already art_crop
  const artCropUrl = 'https://cards.scryfall.io/art_crop/front/8/b/8ba9f61b-9964-4214-b31f-0e0a446a00ab.jpg';
  assert.strictEqual(toArtCropUrl(artCropUrl), artCropUrl);

  // Scryfall named API endpoint without version
  const namedUrl = 'https://api.scryfall.com/cards/named?exact=Atraxa&format=image';
  assert.strictEqual(
    toArtCropUrl(namedUrl),
    'https://api.scryfall.com/cards/named?exact=Atraxa&format=image&version=art_crop'
  );

  // Scryfall named API endpoint with version=normal
  const namedVersionUrl = 'https://api.scryfall.com/cards/named?exact=Atraxa&format=image&version=normal';
  assert.strictEqual(
    toArtCropUrl(namedVersionUrl),
    'https://api.scryfall.com/cards/named?exact=Atraxa&format=image&version=art_crop'
  );

  // Fallback when empty or undefined
  assert.ok(toArtCropUrl(undefined).includes('art_crop'));
  assert.ok(toArtCropUrl('').includes('art_crop'));

  // Non-scryfall URL remains intact
  const customUrl = 'https://example.com/custom-playmat.png';
  assert.strictEqual(toArtCropUrl(customUrl), customUrl);
});
