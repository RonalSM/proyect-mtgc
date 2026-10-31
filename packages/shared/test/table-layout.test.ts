import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getGridColumns, getGridSlotForSeat } from '../src/utils/table-layout.js';

describe('Punto H1 - Disposición circular en sentido horario de la mesa', () => {
  it('Calcula las columnas correctas según totalPlayers', () => {
    assert.strictEqual(getGridColumns(2), 2);
    assert.strictEqual(getGridColumns(3), 2);
    assert.strictEqual(getGridColumns(4), 2);
    assert.strictEqual(getGridColumns(5), 3);
    assert.strictEqual(getGridColumns(6), 3);
  });

  it('2 jugadores: 1 fila con 2 columnas (asiento 0 izq, asiento 1 der)', () => {
    assert.deepStrictEqual(getGridSlotForSeat(0, 2), { row: 0, col: 0 });
    assert.deepStrictEqual(getGridSlotForSeat(1, 2), { row: 0, col: 1 });
  });

  it('4 jugadores: orden horario [(A, B), (C, D)] con A=0, B=1, D=2, C=3', () => {
    // 1.º arriba izquierda
    assert.deepStrictEqual(getGridSlotForSeat(0, 4), { row: 0, col: 0 });
    // 2.º arriba derecha
    assert.deepStrictEqual(getGridSlotForSeat(1, 4), { row: 0, col: 1 });
    // 3.º abajo derecha
    assert.deepStrictEqual(getGridSlotForSeat(2, 4), { row: 1, col: 1 });
    // 4.º abajo izquierda
    assert.deepStrictEqual(getGridSlotForSeat(3, 4), { row: 1, col: 0 });
  });

  it('6 jugadores: orden horario 3 arriba (izq, centro, der) y 3 abajo (der, centro, izq)', () => {
    // Fila superior (izq -> centro -> der)
    assert.deepStrictEqual(getGridSlotForSeat(0, 6), { row: 0, col: 0 });
    assert.deepStrictEqual(getGridSlotForSeat(1, 6), { row: 0, col: 1 });
    assert.deepStrictEqual(getGridSlotForSeat(2, 6), { row: 0, col: 2 });
    // Fila inferior (der -> centro -> izq)
    assert.deepStrictEqual(getGridSlotForSeat(3, 6), { row: 1, col: 2 });
    assert.deepStrictEqual(getGridSlotForSeat(4, 6), { row: 1, col: 1 });
    assert.deepStrictEqual(getGridSlotForSeat(5, 6), { row: 1, col: 0 });
  });

  it('5 jugadores: 3 arriba, 2 abajo a la derecha y celda libre para chat en (1, 0)', () => {
    assert.deepStrictEqual(getGridSlotForSeat(0, 5), { row: 0, col: 0 });
    assert.deepStrictEqual(getGridSlotForSeat(1, 5), { row: 0, col: 1 });
    assert.deepStrictEqual(getGridSlotForSeat(2, 5), { row: 0, col: 2 });
    assert.deepStrictEqual(getGridSlotForSeat(3, 5), { row: 1, col: 2 }); // abajo derecha
    assert.deepStrictEqual(getGridSlotForSeat(4, 5), { row: 1, col: 1 }); // abajo centro
  });

  it('3 jugadores: 2 arriba, 1 abajo a la derecha y celda libre para chat en (1, 0)', () => {
    assert.deepStrictEqual(getGridSlotForSeat(0, 3), { row: 0, col: 0 });
    assert.deepStrictEqual(getGridSlotForSeat(1, 3), { row: 0, col: 1 });
    assert.deepStrictEqual(getGridSlotForSeat(2, 3), { row: 1, col: 1 }); // abajo derecha
  });
});
