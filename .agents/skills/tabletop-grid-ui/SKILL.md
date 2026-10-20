---
name: tabletop-grid-ui
description: 'Diseño e implementación de la pantalla de partida estilo playgroup.gg: cuadrícula de 2 filas y hasta 3 columnas a sangre, playmat de fondo por jugador, pastilla de vida en la esquina interior, mano y pilas en el borde inferior, barra flotante y drag & drop con dnd-kit con posiciones normalizadas. Úsala al construir o modificar apps/web, la mesa, las celdas de jugador, las cartas, las zonas o los estilos de la partida.'
---

# Pantalla de partida: cuadrícula a sangre

Replica el **concepto** del diseño de referencia (captura de playgroup.gg que aportó el usuario). No copies código, imágenes, nombre ni marca de ese sitio.

## Estructura

- Contenedor a pantalla completa: `height: 100dvh; width: 100vw; display: grid; gap: 1px; background: #000`.
- `grid-template-rows: 1fr 1fr` y `grid-template-columns: repeat(var(--cols), 1fr)`, con `--cols = ceil(jugadores / 2)` (1 a 3).
- Una `PlayerCell` por jugador. El jugador local ocupa la celda inferior izquierda. Con 3 o 5 jugadores, la celda sobrante muestra registro y chat.
- Contenido siempre en posición vertical (sin rotar).

## Capas de una celda (de atrás hacia delante)

1. `PlaymatBackground`: `art_crop` del comandante y degradado oscuro arriba y abajo.
2. `BattlefieldCanvas`: cartas con `left/top` en porcentaje y `z-index`.
3. `PileSlots` (abajo a la derecha) y `HandFan` (abajo a la izquierda).
4. `NameTag` (arriba al centro, con botón de ampliar) y `LifePill` (esquina interior).
5. Overlays: vista ampliada de carta y celda ampliada.

La `FloatingToolbar` (ronda, temporizador, historial, espectadores, compartir, dados, ayuda, ajustes) va centrada arriba, superpuesta y plegable.

## Esquina de la pastilla de vida

```ts
function lifeCorner(row: 0 | 1, col: number): { v: 'top' | 'bottom'; h: 'left' | 'right' } {
  return { v: row === 0 ? 'bottom' : 'top', h: col === 0 ? 'right' : 'left' };
}
```

La pastilla queda en la esquina más cercana al centro de la pantalla, así los totales de vida quedan agrupados.

## Posiciones normalizadas

Guarda `x` e `y` de cada carta entre 0 y 1 respecto a la celda, más `z` para el apilado. Convierte a píxeles solo al renderizar. Así las cartas quedan en el mismo sitio en pantallas distintas. El tamaño de carta (`--card-w`) es proporcional al alto de la celda.

## Drag & drop (dnd-kit)

- Sensores: `PointerSensor` con `activationConstraint: { distance: 4 }`, `TouchSensor` con `{ delay: 150, tolerance: 5 }` y `KeyboardSensor`.
- Mientras se arrastra usa `transform` (no `left/top`) para mantener 60 fps; al soltar envía `MOVE_CARD { from, to, x, y }` y deja que el servidor confirme.
- Zonas de destino: campo de batalla, cementerio, exilio, zona de comando y mano.
- Mantén los botones contextuales como alternativa de accesibilidad, **no como reemplazo** del arrastre.
- Al arrastrar, trae la carta al frente.

## Información oculta en pantalla

La mano de los oponentes se dibuja como reversos de carta con «N cartas en mano». Nunca renderices ni recibas el contenido de sus manos.

## Rendimiento

Memoriza cartas con `React.memo`, usa `contain: layout paint` en las celdas, decodifica imágenes de forma asíncrona (`decoding="async"`) y precarga solo el playmat propio. Objetivo: 60 fps con 6 jugadores y 60 cartas.

## Accesibilidad

Contraste del texto sobre el playmat de al menos 4.5:1 (el degradado oscuro lo garantiza), ajuste «reducir fondos» que cambia el arte por un color liso, respeto de `prefers-reduced-motion`, controles de vida operables por teclado. Por debajo de 1024 px de ancho ofrece el modo simplificado.

## Estilo

Tema oscuro, texto claro con sombra suave, cartas con borde fino y sombra, pastilla de vida con número grande (≥ 32 px), turno activo con borde de color y brillo suave. Para la dirección visual general apóyate en la skill `frontend-design`.
