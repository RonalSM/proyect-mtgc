---
name: realtime-game-server
description: 'Patrones para el servidor de juego en tiempo real por WebSocket: estado autoritativo, validación de acciones, versionado de eventos, filtrado de información oculta (manos y bibliotecas), reconexión, deshacer y aleatoriedad segura. Úsala al tocar apps/server, los mensajes de packages/shared, las salas, el estado de la mesa, el barajado, la sincronización o la reconexión.'
---

# Servidor de juego en tiempo real

## Principios

1. **El servidor decide.** El cliente envía _intenciones_ (`MOVE_CARD`, `ADJUST_LIFE`); nunca el estado resultante.
2. **Información oculta.** Antes de enviar cualquier evento o instantánea, pásalo por `viewFor(state, seat)`: las cartas de mano y biblioteca de otros jugadores viajan como `{ hidden: true }`, sin nombre ni `cardId`.
3. **Un solo escritor por mesa.** Procesa las acciones de una mesa en una cola secuencial para evitar condiciones de carrera.
4. **Todo es validable.** Cada mensaje entra por un esquema (Zod, unión discriminada por `type`); lo que no valida se rechaza con un código de error.

## Ciclo de una acción

```
mensaje → validar esquema → comprobar permisos (asiento, rol, fase)
→ applyAction(state, action, actor) (función pura) → state', events
→ version++ → guardar instantánea → difundir a cada cliente con viewFor()
→ ack al emisor (o reject con motivo)
```

`applyAction` debe ser **pura y determinista** (recibe el generador aleatorio por inyección) para poder probarla sin red.

## Permisos

- Un jugador solo mueve cartas de su propia celda; acciones que afectan a otros (vida ajena, expulsar) piden permiso o confirmación según el requisito.
- `START_GAME`, `KICK_PLAYER` y `TRANSFER_HOST` solo los puede ejecutar el anfitrión.
- Los espectadores solo reciben eventos filtrados y pueden usar dados y chat.

## Versionado y reconexión

- Cada evento lleva `version` creciente por mesa.
- El cliente guarda `lastVersion`; al reconectar envía `RESUME { tableId, token, lastVersion }`. Si la brecha es pequeña, envía los eventos faltantes; si no, una instantánea completa filtrada.
- Reserva el asiento de un jugador desconectado al menos 10 minutos (REQ-10).
- Guarda instantáneas del estado en Redis para sobrevivir a reinicios; restáuralas al arrancar.
- Cierra mesas inactivas después del tiempo configurado.

## Optimismo en el cliente

Cada acción lleva `clientActionId`. El cliente la aplica de inmediato, y el servidor responde `ack` o `reject`; si hay rechazo, el cliente revierte. Usa `clientActionId` para ignorar duplicados (idempotencia).

## Aleatoriedad

- Barajar, robar al azar y el d20 usan **`crypto.randomInt`** (Fisher-Yates para el barajado). Nunca `Math.random`.
- En pruebas, inyecta un generador con semilla para forzar empates o secuencias.

```ts
function shuffle<T>(arr: T[], rand = (n: number) => crypto.randomInt(n)): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

## Deshacer

`UNDO_LAST` revierte la última acción del jugador solo si nadie más modificó lo afectado después; si afecta a otros, pide confirmación a la mesa. Guarda en el log la acción y su inversa.

## Límites y abuso

- Limita tamaño de mensaje (por ejemplo 4 KB), frecuencia por conexión y número de conexiones por IP y por mesa.
- Verifica `Origin` y el token en el handshake.
- Registra métricas: mesas activas, conexiones, latencia de acción, rechazos.

## Medición de latencia

Para el requisito de 300 ms mide **de extremo a extremo**: instante del clic en el cliente emisor hasta la actualización en el cliente receptor. El tiempo de procesamiento interno del servidor es solo una parte y no demuestra el requisito.
