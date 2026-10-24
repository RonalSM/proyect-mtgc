import type { CardDefinition, CardFace } from '../types/card.js';

export type SupportedLanguage = 'en' | 'es';
export type CardImageSize = 'small' | 'normal' | 'large' | 'art_crop';

export interface CardDisplayData {
  name: string;
  typeLine: string;
  oracleText: string;
  imageUrlNormal?: string;
  imageUrlSmall?: string;
  imageUrlLarge?: string;
  imageUrlArtCrop?: string;
  isSpanish: boolean;
}

/**
 * Returns canonical card display fields strictly in English.
 * Eliminates missing Spanish print issues, translation mismatches, and 404 CDN image errors.
 */
export function getCardDisplayData(
  card: CardDefinition,
  _lang: SupportedLanguage = 'en',
  faceIndex = 0,
): CardDisplayData {
  const hasFace = !!(card.faces && card.faces[faceIndex]);
  const face: CardFace | undefined = hasFace ? card.faces![faceIndex] : undefined;

  // Carta de dos caras o con caras múltiples en inglés canónico
  if (hasFace && face) {
    return {
      name: face.name,
      typeLine: face.typeLine,
      oracleText: face.oracleText || '',
      imageUrlNormal: face.imageUrlNormal || card.imageUrlNormal,
      imageUrlSmall: face.imageUrlSmall || card.imageUrlSmall,
      imageUrlLarge: face.imageUrlLarge || card.imageUrlLarge,
      imageUrlArtCrop: face.imageUrlArtCrop || card.imageUrlArtCrop,
      isSpanish: false,
    };
  }

  return {
    name: card.name,
    typeLine: card.typeLine,
    oracleText: card.oracleText || '',
    imageUrlNormal: card.imageUrlNormal,
    imageUrlSmall: card.imageUrlSmall,
    imageUrlLarge: card.imageUrlLarge,
    imageUrlArtCrop: card.imageUrlArtCrop,
    isSpanish: false,
  };
}

/**
 * Función unificada para obtener la URL de imagen de una carta según tamaño.
 * Utiliza exclusivamente las URLs guardadas de image_uris de Scryfall (inglés canónico).
 */
export function getCardImageUrl(
  card?: CardDefinition | null,
  options?: {
    size?: CardImageSize;
    lang?: SupportedLanguage;
    faceIndex?: number;
  },
): string | undefined {
  if (!card) return undefined;
  const size = options?.size || 'normal';
  const faceIndex = options?.faceIndex || 0;

  const display = getCardDisplayData(card, 'en', faceIndex);

  switch (size) {
    case 'small':
      return display.imageUrlSmall || display.imageUrlNormal || undefined;
    case 'normal':
      return display.imageUrlNormal || display.imageUrlSmall || undefined;
    case 'large':
      return display.imageUrlLarge || display.imageUrlNormal || display.imageUrlSmall || undefined;
    case 'art_crop':
      return display.imageUrlArtCrop || display.imageUrlNormal || undefined;
    default:
      return display.imageUrlNormal || display.imageUrlSmall || undefined;
  }
}
