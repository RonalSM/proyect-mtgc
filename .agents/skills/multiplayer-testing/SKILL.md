---
name: multiplayer-testing
description: 'Estrategia de pruebas para la mesa multijugador: unitarias (parser de mazos, validador, d20, barajado), integración, E2E con 4 clientes en Playwright, pruebas de fuga de información oculta, latencia de extremo a extremo y carga. Úsala al escribir o ejecutar pruebas, al validar una fase y antes de marcar como completa cualquier tarea de pruebas o de rendimiento.'
---

# Pruebas de la mesa multijugador

Una prueba que no ejecutas no cuenta como evidencia. Ejecuta, guarda el resultado y cítalo en el informe.

## Pirámide

1. **Unitarias** (cobertura ≥ 80 %): `DeckParser`, `CommanderValidator`, `VisibilityFilter`, `applyAction`, `Shuffler`, `resolveOrder` (d20 y empates).
2. **Integración**: crear mesa → unirse → elegir mazo → listo → iniciar → d20 → mover carta → reconectar. Scryfall se simula.
3. **E2E con Playwright**: 4 clientes reales en la misma partida.
4. **Carga**: muchas mesas simultáneas midiendo latencia de extremo a extremo.

## E2E con 4 clientes

Un contexto de navegador por jugador:

```ts
import { test, expect, chromium } from '@playwright/test';

test('lobby, d20 y arrastrar una carta', async () => {
  const browser = await chromium.launch();
  const pages = await Promise.all(
    [0, 1, 2, 3].map(async () => (await browser.newContext()).newPage()),
  );
  // anfitrión crea la mesa; los demás entran con el código
  // cada uno elige mazo y marca Listo; el anfitrión inicia
  // cada uno lanza el d20; todos ven el mismo orden de turnos
  // el jugador activo arrastra una carta de la mano al campo (mouse.down/move/up)
  // los otros tres ven la carta en la posición esperada
});
```

Repite el arrastre con emulación táctil (`hasTouch: true`) para comprobar el `TouchSensor`.

## Fuga de información oculta

Para cada cliente, captura los mensajes WebSocket recibidos (`page.on("websocket")` → `framereceived`) y comprueba que **ninguno** contiene nombres o `cardId` de cartas de la mano o biblioteca de otro jugador, ni la lista completa del mazo de otro jugador en el lobby.

## Latencia de extremo a extremo

- Mide desde el clic del emisor hasta que el DOM del receptor refleja el cambio (por ejemplo `performance.now()` en ambos contextos de la misma máquina).
- Reporta p50, p95 y p99. El requisito es p95 < 300 ms con 6 jugadores.
- No presentes el tiempo de procesamiento interno del servidor como si fuera la latencia del requisito.

## Pruebas de aleatoriedad y casos forzados

- d20: 10 000 tiradas con prueba chi-cuadrado sobre las 20 caras.
- Empates: inyecta un generador con semilla para forzar empates dobles, triples y con 5 rondas.
- Desconexión durante la iniciativa y durante el lobby.

## Carga

Script con clientes `ws` (o k6) que cree N mesas de 4 jugadores y envíe acciones a ritmo realista. Registra latencia por acción, errores, uso de CPU y memoria. Objetivo inicial: 500 mesas simultáneas.

## Qué guardar como evidencia

Salida de los comandos, ruta de los informes de Playwright y los números de latencia con su método de medición. Alimenta la matriz de la skill `spec-conformance-audit`.
