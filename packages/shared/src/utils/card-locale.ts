import type { CardDefinition, CardFace } from '../types/card.js';

export type SupportedLanguage = 'es' | 'en';
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
 * Returns localized card display fields following language preference with English fallback.
 * (Punto 5, C.5 - Español Prioritario)
 */
export function getCardDisplayData(
  card: CardDefinition,
  lang: SupportedLanguage = 'es',
  faceIndex = 0,
): CardDisplayData {
  const hasFace = !!(card.faces && card.faces[faceIndex]);
  const face: CardFace | undefined = hasFace ? card.faces![faceIndex] : undefined;

  // Si se solicita español y la carta tiene datos traducidos en locales.es
  if (lang === 'es' && card.locales?.es) {
    const es = card.locales.es;
    return {
      name: (faceIndex === 0 ? es.printedName : face?.name) || es.printedName || card.name,
      typeLine: (faceIndex === 0 ? es.printedTypeLine : face?.typeLine) || es.printedTypeLine || card.typeLine,
      oracleText: (faceIndex === 0 ? es.printedText : face?.oracleText) || es.printedText || card.oracleText || '',
      imageUrlNormal: (faceIndex === 0 ? es.imageUrlNormal : face?.imageUrlNormal) || es.imageUrlNormal || card.imageUrlNormal || face?.imageUrlNormal,
      imageUrlSmall: (faceIndex === 0 ? es.imageUrlSmall : face?.imageUrlSmall) || es.imageUrlSmall || card.imageUrlSmall || face?.imageUrlSmall,
      imageUrlLarge: (faceIndex === 0 ? es.imageUrlLarge : face?.imageUrlLarge) || es.imageUrlLarge || card.imageUrlLarge || face?.imageUrlLarge,
      imageUrlArtCrop: (faceIndex === 0 ? es.imageUrlArtCrop : face?.imageUrlArtCrop) || es.imageUrlArtCrop || card.imageUrlArtCrop || face?.imageUrlArtCrop,
      isSpanish: true,
    };
  }

  // Carta de dos caras o con caras múltiples en inglés o fallback
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
 * Función unificada para obtener la URL de imagen de una carta según tamaño e idioma (Punto 5 - A.5).
 * Utiliza exclusivamente las URLs guardadas de image_uris y NUNCA deriva small o normal
 * reemplazando texto en una URL.
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
  const lang = options?.lang || 'es';
  const faceIndex = options?.faceIndex || 0;

  const display = getCardDisplayData(card, lang, faceIndex);

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
