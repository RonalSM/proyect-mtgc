---
name: mtg-commander-domain
description: 'Reglas y vocabulario del formato Commander (EDH) de Magic: The Gathering para modelar mazos, zonas, vida, daño de comandante, impuesto, identidad de color y validación de mazos. Úsala cuando trabajes con mazos, validación, zonas de juego, contadores, comandante, mulligan, orden de turnos o cualquier lógica del juego, aunque el usuario no mencione las reglas explícitamente.'
---

# Dominio: Magic: The Gathering, formato Commander

La mesa es un **sandbox**: el sistema registra y muestra el estado, pero no aplica las reglas del juego (no hay pila, prioridad ni validación de maná). Las reglas de abajo sirven para modelar datos, mostrar advertencias y calcular marcadores, no para impedir jugadas.

## Reglas del formato

- Mazo de **100 cartas** incluyendo el comandante; **singleton** (una copia por nombre) salvo tierras básicas y cartas cuyo texto diga que puede haber cualquier cantidad con ese nombre.
- **Vida inicial: 40.**
- **Daño de comandante:** 21 o más de daño de combate recibido de **un mismo comandante** elimina al jugador. Se lleva un contador por pareja (jugador dañado, comandante origen), no un total.
- **Impuesto de comandante:** cada vez que se lanza desde la zona de comando cuesta 2 genéricos más por cada lanzamiento previo. Es un contador por comandante.
- **Identidad de color:** colores de los símbolos de maná del coste y del texto de reglas, más los indicadores de color. Cada carta del mazo debe tener identidad contenida en la del comandante. Scryfall la entrega en `color_identity`.
- **Comandante elegible:** criatura legendaria, o carta que diga que puede ser tu comandante. Hay variantes con dos comandantes (Partner, Background, Doctor's companion): se modelan con una lista `commanderCardIds` y contadores de daño separados.
- **Zonas:** biblioteca, mano, campo de batalla, cementerio, exilio, zona de comando (más la pila, que el sandbox no modela).
- **Contadores de jugador:** veneno (10 elimina), energía, experiencia; contadores personalizados con nombre.
- **Primer turno:** en partidas de dos jugadores quien empieza se salta el primer robo; en multijugador todos roban. Hazlo configurable.
- **Mulligan:** usa un mulligan configurable (el primero gratuito es una opción habitual). No lo codifiques como regla rígida.
- **Comandante a la zona de comando:** cuando el comandante va al cementerio o al exilio, su dueño puede moverlo a la zona de comando. En el sandbox basta un botón visible.

## Validación de mazo (informativa, nunca bloquea)

Usa `legalities.commander` de Scryfall (`legal`, `not_legal`, `banned`, `restricted`). Devuelve una lista de advertencias, cada una con un tipo estable:

`WRONG_SIZE`, `DUPLICATE_CARD`, `COLOR_IDENTITY`, `BANNED_CARD`, `NOT_LEGAL`, `INVALID_COMMANDER`, `UNKNOWN_CARD`.

Casos que suelen romperse: cartas de doble cara (`card_faces`), cartas partidas, tierras básicas «Snow-Covered», cartas con «cualquier cantidad de copias», nombres con acentos o con `//`.

## Modelo de datos sugerido

- `commanderDamage` con clave `"${sourceSeat}:${commanderCardId}"` y valor numérico.
- `commanderTax` con clave `commanderCardId`.
- Cada carta en juego es un `CardInstance` con `instanceId` propio, distinto del `cardId` de Scryfall (puede haber varias copias de una misma carta o tokens).

## Qué NO hacer

No impidas movimientos «ilegales», no calcules maná, no resuelvas habilidades, no elimines automáticamente a un jugador: resalta la condición (vida ≤ 0, 21 de comandante, 10 de veneno) y deja que la mesa decida.
