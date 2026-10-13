/**
 * Utilidades para integración con Scryfall (REQ-8, REQ-22.3)
 */

/**
 * Convierte cualquier URL de imagen de carta de Scryfall a su variante art_crop (REQ-22.3).
 * Extrae exclusivamente la ilustración de la carta, eliminando el marco, textos y caja de reglas.
 * Si la URL no es de Scryfall o ya es art_crop, la conserva intacta.
 */
export function toArtCropUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://cards.scryfall.io/art_crop/front/8/b/8ba9f61b-9964-4214-b31f-0e0a446a00ab.jpg';
  }
  const trimmed = url.trim();

  // Caso 1: CDN estático de Scryfall (cards.scryfall.io)
  // Reemplaza /normal/, /large/, /small/, /border_crop/, /png/ por /art_crop/
  if (trimmed.includes('cards.scryfall.io/')) {
    return trimmed.replace(/\/(normal|large|small|border_crop|png)\//, '/art_crop/');
  }

  // Caso 2: API de Scryfall por nombre o id (api.scryfall.com/cards/...)
  if (trimmed.includes('api.scryfall.com/cards/')) {
    if (trimmed.includes('version=')) {
      return trimmed.replace(/version=[^&]+/, 'version=art_crop');
    }
    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}version=art_crop`;
  }

  return trimmed;
}
