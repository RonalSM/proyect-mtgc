/**
 * Utilidades para la disposición de la mesa en cuadrícula de 2 filas y hasta 3 columnas,
 * siguiendo el orden circular horario a partir de la iniciativa (H1).
 */

export interface GridSlotCoordinate {
  row: 0 | 1;
  col: number;
}

/**
 * Retorna el número de columnas de la cuadrícula de la mesa (2 o 3) según la cantidad de jugadores.
 * - 2 jugadores (1v1): 2 columnas
 * - 3 o 4 jugadores: 2 columnas
 * - 5 o 6 jugadores: 3 columnas
 */
export function getGridColumns(totalPlayers: number): number {
  const count = Math.max(2, totalPlayers);
  if (count === 2) return 2;
  return Math.min(3, Math.max(2, Math.ceil(count / 2)));
}

/**
 * Retorna las coordenadas de celda (row, col) para un número de asiento (0..5)
 * siguiendo un recorrido circular en sentido horario empezando arriba a la izquierda (H1).
 *
 * Correspondencia exacta documentada:
 * - 2 jugadores (1v1, cols=2):
 *     Fila 0: [Asiento 0 (izq), Asiento 1 (der)]
 *     Orden horario: 0 -> 1 -> 0
 *
 * - 3 jugadores (cols=2):
 *     Fila 0: [Asiento 0 (izq), Asiento 1 (der)]
 *     Fila 1: [Chat (izq),      Asiento 2 (der)]
 *     Orden horario: 0 (arr-izq) -> 1 (arr-der) -> 2 (abj-der) -> 0
 *
 * - 4 jugadores (cols=2):
 *     Fila 0: [Asiento 0 (izq), Asiento 1 (der)]
 *     Fila 1: [Asiento 3 (izq), Asiento 2 (der)]
 *     Ejemplo cliente: A(20), B(17), D(10), C(5) => turnOrder [A,B,D,C] => cuadrícula [(A,B),(C,D)]
 *     Orden horario: A (arr-izq) -> B (arr-der) -> D (abj-der) -> C (abj-izq) -> A
 *
 * - 5 jugadores (cols=3):
 *     Fila 0: [Asiento 0 (izq), Asiento 1 (centro), Asiento 2 (der)]
 *     Fila 1: [Chat (izq),      Asiento 4 (centro), Asiento 3 (der)]
 *     Orden horario: 0 -> 1 -> 2 -> 3 -> 4 -> 0
 *
 * - 6 jugadores (cols=3):
 *     Fila 0: [Asiento 0 (izq), Asiento 1 (centro), Asiento 2 (der)]
 *     Fila 1: [Asiento 5 (izq), Asiento 4 (centro), Asiento 3 (der)]
 *     Orden horario: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0
 */
export function getGridSlotForSeat(
  seatNumber: number,
  totalPlayers: number,
): GridSlotCoordinate {
  const count = Math.max(2, totalPlayers);
  if (count === 2) {
    return { row: 0, col: seatNumber === 0 ? 0 : 1 };
  }

  const cols = getGridColumns(count);
  if (seatNumber < cols) {
    // Fila superior (row 0), de izquierda a derecha (col 0 .. cols - 1)
    return { row: 0, col: Math.max(0, Math.min(cols - 1, seatNumber)) };
  } else {
    // Fila inferior (row 1), en sentido horario (de derecha a izquierda: cols - 1 .. 0)
    const bottomIndex = seatNumber - cols;
    const col = cols - 1 - bottomIndex;
    return { row: 1, col: Math.max(0, Math.min(cols - 1, col)) };
  }
}
