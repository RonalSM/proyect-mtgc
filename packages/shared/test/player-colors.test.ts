import { test } from 'node:test';
import assert from 'node:assert';
import {
  PLAYER_PALETTE,
  getPlayerColor,
  getPlayerColorDef,
  calculateRelativeLuminance,
  calculateContrastRatio,
} from '../src/utils/player-colors.js';

test('Punto H2: Paleta de 6 colores distinguibles con contraste WCAG AA sobre fondo oscuro', () => {
  const DARK_TEAL_BACKGROUND = '#092328';
  const ACTIVE_TURN_AMBER = '#F59E0B';

  // 1. Debe haber al menos 6 colores en la paleta
  assert.ok(PLAYER_PALETTE.length >= 6, 'Debe haber al menos 6 colores');

  const usedHexes = new Set<string>();
  const usedSymbols = new Set<string>();

  PLAYER_PALETTE.forEach((color, i) => {
    // 2. Colores y símbolos únicos para daltonismo
    assert.ok(!usedHexes.has(color.hex.toLowerCase()), `Color duplicado: ${color.hex}`);
    assert.ok(!usedSymbols.has(color.symbol), `Símbolo duplicado: ${color.symbol}`);
    usedHexes.add(color.hex.toLowerCase());
    usedSymbols.add(color.symbol);

    // 3. Contraste WCAG AA >= 4.5:1 contra fondo verde-azulado oscuro #092328
    const contrastOnDark = calculateContrastRatio(color.hex, DARK_TEAL_BACKGROUND);
    assert.ok(
      contrastOnDark >= 4.5,
      `Color ${color.name} (${color.hex}) tiene contraste ${contrastOnDark.toFixed(2)}:1, debe ser >= 4.5:1`,
    );

    // 4. Ninguno se confunde con el ámbar del turno activo #F59E0B
    const distFromAmber = Math.abs(calculateRelativeLuminance(color.hex) - calculateRelativeLuminance(ACTIVE_TURN_AMBER));
    assert.notStrictEqual(color.hex.toUpperCase(), ACTIVE_TURN_AMBER.toUpperCase());
    assert.notStrictEqual(color.hex.toUpperCase(), '#FBBF24');
  });

  // 5. getPlayerColor devuelve el color estable del jugador si existe
  const pWithColor = { id: 'p1', name: 'Alice', color: '#38BDF8', seatNumber: 3 };
  assert.strictEqual(getPlayerColor(pWithColor), '#38BDF8');

  // 6. getPlayerColor asigna por seatNumber de forma estable si no viene definido
  const pFallback = { id: 'p2', name: 'Bob', seatNumber: 2 };
  assert.strictEqual(getPlayerColor(pFallback), PLAYER_PALETTE[2].hex);

  // 7. Símbolo accesible disponible para daltonismo
  const def = getPlayerColorDef(pWithColor);
  assert.strictEqual(def.symbol, '◆');
});
