---
name: spec-conformance-audit
description: 'Audita el código contra requirements.md, design.md y tasks.md y produce una matriz de conformidad honesta. Úsala SIEMPRE que el usuario pida revisar el avance, comparar código con el plan, actualizar tasks.md, marcar tareas como hechas o cerrar una fase, y antes de escribir [x] en cualquier tarea. Úsala también cuando una implementación difiera del diseño original.'
---

# Auditoría de conformidad con la especificación

Los documentos del proyecto (`requirements.md`, `design.md`, `tasks.md`) son el contrato. El código se acerca a ellos, no al revés. Esta skill existe porque marcar tareas como completas sin cumplir sus requisitos hace que el plan deje de servir.

## Reglas de oro

1. **No edites `requirements.md` ni `design.md` para justificar el código.** Si el código difiere, corrige el código. Si crees que la desviación es mejor, propónla al usuario como «desviación propuesta» y espera su aprobación.
2. **No sustituyas un mecanismo por otro sin aprobación** (por ejemplo, drag & drop por botones, Redis por memoria, Argon2id por otro algoritmo). Un cambio de mecanismo es una desviación, aunque funcione.
3. **Mide lo que el requisito dice, no un sustituto.** Si el requisito habla de latencia de extremo a extremo, mide cliente emisor → servidor → cliente receptor; el tiempo interno del servidor no cuenta.
4. **`[x]` solo si todos los requisitos que cita la tarea cumplen y existe evidencia** (archivo y prueba). Si cumple a medias, deja `[ ]` y anota `Falta: ...`.

## Procedimiento

1. Lee los tres documentos completos (y cualquier adenda, por ejemplo `cambios-v2.md`).
2. Lista cada requisito con sus criterios de aceptación numerados.
3. Para cada criterio busca evidencia en el código y en las pruebas. Cita ruta de archivo y nombre de la prueba.
4. Asigna un estado: **Cumple**, **Parcial**, **No cumple** o **Diferido con aprobación** (solo si el usuario lo aprobó por escrito en esta conversación).
5. Genera la matriz (plantilla abajo).
6. Actualiza `tasks.md` aplicando la regla de `[x]`.
7. Resume las desviaciones y pregunta al usuario cuáles aprueba; no decidas por él.

## Plantilla de matriz

| Requisito | Criterio                           | Estado  | Evidencia (archivo / prueba)    | Qué falta                      |
| --------- | ---------------------------------- | ------- | ------------------------------- | ------------------------------ |
| REQ-9     | 9.2 Arrastrar y soltar entre zonas | Parcial | `apps/web/...` / sin prueba E2E | Falta drag & drop; hay botones |

## Anti-patrones que debes evitar

- Marcar una fase como completa mientras hay requisitos «diferidos» que nadie aprobó.
- Justificar una desviación con «es más estable» o «para móviles» sin que el usuario lo haya pedido.
- Reportar un benchmark que mide otra cosa (por ejemplo, 0,29 ms de procesamiento como si fuera la latencia del requisito).
- Reescribir los documentos al final para que «coincidan» con lo construido.
- Decir que algo está probado sin haber ejecutado la prueba.

## Informe final

Entrega: la matriz, la lista de desviaciones con una recomendación por cada una (restaurar o aprobar) y el `tasks.md` actualizado.
