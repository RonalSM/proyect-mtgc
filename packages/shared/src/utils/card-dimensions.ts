export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface CardDimensions {
  width: number;
  height: number;
}

/**
 * Computes exact integer even pixel dimensions for cards based on pod size and viewport resolution.
 */
export function getCardDimensions(
  podSize: number,
  viewport: ViewportDimensions = { width: 1920, height: 1080 }
): CardDimensions {
  const isTwoPlayer = podSize <= 2;
  const cellWidth = isTwoPlayer
    ? viewport.width / 2
    : podSize <= 4
    ? viewport.width / 2
    : viewport.width / 3;

  const cellHeight = isTwoPlayer
    ? viewport.height
    : viewport.height / 2;

  // Límite por alto: cerca del 20% del alto de la celda (REQ-22.6.3 / Punto 9)
  const maxHByCellHeight = cellHeight * 0.20;

  // Límite por ancho: vida (~80px) + gaps/padding (~50px) + comandante (W) + mano (~2.5*W) + biblioteca (W) + pilas (W)
  const maxWByCellWidth = Math.max(45, (cellWidth - 130) / 5.5);
  const maxHByCellWidth = maxWByCellWidth / 0.714;

  let rawH = Math.round(Math.max(65, Math.min(135, Math.min(maxHByCellHeight, maxHByCellWidth))));
  // Dimensiones enteras y pares (Punto 1)
  if (rawH % 2 !== 0) {
    rawH = rawH < 135 ? rawH + 1 : rawH - 1;
  }
  let rawW = Math.round(rawH * 0.714);
  if (rawW % 2 !== 0) {
    rawW = rawW + 1;
  }
  return { width: rawW, height: rawH };
}
