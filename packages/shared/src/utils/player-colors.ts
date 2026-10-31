/**
 * Paleta de colores accesibles por jugador (H2)
 *
 * Requisitos:
 * 1. Estable y persistente durante toda la partida al unirse.
 * 2. 6 colores distinguibles con contraste WCAG AA (>= 4.5:1) sobre el fondo oscuro verde-azulado (#092328 / #040D0F).
 * 3. Aptos para daltonismo (distintos niveles de luminancia relativa y matices separados).
 * 4. Ninguno confundible con el ámbar del turno activo (#F59E0B / #FBBF24, matiz ~38°).
 */

export interface PlayerColorDef {
  id: string;
  name: string;
  hex: string;
  borderHex: string;
  glowHex: string;
  badgeBg: string;
  symbol: string; // Inicial / forma para daltonismo sin depender únicamente del color
}

export const PLAYER_PALETTE: PlayerColorDef[] = [
  {
    id: 'sky',
    name: 'Azul Cielo',
    hex: '#38BDF8', // Sky 400 (~199°, L=0.44, Contraste ~7.6:1)
    borderHex: '#38BDF8',
    glowHex: 'rgba(56, 189, 248, 0.45)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    symbol: '◆', // Diamante
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda',
    hex: '#4ADE80', // Green 400 (~142°, L=0.55, Contraste ~9.4:1)
    borderHex: '#4ADE80',
    glowHex: 'rgba(74, 222, 128, 0.45)',
    badgeBg: 'rgba(74, 222, 128, 0.15)',
    symbol: '▲', // Triángulo
  },
  {
    id: 'purple',
    name: 'Púrpura Orquídea',
    hex: '#C084FC', // Purple 400 (~270°, L=0.35, Contraste ~6.2:1)
    borderHex: '#C084FC',
    glowHex: 'rgba(192, 132, 252, 0.45)',
    badgeBg: 'rgba(192, 132, 252, 0.15)',
    symbol: '●', // Círculo
  },
  {
    id: 'rose',
    name: 'Rosa Coral',
    hex: '#FB7185', // Rose 400 (~351°, L=0.34, Contraste ~6.1:1)
    borderHex: '#FB7185',
    glowHex: 'rgba(251, 113, 133, 0.45)',
    badgeBg: 'rgba(251, 113, 133, 0.15)',
    symbol: '★', // Estrella
  },
  {
    id: 'ice',
    name: 'Blanco Hielo',
    hex: '#F8FAFC', // Slate 50 (Acromático, L=0.95, Contraste ~15.7:1)
    borderHex: '#F8FAFC',
    glowHex: 'rgba(248, 250, 252, 0.45)',
    badgeBg: 'rgba(248, 250, 252, 0.15)',
    symbol: '■', // Cuadrado
  },
  {
    id: 'lime',
    name: 'Lima Limón',
    hex: '#A3E635', // Lime 400 (~83°, L=0.64, Contraste ~10.8:1)
    borderHex: '#A3E635',
    glowHex: 'rgba(163, 230, 53, 0.45)',
    badgeBg: 'rgba(163, 230, 53, 0.15)',
    symbol: '⬟', // Pentágono
  },
];

/**
 * Retorna el color hexadecimal asignado o inferido de un jugador
 */
export function getPlayerColor(
  player?: { color?: string; seatNumber?: number } | null,
  fallbackIndex = 0,
): string {
  if (player?.color) {
    return player.color;
  }
  const idx = Math.abs(player?.seatNumber ?? fallbackIndex) % PLAYER_PALETTE.length;
  const def = PLAYER_PALETTE[idx] ?? PLAYER_PALETTE[0];
  return def ? def.hex : '#38BDF8';
}

/**
 * Retorna la definición completa del color (nombre, símbolo, clases y hex)
 */
export function getPlayerColorDef(
  player?: { color?: string; seatNumber?: number } | null,
  fallbackIndex = 0,
): PlayerColorDef {
  if (player?.color) {
    const found = PLAYER_PALETTE.find(
      c => c.hex.toLowerCase() === player.color!.toLowerCase() || c.id === player.color,
    );
    if (found) return found;
  }
  const idx = Math.abs(player?.seatNumber ?? fallbackIndex) % PLAYER_PALETTE.length;
  return PLAYER_PALETTE[idx] ?? PLAYER_PALETTE[0]!;
}

/**
 * Calcula la luminancia relativa según especificación WCAG 2.1
 */
export function calculateRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calcula el ratio de contraste entre dos colores hexadecimales según WCAG 2.1
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateRelativeLuminance(hex1);
  const l2 = calculateRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
