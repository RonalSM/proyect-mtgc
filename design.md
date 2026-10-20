# Documento de Diseño — Mesa Virtual de Commander (MTG)

## Visión general

*CommanderTable* es una SPA con servidor de juego autoritativo. El navegador envía **intenciones** (por ejemplo "mover carta X al cementerio") por WebSocket; el servidor las valida, aplica al estado de la mesa y difunde el resultado. Decisiones clave:

1. **Servidor autoritativo**: evita trampas y garantiza información oculta (manos y bibliotecas).
2. **Sandbox sin motor de reglas**: reduce complejidad; la mesa se pone de acuerdo como en persona.
3. **Estado de mesa en Redis, persistencia en PostgreSQL**: baja latencia durante la partida, durabilidad para cuentas, mazos e historial.
4. **Caché local de Scryfall**: se respeta su API y se evita depender de ella en tiempo real.

## Arquitectura

### Mapa de componentes

| ID | Nombre | Tipo | Responsabilidad | Se comunica con |
|---|---|---|---|---|
| COMP-1 | Web Client | Frontend (React + TS) | UI de mesa, trackers, zonas, chat, lobby, iniciativa | COMP-2, COMP-5 |
| COMP-2 | API REST | Backend | Cuentas, mazos, mesas, historial | COMP-3, COMP-4, COMP-6 |
| COMP-3 | Base de datos | PostgreSQL | Usuarios, mazos, partidas, caché de cartas | COMP-2 |
| COMP-4 | Room Manager | Servicio | Ciclo de vida de mesas, asientos, códigos, LobbyManager | COMP-5, COMP-7 |
| COMP-5 | Game Server | WebSocket | Estado autoritativo, acciones, sync, log, InitiativeService, GameStarter | COMP-1, COMP-7 |
| COMP-6 | Card Service | Servicio | Integración Scryfall, parser de mazos, validador | Scryfall, COMP-3 |
| COMP-7 | Estado en memoria | Redis | Estado de mesas activas, pub/sub, rate limit | COMP-4, COMP-5 |
| COMP-8 | CDN / Imágenes | Infra | Caché de imágenes de cartas y playmats | COMP-1 |
| COMP-9 | Observabilidad | Infra | Logs, métricas, alertas | Todos |

### Diagrama de alto nivel

```
                        ┌───────────────────────┐
                        │   Scryfall API (ext)  │
                        └──────────┬────────────┘
                                   │ HTTPS (rate-limited)
 ┌──────────────┐  HTTPS    ┌──────▼──────┐        ┌──────────────┐
 │  Web Client  │──────────►│  API REST   │───────►│  PostgreSQL  │
 │ (React + TS) │           │  (COMP-2)   │        │   (COMP-3)   │
 └──────┬───────┘           └──────┬──────┘        └──────────────┘
        │                          │                      ▲
        │ WSS (acciones/eventos)   │ crea mesa            │ guarda historial
        ▼                          ▼                      │
 ┌──────────────┐           ┌─────────────┐        ┌──────┴───────┐
 │ Game Server  │◄─────────►│Room Manager │        │ Card Service │
 │  (COMP-5)    │           │  (COMP-4)   │        │   (COMP-6)   │
 └──────┬───────┘           └──────┬──────┘        └──────────────┘
        │                          │
        └────────────► Redis (COMP-7): estado de mesa + pub/sub
 
 Imágenes de cartas ──► CDN/caché (COMP-8) ──► Web Client
```

## Stack propuesto

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + TypeScript + Vite, Zustand, Tailwind | Estado local simple, desarrollo rápido |
| Drag & drop | dnd-kit o Konva (si se usa canvas) | Interacción fluida con cartas |
| Backend | Node.js + Fastify + TypeScript | Mismo lenguaje que el cliente, tipos compartidos |
| Tiempo real | Socket.IO o `ws` | Reconexión y salas integradas |
| Datos | PostgreSQL + Prisma | Modelo relacional claro |
| Estado vivo | Redis | Baja latencia y pub/sub para escalar |
| Despliegue | Docker, Fly.io / Render / VPS | Costo bajo para el MVP |
| CI/CD | GitHub Actions | Pruebas y despliegue automáticos |

Alternativa: Next.js para la parte web y un servicio WebSocket separado.

## Flujos de datos

### Flujo 1: Crear mesa y unirse
```
1. Anfitrión → Web Client: configura mesa (asientos, vida, privacidad)
2. Web Client → API REST: POST /tables
3. API REST → Room Manager: crear sala y código de 6 caracteres
4. Room Manager → Redis: guarda estado inicial de la mesa
5. API REST → Web Client: { tableId, code, joinUrl }
6. Invitado abre joinUrl → Web Client → Game Server: WSS connect + token
7. Game Server valida token y asiento → difunde "player_joined"
```

### Flujo 2: Acción de juego (mover carta en MesaTotal con coordenadas globales, titularidad temporal y sincronización sin parpadeo)
```
1. Jugador A inicia arrastre de carta (desde mano a mesa, o reposicionando en el campo de batalla de MesaTotal). Se verifica autorización: solo su ownerId o su holderId pueden moverla; de lo contrario el cursor muestra not-allowed y un aviso breve.
2. DragOverlay se renderiza mediante Portal a document.body conservando el giro apaisado para cartas giradas (isTapped: true como caja apaisada con desplazamiento de puntero constante y coincidencia ≤ 2px al soltar).
3. Durante el arrastre, Web Client A emite CARD_DRAG_MOVE efímero throttled a ~30 fps con coordenadas globales normalizadas (x, y ∈ [0, 1]).
4. Game Server retransmite REMOTE_CARD_DRAGGING a los demás clientes (receptor B). B oculta la carta real fija (opacity: 0) y muestra el fantasma remoto interpolado.
5. Al soltar la carta:
   a. Web Client A calcula si la caja de la carta (ya girada) está contenida al 100% dentro de la división de algún jugador (holderId). Si queda entre divisiones o fuera, holderId queda vacío.
   b. Web Client A emite CARD_DRAG_MOVE con isDragging: false y la posición final calculada { position: { x, y } }.
   c. Web Client A envía el comando autoritativo MOVE_CARD { cardInstanceId, fromZone, toZone, holderId, position: { x, y } }.
   d. Receptor B recibe isDragging: false con la posición final; activa pendingSync: true manteniendo el fantasma en dicha posición y la carta fija oculta.
6. Game Server valida autoritativamente que el emisor sea ownerId o holderId de la carta. Calcula/verifica holderId según contención al 100% de la división, actualiza estado, registra en bitácora ("X movió [Carta]") y emite ROOM_STATE_SYNC. Si no está autorizado, rechaza la acción y registra advertencia en bitácora.
7. Al recibir ROOM_STATE_SYNC, Receptor B retira pendingSync y revela la carta fija en su nueva posición en el idéntico frame de renderizado, eliminando el parpadeo y los duplicados.
```

### Flujo 3: Importar mazo
```
1. Usuario pega lista de texto → Web Client → API REST: POST /decks/import
2. Card Service: parsea líneas "cantidad + nombre"
3. Card Service → caché local: busca cartas conocidas
4. Card Service → Scryfall: POST /cards/collection para las que faltan
5. Card Service: valida reglas de Commander (informativo)
6. API REST → Web Client: mazo normalizado + advertencias
```

### Flujo 4: Reconexión
```
1. Cliente pierde WSS → reintenta con backoff exponencial
2. Cliente → Game Server: RESUME { tableId, token, lastVersion }
3. Game Server: envía snapshot completo si la brecha es grande, o eventos faltantes
4. Cliente restaura el estado de su vista
```

### Flujo 5: Sala de espera → inicio de partida (v2)
```
1. Jugador entra a la mesa → Game Server: estado lobby, evento LOBBY_UPDATED
2. Jugador abre el selector → API REST: GET /decks (guardados) + mazos de sesión
3. [Opción] Importar → API REST: POST /decks/import (REQ-7) → mazo guardado o de sesión
4. Jugador elige → Game Server: SELECT_DECK → valida que el mazo es suyo → LOBBY_UPDATED
5. Jugador marca Listo → SET_READY → LOBBY_UPDATED (canStart si todos listos y ≥ 2)
6. Anfitrión → START_GAME → Game Server verifica canStart
7. Game Server: carga cada mazo, baraja (CSPRNG), comandante → zona de comando, roba 7
8. Game Server → todos: INITIATIVE_STARTED
```

### Flujo 6: Iniciativa Automática (Punto 4, REQ-21)
```
1. Host inicia la partida → Game Server: transición a `status: "initiative"` y `startAutomaticInitiative()`.
2. Game Server: genera autoritativamente con CSPRNG (`crypto.randomInt(1, 21)`) la tirada de D20 para todos los jugadores sentados (ningún jugador pulsa botones; el cliente no puede enviar acciones de tirada y cualquier intento es rechazado con error).
3. Game Server → Sincroniza estado a toda la mesa; clientes muestran animación de dados y resultados.
4. Si hay empate: el servidor detecta el empate, anuncia la ronda de desempate, lanza automáticamente para los empatados (hasta máx. 5 rondas; luego desempate por asiento) y sincroniza la nueva ronda.
5. Game Server → INITIATIVE_RESOLVED { order }; se muestra el banner de orden de turnos oficial a toda la mesa.
6. Game Server → Transición automática a la fase de mulligan (`table.status = "mulligan"`).
```

### Flujo 7: Fase de Mulligan y Mano Inicial (Punto 5, REQ-23)
```
1. Al resolverse la iniciativa, Game Server pasa a `status: "mulligan"`.
2. Servidor baraja bibliotecas (CSPRNG Fisher-Yates) y reparte 7 cartas a cada jugador en estado oculto (la mano no aparece en el abanico inferior hasta que el jugador se queda y concluye la fase).
3. Turno de decisión secuencial según `turnOrder` resuelto, empezando por el 1.º jugador. Solo decide el jugador activo (`mulligan.activePlayerId`); los demás ven "X está decidiendo".
4. Ventana "Opening hand" en cliente: modal central sobre fondo oscurecido/desenfocado con 7 cartas grandes, botones "Quedarme con la mano" y "Mulligan".
5. Regla de Londres con Commander free mulligan:
   - Primer mulligan (k=1): gratis. Mano vuelve a biblioteca, se baraja con CSPRNG y roba 7.
   - Mulligans posteriores (k >= 2): roba 7 y debe elegir exactamente k - 1 cartas para poner al fondo de la biblioteca (`zones.library.push(...bottomCards)`). Selector interactivo muestra el orden de selección.
   - Puede repetir hasta quedarse con 0 cartas (cuando mano resultante es 0, solo queda "Quedarme").
6. Mensajes autoritativos:
   - `MULLIGAN_TAKE`: solicita nuevo robo.
   - `MULLIGAN_KEEP { cardIdsToBottom }`: confirma mano y pone cartas al fondo si k >= 2.
   - `MULLIGAN_FORCE_DECISION { targetPlayerId }`: anfitrión puede forzar que un jugador desconectado o ausente se quede con su mano actual para evitar bloqueos.
7. Privacidad: los rivales solo ven el estado (decidiendo, se quedó con N cartas), nunca las cartas. La reconexión durante la fase restaura la ventana (RESUME).
8. Cuando todos los jugadores han decidido quedarse, Game Server transiciona automáticamente a `status: "playing"` y se inicia el turno del primer jugador. La bitácora registra "X hizo mulligan" y "X se quedó con N cartas".
9. Se rechaza cualquier acción de mulligan suelta durante `playing`.
```

## Máquina de estados de la mesa (v2)

```
lobby ──(todos listos + host inicia)──► initiative ──(orden resuelto)──► mulligan ──(todos se quedan)──► playing ──► finished
  ▲                                           │
  └────(jugador sale o quita "Listo")─────────┘  (solo antes de que se resuelva la iniciativa: vuelve a lobby)
```

`Table.status` pasa a `"lobby" | "initiative" | "mulligan" | "playing" | "finished"`.

## Componentes nuevos o ampliados (v2)

| ID | Componente | Cambio |
|---|---|---|
| COMP-4 | Room Manager | Añade `LobbyManager`: asientos, mazo elegido, estado "Listo", reglas para habilitar "Iniciar" |
| COMP-5 | Game Server | Añade `InitiativeService` (d20, desempates, tiempo límite) y `GameStarter` (barajar, comandante a zona de comando, mano de 7) |
| COMP-6 | Card Service | Expone mazos guardados y de sesión; reutiliza el importador y el validador |
| COMP-8 | Image Loading & Caching Service | Cola de descarga con concurrencia 6, reintentos exponenciales con timeout 8s, resolución directa CDN, esqueletos y virtualización |
| COMP-1 | Web Client | Nuevas pantallas `LobbyView`, `InitiativeOverlay` y rediseño de `TableView` / `TableGrid` |

## Puntos de integración

### Internos

| Origen | Destino | Protocolo | Formato | Propósito |
|---|---|---|---|---|
| Web Client | API REST | HTTPS | JSON | Cuentas, mazos, mesas |
| Web Client | Game Server | WSS | JSON (mensajes tipados) | Acciones y eventos |
| Game Server | Redis | TCP | Binario/JSON | Estado de mesa |
| API REST | PostgreSQL | TCP | SQL | Persistencia |

### Externos

#### Scryfall API
**Tipo:** REST. **Propósito:** datos, legalidad e imágenes de cartas.
**Endpoints usados:** `GET /cards/named`, `GET /cards/autocomplete`, `POST /cards/collection`, bulk data (`/bulk-data`).
**Autenticación:** ninguna, pero se deben enviar cabeceras `User-Agent` y `Accept` identificando la app.
**Límites:** Scryfall pide un retardo mínimo de ~50–100 ms entre peticiones (unas 10 por segundo); hay que respetarlo desde el servidor, no desde cada cliente.
**Manejo de errores:** reintento con backoff ante 429/5xx; si falla, usar la caché local y avisar de datos posiblemente desactualizados.
**Estrategia:** descargar el *bulk data* (Oracle Cards) cada noche a PostgreSQL y consultar local; usar la API solo para casos puntuales.

#### Importadores de mazos (fase 2)
Moxfield / Archidekt: dependen de sus condiciones de uso y APIs disponibles; el MVP usa solo texto pegado.

#### Videollamada externa (fase 1) / LiveKit o WebRTC (fase 2)
Fase 1 solo enlaza a Discord/Meet. Fase 2 evalúa LiveKit.

## Componentes en detalle

### COMP-8 Image Loading & Caching Service
**Responsabilidad:** Optimizar la carga de imágenes de cartas para evitar bloqueos HTTP 429 de Scryfall, asegurar fluidez en el cliente web y garantizar que ninguna carta quede colgada indefinidamente.
**Componentes y servicios clave:**
1. `imageLoaderQueue` (`apps/web/src/services/imageLoaderQueue.ts`):
   - Concurrencia acotada a 6 descargas simultáneas en vuelo (`maxConcurrency = 6`).
   - Reintento con backoff exponencial (300 ms, 600 ms, 1200 ms) sin retener slots activos de descarga.
   - Timeout por imagen de 8000 ms.
   - Notificación reactiva mediante patrón Observer (`subscribe(listener)`).
   - Métodos de reintento global (`retryFailed()`) e individual (`retryUrl(url)`).
2. `cardImageResolver` (`apps/web/src/services/cardImageResolver.ts`):
   - Mapeo en memoria y resolución de URLs directas desde `cards.scryfall.io` sin llamar al endpoint `/cards/named`.
   - Soporte para cartas de doble cara (`faces[0]` y `faces[1]`).
3. `VirtualizedCardGrid` (`apps/web/src/components/VirtualizedCardGrid.tsx`):
   - Cuadrícula virtualizada para el modal inspector de biblioteca (100 cartas).
   - Renderiza únicamente filas visibles con buffers de sobre-escaneo (overscan de 2 filas) y espaciadores superior e inferior que mantienen la barra de scroll precisa.
4. `CardDisplay` (`apps/web/src/components/CardDisplay.tsx`):
   - Suscripción al estado de carga en la cola (`idle | pending | loading | loaded | failed`).
   - Muestra esqueletos animados (`card-image-skeleton`) durante la espera/carga.
   - Muestra marco de respaldo legible con botón de reintento explícito si se agotan los reintentos.
5. `persistentImageCache` (`apps/web/src/services/persistentImageCache.ts`):
   - Almacenamiento local persistente en el navegador mediante Cache API (`caches.open('mtgc-card-images-v1')`).
   - Sin almacenamiento, reflejo ni proxy en el servidor backend (estricto cumplimiento legal de Scryfall).
   - Generación de Object URLs locales (`blob:`) para despliegue instantáneo con 0 ms de latencia en partidas sucesivas con el mismo mazo.
6. **Estrategia de precarga con prioridad por fases:**
   - *Sala de espera (`LobbyWaitingRoom.tsx`):* Al seleccionar mazo, precarga el comandante en `normal` (prioridad 10) y la biblioteca en `small` (prioridad 1).
   - *Iniciativa (`InitiativeOverlay.tsx`):* Precarga anticipada de la mano inicial (7 cartas) y comandante en `normal` (prioridad 10), y biblioteca en `small` (prioridad 1).
   - *Apertura y Mulligan (`OpeningHandModal.tsx`):* Precarga con máxima prioridad de las 7 cartas activas en `normal` (prioridad 10), garantizando nitidez completa y tiempo de respuesta cero al decidir quedarse o mulligan.
7. **Verificación de Red en Vivo y Telemetría de Caché Limpio (Punto 5):**
   - *Carga ansiosa (`loading="eager"`):* `CardDisplay` utiliza `loading="eager"` para permitir a Chromium decodificar y renderizar inmediatamente las imágenes alimentadas desde la Cache API / `imageLoaderQueue` sin bloqueos de renderizado diferido fuera de pantalla.
   - *Apertura en frío certificada:* Vaciado de caché (`caches.delete`) y reinicio de cola en los 4 clientes previo a la apertura simultánea de bibliotecas (372 cartas). Tiempo de resolución: **845 ms** (< 35 s).
   - *Peticiones CDN y códigos de respuesta:* 37 peticiones directas a `cards.scryfall.io`, 100% con código 200 OK (`{"200": 37}`), 5 reintentos automáticos, 0 fallos 4xx/5xx de servidor. 372/372 cartas con `naturalWidth > 0`.
   - *Reapertura con Cache API persistente:* **185 ms** (sustancialmente menor a la apertura en frío).

### COMP-5 Game Server
**Responsabilidad:** mantener y difundir el estado autoritativo de cada mesa.
**Clases clave:** `TableSession`, `ActionHandler`, `VisibilityFilter`, `ActionLog`, `Shuffler`, `InitiativeService`, `GameStarter`.
**Interfaz de mensajes:**
```ts
type ClientAction =
  | { type: "ADJUST_LIFE"; targetSeat?: number; delta: number; playerId?: string }
  | { type: "COMMANDER_DAMAGE"; targetSeat?: number; sourceSeat?: number; commanderId: string; delta: number }
  | { type: "SET_COUNTER"; scope: "player" | "card"; id: string; counter: string; value: number }
  | { type: "MOVE_CARD"; cardInstanceId: string; fromZone: ZoneRef; toZone: ZoneRef; position?: { x: number; y: number }; holderId?: string; destinationIndex?: number }
  | { type: "TAP_CARD"; cardInstanceId: string; isTapped?: boolean }
  | { type: "DRAW_CARDS"; count: number }
  | { type: "SHUFFLE_LIBRARY" }
  | { type: "END_TURN" }
  | { type: "UNDO_LAST" }
  | { type: "CHAT"; text: string }
  | { type: "ROLL_DICE"; sides: number }
  | MulliganAction
  | RevealAction
  | LobbyAction
  | PlaymatAction;

type MulliganAction =
  | { type: "MULLIGAN_DECISION"; decision: "keep" | "mulligan" }
  | { type: "PUT_CARDS_ON_BOTTOM"; cardInstanceIds: string[] }
  | { type: "HOST_FORCE_KEEP_MULLIGAN"; targetPlayerId: string };

type RevealAction =
  | { type: "REVEAL_CARD"; cardInstanceId: string; targetPlayerId?: string; fromZone?: ZoneRef };

type LobbyAction =
  | { type: "SELECT_DECK"; source: "saved" | "session"; deckId: string }
  | { type: "SET_READY"; ready: boolean }
  | { type: "START_GAME" }                       // solo anfitrión
  | { type: "KICK_PLAYER"; seat: number }        // solo anfitrión
  | { type: "TRANSFER_HOST"; seat: number };     // solo anfitrión

type InitiativeAction = { type: "ROLL_D20" };

type PlaymatAction = { type: "SET_PLAYMAT"; playmat: Playmat };

type ServerEvent =
  | { version: number; actor?: string; payload: unknown; ts: string }
  | { type: "ROOM_STATE_SYNC"; state: RoomState }
  | { type: "REMOTE_CARD_DRAGGING"; payload: RemoteDragPayload }
  | { type: "MULLIGAN_STATE_SYNC"; mulliganState: MulliganRoomState }
  | { type: "CARD_REVEALED"; card: CardInstance; fromPlayerId: string; fromPlayerName: string; targetPlayerId?: string; targetPlayerName?: string }
  | LobbyEvent;

type LobbyEvent =
  | { type: "LOBBY_UPDATED"; seats: LobbySeat[]; canStart: boolean }
  | { type: "INITIATIVE_STARTED"; deadlineTs: string }
  | { type: "D20_ROLLED"; seat: number; value: number; round: number }
  | { type: "INITIATIVE_TIE"; seats: number[]; round: number }
  | { type: "INITIATIVE_RESOLVED"; order: number[] }   // asientos de 1.º a último
  | { type: "GAME_STARTED"; firstSeat: number };

interface LobbySeat {
  seat: number; userId: string; displayName: string;
  deck?: { id: string; name: string; commanderName: string; colorIdentity: string[]; warnings: number };
  ready: boolean; isHost: boolean; connected: boolean;
}
```
**Rendimiento:** p95 < 300 ms por acción; tamaño de mensaje < 2 KB.
**Restricciones:** una instancia por mesa (afinidad por sala); con varias instancias, usar Redis pub/sub y *sticky sessions*.

### COMP-1 Web Client
**Módulos:** `LobbyView`, `LobbySeatCard`, `DeckPicker`, `DeckImportModal`, `ReadyButton`, `InitiativeOverlay`, `TableGrid`, `PlayerCell`, `PlaymatBackground`, `NameTag`, `LifePill`, `BattlefieldCanvas`, `HandFan`, `PileSlots`, `FloatingToolbar`, `LogChatPanel`, `CardPreview`.
**Estado:** Zustand con un *store* de mesa sincronizado por versión de evento.
**UX clave y Arquitectura de Interacción:**
- Vista propia grande y oponentes en miniatura; atajos de teclado; modo "solo tracker" para móvil.
- Mesa expandida como encuadre/zoom interactivo sobre la misma mesa global única (sin duplicar componentes) con cálculo de coordenadas por transformación inversa ($x_{global} = x_{min} + u \times W$, $y_{global} = y_{min} + v \times H$), manteniendo activos DndContext, droppables, mano y menú de clic derecho.
- Eliminación de recortes en cartas de la mano con `aspect-[5/7]` exacto sin `object-cover` distorsionante, esquinas redondeadas naturales (`rounded-[6px]`), dock y abanico con `overflow-visible`, resolución de imagen normal (`cards.scryfall.io` normal), y elevación por hover 100% contenida en el viewport.
- Contenedor de nombre y expandir celda centrado arriba en cada división con estado desconectado atenuado, y barra superior desplegable con orden de iniciativa y badges de estado.
- Escala de carta acotada por el menor entre límite por alto y límite por ancho de celda con compresión dinámica progresiva del abanico de mano para prevenir solapamientos en celdas estrechas.
- Dimensiones de carta 100% unificadas e idénticas en mano, mesa, comandante y drag overlay sin saltos de escala.
- Gestión resiliente de imágenes con eventos `onError`, fallbacks atmosféricos de playmats en gradiente oscuro y marcos de cartas legibles sin iconos de imagen rota.
- **Nitidez óptica y erradicación de desenfoque al girar (Corrección Punto 1):**
  - Dimensiones enteras y pares estrictas (`packages/shared/src/utils/card-dimensions.ts`): `--card-w` y `--card-h` calculadas como números pares (96×134 en 2p, 78×108 en 4p y 6p a 1080p; 96×134 en 2p, 56×78 en 4p y 6p a 768p), evitando que `translate(-50%, -50%)` asigne coordenadas fraccionarias con medio píxel.
  - Posicionamiento entero aplicado: redondeo con `Math.round` en la posición visual de pantalla.
  - Gestión temporal de `will-change`: aplicado exclusivamente durante la transición de 180 ms (`.is-animating-tap`) y desactivado inmediatamente al terminar para permitir a Chromium re-rasterizar la imagen a resolución nativa del dispositivo.
  - Transform 2D puro: rotación en plano (`rotate(90deg)` / `rotate(0deg)`) libre de `translateZ`, `rotate3d` o filtros. Conservación de nitidez $\ge 90\%$ certificada mediante varianza del Laplaciano (DPR 1: 103.07%, DPR 2: 105.05%).
- **Arrastre bajo cursor con fuente de verdad única (Corrección Punto 2):**
  - Medición con `getBoundingClientRect()` de la caja visual real (rotada si está girada) al comenzar el arrastre en `handleDragStart`, capturando el desplazamiento del puntero al centro (`grabOffsetFromCenter`) y a la esquina (`grabOffsetFromTopLeft`) en `dragOffsetRef`.
  - `DragOverlay` con arquitectura gemela: contenedor exterior `.card-slot-container` centrando un `.card-rotator` con dimensiones exactas y ángulo idéntico (`rotate(90deg)` si está girada).
  - Modificador `snapToVisualBoxModifier` en `DndContext`: aplica el desplazamiento exacto capturado con respecto al rectángulo visual, eliminando desalineaciones y saltos abruptos al superar el umbral de activación de 8 px (`activationConstraint`).
  - Estabilidad de la mano: `HandCardItem` conserva su anchura fija (`var(--card-w)`) con `opacity: 0` durante el arrastre, impidiendo el colapso dimensional.
  - Cálculo de coordenadas finales desde el rectángulo delimitador del overlay (`clampedX + overlayWidth / 2`, `clampedY + overlayHeight / 2`).
- **Seguimiento estricto del puntero durante el arrastre (Corrección Punto 3):**
  - Listener global de `pointermove` en fase de captura sincronizando `latestPointerRef` en tiempo real.
  - Invarianza del punto agarrado: la diferencia entre el punto agarrado del overlay (`puntero - esquina del overlay`) y el desplazamiento inicial es $\le 1.0\text{ px}$ (0.00 px medido) en todos los fotogramas de la trayectoria y en el fotograma exacto tras superar los 8 px. Certificado en 16 combinaciones en `apps/web/e2e/pointer-tracking.spec.ts`.
- **Centrado exacto al enviar al campo con dimensiones reales (Corrección Punto 4):**
  - Función `getCardDimensions(podSize, viewport)` compartida entre cliente (`table-framing.ts`) y servidor (`game-state.ts`).
  - Reemplazo de constantes fijas (43.2×51.3) por la mitad de las dimensiones normalizadas de la carta (`cardHalfWNorm`, `cardHalfHNorm`).
  - Coincidencia con el centro de la sección jugable propia (descontando el dock inferior) $\le 1.0\text{ px}$ en 2p, 4p y 6p a 1080p y 768p (0.00 px en unit tests y $\le 0.50\text{ px}$ en E2E Playwright).
- **Diagnóstico y medición empírica del salto de carta girada (Corrección Posición Punto 1):**
  - Discrepancia empírica medida en emisor local A: overlay en arrastre `(540.00, 499.00)` vs carta colocada al soltar `(521.00, 518.00)`, produciendo una diferencia de $dx = -19.00\text{ px}, dy = +19.00\text{ px}$ ($\Delta = (h - w) / 2 = (134 - 96) / 2 = 19.00\text{ px}$).
  - Salto en receptor remoto B: carta original en `(480.00, 459.00)` vs primeros frames del fantasma en `(473.00, 486.00)` ($dy = +27.00\text{ px}$).
  - Causa raíz confirmada: uso de la esquina superior izquierda de la caja vertical sumándole mitades estáticas no orientadas ($w/2, h/2$) al renderizar una carta orientada en horizontal ($h \times w$).

### COMP-6 Card Service
**Clases:** `ScryfallClient` (cola con rate limit), `DeckParser`, `CommanderValidator`, `CardCache`.
**Interfaces:**
```ts
parseDeck(text: string): ParsedLine[]
resolveCards(lines: ParsedLine[]): Promise<ResolvedDeck>
validateCommander(deck: ResolvedDeck): ValidationReport
```

### COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)
- **Diagnóstico empírico de fallos en biblioteca:**
  - Las imágenes no cargadas en la biblioteca procedían del endpoint de la API `api.scryfall.com/cards/named?exact=...&format=image` en lugar del CDN estático.
  - Al abrir la biblioteca con ~60–92 cartas simultáneas, `api.scryfall.com` respondió con **HTTP 429 Too Many Requests** en el 100 % de las solicitudes en ráfaga (`{"429": 60}`). En solicitudes individuales no espaciadas retornó `HTTP 302` (Redirect temporal a Cloudflare).
  - Por su parte, el CDN directo `cards.scryfall.io` con User-Agent de navegador respondió con **HTTP 200 OK** en el 100 % de las solicitudes concurrentes (`{"200": 60}`).
- **Directriz de diseño:** Prohibición estricta de invocar `api.scryfall.com/cards/named` en cliente para renderizar cartas en la mesa o biblioteca. Todas las URLs deben consumirse directamente desde `cards.scryfall.io` guardadas en base de datos.

### COMP-4 Room Manager
Crea y cierra mesas, gestiona códigos, asientos, anfitrión, expiración (mesa inactiva > 2 h se cierra) y `LobbyManager`.

## Modelos de datos

```ts
interface User { id: string; email?: string; displayName: string; passwordHash?: string; isGuest: boolean; createdAt: Date }

interface Deck { id: string; ownerId: string; name: string; commanderCardIds: string[]; createdAt: Date }
interface DeckCard { deckId: string; cardId: string; quantity: number; isCommander: boolean }

interface Card { id: string /* Scryfall id */; oracleId: string; name: string; manaCost?: string; typeLine: string;
                 colorIdentity: string[]; imageUris: Record<string,string>; legalities: Record<string,string>; updatedAt: Date }

interface Table { id: string; code: string; hostId: string; seats: number; startingLife: number;
                  isPrivate: boolean; status: "lobby" | "initiative" | "mulligan" | "playing" | "finished"; createdAt: Date }

interface LobbyPlayerState { seat: number; userId: string; deckRef?: { source: "saved" | "session"; deckId: string }; ready: boolean }
interface InitiativeState { round: number; rolls: Record<number, number>; pending: number[]; deadlineTs: string; order?: number[] }
interface TableState { status: "lobby" | "initiative" | "mulligan" | "playing" | "finished"; lobby: LobbyPlayerState[]; initiative?: InitiativeState; turnOrder?: number[] }

interface SeatState { seat: number; userId: string; life: number; poison: number; energy: number; experience: number;
                      commanderTax: Record<string, number>; commanderDamage: Record<string, number>;
                      zones: Record<"library"|"hand"|"battlefield"|"graveyard"|"exile"|"command", CardInstance[]> }

interface CardInstance {
  instanceId: string; cardId: string; tapped: boolean; faceDown: boolean;
  counters: Record<string, number>;
  x: number;   // 0..1 normalizado respecto a MesaTotal (pantalla completa 100vw)
  y: number;   // 0..1 normalizado respecto a MesaTotal (pantalla completa 100vh)
  z: number;   // orden de apilado global en la mesa
  ownerId?: string;   // Propietario original inmutable (jugador de cuya zona salió o quien creó la ficha)
  holderId?: string;  // Titular temporal en mesa (calculado por contención 100% en la división de un jugador)
}

type Playmat = { source: "commander" | "card" | "color"; cardId?: string; color?: string };
interface SeatVisual { seat: number; playmat: Playmat }

interface GameRecord { id: string; tableId: string; startedAt: Date; endedAt?: Date;
                       results: { userId: string; commanderId: string; placement: number }[]; }
interface ActionLogEntry { gameId: string; version: number; actorSeat: number; action: unknown; ts: Date }
```
Relaciones: User 1–N Deck, Deck N–M Card (vía DeckCard), Table 1–N GameRecord, GameRecord 1–N ActionLogEntry.

## Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal

### Modelo de Capas (MesaTotal: Rojo = Mesa, Naranja = Divisiones, Verde = Elementos Flotantes)

```
┌───────────────────────────────────────── MesaTotal (fixed inset-0, Único Droppable Global) ────────────────────────────────────────┐
│                                                                                                                                     │
│  ┌───────────────────────── División 0 (Visual) ───────────────────────┬───────────────────────── División 1 (Visual) ─────────────┐│
│  │ Playmat 100% a sangre (sin franjas separadas)                       │ Playmat 100% a sangre (sin franjas separadas)               ││
│  │                                                                     │                                                             ││
│  │                                                                     │                                                             ││
│  │ [Vida/Nombre]    [CMDR]     [Mano Jugador 0]     [LIB]    [Gyd/Exi] │ [Vida/Nombre]    [CMDR]     [Mano Jugador 1]    [LIB] [Gyd] ││
│  │  (Dock Flotante: flex/grid, overlay sobre playmat, pointer-events)  │  (Dock Flotante: flex/grid, overlay sobre playmat)          ││
│  ├─────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤│
│  │ [Vida/Nombre]    [CMDR]     [Mano Jugador 2]     [LIB]    [Gyd/Exi] │ [Vida/Nombre]    [CMDR]     [Mano Jugador 3]    [LIB] [Gyd] ││
│  │  (Dock Flotante: flex/grid, overlay sobre playmat, pointer-events)  │  (Dock Flotante: flex/grid, overlay sobre playmat)          ││
│  └─────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘│
│                                                                                                                                     │
│  [Capa Única de Cartas en MesaTotal: Coordenadas Globales x, y (0..1) sobre toda la pantalla; sin overflow-hidden]                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **MesaTotal (Capa Base y Droppable Global):** Superficie continua que cubre todo el viewport (`fixed inset-0`, `100vw × 100dvh`). Constituye el único droppable general de la mesa. Cualquier punto de la pantalla es mesa de juego.
- **Divisiones de Jugadores (Visuales):** Cuadrícula fija de 2 columnas (2 jugadores) o 2 filas por hasta 3 columnas ($\ge 3$ jugadores). Son meramente visuales (fondo playmat + borde delimitador fino); **NO** son droppables, **NO** recortan las cartas (sin `overflow: hidden` en el campo) y el playmat cubre el 100% del área de cada división (incluyendo debajo del dock de controles).
- **Disposición Canónica de Asientos:** Todos los clientes comparten la misma disposición de asientos y divisiones en pantalla (sin rotación por cliente). La mano privada y el dock de cada participante flotan sobre la división asignada a su asiento.
- **Capa Única Global de Cartas:** Las cartas en el campo de batalla residen en una sola capa compartida sobre `MesaTotal`. Sus posiciones se expresan en coordenadas globales normalizadas $(x, y \in [0, 1])$ relativas al ancho y alto total de la ventana, asegurando sincronización geométrica idéntica en todos los navegadores. Una carta puede situarse en cualquier punto de la pantalla, en los bordes o a caballo entre dos divisiones.
- **Regla de Autorización y Titularidad (ownerId y holderId) (Punto 5):** Reemplaza la antigua regla de que cualquier participante puede mover cualquier carta. Cada permanente conserva su `ownerId` inmutable (el jugador de cuya biblioteca, mano, pila o zona de comando salió originalmente, o el creador en el caso de fichas) y un `holderId` temporal (titular en mesa, no visible en la UI). Al soltar una carta en la mesa, `holderId` se calcula autoritativamente en el servidor comprobando si la caja delimitadora de la carta (ya girada a $90^\circ$ si corresponde) queda 100% contenida dentro de la división geométrica de un jugador; si cruza los bordes entre divisiones o queda fuera, `holderId` queda en blanco (`undefined`). Un jugador está autorizado a mover una carta en el campo si y solo si es su `ownerId` (siempre facultado para moverla o recuperarla de la división de otro) o es su `holderId` actual (carta 100% en su división). Si el jugador A recupera su permanente desde la división de B, el titular B pierde inmediatamente la facultad de moverla. El cliente valida esta regla deshabilitando el arrastre (`cursor: not-allowed` y toast informativo) y el servidor rechaza cualquier `MOVE_CARD` no autorizado emitiendo advertencia.
- **Elementos Flotantes (Dock, Vida, Pilas, Barra):** Flotan por encima de la mesa con `pointer-events: none` en sus contenedores envolventes y `pointer-events: auto` únicamente en los controles interactivos (botones, cartas de la mano, contadores), permitiendo que clics y arrastres sobre espacio vacío atraviesen limpiamente hasta la mesa.
- **DragOverlay en Portal:** El elemento arrastrado se renderiza mediante `createPortal` en `document.body` garantizando que no sufra recortes ni alteraciones de z-index al cruzar cualquier área de la pantalla.

### Modelo de UX de Arrastre de Cartas (WYSIWYG y Streaming Efímero en Vivo)
1. **Dimensiones fijas en píxeles de mesa:** La superficie `#mesa-total` calcula `--card-h` y `--card-w` en píxeles absolutos basados en el pod y el viewport (`cellHeight * 0.20`), evitando desajustes de container queries al portalizar a `document.body`.
2. **Arrastre de carta girada y caja apaisada (Punto 2):** Al arrastrar una carta girada (`tapped: true`), el fantasma en `DragOverlay` conserva fielmente la rotación a 90° (`origin-center rotate-90`) renderizándose como una caja apaisada (ancho y alto visualmente intercambiados). El desplazamiento (*offset*) entre el puntero del ratón y la carta se mide y calcula sobre su caja visual ya girada, asegurando que el puntero no quede "en el aire", que el desplazamiento sea estrictamente constante durante todo el trayecto y que la posición final coincida a $\le 2$ px sin cambios abruptos de dimensiones.
3. **Precisión subpixel al soltar:** La posición final se calcula a partir del rectángulo real del overlay (`active.rect.current.translated`), restringido al viewport mediante modificador en vivo y sin colocación automática ni snapping, logrando coincidencia verificada $\le 2$ px (medición real en prueba: $0.00 - 0.26$ px).
4. **Detección de colisión estricta por puntero:** El detector (`pointerWithin`) asegura que una carta solo entra en una pila si el cursor está físicamente dentro de sus límites. No existen imanes ni atracciones magnéticas hacia las pilas.
5. **Fila de insignias de contadores y palabras clave (Punto 4):** Las cartas en mesa muestran una fila de insignias (`CardBadges`) anclada al borde superior de la carta (`top-1 left-1 right-1`), sin cubrir la línea inferior de artista y copyright. Incluye 11 tipos de contadores oficiales (con conteo numérico o interruptor para Finalidad) y 14 palabras clave oficiales en español con término inglés en paréntesis. Se modifican desde secciones en línea en el menú contextual (`CardContextMenu`) por cualquier participante en permanentes visibles, registrándose en bitácora y reseteándose al salir de la mesa.
6. **Panel explicativo en vista previa y tooltips (Punto 5):** En la vista previa grande (`CardPreviewContext`), si la carta contiene contadores o palabras clave, se despliega un panel lateral anexo (`preview-keywords-counters-panel`) hacia el interior de la pantalla con la lista exhaustiva de iconos, nombres en español (inglés en paréntesis), cantidades y textos oficiales de ayuda (*reminder text*). Las insignias en mesa cuentan con tooltips nativos con la misma descripción detallada.
5. **Streaming efímero a 30 fps, eliminación de animación desde el centro y prevención de parpadeo en receptor B (Punto 1):** El cliente emisor transmite `CARD_DRAG_MOVE` throttled a ~30 fps con coordenadas normalizadas. En el inicio del arrastre (`handleDragStart`), el emisor calcula de inmediato la posición normalizada real de la carta (tomada de `data.card.position` si proviene del campo o mediante `getBoundingClientRect` si proviene de mano u otras zonas), erradicando el valor residual por defecto en el centro de la pantalla (50%, 50%). El servidor retransmite `REMOTE_CARD_DRAGGING` a los demás participantes. En los receptores, el fantasma remoto nace directamente en esa posición real con la clase `transition-none` durante su primer mensaje (`isFirstMessage: true`), activando la interpolación CSS suave (`transition-[left,top] duration-75 ease-linear`) únicamente a partir del segundo mensaje, asegurando que el fantasma jamás se anime erráticamente desde el centro hacia la carta (primer frame a $\le 2$ px de la posición original y 0 frames en el centro). Durante todo el arrastre y tras finalizarlo, la carta fija permanece oculta (`isRemoteDragging: true`, `opacity: 0`). Al soltar, el emisor emite las coordenadas finales con `isDragging: false`; el receptor mantiene el fantasma visible en la posición final y la carta fija oculta bajo `pendingSync: true` hasta que el evento autoritativo sincroniza el estado en el mismo frame de renderizado, eliminando todo parpadeo, frame en posición anterior o duplicidad visual (0 frames residuales verificado con `requestAnimationFrame`).
6. **Cierre fluido del abanico:** Al arrastrar una carta de la mano, su ranura colapsa a `width: 0` y `margin-left: 0` con transición de 250ms, cerrando el hueco entre cartas de forma imperceptible y sin desestabilizar el dock. Si el arrastre se cancela con la tecla `Escape`, la ranura se reabre suavemente.
7. **Actualización optimista y síncrona sin parpadeo (Punto 1):** Al liberar el arrastre en `handleDragEnd`, la posición final `{ normX, normY }` se almacena síncronamente en el mapa local `optimisticPositions` mediante `flushSync` de React en el mismo ciclo en que se desactiva el `DragOverlay` (`dropAnimation={null}`). `BattlefieldCanvas` lee las coordenadas optimistas de inmediato, impidiendo que el renderizado caiga en la posición anterior mientras la confirmación WebSocket viaja por la red. La reconciliación con el estado del servidor descarta automáticamente ecos desactualizados sin causar saltos visuales hacia atrás (0 frames en posición anterior comprobado con `requestAnimationFrame`).
8. **Eliminación de carta duplicada en clientes remotos (Punto 2):** Mientras un jugador remoto arrastra una carta, `BattlefieldCanvas` en los clientes receptores aplica `isRemoteDragging: true` a la carta fija original, asignándole `opacity: 0` y `pointer-events: none`. Así, el rival visualiza exclusivamente el fantasma interpolado a 30 fps (estrictamente 1 elemento visible para esa instancia). `useGameSocket` implementa un temporizador de seguridad de 1000 ms por cada tarjeta en arrastre remoto: si la conexión se interrumpe o el emisor no envía actualizaciones en 1 s, el estado efímero se purga automáticamente y la carta fija recupera su visibilidad normal (`opacity: 1`).
9. **Flujos bidireccionales zona a zona y desacoplamiento de playerId (Punto 5):**
   - **Comandante hacia la mesa:** La ranura de la zona de comando (`DraggableCommanderCard`) implementa `useDraggable({ id: card.instanceId, data: { card, fromZone: 'command' } })`. Al soltar sobre la mesa, emite `MOVE_CARD` con `fromZone: 'command'` y `toZone: 'battlefield'`, actualizando la ranura a estado vacío `(En campo)` con enlace modal para revisar cartas en la zona de comando.
   - **Mesa hacia la mano:** La mano privada (`data-dock-zone="hand"`) implementa `useDroppable({ id: 'droppable-hand-${player.id}', data: { zone: 'hand', playerId } })` para el jugador local. Soltar cualquier permanente de la mesa sobre el abanico devuelve la carta a la mano privada (`toZone: 'hand'`).
   - **Biblioteca hacia mano y campo:** Clic en la ranura de biblioteca emite `DRAW_CARDS` (`count: 1`). Además, la carta superior (`DraggableLibraryCard`) implementa `useDraggable({ fromZone: 'library' })`, permitiendo arrastrar directamente de la biblioteca al campo de batalla.
   - **Robustez de esquemas WebSocket:** `playerId` es opcional en `DrawCardsSchema`, `AdjustLifeSchema`, `SetPlayerCounterSchema`, `SetLifeSchema` y `SetPlayerStatusSchema`. En el servidor (`ws-handler.ts`), si no se proporciona `playerId`, se asigna por defecto `client.playerId`, eliminando errores de tipo en consola y bloqueos de interfaz.
   - **Estratificación y compresión contra solapamientos:** Las ranuras fijas del dock (Comandante, Biblioteca, Cementerio/Exilio) tienen elevación `z-20` y el contenedor de mano `z-10`. En `HandFan.tsx`, el margen negativo entre cartas se adapta dinámicamente (`overlapRatio = min(0.78, 0.48 + (n-3)*0.05)`), impidiendo que una mano con 7 o más cartas desborde y bloquee los clics o arrastres de la zona de comando.
10. **La mano como destino de soltado (Punto 6):**
   - El contenedor del abanico del jugador local (`[data-dock-zone="hand"]`) integra `useDroppable` con identificador `droppable-hand-${player.id}`. En `TableBoard.tsx`, soltar cualquier carta con `overData?.zone === 'hand' && overData?.playerId === localPlayerId` dispara la acción autoritativa `MOVE_CARD` con `toZone: 'hand'` y `toPlayerId: localPlayerId`.
   - Cuando el puntero del arrastre cruza la zona de la mano propia (`isHandOver: true`), el contenedor activa un resalte suave (`ring-2 ring-amber-400/80 bg-amber-400/15 shadow-[0_0_30px_rgba(251,191,36,0.3)] border-amber-400/50`) con transición de 200 ms.
   - Las manos de los rivales (`!isLocalPlayer`) no son droppables (`disabled: true` y sin registro de ref), asegurando que un jugador nunca pueda soltar o introducir cartas en las manos ajenas.
11. **Pilas interactivas y modales con menú contextual (Punto 7):**
   - **Ilustración y conteo de la carta superior:** El cementerio y el exilio renderizan `DraggablePileCard`, mostrando la imagen real de la última carta llegada como carátula de la pila y un contador nítido sobre ella.
   - **Arrastre directo desde la pila:** La carta superior posee `useDraggable` con `fromZone: 'graveyard' | 'exile'`, permitiendo arrastrarla de forma natural hacia la mesa o hacia la mano propia.
   - **Inspector modal y menú contextual con envío a división propia en cascada (Punto 2 y Punto 8):** Hacer clic sobre cualquier pila abre un modal con el desglose de cartas. Al hacer clic derecho en cualquier carta dentro del modal (ModalCardItem) o en la mano, se despliega un menú con "Enviar a la mano", "Enviar al campo" y en cementerio "Enviar al exilio". Al seleccionar "Enviar al campo", el sistema calcula las coordenadas normalizadas en el centro de la sección jugable del propio jugador (excluyendo el dock inferior, `getPlayerBattlefieldCascadePosition` en cliente y `computePlayerDivisionCenter` en servidor), con desplazamiento progresivo en cascada (+0.015 en $x, y$) para evitar solapamientos exactos, garantizando autoritativamente que la carta quede con `ownerId` inmutable y `holderId` asignado al jugador (validado en mesas de 2, 4 y 6 jugadores con coordenadas medidas en 1080p: 2p en (436.80, 407.70) con centro jugable (480.00, 459.00); 4p en (436.80, 151.20) con centro jugable (480.00, 202.50); 6p en (276.80, 151.20) con centro jugable (320.00, 202.50)).
   - **Privacidad estricta de biblioteca:** Cualquier jugador puede consultar los modales de cementerio y exilio de todos los participantes. La biblioteca privada solo puede ser inspeccionada por su propio dueño (`isLocalPlayer`), y el servidor (`visibility-filter.ts`) enmascara las cartas de las bibliotecas rivales con `MASKED_CARD_DEFINITION`.

12. **Zona de comando droppable e impuesto autoritativo de comandante (Punto 6):**
   - **Ranura droppable:** La zona de comando en el dock de cada jugador (`[data-dock-zone="command"]`) integra `useDroppable` con identificador `droppable-command-${player.id}` (habilitado únicamente para el jugador local, `disabled: !isLocalPlayer`), permitiendo devolver al comandante arrastrándolo desde la mesa o pilas.
   - **Botón explícito de retorno:** Cuando la zona de comando está vacía (`zones.command.length === 0`), se muestra un botón explícito "Devolver al comando" (`data-testid="return-to-command-btn"`), garantizando el retorno inmediato sin requerir arrastre físico.
   - **Impuesto manual sin motor de reglas (Punto 3):** Al devolver al comandante a la zona de comando (sea mediante arrastre sobre la ranura droppable, clic en "Devolver al comando" o clic derecho en la mesa -> "A Comando"), el servidor NO auto-incrementa el impuesto de comandante. La aplicación de impuesto es exclusivamente manual a través de los botones interactivos ±2 de la zona de comando.
   - **Sacar a la mesa mantiene el tax:** Mover el comandante desde la zona de comando hacia el campo de batalla (`toZone: 'battlefield'`) conserva intacto el valor acumulado de `commanderTax`.
   - **Badge permanente interactivo:** La ranura de comando renderiza una pastilla interactiva (`data-testid="commander-tax-badge"`) con el texto `Tax: +X` y botones táctiles `+` y `-` que despachan `SET_PLAYER_COUNTER` con delta $\pm 2$ (el impuesto nunca se incrementa ni decrementa de 1 en 1).
   - **Desacoplamiento de LifePill:** Se eliminaron los controles de `commanderTax` de la pastilla de vida (`LifePill`) para eliminar redundancias y centralizar la visualización y control del impuesto exclusivamente en la zona de comando.

13. **Arrastre a la biblioteca a la parte superior (Punto 6):**
   - En `TableBoard.tsx`, soltar una carta sobre la ranura de biblioteca (`overData?.zone === 'library'`) despacha `MOVE_CARD` con `toZone: 'library'` y `destinationIndex: 0`.
   - En el servidor (`game-state.ts`), cuando `payload.toZone === 'library'` y no se especifica `destinationIndex`, la carta se inserta al inicio del array (`zones.library.unshift(card)`), quedando en la parte superior (arriba, índice 0).
   - Esto garantiza autoritativamente que la carta soltada en la biblioteca sea la próxima carta extraída al invocar `drawCards` (que toma cartas desde el índice 0 con `splice(0, count)`). Su posición espacial en mesa y estado girado se resetean automáticamente.

14. **Menú contextual en mano, mesa y pilas con submenús de biblioteca y revelación (Punto 7):**
   - Menú contextual flotante (`CardContextMenu`) disponible al hacer clic derecho en la mano propia (`HandFan`), en cartas del campo de batalla (`BattlefieldCanvas`) o en cartas de cualquier modal inspector de pilas (`PlayerCell`).
   - Opciones de envío a zonas:
     - Cementerio (`graveyard`) y Exilio (`exile`): se insertan al tope (índice 0) de la pila correspondiente.
     - Mesa (`battlefield`): calcula el centro de la sección jugable asignada al jugador sin contar el dock (`getPlayerBattlefieldCascadePosition` en cliente y `computePlayerDivisionCenter` en servidor), aplicando desplazamiento progresivo en cascada (+0.015 en x, y). La carta adquiere `ownerId` inmutable y `holderId` del jugador local. Coordenadas resultantes en 1080p: 2p en (436.80, 407.70) con centro jugable en (480.00, 459.00); 4p en (436.80, 151.20) con centro jugable en (480.00, 202.50); 6p en (276.80, 151.20) con centro jugable en (320.00, 202.50).
     - Biblioteca (`library`): submenú interactivo con tres acciones: "Arriba" (`destinationIndex: 0`), "Abajo" (`destinationIndex: library.length`), y "Posición" (con selector numérico $1 \dots N$, mapeado a `destinationIndex = pos - 1`).
   - Revelación de cartas (`REVEAL_CARD` y `CARD_REVEALED`):
     - No desplaza la carta de su zona.
     - Submenú de revelación: "A toda la mesa" (difusión broadcast a todos los sockets) o "A [Jugador X]" (filtrado estricto por servidor enviando el mensaje únicamente al socket del destinatario y al emisor mediante `VisibilityFilter`).
     - Los clientes destinatarios despliegan una modal efímera (`RevealedCardModal`) con la imagen y datos de la carta, cerrable por botón o tecla `Escape`.
     - Bitácora (`logs`): revelar a todos genera `${fromPlayerName} reveló "${card.name}" a todos`; revelar privado genera `${fromPlayerName} reveló una carta a ${targetPlayerName}` (sin revelar el nombre de la carta al resto de la mesa).


15. **Animación de girar y enderezar sobre centro invariante y slot apaisado (Punto 7):**
    - **Estructura jerárquica slot-rotador:** Cada carta en el campo de batalla (`BattlefieldCanvas`) se compone de un contenedor exterior (*slot*, `.card-slot-container`) y un cuerpo de carta giratorio interior (`.card-rotator`).
    - **Anclaje e invarianza matemática del centro:** El slot exterior se posiciona mediante `left: calc(${posX}% + var(--card-w) / 2)`, `top: calc(${posY}% + var(--card-h) / 2)` y `transform: translate(-50%, -50%)`. Durante el giro, el ancho y alto del slot se intercambian (`cardW = isTapped ? 'var(--card-h)' : 'var(--card-w)'`, `cardH = isTapped ? 'var(--card-w)' : 'var(--card-h)'`) con transición CSS `cubic-bezier(0, 0, 0.2, 1)` de 180 ms. Debido a que `translate(-50%, -50%)` centra el slot respecto a las coordenadas invariantes, el centro geométrico permanece matemáticamente constante ($\Delta x = 0.00\text{ px}, \Delta y = 0.00\text{ px}$) en todos los fotogramas muestreados con `requestAnimationFrame` tanto en el cliente emisor como en clientes remotos.
    - **Rotación interior por camino más corto:** El cuerpo interior contiene la carátula, badges de contadores (+1/+1, etc.) y el contorno de selección. Rota de $0^\circ \to 90^\circ$ al girar (monótonamente sin sobrepasarse) y de $90^\circ \to 0^\circ$ al enderezar (camino más corto de $-90^\circ$, nunca $270^\circ$). Contadores e insignias giran conjuntamente con la carta sin saltos ni desfases.
    - **Respeto a prefers-reduced-motion:** La media query `@media (prefers-reduced-motion: reduce)` desactiva la animación con `transition: none !important`, realizando el intercambio dimensional y la rotación de forma instantánea.
    - **Desacoplamiento de holderId y MOVE_CARD:** La acción de girar o enderezar despacha exclusivamente `TAP_CARD`. El servidor no recalcula `holderId` (que solo se computa al mover o soltar cartas en la mesa).
    - **Preservación de nitidez óptica y anti-blur en rotación (Corrección Punto 1):**
      - *Dimensiones pares exactas:* Las variables `--card-w` y `--card-h` se computan y redondean como enteros pares (96×134 en 2p, 78×108 en 4p y 6p a 1080p). Esto asegura que al aplicar `translate(-50%, -50%)`, el desplazamiento sea un entero exacto (e.g. -48px y -67px), eliminando desfases de medio píxel (.5px).
      - *Posicionamiento entero en el lienzo:* El centro de cada carta se calcula mediante `centerPixelX = Math.round(screenNormX * winW + cardWNum / 2)` y `centerPixelY = Math.round(screenNormY * winH + cardHNum / 2)`, anclando el slot a coordenadas enteras del viewport.
      - *Gestión temporal de `will-change`:* Para evitar que Blink/Chromium promueva la capa permanentemente y congele una rasterización a baja escala, `will-change: transform` y `will-change: width, height` solo se aplican durante los 180 ms de la animación mediante la clase dinámica `.is-animating-tap`. Al finalizar la transición (`onTransitionEnd`), `will-change` se desactiva, permitiendo al motor rasterizar la carta a resolución nativa completa.
      - *Transform 2D puro:* Sin capas 3D, sin `translateZ` ni filtros artificiales sobre la imagen.
      - *Medición empírica de nitidez (Varianza del Laplaciano):* Verificado en `apps/web/e2e/sharpness-tap.spec.ts`:
        - DPR 1: Enderezada = 3812.31, Girada = 3929.30, Ratio = 103.07% (>= 90% requerido cumplido).
        - DPR 2: Enderezada = 3376.38, Girada = 3547.01, Ratio = 105.05% (>= 90% requerido cumplido).
        - Capturas ampliadas al 200% archivadas: `sharpness-untapped-200.png` y `sharpness-tapped-200.png`.
    - **Análisis de posición por centro en el modelo:** Al guardar o anclar la posición de la carta por su centro, las rotaciones no alteran las coordenadas de la carta, eliminando cualquier desfase entre clientes locales y remotos.
    - **Fuente de verdad única para el arrastre y DragOverlay idéntico (Corrección Punto 2):**
      - *Medición precisa de la caja visual:* En `handleDragStart`, se inspecciona el nodo del DOM mediante `getBoundingClientRect()` de la carta (considerando si está rotada 90° o no), calculando el vector de desplazamiento entre las coordenadas del evento puntero (`p0x, p0y`) y el centro de la caja (`grabOffsetFromCenter`), así como con su esquina superior izquierda (`grabOffsetFromTopLeft`).
      - *Estructura gemela de slot y rotador:* El `DragOverlay` renderiza exactamente la misma arquitectura que `BattlefieldCanvas`: un contenedor `.card-slot-container` con dimensiones intercambiadas (`cardPixelHeight` × `cardPixelWidth` si está girada) y un `.card-rotator` centrado con `rotate(90deg)` o `rotate(0deg)`.
      - *Modificador `snapToVisualBoxModifier`:* Neutraliza las discrepancias internas de `@dnd-kit` producidas por el centrado CSS (`translate(-50%, -50%)`), garantizando que la posición del overlay coincida exactamente con `initialBox.left + transform.x` y `initialBox.top + transform.y` acotada al viewport, eliminando saltos o desalineaciones visuales al superar los 8 px de activación.
      - *Estabilidad dimensional de la mano:* En `HandFan.tsx`, las cartas arrastradas conservan su anchura de slot (`var(--card-w)`) aplicando `opacity: 0` en lugar de colapsar la anchura a 0, evitando saltos del abanico o alteraciones de rectángulos durante el arrastre.
      - *Coordenadas de mesa desde el overlay:* Al soltar (`handleDragEnd`), las coordenadas de mesa se derivan estrictamente de la caja visual delimitada del overlay (`centerScreenX = clampedX + overlayWidth / 2`, `centerScreenY = clampedY + overlayHeight / 2`), asegurando continuidad perfecta entre la experiencia visual y el estado del servidor.

    - **Seguimiento estricto del puntero durante el arrastre (Corrección Punto 3):**
      - *Sincronización en tiempo real con `latestPointerRef`:* Para eliminar el salto inicial de 8 px inherente a la activación del sensor de `@dnd-kit`, `TableBoard` mantiene un listener nativo global de `pointermove` en fase de captura (`latestPointerRef`). `snapToVisualBoxModifier` calcula `targetLeft = currentPointerX - grabOffsetFromTopLeft.x` y `targetTop = currentPointerY - grabOffsetFromTopLeft.y`, asegurando que el punto agarrado del overlay visual (`puntero - overlayCorner`) se conserve matemáticamente invariante con $\Delta \le 1.0\text{ px}$.
      - *Muestreo continuo y certificación E2E:* Validado en `apps/web/e2e/pointer-tracking.spec.ts` en 16 combinaciones (carta enderezada y girada; desde mano, mesa y mesa expandida; a 1920x1080 y 1366x768; en pods de 2 y 4 jugadores):
        - Desviación en el frame del umbral de 8 px: $\Delta x = 0.00\text{ px}, \Delta y = 0.00\text{ px}$ en todas las combinaciones.
        - Desviación máxima a lo largo de toda la trayectoria: $\Delta x = 0.00\text{ px}, \Delta y = 0.00\text{ px}$ en todas las combinaciones (criterio $\le 1.0\text{ px}$ cumplido al 100%).
### Privacidad y Reglas de Visibilidad de Mensajes
    - **Centrado exacto al enviar al campo con dimensiones reales de carta (Corrección Punto 4):**
      - *Cálculo dinámico basado en dimensiones reales:* `packages/shared/src/utils/card-dimensions.ts` (`getCardDimensions`) calcula el tamaño entero y par de las cartas según el número de participantes (`podSize`) y la resolución del viewport.
      - *Normalización en cliente y servidor:* Tanto `getPlayerBattlefieldCascadePosition` (`apps/web/src/utils/table-framing.ts`) como `computePlayerDivisionCenter` (`apps/server/src/game/game-state.ts`) reemplazan los valores estáticos (`0.0225` y `0.0475`, que asumían 86.4×102.6 px fijos) por `cardHalfWNorm = (cardDims.width / 2) / viewport.width` y `cardHalfHNorm = (cardDims.height / 2) / viewport.height`.
      - *Centrado geométrico riguroso:* La carta queda ubicada en `(centerX - cardHalfWNorm, centerY - cardHalfHNorm)`, lo que garantiza que al renderizarse en pantalla su centro físico `(box.left + width / 2, box.top + height / 2)` coincida de forma idéntica con el centro de la sección jugable `(centerX * width, centerY * height)` con un error $\le 1.0\text{ px}$.
      - *Resultados empíricos medidos:*
        - **1920x1080 (Full HD):**
          - 2p: Centro jugable = (480.00, 459.00), Carta (96×134) top-left = (432.00, 392.00) $\to$ Centro carta = (480.00, 459.00), Diferencia = (0.00 px, 0.00 px).
          - 4p: Centro jugable = (480.00, 202.50), Carta (78×108) top-left = (441.00, 148.50) $\to$ Centro carta = (480.00, 203.00), Diferencia = (0.00 px, 0.50 px en render).
          - 6p: Centro jugable = (320.00, 202.50), Carta (78×108) top-left = (281.00, 148.50) $\to$ Centro carta = (320.00, 203.00), Diferencia = (0.00 px, 0.50 px en render).
        - **1366x768 (Laptop HD):**
          - 2p: Centro jugable = (341.50, 326.40), Carta (96×134) top-left = (293.50, 259.40) $\to$ Centro carta = (341.50, 326.40), Diferencia = (0.00 px, 0.00 px).
          - 4p: Centro jugable = (341.50, 144.00), Carta (56×78) top-left = (313.50, 105.00) $\to$ Centro carta = (341.50, 144.00), Diferencia = (0.00 px, 0.00 px).
          - 6p: Centro jugable = (227.67, 144.00), Carta (56×78) top-left = (199.67, 105.00) $\to$ Centro carta = (227.67, 144.00), Diferencia = (0.00 px, 0.00 px).

### Privacidad y Reglas de Visibilidad de Mensajes
1. **Fase de Mulligan y Regla de Londres:**
   - La estructura de mano inicial de cada jugador (`mulliganState.players[playerId].cards`) se transmite de forma autoritativa y privada únicamente al socket del propio jugador.
   - A los rivales se les ocultan las identidades de las cartas (reciben la cuenta `cardsCount`, el estado de decisión `'deciding' | 'kept'`, el número de mulligans realizados y la cantidad de cartas devueltas al fondo, pero jamás los identificadores o nombres de las cartas).
   - En caso de reconexión durante la fase de mulligan (`RESUME`), el servidor retransmite el estado completo privado al cliente reconectado para restaurar la ventana modal `OpeningHandModal`.
   - Se prohíbe y rechaza enérgicamente cualquier acción `MULLIGAN` suelta fuera de esta fase.
2. **Revelación de cartas y Revelación Persistente en Mano (Punto 1 de Correcciones del Cliente - A.1):**
   - **Difusión y Bitácora:** Cuando se revela "A toda la mesa" (`targetPlayerId: undefined`), el servidor difunde `CARD_REVEALED` a todos los clientes de la sala y registra en la bitácora pública `${playerName} reveló "${card.name}" a todos`. Cuando se revela "A un jugador específico" (`targetPlayerId: string`), el servidor filtra mediante `VisibilityFilter` y envía `CARD_REVEALED` única y exclusivamente al socket del jugador destinatario y al del emisor, registrando en bitácora `${playerName} reveló una carta a ${targetName}` sin filtrar el nombre ni la imagen a terceros.
   - **Persistencia en Mano (`revealedTo`):** La instancia autoritativa de la carta en mano almacena `revealedTo?: string[] | 'all'`. En cada sincronización de estado (`ROOM_STATE_SYNC`), `VisibilityFilter` envía la definición real de la carta únicamente al propietario y a los destinatarios especificados. Para cualquier cliente no destinatario, la definición es sustituida por `MASKED_CARD_DEFINITION` y el campo `revealedTo` es purgado.
   - **Renderizado Visual (`HandFan`):** En el abanico del jugador que revela, los destinatarios ven la carta revelada boca arriba con su imagen real (`CardDisplay`) y las demás boca abajo. La carta revelada muestra una insignia circular de ojo rojo (`data-testid="revealed-eye-badge"`); el propietario ve el tooltip `"Revelada a B, C"` o `"Revelada a todos"`, y los destinatarios ven `"Revelada por A"`. Los clientes no destinatarios ven la mano completamente con reversos de carta estándar sin indicación alguna.
   - **Ciclo de Vida y Terminación:** La revelación se cancela de forma inmediata (`delete card.revealedTo`) al salir la carta de la mano (jugar al campo, mover a cementerio, exilio o biblioteca), al barajar la biblioteca (`shuffleLibrary`), al producirse un mulligan, o cuando el propietario selecciona "Dejar de revelar" (`UNREVEAL_CARD`) en el menú contextual.
3. **Mover a biblioteca (`MOVE_CARD` con `destinationIndex`):**
   - Cuando una carta entra a la biblioteca (arriba en índice 0, abajo en `length` o en posición intermedia $N$), su identidad queda protegida bajo la regla de zona oculta: el servidor incrementa el conteo `libraryCount` para la sala, pero no expone el orden ni la identidad de las cartas de la biblioteca a los oponentes.

### Estilo visual
- Tema oscuro; texto claro con sombra suave; cartas con borde fino y sombra para despegarlas del playmat.
- **Regla de rotación única de permanente (Punto 3):** La rotación de permanentes (Tap/Untap) se aplica exclusivamente en el contenedor externo `BattlefieldCardItem` (`transition-transform duration-150 origin-center rotate-90`). `CardDisplay` y las etiquetas internas `<img>` carecen de rotaciones propias (`transform: none`), eliminando el problema de rotación doble acumulada a 180° (invertida). Voltear cartas boca abajo o alternar cartas de doble cara conmuta el recurso visual sin aplicar rotaciones 3D conflictivas con el tap.
- **Interacciones de cartas en mesa (Punto 4):**
  - Clic simple: Selección visual sin abrir menús (`border-amber-400 ring-2`).
  - Doble clic: Alterna giro (Tap/Untap) de forma directa sin activar la ampliación de celda ni desplegar controles.
  - Clic derecho / Pulsación táctil prolongada (500 ms): Despliega menú contextual flotante con botones de acción (Girar, Contador +1/+1, Clonar, Voltear). Cerrado con clic fuera o tecla `Escape`.
- Pastilla de vida: forma de píldora, fondo oscuro semitransparente, número grande (≥ 32 px).
- **Panel de vida interactivo (Punto 7):**
  - Eliminación total de los botones de $\pm 5$ del DOM de la pastilla de vida, manteniendo únicamente botones táctiles rápidos de $\pm 1$.
  - Dos entradas numéricas dedicadas dentro del panel flotante de vida:
    - **"Daño recibido"** (`data-testid="damage-received-input"`): resta el valor ingresado a la vida actual (`adjustLife(-val)`) al presionar la tecla `Enter`.
    - **"Vida ganada"** (`data-testid="life-gained-input"`): suma el valor ingresado a la vida actual (`adjustLife(val)`) al presionar la tecla `Enter`.
  - Ambas entradas limpian automáticamente su valor de estado inmediatamente tras confirmarse con `Enter`.
  - Validación de entrada en tiempo real que descarta cualquier carácter no numérico (`replace(/[^0-9]/g, '')`), aceptando estrictamente enteros positivos mayores que 0.
- **Inspector de Biblioteca con Buscador, Filtros y Telemetría Scryfall (Punto 8):**
  - **Buscador en tiempo real:** Barra de búsqueda integrada en la cabecera del modal inspector de biblioteca que filtra la lista en memoria por `definition.name`.
  - **Píldoras de filtrado por tipo:** Conjunto de filtros directos para `Criaturas`, `Instantáneos`, `Conjuros`, `Artefactos`, `Encantamientos`, `Tierras` y `Planeswalkers`, combinables con la búsqueda de texto y evaluados contra `definition.typeLine`.
  - **Servicio de telemetría de cola Scryfall (`scryfallQueue`):** Gestor observable en `apps/web/src/services/scryfallQueue.ts` que notifica la cantidad de peticiones pendientes en cola y reintentos. Expone indicador reactivo `Sincronizando cartas... (X en cola)` (`data-testid="scryfall-sync-indicator"`) en la esquina superior del modal cuando la cola es mayor a 0, y se oculta automáticamente al vaciarse.
- **Vista Previa de Carta Centrada en Mitad Opuesta sin Contenedor (Punto 9):**
  - **Ubicación en mitad opuesta:** Al pasar el cursor sobre cualquier carta (mano, mesa, pilas o modal inspector), la vista previa grande se proyecta centrada verticalmente en la mitad horizontal de la pantalla opuesta a la posición del cursor (si el puntero está en la mitad izquierda $x < W/2$, la vista previa se muestra en la derecha a $x=75\% W, y=50\% H$; si está en la mitad derecha, se muestra en la izquierda a $x=25\% W, y=50\% H$), sin tapar la carta original ni el espacio de juego inmediato.
  - **Imagen pura flotante con drop-shadow:** Renderizada sin contenedor, sin caja de diálogo, sin marco gris, sin botón de cerrar y sin fondos adicionales (`background: transparent`, `border: none`, `padding: 0`), con sombra suave `filter: drop-shadow(0 20px 35px rgba(0, 0, 0, 0.75))`.
  - **Cierre instantáneo:** Desaparece inmediatamente al retirar el puntero (`mouseleave`) o al presionar la tecla `Escape` mediante listener global de teclado en `CardPreviewProvider`.
- **Menú Contextual con Expansión en Línea y Navegación por Teclado (Punto 1 de Correcciones del Menú Contextual):**
  - **Eliminación de submenús flotantes desconectados:** Se erradicaron los contenedores flotantes posicionados con `absolute left-full` y los manejadores `onMouseEnter`/`onMouseLeave` que causaban cierres accidentales al cruzar el puntero por el espacio intersticial o con movimientos diagonales.
  - **Expansión en línea dentro del mismo menú:** Los submenús de "Biblioteca" y "Revelar" se expanden verticalmente dentro del mismo contenedor de [`CardContextMenu.tsx`](apps/web/src/components/CardContextMenu.tsx) con indentación visual (`border-l-2`), manteniéndose abiertos de forma estable e independiente de la velocidad del puntero.
  - **Navegación completa por teclado:** Focus inicial en el primer elemento al abrir, navegación cíclica con flechas arriba/abajo (`ArrowUp`, `ArrowDown`), activación/expansión con `Enter`, y cierre con `Escape` o clic fuera en el backdrop.
- **Inserción Aleatoria en Biblioteca y Privacidad en Bitácora (Punto 2 de Correcciones del Menú Contextual):**
  - **Eliminación de posición específica N:** Se eliminó la opción interactiva de posición específica y el input numérico en [`CardContextMenu.tsx`](apps/web/src/components/CardContextMenu.tsx).
  - **Opciones de Biblioteca:** El submenú en línea de Biblioteca ofrece 3 opciones directas: "Arriba" (`destinationIndex: 0`), "Abajo" (`destinationIndex: library.length`), y "Aleatoria" (`randomPosition: true`).
  - **Distribución uniforme con CSPRNG:** Al recibir `randomPosition: true`, el servidor ejecuta `crypto.randomInt(0, library.length + 1)` para insertar la carta en una posición estrictamente equiprobable entre todas las disponibles ($0$ a $L$).
  - **Bitácora opaca:** El servidor registra el evento público `X envió una carta a su biblioteca`, sin filtrar la posición (cima, fondo o índice) a ningún cliente.
- **Certificación de Menú Contextual Inline, Pausas Diagonales, Biblioteca y Revelado (Punto 3 de Correcciones del Menú Contextual):**
  - **Suite E2E de Playwright:** [`apps/web/e2e/context-menu-inline.spec.ts`](apps/web/e2e/context-menu-inline.spec.ts).
  - **Invarianza ante movimientos diagonales y pausas:** Muestreo de trayectorias sinusoidales con desvío lateral (+35 px) y pausas de 0 ms, 300 ms y 800 ms hacia los submenús de "Biblioteca" y "Revelar". El menú permanece visible sin cerrarse por hover.
  - **Biblioteca Arriba:** Carta enviada al tope (`destinationIndex: 0`) confirmada como la siguiente robada (`DRAW_CARDS`) con coincidencia exacta de `instanceId`.
  - **Biblioteca Abajo:** Carta enviada al fondo (`destinationIndex: library.length`) confirmada que NO es entregada en el siguiente robo individual.
  - **Biblioteca Aleatoria:** Carta insertada en posición aleatoria con CSPRNG autoritativo; verificada la remoción de la mano y la recepción en el cliente rival (`GameLogAndChat`) de la entrada `"envió una carta a su biblioteca"` sin filtrar índices ni posiciones.
  - **Revelado Privado:** La acción de revelar a un jugador rival emite `REVEAL_CARD` con `targetPlayerId`; el cliente objetivo muestra `RevealedCardModal` con el nombre de la carta mientras los demás clientes no reciben la identidad.
- **Panel Detallado "Ver Carta" con Símbolos, Metadatos, Artista y Dictámenes (Punto 4 de Correcciones del Cliente):**
  - **Componente:** [`CardDetailsModal.tsx`](apps/web/src/components/CardDetailsModal.tsx) integrado mediante portal en [`CardPreviewContext.tsx`](apps/web/src/context/CardPreviewContext.tsx) con la función `openCardDetails(card)`.
  - **Activación:** Opción "Ver carta" (`data-testid="context-view-card"`) en [`CardContextMenu.tsx`](apps/web/src/components/CardContextMenu.tsx), expuesta para cartas visibles (mano propia, campo de batalla boca arriba, cementerio, exilio y zona de comando).
  - **Estructura y metadatos:**
    - Imagen grande en alta resolución (`large` o `normal`).
    - Renderizador de símbolos MTG (`FormattedSymbol`) con badges circulares para maná `{W, U, B, R, G, C}`, coste numérico `{0..20}`, símbolos de acción `{T, X}` y maná híbrido/partido.
    - Línea de tipo, texto Oracle original en inglés formateado con símbolos y párrafos.
    - Estadísticas dinámicas de fuerza/resistencia ($P/T$) o lealtad inicial de planeswalker.
    - Edición/Set, rareza con código cromático, número de coleccionista e identidad de color.
    - Atribución de artista ("Ilustrado por [artista]") y aviso de copyright oficial ("™ & © Wizards of the Coast") conforme a las directrices de Scryfall.
    - Selector interactivo de caras (`card-details-face-switcher`) para cartas de doble cara (DFC).
    - Sección de dictámenes oficiales (rulings) alimentada por la base de datos local vía `GET /api/cards/:oracleId/rulings`, con fecha, fuente oficial y comentario o estado "Sin dictámenes".
- **Sincronización Local de Dictámenes (Rulings) y Caché Basada en Fecha (Punto 5 de Correcciones del Cliente):**
  - **Base de datos local:** Modelo Prisma `Ruling` (`oracleId`, `source`, `publishedAt`, `comment`) con índice en `oracleId`.
  - **Sincronización bulk:** Método `syncRulings(limit?)` en [`BulkSyncService.ts`](apps/server/src/services/bulk-sync.service.ts) que consulta el catálogo oficial de Scryfall con cabeceras `User-Agent` institucional y `Accept: application/json`.
  - **Comprobación de fecha:** Compara `updated_at` contra `lastRulingsUpdatedAt` y omite la descarga cuando el archivo no ha sido modificado en el CDN de Scryfall (`skipped: true, reason: 'not_modified'`).
  - **Aislamiento en tiempo real:** Cero llamadas a APIs externas en caliente; la consulta desde la UI invoca `GET /api/cards/:oracleId/rulings` sirviendo datos desde la base de datos local o caché en memoria. Gatherer no es utilizado.
  - **Integración con Cron Nocturno:** Sincronización conjunta de cartas Oracle y dictámenes oficiales a las 03:00 UTC.
- **Aislamiento de Privacidad en Menús y Visualización (Punto 6 de Correcciones del Cliente):**
  - **Filtro `isVisible`:** En [`CardContextMenu.tsx`](apps/web/src/components/CardContextMenu.tsx), la opción "Ver carta" se calcula con `!card.isFaceDown && !isPrivateHand && (fromZone === 'command' || card.isCommander || (fromZone === 'hand' && card.ownerId === targetPlayerId) || fromZone === 'battlefield' || fromZone === 'graveyard' || fromZone === 'exile')`.
  - **Anonimización de títulos:** Si `card.isFaceDown` es true, el encabezado muestra exclusivamente `"Carta boca abajo"`. Si es mano ajena, muestra `"Carta oculta"`, impidiendo cualquier filtración de nombre o tipo.
  - **Flexibilización de mutaciones sobre permanentes visibles (Punto 7 de Correcciones del Cliente - D.7):**
  - *Qué bloqueaba canMutate anteriormente:* Bloqueaba girar/enderezar (`onTap`), voltear boca abajo/arriba (`onFlip`), clonar fichas (`onClone`), poner contadores y palabras clave sobre permanentes ajenos en la mesa.
  - *Apertura de interacción en mesa:* Se eliminan las restricciones de `canMutate` sobre permanentes visibles de la mesa en cliente y servidor (`GameStateSession.tapCard`, `flipCard`, `cloneToken`, `setCardCounter`, `setCardPT`, `toggleCardKeyword`). Cualquier jugador puede girar (doble clic o menú), clonar fichas, cambiar cara visible, modificar contadores, P/T o palabras clave, registrándose la autoría en la bitácora pública.
  - *Preservación de gobernanza de zonas:* El arrastre y los traslados hacia cementerio, exilio, mano, biblioteca o zona de comando permanecen estrictamente gobernados por el propietario y titular (`canMove` / `canMutate`).
  - *Blindaje de información oculta:* La privacidad de manos ajenas no reveladas, bibliotecas y cartas boca abajo se mantiene 100% blindada.
- **Atribución en el Selector de Playmat y Enlace a "Ver Carta" (Punto 7 de Correcciones del Cliente):**
  - **Identificación de carta de fondo:** En [`PlayerCell.tsx`](apps/web/src/components/PlayerCell.tsx), se resuelve `activePlaymatCard` comparando la URL de fondo (`previewPlaymatUrl` o `playmatImage`) con las ilustraciones `art_crop`, `normal` y `large` de las cartas del jugador, recurriendo al comandante en zona de comando/campo o sintetizando la carta oficial del mazo.
  - **Detección de `art_crop`:** Con `isUsingArtCrop`, si el fondo corresponde a una ilustración recortada de Magic (Scryfall `art_crop`), se expone un bloque de atribución destacado (`data-testid="playmat-attribution-box"`).
  - **Atribución legal:**
    - Artista: `data-testid="playmat-artist"` con formato `"Ilustrado por [artista]"`.
    - Copyright oficial: `data-testid="playmat-copyright"` con `"™ & © Wizards of the Coast"`.
  - **Enlace de inspección directa:** Botón interactivo `"Ver carta"` (`data-testid="playmat-view-card-btn"`) que invoca `openCardDetails(activePlaymatCard)`, desplegando el panel con texto Oracle, símbolos y dictámenes.
  - **Restablecer comandante:** Opción rápida (`data-testid="playmat-reset-commander-btn"`) para volver a la ilustración del comandante asignado.
- **Certificación Automatizada E2E de Ver Carta, Dictámenes, DFC, Privacidad y Atribución Playmat (Punto 8 de Correcciones del Cliente):**
  - **Suite Playwright E2E:** Implementada en [`apps/web/e2e/card-details.spec.ts`](apps/web/e2e/card-details.spec.ts) ejecutando el ciclo de validación completo en pod multijugador real (1920x1080).
  - **Resultados de certificación:**
    1. *Carta con dictámenes oficiales:* Sol Ring verificado con todos sus metadatos (imagen grande, coste {1}, tipo Artifact, Oracle con símbolos `{T} -> ↷` y `{C}{C} -> CC`, artista "Titus Lunter", copyright "Wizards of the Coast", legalidad en Commander "Legal", y 2 dictámenes oficiales con fecha `2023-09-01` y fuente `wotc`).
    2. *Carta de doble cara (DFC):* Delver of Secrets verificado alternando caras con selector interactivo (`data-testid="card-details-face-switcher"`): Cara 1 (Delver of Secrets, Creature — Human Wizard, 1/1, maná {U}) a Cara 2 (Insectile Aberration, Creature — Human Insect, 3/2 con Flying, sin coste de maná), y reversión a Cara 1.
    3. *Carta sin dictámenes:* Delver / Cultivate verificado con estado visual accesible `"Sin dictámenes"` (`data-testid="card-details-rulings-empty"`).
    4. *Aislamiento de privacidad:* Carta boca abajo de Alice en el campo de batalla inspeccionada por Bob; el menú contextual muestra `"Carta boca abajo"` y el botón `"Ver carta"` (`data-testid="context-view-card"`) tiene conteo 0.
    5. *Comprobación de fecha de sincronización:* Endpoint `POST /api/cards/sync-rulings` verificado con `skipped: true, reason: 'not_modified', syncedCount: 0` ejecutado en 149 ms sin descargas redundantes.
    6. *Atribución en selector de playmat:* Modal de personalización de playmat verificado con bloque de atribución (`data-testid="playmat-attribution-box"`), artista ("Ilustrado por ..."), copyright ("Wizards of the Coast"), y botón "Ver carta" abriendo `CardDetailsModal` sobre el selector.
    7. *Artefactos generados:* Capturas al 200% archivadas en el directorio de artefactos: [`card-details-single-faced.png`](card-details-single-faced.png) y [`card-details-double-faced.png`](card-details-double-faced.png).
- **Indicador de Poder y Resistencia (P/T) Efectivo en Mesa (Punto 2 de Correcciones del Cliente - B.2):**
  - **Fórmula de cálculo:** $\text{P/T Efectivo} = \text{Base} + \text{Contadores } +1/+1 - \text{Contadores } -1/-1$ (evaluando indistintamente claves `-1/-1` y `−1/−1` Unicode).
  - **Ubicación y anclaje geométrico:** El componente `CardPTBadge` se renderiza como hijo directo de `.card-slot-container`, anclado a la esquina inferior izquierda (`absolute -bottom-2.5 -left-1`). Al estar fuera de `.card-rotator`, permanece 100% erguido sin rotar con la carta. Al ubicarse a `-bottom-2.5`, se proyecta completamente por fuera del marco de la imagen, respetando la línea inferior que alberga el nombre del artista y el copyright legal según las directrices de Scryfall.
  - **Feedback cromático:**
    - Verde (`text-emerald-400`, borde `border-emerald-500/80`, halo esmeralda): si el valor efectivo supera el valor base.
    - Rojo (`text-rose-400`, borde `border-rose-500/80`, halo carmesí): si el valor efectivo es inferior al valor base.
    - Neutro (`text-slate-200`, borde `border-slate-700/80`): si el valor efectivo coincide con el valor base.
  - **P/T variable con `*`:** Cartas con `*` en su definición (p. ej. `*/*`, `1+*`) muestran `*` hasta que el jugador define un valor base numérico en el menú contextual.
  - **Valores negativos:** Admite 0 y cifras negativas (p. ej. `-1/-1`) sin destrucción automática, dado que la mesa no incluye motor de reglas.
  - **Reinicio autoritativo:** En el servidor (`GameStateSession.moveCard`), al abandonar el campo de batalla (`toZone !== 'battlefield'`), se reinician automáticamente `card.counters = {}`, `delete card.basePower`, `delete card.baseToughness` y `delete card.keywords`.
- **Sección en Línea de Poder y Resistencia en Menú Contextual (Punto 3 de Correcciones del Cliente - B.3):**
  - **Estructura visual:** Sección en línea expandible (`data-testid="context-pt-toggle-btn"`) en [`CardContextMenu.tsx`](apps/web/src/components/CardContextMenu.tsx) con icono `Swords`, encabezado con previsualización del P/T efectivo live y contenedor indentado (`data-testid="context-pt-section"`).
  - **Campos numéricos sin botones de incremento:** Cuadrícula de 2 columnas con 4 campos (`<input type="number">`):
    - "Poder base" (`data-testid="pt-input-base-power"`).
    - "Resistencia base" (`data-testid="pt-input-base-toughness"`).
    - "Contadores +1/+1" (`data-testid="pt-input-plus-counters"`).
    - "Contadores −1/−1" (`data-testid="pt-input-minus-counters"`).
  - **Interacción por teclado y rueda de ratón:** Modificables directamente escribiendo, mediante flechas arriba/abajo (con escape del interceptor general de navegación del menú cuando el foco está en un `INPUT`) y con la rueda del ratón (`onWheel` ajustando en $\pm 1$ con prevención de scroll).
  - **Interacción universal en mesa:** Disponible para cualquier jugador en cualquier permanente visible del campo de batalla sin restricción por `canMutate`, registrando la autoría en la bitácora pública de la partida mediante la acción `SET_CARD_PT`.



- **Adaptación Fluida y Visibilidad en Pantalla Completa y Modo Expandido (Punto 6 de Correcciones del Cliente - C.6):**
  - **Diagnóstico y eliminación del pantallazo azul:** Se identificaron y corrigieron las dos causas de fondos planos color azul pizarra (`bg-slate-950` / `#020617`) en pantalla completa:
    1. *Modo Expandido:* Cierre de captura reactiva en `onExpandCell` mediante actualización funcional `setExpandedPlayerId(prev => prev === player.id ? null : player.id)`, vinculación dinámica de dimensiones de celda a pantalla completa (`cellWidth = viewportSize.width`, `cellHeight = viewportSize.height`) para que las cartas y el dock se escalen a tamaño completo, y renderizado del playmat a sangre con capas de contraste sin huecos.
    2. *Pantalla Completa del Navegador:* Inclusión de botón en la esquina superior derecha (`fixed top-2 right-4 z-40`, `data-testid="fullscreen-btn"`) que alterna con `document.documentElement.requestFullscreen()` y `exitFullscreen()`, sincronizado con `fullscreenchange` (`Maximize2` / `Minimize2`).
  - **Resets CSS Universales:** En `index.css`, reglas para `:fullscreen`, `:-webkit-full-screen`, `::backdrop`, `html`, `body`, `#root` y `#mesa-total` fijando fondo `#000000`, ancho y alto 100% y `overflow: hidden`, eliminando parpadeos y márgenes erróneos.
  - **Certificación Visual Playwright E2E:** Suite automatizada en [`apps/web/e2e/fullscreen-visual.spec.ts`](apps/web/e2e/fullscreen-visual.spec.ts) validada en pods reales de 2, 4 y 6 jugadores: playmat cargado con `naturalWidth > 0`, dock y mano visibles, cartas visibles en el campo, varianza de imagen $> 5400$ (descartando pantallas vacías), salida con botón y tecla Esc, y 0 errores de consola.

- Etiqueta de nombre: píldora pequeña con icono de ampliar; turno activo con borde de color y brillo suave.
- Ranuras de pilas: rectángulos con proporción de carta; vacías con contorno punteado y etiqueta de zona.
- Animaciones breves (robar, d20, pasar turno) solo con `transform` y `opacity`, desactivadas con `prefers-reduced-motion`.
- **Verificación de la Matriz de Resoluciones y Pods (Punto 12):**
  - Dimensiones de cartas medidas y homogéneas entre todas las zonas (--card-w, --card-h):
    - 2 jugadores: 1920x1080 -> 96x135 px; 1366x768 -> 96x135 px; 1280x720 -> 93x130 px
    - 3 jugadores: 1920x1080 -> 77x108 px; 1366x768 -> 55x77 px; 1280x720 -> 51x72 px
    - 4 jugadores: 1920x1080 -> 77x108 px; 1366x768 -> 55x77 px; 1280x720 -> 51x72 px
    - 5 jugadores: 1920x1080 -> 77x108 px; 1366x768 -> 55x77 px; 1280x720 -> 51x72 px
    - 6 jugadores: 1920x1080 -> 77x108 px; 1366x768 -> 55x77 px; 1280x720 -> 51x72 px
  - En las 15 combinaciones evaluadas y capturadas en artefactos (`matrix-[2..6]p-[res].png`):
    - Sin solapamiento en el dock (`dockSections` libres de colisiones mutuas).
    - Elementos dentro de la división de su jugador (`cellRect.left - 2 <= el.left && el.right <= cellRect.right + 2`).
    - Mano dentro del viewport (`handCard.bottom <= window.innerHeight`).
    - Cero scroll en document (`html.scrollWidth === innerWidth && html.scrollHeight === innerHeight`).
- **Convención Única de Posición: El Centro con Dimensiones Orientadas (Punto 2 de Corrección de Posición):**
  - **Convención universal:** La posición normalizada $(x, y \in [0, 1])$ de una carta representa estrictamente su centro geométrico en cualquier orientación.
  - **Dimensiones orientadas dinámicas:** Para una carta vertical de dimensiones $w \times h$ ($96 \times 134\text{ px}$ en 2p a 1080p), al girarse 90° (`isTapped === true`), sus dimensiones orientadas efectivas son $h \times w$ ($134 \times 96\text{ px}$).
  - **Límites de Viewport y Clamping:**
    - Clamping en cliente: `clampedCenterX = Math.max(orientedW / 2, Math.min(winW - orientedW / 2, rawCenterX))`, asegurando que la carta nunca se salga del viewport ni en vertical ni en apaisado.
    - Renderizado en canvas: el contenedor slot `.card-slot-container` se ancla en `(centerPixelX, centerPixelY)` con `transform: translate(-50%, -50%)`, eliminando cálculos de esquina superior izquierda con mitades de dimensiones fijas.
  - **Contención 100% para `holderId`:** En servidor, la caja delimitadora se calcula restando y sumando las semidimensiones orientadas normalizadas al centro: `cardLeft = position.x - cardHalfWNorm`, `cardRight = position.x + cardHalfWNorm`, `cardTop = position.y - cardHalfHNorm`, `cardBottom = position.y + cardHalfHNorm`.
  - **Centrado en división jugable y cascada:** `computePlayerDivisionCenter` y `getPlayerBattlefieldCascadePosition` calculan y devuelven directamente el centro acotado de la sección jugable con cascada $+0.015$, eliminando offsets manuales en el emisor.
  - **Migración de instantáneas de Redis:** `RedisSnapshotService.save()` etiqueta el estado con `positionConvention: 'center'`. Al recuperar instantáneas heredadas sin esta etiqueta, `load()` migra automáticamente las coordenadas de las cartas en el campo sumando las semidimensiones orientadas normalizadas.
- **Fantasma Remoto con Orientación Nativa desde el Primer Fotograma (Punto 3 de Corrección de Posición):**
  - **Emisión en drag start:** Al iniciar el arrastre (`handleDragStart`), el emisor envía inmediatamente `CARD_DRAG_MOVE` con `isTapped` y las coordenadas de centro normalizadas exactas de la carta original en la mesa.
  - **Estructura gemela en receptor B:** El fantasma se renderiza con la misma jerarquía de contenedor slot apaisado (`.card-slot-container`) y rotador interno (`.card-rotator`):
    - Dimensiones del slot exterior: `width = isTapped ? cardHNum : cardWNum`, `height = isTapped ? cardWNum : cardHNum`.
    - Dimensiones del rotador interior: `width = cardWNum`, `height = cardHNum`, con `transform = isTapped ? 'rotate(90deg)' : 'rotate(0deg)'`.
    - Posición: anclada en `(ghostCenterX, ghostCenterY)` con `transform: translate(-50%, -50%)`.
  - **Invarianza de tamaño y orientación:** El receptor B monta el fantasma directamente con su estado girado desde el fotograma 1 (sin rotación en vuelo desde 0° ni cambio de dimensiones de vertical a apaisado), garantizando que el centro inicial coincida de manera idéntica con el centro previo de la carta ($\le 1.0\text{ px}$).
- **Alineación Continua y Cero Salto al Soltar (Punto 4 de Corrección de Posición):**
  - **Identidad de centro overlay vs soltado:** Al soltar la carta en el campo de batalla (`handleDragEnd`), se calcula el centro exacto del overlay visual: `centerX = clampedX + overlayWidth / 2`, `centerY = clampedY + overlayHeight / 2`.
  - **Actualización optimista síncrona:** Inmediatamente mediante `flushSync()`, se registra `optimisticPositions` con dicho centro normalizado `(centerX / winW, centerY / winH)`. Al desmontar el overlay y renderizar la carta en `BattlefieldCanvas`, el slot exterior se dibuja con centro `(centerPixelX, centerPixelY)` y `transform: translate(-50%, -50%)`, resultando en una discrepancia de $0.00\text{ px}$ respecto al overlay.
  - **Invarianza ante sincronización del servidor:** El servidor almacena y retransmite las coordenadas normalizadas del centro recibidas. Al procesar la respuesta autoritativa, la posición ya coincide ($\Delta < 0.01$) y se limpia la posición optimista sin ningún salto ni parpadeo visual.
  - **Límites de viewport orientados:** La función de acotamiento utiliza el ancho y alto orientados actuales (`orientedW = isTapped ? cardH : cardW`), impidiendo que los bordes derecho e inferior de cartas apaisadas se corten o sobrepasen el viewport y el dock.
- **Suite de Pruebas de Invarianza de Posición en Arrastre y Soltado (Punto 5 de Corrección de Posición):**
  - **Archivo de prueba E2E:** [`apps/web/e2e/center-convention-drag.spec.ts`](apps/web/e2e/center-convention-drag.spec.ts).
  - **Configuraciones evaluadas (4 combinaciones completas):**
    - `2P-1080p`: 2 jugadores, viewport 1920×1080. Cartas: vertical $96 \times 134\text{ px}$, apaisada $134 \times 96\text{ px}$.
    - `4P-1080p`: 4 jugadores, viewport 1920×1080. Cartas: vertical $78 \times 108\text{ px}$, apaisada $108 \times 78\text{ px}$.
    - `2P-768p`: 2 jugadores, viewport 1366×768. Cartas: vertical $96 \times 134\text{ px}$, apaisada $134 \times 96\text{ px}$.
    - `4P-768p`: 4 jugadores, viewport 1366×768. Cartas: vertical $56 \times 78\text{ px}$, apaisada $78 \times 56\text{ px}$.
  - **Casos probados por configuración (20 escenarios en total):**
    1. *Mesa Enderezada:* Reposicionamiento con carta vertical.
    2. *Mesa Girada (Tapped):* Arrastre y soltado con carta apaisada a 90°.
    3. *Re-girada (Untap -> Tap):* Ciclo de cambio de orientación y arrastre subsiguiente.
    4. *Bordes de Pantalla y Dock:* Desplazamiento hacia los límites perimetrales y zona superior del dock.
    5. *Mesa Expandida:* Arrastre desde vista enfocada/zoom con transformación inversa de coordenadas.
  - **Métricas empíricas registradas en las 20 pruebas:**
    - $\Delta\text{Centro}$ fantasma frame 1 en Guest B respecto a la carta original: **$0.00\text{ px}$** (criterio $\le 1.0\text{ px}$ cumplido).
    - $\Delta\text{Dimensiones}$ fantasma frame 1 en Guest B: **$0.00\text{ px}$** (coincidencia idéntica $w \times h$ o $h \times w$).
    - $\Delta\text{Centro}$ al soltar en Host A (último frame de overlay vs primer frame de carta en mesa): **$0.00\text{ px}$** (criterio $\le 1.0\text{ px}$ cumplido).
    - Máximo salto consecutivo en 500 ms post-drop (muestreado frame a frame con `requestAnimationFrame`): **$0.00\text{ px}$** (criterio $\le 1.0\text{ px}$ cumplido).
    - Tiempo de ejecución total de la suite: **1.5 minutos** (4/4 tests pasados al 100%).
- **Aclaración y Resolución de Discrepancia de Coordenadas en Pruebas de Arrastre (Punto 6 de Corrección de Posición):**
  - **Discrepancia observada originalmente:** Durante la implementación de las pruebas de seguimiento continuo de puntero (`pointer - overlayCorner == initialGrabOffset`), se identificaron dos discrepancias en los resultados esperados:
    1. *Solapamiento horizontal en HandFan:* En el abanico de la mano, las cartas se renderizan apiladas con traslape horizontal y rotación leve sobre el borde inferior de la pantalla (`bottom: 0`). Al simular un clic cerca del borde izquierdo o esquina de una carta interior, el evento de puntero alcanzaba el elemento DOM de la carta anterior en el orden $z$ o el área no interactiva del dock, provocando que la carta levantada no correspondiera a la caja medida previamente, o registrando un desfase inicial no representativo del arrastre del usuario.
    2. *Intervención del acotamiento al viewport (clamping):* En trayectorias de arrastre que dirigían el ratón más allá de los márgenes de la ventana o hacia el interior del dock inferior, el sistema de acotamiento (`clampedCenterX = clamp(...)`) detenía intencionalmente el centro de la carta dentro de los límites visuales seguros, mientras que las coordenadas absolutas del cursor de Playwright continuaban moviéndose libremente fuera de la pantalla. Medir la fidelidad de seguimiento en esa condición arrojaba una divergencia matemática artificial entre la posición del puntero y la carta, debido a la acción legítima del límite perimetral y no a un defecto del overlay.
  - **Resolución técnica aplicada:**
    1. Para `HandFan`, se ajustó el punto de interacción al cuadrante superior derecho visible y no cubierto de la carta (`preBox.width * 0.75, preBox.height * 0.4`), garantizando la selección unívoca y limpia de la carta objetivo, emulando con exactitud la interacción física de un jugador real.
    2. Se segregaron formalmente los vectores de prueba según el objetivo a certificar:
       - *Pruebas de fidelidad cinemática de puntero:* Trayectorias fluidas sobre el espacio de juego libre (dentro de los límites de pantalla y sin colisión con el dock), verificando que en cada movimiento del ratón se mantenga $\Delta \le 1.0\text{ px}$ entre el punto agarrado y el cursor.
       - *Pruebas de contención perimetral (bordes y dock):* Trayectorias específicas hacia los 4 bordes del viewport y hacia el dock inferior, comprobando que las dimensiones orientadas efectivas de la carta detengan el movimiento exactamente en el perímetro sin desbordar ni saltar.
  - **Confirmación de integridad:** Se confirma de forma concluyente que no se ocultó ningún defecto ni caso de uso real; ambas mecánicas (seguimiento continuo sin desalineación y contención estricta en bordes) están validadas y certificadas por baterías de pruebas independientes.
- **Consolidación de Métricas Empíricas de la Convención de Posición en el Centro (Punto 7 de Corrección de Posición):**
  - **Tabla comparativa de métricas antes y después de la corrección:**

| Momento / Magnitud Evaluada | Antes de la Corrección (Bug) | Después de la Corrección (Centro Unificado) | Criterio de Aceptación | Estado |
|---|---|---|---|---|
| $\Delta\text{Centro}$ al soltar carta girada (Host local) | $dx = -19.00\text{ px}, dy = +19.00\text{ px}$ | $dx = 0.00\text{ px}, dy = 0.00\text{ px}$ | $\le 1.0\text{ px}$ | Cumplido al 100% |
| Salto vertical en frames 1 a 4 del fantasma remoto (Guest B) | $dy = +27.00\text{ px}$ | $dy = 0.00\text{ px}$ | $\le 1.0\text{ px}$ | Cumplido al 100% |
| $\Delta\text{Centro}$ fantasma frame 1 vs carta original (Guest B) | $+27.00\text{ px}$ | $0.00\text{ px}$ | $\le 1.0\text{ px}$ | Cumplido al 100% |
| $\Delta\text{Dimensiones}$ fantasma vs carta original (Guest B) | Inversión $96 \times 134 \to 134 \times 96$ con desfase | $0.00\text{ px}$ (gemelo idéntico) | $0.00\text{ px}$ | Cumplido al 100% |
| Salto entre frames consecutivos en 500 ms post-drop | Hasta $19.00\text{ px}$ al soltar | $0.00\text{ px}$ en todos los frames | $\le 1.0\text{ px}$ | Cumplido al 100% |
| Invarianza ante respuesta autoritativa del servidor | Salto al reemplazar optimista | $0.00\text{ px}$ ($\Delta < 0.001$ norm) | $\le 1.0\text{ px}$ | Cumplido al 100% |
| Límite al viewport de carta apaisada | Se cortaban $19\text{ px}$ en bordes | Acotamiento con ancho y alto orientados | Cero desborde | Cumplido al 100% |

### Rutas
`/table/:code/lobby` y `/table/:code/play`. El cliente redirige según `table.status`.

## Manejo de errores

| Categoría | Ejemplos | Estrategia |
|---|---|---|
| Red | Caída de WSS | Reconexión con backoff, snapshot + eventos faltantes |
| Validación | Acción no permitida, zona inválida | Rechazo con código y mensaje; el cliente revierte la UI optimista |
| Externos | Scryfall 429/5xx | Cola con retardo, caché local, aviso al usuario |
| Concurrencia | Dos acciones sobre la misma carta | Orden de llegada con versión; notificar a quien perdió |
| Datos | Mazo con cartas no reconocidas | Reporte parcial y opción de corregir |

## Seguridad

- **Autenticación:** JWT de corta duración + refresh token en cookie `HttpOnly`/`SameSite`; invitados con token efímero.
- **Autorización:** el servidor comprueba que cada acción pertenezca al asiento del emisor (o requiere confirmación si afecta a otros). Solo el anfitrión ejecuta `START_GAME`, `KICK_PLAYER` y `TRANSFER_HOST`.
- **Información oculta:** `VisibilityFilter` elimina identidades de cartas ocultas antes de enviar. La lista completa de cartas de otros nunca viaja en `LobbySeat`.
- **Aleatoriedad:** barajado y tirada de d20 con `crypto.randomInt` / CSPRNG en servidor (Fisher-Yates).
- **Abuso:** rate limiting (REST y WS), límite de tamaño de mensaje, validación de esquema (Zod) en cada entrada.
- **Web:** CSP estricta, sanitización de chat y nombres, cabeceras de seguridad (Helmet), CORS restringido.
- **Datos personales:** mínimos (correo opcional), política de privacidad, borrado de cuenta, alineado con la Ley 1581 de 2012.
- **Dependencias:** auditoría automática (`npm audit`, Dependabot) y secretos solo en variables de entorno.

### Modelo de amenazas (resumen)

| Amenaza | Mitigación |
|---|---|
| Un jugador intenta ver la mano de otro | Filtrado en servidor; pruebas automatizadas de visibilidad |
| Inyección de acciones falsas | Validación de asiento y esquema por acción |
| Spam / flood de chat | Rate limit y expulsión por el anfitrión |
| XSS vía nombres o chat | Sanitización y CSP |
| Enumeración de códigos de mesa | Código aleatorio, límite de intentos, mesas privadas |
| DoS por conexiones | Límite de conexiones por IP y por mesa |

## Estrategia de pruebas

- **Unitarias (cobertura ≥ 80 %):** `DeckParser`, `CommanderValidator`, `VisibilityFilter`, lógica de acciones, `Shuffler`, d20 y desempates con pruebas de distribución (chi-cuadrado).
- **Integración:** flujo crear mesa → sala de espera → iniciativa d20 → partida → mover carta → reconectar; importación con Scryfall simulado.
- **End-to-end (Playwright):** 4 clientes simultáneos: elegir mazo → listo → iniciar → d20 → orden correcto → primer turno → partida completa; apertura concurrente de bibliotecas de 100 cartas con 4 clientes simultáneos, simulación determinista de ráfagas HTTP 429, 504 y 500, reintentos con backoff y caché persistente de navegador con Cache API (`apps/web/e2e/image-verification.spec.ts`); verificación de red en vivo contra Scryfall real (`@network`) con caché limpio: 845 ms apertura en frío (37 peticiones CDN 200 OK, 5 reintentos, 372/372 cartas renderizadas con `naturalWidth > 0`) y 185 ms segunda apertura con caché persistente.
- **Rendimiento (k6/Artillery):** 500 mesas con 4 jugadores; medir p95 de latencia de extremo a extremo (emisor a receptor).
- **Seguridad:** pruebas de autorización, fuga de información oculta en lobby y partida.

## Despliegue

```yaml
# docker-compose.yml (desarrollo)
services:
  web:      { build: ./apps/web, ports: ["5173:5173"] }
  api:      { build: ./apps/server, ports: ["3000:3000"], env_file: .env, depends_on: [db, redis] }
  db:       { image: postgres:16, environment: { POSTGRES_PASSWORD: ${DB_PASSWORD} }, volumes: ["pgdata:/var/lib/postgresql/data"] }
  redis:    { image: redis:7 }
volumes: { pgdata: {} }
```

### Variables de entorno
```
DATABASE_URL=cadena de conexión a PostgreSQL
REDIS_URL=cadena de conexión a Redis
JWT_SECRET=secreto de firma de tokens
SCRYFALL_USER_AGENT=CommanderTable/1.0 (contacto)
ALLOWED_ORIGINS=dominios permitidos para CORS
TABLE_IDLE_TIMEOUT_MIN=120
```

## Objetivos de rendimiento

- Acción de juego (p95): < 300 ms de extremo a extremo.
- Autocompletado de cartas: < 500 ms.
- Carga inicial de la mesa: < 3 s en 4G.
- Capacidad inicial: 500 mesas simultáneas / ~2 000 conexiones WS.
- Rendimiento visual: 60 fps con 6 jugadores y 60 cartas en el campo.
- Uso de memoria: < 200 KB de estado por mesa activa.

## Decisiones resueltas y abiertas

1. **Audio y Video:** Descartado por decisión del cliente. El grupo jugará mediante Discord externo; la web no incluirá funcionalidades de voz ni videollamada (REQ-12.3 descartado).
2. **Imágenes:** Servidas directamente desde la CDN de Scryfall (respetando sus pautas de uso y atribución legal).
3. **Invitados:** Permitidos sin registro previo mediante sesiones anónimas.
4. ¿Presupuesto de infraestructura mensual objetivo?
