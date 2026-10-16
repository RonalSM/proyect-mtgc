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

### Flujo 2: Acción de juego (mover carta en MesaTotal con coordenadas globales y sincronización sin parpadeo)
```
1. Jugador A inicia arrastre de carta (desde mano a mesa, o reposicionando en el campo de batalla de MesaTotal).
2. DragOverlay se renderiza mediante Portal a document.body conservando el giro apaisado para cartas giradas (isTapped: true como caja apaisada con desplazamiento de puntero constante y coincidencia ≤ 2px al soltar).
3. Durante el arrastre, Web Client A emite CARD_DRAG_MOVE efímero throttled a ~30 fps con coordenadas globales normalizadas (x, y ∈ [0, 1]).
4. Game Server retransmite REMOTE_CARD_DRAGGING a los demás clientes (receptor B). B oculta la carta real fija (opacity: 0) y muestra el fantasma remoto interpolado.
5. Al soltar la carta:
   a. Web Client A emite CARD_DRAG_MOVE con isDragging: false y la posición final calculada { position: { x, y } }.
   b. Web Client A envía el comando autoritativo MOVE_CARD { cardInstanceId, fromZone, toZone, position: { x, y } }.
   c. Receptor B recibe isDragging: false con la posición final; activa pendingSync: true manteniendo el fantasma en dicha posición y la carta fija oculta.
6. Game Server procesa MOVE_CARD de forma autoritativa, actualiza estado en memoria/Redis, registra en bitácora ("X movió [Carta]") y emite ROOM_STATE_SYNC.
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

### Flujo 6: Iniciativa (v2)
```
1. Cada jugador → Game Server: ROLL_D20 (o lanzamiento automático al vencer el plazo de 15 s)
2. Game Server: crypto.randomInt(1, 21) → D20_ROLLED a toda la mesa
3. Al lanzar todos: ordena de mayor a menor
4. Si hay empate: INITIATIVE_TIE → solo los empatados relanzan (máx. 5 rondas; luego por asiento)
5. Game Server → INITIATIVE_RESOLVED { order } → table.status = "playing"
6. Game Server → GAME_STARTED { firstSeat } y se inicia el turno del primero
```

## Máquina de estados de la mesa (v2)

```
lobby ──(todos listos + host inicia)──► initiative ──(orden resuelto)──► playing ──► finished
  ▲                                           │
  └────(jugador sale o quita "Listo")─────────┘  (solo antes de que se resuelva la iniciativa: vuelve a lobby)
```

`Table.status` pasa a `"lobby" | "initiative" | "playing" | "finished"`.

## Componentes nuevos o ampliados (v2)

| ID | Componente | Cambio |
|---|---|---|
| COMP-4 | Room Manager | Añade `LobbyManager`: asientos, mazo elegido, estado "Listo", reglas para habilitar "Iniciar" |
| COMP-5 | Game Server | Añade `InitiativeService` (d20, desempates, tiempo límite) y `GameStarter` (barajar, comandante a zona de comando, mano de 7) |
| COMP-6 | Card Service | Expone mazos guardados y de sesión; reutiliza el importador y el validador |
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

### COMP-5 Game Server
**Responsabilidad:** mantener y difundir el estado autoritativo de cada mesa.
**Clases clave:** `TableSession`, `ActionHandler`, `VisibilityFilter`, `ActionLog`, `Shuffler`, `InitiativeService`, `GameStarter`.
**Interfaz de mensajes:**
```ts
type ClientAction =
  | { type: "ADJUST_LIFE"; targetSeat: number; delta: number }
  | { type: "COMMANDER_DAMAGE"; targetSeat: number; sourceSeat: number; commanderId: string; delta: number }
  | { type: "SET_COUNTER"; scope: "player" | "card"; id: string; counter: string; value: number }
  | { type: "MOVE_CARD"; cardInstanceId: string; from: ZoneRef; to: ZoneRef; x?: number; y?: number }
  | { type: "TAP_CARD"; cardInstanceId: string; tapped: boolean }
  | { type: "DRAW"; count: number }
  | { type: "SHUFFLE_LIBRARY" }
  | { type: "MULLIGAN" }
  | { type: "END_TURN" }
  | { type: "UNDO_LAST" }
  | { type: "CHAT"; text: string }
  | LobbyAction
  | InitiativeAction
  | PlaymatAction;

type LobbyAction =
  | { type: "SELECT_DECK"; source: "saved" | "session"; deckId: string }
  | { type: "SET_READY"; ready: boolean }
  | { type: "START_GAME" }                       // solo anfitrión
  | { type: "KICK_PLAYER"; seat: number }        // solo anfitrión
  | { type: "TRANSFER_HOST"; seat: number };     // solo anfitrión

type InitiativeAction = { type: "ROLL_D20" };

type PlaymatAction = { type: "SET_PLAYMAT"; playmat: Playmat };

type ServerEvent =
  | { version: number; actor: number; payload: unknown; ts: string }
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
**Módulos:** `LobbyView`, `LobbySeatCard`, `DeckPicker`, `DeckImportModal`, `ReadyButton`, `InitiativeOverlay`, `TableGrid`, `PlayerCell`, `PlaymatBackground`, `NameTag`, `LifePill`, `BattlefieldCanvas`, `HandFan`, `PileSlots`, `FloatingToolbar`, `LogChatPanel`, `CardPreview`, `ExpandedCellView`.
**Estado:** Zustand con un *store* de mesa sincronizado por versión de evento.
**UX clave:** vista propia grande y oponentes en miniatura; atajos de teclado; modo "solo tracker" para móvil; contenedor de nombre y expandir celda centrado arriba en cada división con estado desconectado atenuado, y barra superior desplegable con orden de iniciativa y badges de estado (Punto 8); escala de carta acotada por el menor entre límite por alto y límite por ancho de celda con compresión dinámica progresiva del abanico de mano para prevenir solapamientos en celdas estrechas (Punto 9); dimensiones de carta 100% unificadas e idénticas en mano, mesa, comandante y drag overlay sin saltos de escala (Punto 10); gestión resiliente de imágenes con eventos `onError`, fallbacks atmosféricos de playmats en gradiente oscuro y marcos de cartas legibles sin iconos de imagen rota, con CSP extendido para Scryfall (Punto 11).

### COMP-6 Card Service
**Clases:** `ScryfallClient` (cola con rate limit), `DeckParser`, `CommanderValidator`, `CardCache`.
**Interfaces:**
```ts
parseDeck(text: string): ParsedLine[]
resolveCards(lines: ParsedLine[]): Promise<ResolvedDeck>
validateCommander(deck: ResolvedDeck): ValidationReport
```

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
                  isPrivate: boolean; status: "lobby" | "initiative" | "playing" | "finished"; createdAt: Date }

interface LobbyPlayerState { seat: number; userId: string; deckRef?: { source: "saved" | "session"; deckId: string }; ready: boolean }
interface InitiativeState { round: number; rolls: Record<number, number>; pending: number[]; deadlineTs: string; order?: number[] }
interface TableState { status: "lobby" | "initiative" | "playing" | "finished"; lobby: LobbyPlayerState[]; initiative?: InitiativeState; turnOrder?: number[] }

interface SeatState { seat: number; userId: string; life: number; poison: number; energy: number; experience: number;
                      commanderTax: Record<string, number>; commanderDamage: Record<string, number>;
                      zones: Record<"library"|"hand"|"battlefield"|"graveyard"|"exile"|"command", CardInstance[]> }

interface CardInstance {
  instanceId: string; cardId: string; tapped: boolean; faceDown: boolean;
  counters: Record<string, number>;
  x: number;   // 0..1 normalizado respecto a MesaTotal (pantalla completa 100vw)
  y: number;   // 0..1 normalizado respecto a MesaTotal (pantalla completa 100vh)
  z: number;   // orden de apilado global en la mesa
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
- **Libertad de Movimiento y Entrega Manual:** Cualquier participante puede mover cualquier carta ya presente en el campo de batalla. Entregar una carta a otro jugador es simplemente desplazarla y soltarla cerca de su división o playmat, de forma inmediata y física sin validaciones de juego ni aceptación. La bitácora autoritativa registra el movimiento ("X movió [Carta]").
- **Elementos Flotantes (Dock, Vida, Pilas, Barra):** Flotan por encima de la mesa con `pointer-events: none` en sus contenedores envolventes y `pointer-events: auto` únicamente en los controles interactivos (botones, cartas de la mano, contadores), permitiendo que clics y arrastres sobre espacio vacío atraviesen limpiamente hasta la mesa.
- **DragOverlay en Portal:** El elemento arrastrado se renderiza mediante `createPortal` en `document.body` garantizando que no sufra recortes ni alteraciones de z-index al cruzar cualquier área de la pantalla.

### Modelo de UX de Arrastre de Cartas (WYSIWYG y Streaming Efímero en Vivo)
1. **Dimensiones fijas en píxeles de mesa:** La superficie `#mesa-total` calcula `--card-h` y `--card-w` en píxeles absolutos basados en el pod y el viewport (`cellHeight * 0.20`), evitando desajustes de container queries al portalizar a `document.body`.
2. **Seguimiento inmediato sin distorsión:** El `DragOverlay` tiene tamaño fijo idéntico al de la mesa, sin `scale`, sin rotación, sin efecto hover-scale y con `transition: none` para conservar el desplazamiento exacto entre el puntero y la esquina de la carta.
3. **Precisión subpixel al soltar:** La posición final se calcula a partir del rectángulo real del overlay (`active.rect.current.translated`), restringido al viewport mediante modificador en vivo y sin colocación automática ni snapping, logrando coincidencia verificada $\le 2$ px (medición real en prueba: $0.00 - 0.26$ px).
4. **Detección de colisión estricta por puntero:** El detector (`pointerWithin`) asegura que una carta solo entra en una pila si el cursor está físicamente dentro de sus límites. No existen imanes ni atracciones magnéticas hacia las pilas.
5. **Streaming efímero a 30 fps para rivales:** El cliente transmite `CARD_DRAG_MOVE` throttled a ~30 fps con coordenadas normalizadas. El servidor procesa el mensaje bajo un rate limit independiente (~60 msg/s) sin alterar el estado de la sesión, bitácora ni versiones, y retransmite `REMOTE_CARD_DRAGGING` a los demás participantes. Los clientes receptores interpolan la posición con suavidad (`transition: left 75ms linear, top 75ms linear`). Al soltar, se emite `isDragging: false` y la acción autoritativa final `MOVE_CARD`.
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
   - **Inspector modal y menú contextual:** Hacer clic sobre cualquier pila abre un modal con el desglose de cartas. Al hacer clic derecho en cualquier carta dentro del modal (`ModalCardItem`), se despliega un menú flotante con: "Enviar a la mano", "Enviar al campo" y en cementerio "Enviar al exilio".
   - **Privacidad estricta de biblioteca:** Cualquier jugador puede consultar los modales de cementerio y exilio de todos los participantes. La biblioteca privada solo puede ser inspeccionada por su propio dueño (`isLocalPlayer`), y el servidor (`visibility-filter.ts`) enmascara las cartas de las bibliotecas rivales con `MASKED_CARD_DEFINITION`.

### Estilo visual
- Tema oscuro; texto claro con sombra suave; cartas con borde fino y sombra para despegarlas del playmat.
- **Regla de rotación única de permanente (Punto 3):** La rotación de permanentes (Tap/Untap) se aplica exclusivamente en el contenedor externo `BattlefieldCardItem` (`transition-transform duration-150 origin-center rotate-90`). `CardDisplay` y las etiquetas internas `<img>` carecen de rotaciones propias (`transform: none`), eliminando el problema de rotación doble acumulada a 180° (invertida). Voltear cartas boca abajo o alternar cartas de doble cara conmuta el recurso visual sin aplicar rotaciones 3D conflictivas con el tap.
- **Interacciones de cartas en mesa (Punto 4):**
  - Clic simple: Selección visual sin abrir menús (`border-amber-400 ring-2`).
  - Doble clic: Alterna giro (Tap/Untap) de forma directa sin activar la ampliación de celda ni desplegar controles.
  - Clic derecho / Pulsación táctil prolongada (500 ms): Despliega menú contextual flotante con botones de acción (Girar, Contador +1/+1, Clonar, Voltear). Cerrado con clic fuera o tecla `Escape`.
- Pastilla de vida: forma de píldora, fondo oscuro semitransparente, número grande (≥ 32 px).
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
- **End-to-end (Playwright):** 4 clientes simultáneos: elegir mazo → listo → iniciar → d20 → orden correcto → primer turno → partida completa.
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
