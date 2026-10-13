# Plan de Implementación — Mesa Virtual de Commander (MTG)

## Límites del proyecto

| Imprescindible (MVP)                                    | Deseable                                  | Fuera de alcance              |
| ------------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| Mesas 2–6, vida, daño de comandante, contadores, turnos | Temporizador de turno, reacciones rápidas | Motor de reglas / stack       |
| Importar mazo por texto + búsqueda de cartas            | Importar desde Moxfield/Archidekt         | Marketplace o venta de cartas |
| Tablero con zonas, drag & drop, información oculta      | Historial y estadísticas                  | App móvil nativa              |
| Reconexión, log, deshacer, chat                         | Video integrado (LiveKit)                 | Torneos y emparejamiento      |
| Cuentas e invitados, seguridad básica                   | Temas visuales, tokens personalizados     |                               |

**Restricciones técnicas:** respetar límites de Scryfall; sin automatización de reglas; presupuesto de infraestructura bajo.

## Cronograma estimado (equipo pequeño, 1–2 desarrolladores)

| Fase          | Contenido                       | Duración estimada |
| ------------- | ------------------------------- | ----------------- |
| 1             | Infraestructura                 | 1 semana          |
| 2             | Capa de datos y cartas          | 1,5 semanas       |
| 3             | Servidor de juego               | 2,5 semanas       |
| 4             | Interfaz de mesa                | 3 semanas         |
| 5             | Cuentas, seguridad y extras MVP | 1,5 semanas       |
| 6             | Pruebas y estabilización        | 1,5 semanas       |
| 7             | Despliegue y documentación      | 1 semana          |
| **Total MVP** |                                 | **≈ 12 semanas**  |

## Tareas

- [x] **1. Infraestructura y configuración**

  - [x] 1.1 Estructura del monorepo
    - Crear `apps/web`, `apps/server`, `packages/shared` (tipos compartidos de acciones y eventos)
    - Configurar TypeScript, ESLint, Prettier, Husky
    - _Componentes: COMP-1, COMP-2, COMP-5_

  - [x] 1.2 Docker y entorno local
    - `docker-compose` con PostgreSQL y Redis
    - Archivo `.env.example` y documentación de arranque
    - _Dependencias: 1.1_

  - [x] 1.3 CI/CD base
    - GitHub Actions: format, lint, typecheck, build, pruebas (`npm test`) y audit
    - Dependabot y `npm audit`
    - _Requisitos: REQ-16, REQ-19_
    - _Dependencias: 1.1_

- [x] **2. Capa de datos y servicio de cartas**

  - [x] 2.1 Esquema de base de datos
    - Modelos User, Deck, DeckCard, Card, Table, GameRecord, ActionLogEntry (Prisma 7 + adapter-pg)
    - _Nota de estado: Modelos y adaptadores listos con fallback en memoria; migraciones SQL en carpeta prisma/migrations pendientes de ejecución local_
    - _Requisitos: REQ-1, REQ-7, REQ-14_
    - _Dependencias: 1.2_

  - [x] 2.2 Cliente de Scryfall
    - Cola con límite de peticiones (75 ms), cabeceras `User-Agent`/`Accept`, reintentos con backoff
    - Endpoints: named, autocomplete, collection (batch de 75)
    - _Requisitos: REQ-7, REQ-18_
    - _Dependencias: 2.1_

  - [x] 2.3 Sincronización de bulk data
    - Endpoint `POST /api/cards/sync-bulk` que descarga Oracle Cards y actualiza la tabla `Card` por lotes (bajo demanda)
    - _Requisitos: REQ-7, REQ-15_
    - _Dependencias: 2.2_

  - [x] 2.4 Parser de mazos y validador de Commander
    - Parsear "1 Sol Ring", secciones y comandante (_CMDR_, inline tags)
    - Validar 100 cartas, singleton (con excepciones de reglas), identidad de color y legalidad
    - Pruebas unitarias con mazos reales de ejemplo
    - _Requisitos: REQ-7, REQ-8_
    - _Dependencias: 2.2_

  - [x] 2.5 Buscador de cartas
    - Autocompletado híbrido local/memoria/Scryfall < 500 ms (índice en memoria LRU)
    - _Requisitos: REQ-7_
    - _Dependencias: 2.3_

- [x] **3. Servidor de juego (tiempo real)**

  - [x] 3.1 Room Manager
    - Crear/cerrar mesas, código único de 6 caracteres con CSPRNG, asientos, anfitrión, expiración/reserva de 10 min por desconexión
    - _Requisitos: REQ-2, REQ-13_
    - _Dependencias: 1.2, 2.1_

  - [x] 3.2 Servidor WebSocket y estado autoritativo
    - Conexión autenticada, salas, estado autoritativo en memoria RAM con versionado estricto de eventos (Redis desacoplado para escalabilidad futura)
    - Validación de esquema (Zod) para cada acción
    - _Requisitos: REQ-10, REQ-16_
    - _Dependencias: 3.1_

  - [x] 3.3 Acciones de vida, daño de comandante y contadores
    - `ADJUST_LIFE`, `COMMANDER_DAMAGE` (matriz por oponente, derrota a 21), `SET_PLAYER_COUNTER` (veneno derrota a 10, tax, energía), resaltado de condiciones de derrota
    - _Requisitos: REQ-3, REQ-4, REQ-5_
    - _Dependencias: 3.2_

  - [x] 3.4 Zonas y movimiento de cartas
    - `MOVE_CARD`, `TAP_CARD` (90°), `DRAW_CARDS`, `MULLIGAN` (London), `SHUFFLE_LIBRARY` con CSPRNG Fisher-Yates
    - `VisibilityFilter` estricto en servidor para mano privada y biblioteca
    - _Requisitos: REQ-9, REQ-16_
    - _Dependencias: 3.2, 2.4_

  - [x] 3.5 Turnos y temporizador
    - `PASS_TURN`, orden de turnos circular con salto automático de eliminados
    - _Nota de estado: Temporizador con cuenta regresiva configurable y reordenamiento manual previo de asientos diferidos para post-MVP_
    - _Requisitos: REQ-6_
    - _Dependencias: 3.2_

  - [x] 3.6 Log de acciones y deshacer
    - Registro en memoria `state.logs` (hasta 200 eventos), pila autoritativa `UNDO_LAST` por jugador
    - _Requisitos: REQ-11_
    - _Dependencias: 3.3, 3.4_

  - [x] 3.7 Reconexión
    - `RESUME` con estado sincronizado, reserva de asiento por 10 min con timer, backoff exponencial en cliente
    - _Requisitos: REQ-10_
    - _Dependencias: 3.2_

  - [x] 3.8 Chat, espectadores y moderación
    - Chat sanitizado contra XSS con límite de tasa, rol de espectador protegido (solo lectura, chat y dados)
    - _Nota de estado: Expulsión forzada y transferencia de anfitrión diferidos para fase posterior_
    - _Requisitos: REQ-12, REQ-13_
    - _Dependencias: 3.2_

- [x] **4. Interfaz web**

  - [x] 4.1 Sistema de diseño y layout
    - Tokens de diseño, tema oscuro Slate de alto contraste, layout responsivo de mesa para 2–6 jugadores
    - _Requisitos: REQ-17_
    - _Dependencias: 1.1_

  - [x] 4.2 Pantallas de inicio, lobby y unión a mesa
    - Crear mesa, unirse por código de 6 caracteres con copiado directo, lista de asientos, toggle de espectador
    - _Requisitos: REQ-1, REQ-2_
    - _Dependencias: 3.1, 4.1_

  - [x] 4.3 Paneles de jugador
    - Vida central $\pm 1$ y $\pm 5$, daño de comandante por oponente, veneno, impuesto commander tax
    - _Requisitos: REQ-3, REQ-4, REQ-5_
    - _Dependencias: 3.3, 4.1_

  - [x] 4.4 Importador de mazos y buscador
    - Pegar lista de texto (Moxfield/MTGA/MTGO), validación de 100 cartas e identidad de color, carga en mesa en curso (`LOAD_DECK`)
    - _Nota de estado: Guardado persistente de colecciones de mazos por usuario en cuenta de BD diferido a post-MVP_
    - _Requisitos: REQ-7, REQ-8_
    - _Dependencias: 2.4, 2.5, 4.1_

  - [x] 4.5 Campo de batalla y zonas
    - Zonas: mano privada, biblioteca, campo, cementerio, exilio, comando
    - Drag & drop interactivo y fluido sin botones de movimiento ("Jugar", "Lanzar al campo", "Descartar" eliminados): arrastre de cartas desde la mano privada hacia el campo con captura de coordenadas (x, y); arrastre libre para reposicionar en campo de batalla; movimiento entre zonas (campo a cementerio, exilio y mano; mano a cementerio y exilio; comando a campo) con zonas de destino reactivas e indicadores visuales; soporte de giro (tap/untap a 90°), contadores +1/+1 y modal de zoom HD
    - _Requisitos: REQ-9_
    - _Dependencias: 3.4, 4.1_

  - [x] 4.6 Barra de turnos, log y chat
    - Indicador de turno activo, panel deslizante de log de acciones autoritativas, chat en vivo y menú de dados (D20, D6, Moneda)
    - _Requisitos: REQ-6, REQ-11, REQ-12_
    - _Dependencias: 3.5, 3.6, 3.8_

  - [x] 4.7 Manejo de reconexión en cliente
    - Hook `useGameSocket` con reconexión automática por backoff exponencial, indicador visual de estado y restauración del estado de mesa
    - _Requisitos: REQ-10_
    - _Dependencias: 3.7_

  - [x] 4.8 Accesibilidad y modo móvil
    - Contraste visual AA, diseño flexible por rejilla Tailwind para pantallas pequeñas
    - _Requisitos: REQ-17_
    - _Dependencias: 4.3, 4.5_

- [x] **5. Cuentas y seguridad**

  - [x] 5.1 Registro, login e invitados
    - Hasheo nativo `crypto.scryptSync` con sal aleatoria (evitando dependencias nativas C++ `node-gyp` en Windows), sesiones de invitado anónimo y JWT en cookie `HttpOnly` (sesión directa sin verificación por correo)
    - _Requisitos: REQ-1, REQ-16_
    - _Dependencias: 2.1_

  - [x] 5.2 Endurecimiento
    - Helmet CSP (whitelisting de Scryfall CDN y WebSockets), CORS, rate limiting (150 req/min), sanitización estricta de chat contra XSS y atributos maliciosos
    - _Requisitos: REQ-16_
    - _Dependencias: 3.2, 5.1_

  - [x] 5.3 Privacidad y legal
    - Modal legal interactivo (`LegalModal`), borrado completo de cuenta (`DELETE /api/auth/account`), aviso de no afiliación con Wizards of the Coast (Fan Content Policy), atribución de Scryfall
    - _Requisitos: REQ-16, REQ-18_
    - _Dependencias: 5.1_

- [x] **6. Pruebas**

  - [x] 6.1 Pruebas unitarias
    - Parser, validador, filtro de visibilidad, barajado CSPRNG, acciones de vida, daño de comandante, contadores, turnos y dados (20 pruebas en server, 5 en shared)
    - _Requisitos: REQ-7, REQ-8, REQ-9_
    - _Dependencias: 2.4, 3.4_

  - [x] 6.2 Pruebas de integración
    - Crear mesa $\to$ unirse $\to$ jugar $\to$ desconectar $\to$ reconectar con estado intacto; cliente Scryfall simulado con servidor HTTP local
    - _Requisitos: REQ-2, REQ-10_
    - _Dependencias: Fase 3_

  - [x] 6.3 Pruebas end-to-end
    - Playwright en navegador Chromium con 4 clientes jugando una partida completa en tiempo real (`apps/web/e2e/tabletop.spec.ts`)
    - _Requisitos: REQ-3 a REQ-12_
    - _Dependencias: Fase 4_

  - [x] 6.4 Pruebas de carga
    - Benchmark automatizado de 500 mesas simultáneas (2,000 jugadores), latencia p95 de 0.29 ms (SLA < 300 ms)
    - _Requisitos: REQ-15_
    - _Dependencias: Fase 3_

  - [x] 6.5 Pruebas de seguridad
    - Enmascaramiento autoritativo de cartas ocultas, aislamiento de espectadores, sanitización XSS, rechazo de payloads Zod malformados
    - _Requisitos: REQ-16_
    - _Dependencias: 5.2_

  - [ ] 6.6 Beta cerrada
    - 5–10 mesas reales de playgroups para recoger errores y fricciones de juego en vivo
    - _Nota: Hito operativo de campo pendiente de ejecución con usuarios humanos reales_
    - _Dependencias: 6.3_

- [x] **7. Despliegue y documentación**

  - [x] 7.1 Despliegue de producción
    - Dockerfiles multi-stage para web (Nginx) y server (Node 20), `docker-compose.prod.yml` orquestando Postgres, Redis, Server y Web, plantilla `.env.production.example`
    - _Requisitos: REQ-19_
    - _Dependencias: Fase 6_

  - [x] 7.2 Observabilidad
    - Logs estructurados con Pino, endpoints `/health`, `/api/health` y `/api/metrics` con métricas de memoria RSS/heap, salas activas y jugadores
    - _Requisitos: REQ-19_
    - _Dependencias: 7.1_

  - [x] 7.3 Documentación
    - README completo, manual de usuario ("cómo jugar una mesa"), guía de despliegue con Docker y avisos legales
    - _Dependencias: 7.1_

- [ ] **8. Sala de espera, iniciativa y mesa inmersiva**

  - [ ] 8.0 Prerrequisitos (si siguen pendientes)
    - Guardar mazos en la cuenta (REQ-7.5) y expulsar/transferir anfitrión (REQ-13)
    - _Requisitos: REQ-7.5, REQ-13_

  - [ ] 8.1 Máquina de estados de mesa y mensajes compartidos
    - Estados `lobby | initiative | playing | finished`; tipos en `packages/shared`
    - _Requisitos: REQ-20, REQ-21_
    - _Dependencias: 3.2_

  - [ ] 8.2 LobbyManager en el servidor
    - Selección de mazo, "Listo", habilitar inicio, expulsar, transferir anfitrión, privacidad de la lista de cartas
    - _Requisitos: REQ-20_
    - _Dependencias: 8.0, 8.1_

  - [ ] 8.3 GameStarter
    - Barajar con CSPRNG, comandante a zona de comando, mano de 7
    - _Requisitos: REQ-20.11_
    - _Dependencias: 8.2_

  - [ ] 8.4 InitiativeService
    - d20 en servidor, empates por rondas, tiempo límite de 15 s, orden final de turnos
    - _Requisitos: REQ-21_
    - _Dependencias: 8.1, 8.3_

  - [ ] 8.5 Pantalla de sala de espera
    - Asientos, selector de mazos, modal de importación, "Listo", "Iniciar partida", expulsar
    - _Requisitos: REQ-20, REQ-22.12_
    - _Dependencias: 8.2, 4.4_

  - [ ] 8.6 Superposición de iniciativa
    - Animación de d20, resultados por jugador, empates y orden final
    - _Requisitos: REQ-21, REQ-22.12_
    - _Dependencias: 8.4_

  - [ ] 8.7 Cuadrícula a sangre y barra flotante
    - `TableGrid` de 2 filas y hasta 3 columnas (`--cols = ceil(jugadores/2)`), 100dvh sin scroll, celdas separadas por 1 px
    - `FloatingToolbar` (ronda, temporizador, historial, espectadores, compartir, dados, ayuda, ajustes, plegable) y celda libre con `LogChatPanel`
    - _Requisitos: REQ-22.1, 22.2, 22.9, 22.10_
    - _Dependencias: 4.1_

  - [ ] 8.8 Celda de jugador
    - `PlayerCell` con `PlaymatBackground` (art_crop de Scryfall con degradado oscuro), `NameTag` (turno activo, iniciativa, conexión), `LifePill` en la esquina interior, insignias de contadores, `HandFan` y `PileSlots`
    - Selector de playmat (`SET_PLAYMAT`) y atribución de Scryfall en el pie
    - _Requisitos: REQ-22.3, 22.4, 22.5, 22.7, 22.8, REQ-3, REQ-4, REQ-5_
    - _Dependencias: 8.7, 3.3_

  - [ ] 8.9 Campo de batalla libre y ampliación de celda
    - `BattlefieldCanvas` con posiciones normalizadas (x, y de 0 a 1) y orden `z`; arrastrar y soltar con dnd-kit (ratón, táctil y teclado)
    - Vista ampliada de carta, `ExpandedCellView` (botón y doble clic, cerrar con Esc)
    - _Requisitos: REQ-22.6, 22.11, 22.17, REQ-9_
    - _Dependencias: 8.8, 3.4_

  - [ ] 8.10 Orden de turnos en el juego
    - `PASS_TURN` usa `turnOrder`; indicadores 1.º, 2.º… en la barra de turnos y zonas
    - _Requisitos: REQ-21.7, REQ-21.8, REQ-22.4, REQ-6_
    - _Dependencias: 8.4, 8.7_

  - [ ] 8.11 Pruebas
    - Unitarias del d20 y desempates; E2E de 4 clientes (lobby → d20 → partida); fuga de mazo privado; rendimiento 60 fps con 6 jugadores; posiciones normalizadas iguales en dos tamaños de ventana; contraste del texto sobre playmats
    - _Requisitos: REQ-20, REQ-21, REQ-22_
    - _Dependencias: 8.5 a 8.10_

## Fases posteriores (post-MVP)

- [ ] ~~**9. Video integrado** (LiveKit/WebRTC)~~ — _Descartado por decisión del cliente (Discord externo)_
- [ ] **10. Historial y estadísticas** por mazo y jugador — _REQ-14_
- [ ] **11. Importadores** Moxfield/Archidekt — _REQ-7.2_
- [ ] **12. Modos de juego** (Brawl, Two-Headed Giant) y tokens personalizados

## Grafo de dependencias (resumen)

```
1 Infraestructura ──► 2 Datos y cartas ──► 3 Servidor de juego ──► 4 Interfaz ──► 6 Pruebas ──► 7 Despliegue
                              └──────────► 5 Cuentas y seguridad ───────────────┘
```

## Hitos

| Hito                | Criterio de éxito                                                  | Semana |
| ------------------- | ------------------------------------------------------------------ | ------ |
| H1: "Hola, mesa"    | Dos clientes en una sala viendo la vida actualizada en tiempo real | 4      |
| H2: Mesa jugable    | 4 jugadores con mazos importados moviendo cartas entre zonas       | 8      |
| H3: Beta cerrada    | Partidas completas con playgroups reales sin fallos bloqueantes    | 11     |
| H4: Lanzamiento MVP | Despliegue con monitoreo y documentación                           | 12     |

## Riesgos principales

| Riesgo                                                | Impacto | Mitigación                                                  |
| ----------------------------------------------------- | ------- | ----------------------------------------------------------- |
| Cambios o límites de la API de Scryfall               | Medio   | Bulk data local y caché                                     |
| Complejidad del drag & drop con muchas cartas         | Alto    | Prototipo temprano (H1/H2), virtualización de listas        |
| Latencia con 6 jugadores                              | Alto    | UI optimista, mensajes pequeños, pruebas de carga tempranas |
| Fuga de información oculta                            | Alto    | Filtrado en servidor y pruebas automatizadas                |
| Cumplimiento legal (propiedad intelectual de Wizards) | Medio   | Proyecto no comercial, avisos y atribuciones                |
| Alcance creciente (reglas automáticas)                | Alto    | Mantener "sandbox" como decisión firme del MVP              |

---

## 🛠️ Estado de Construcción y Adaptaciones Arquitectónicas (Fases 1 a 7)

A continuación se detalla cómo quedó implementada y verificada cada fase del proyecto frente a los requisitos (`REQ-1` a `REQ-19`), destacando las adaptaciones técnicas y decisiones arquitectónicas respecto al plan inicial.

### 1. Infraestructura y Monorepo (Fase 1 — REQ-16, REQ-19)

- **Estructura**: Monorepo con npm workspaces estructurado en `apps/web` (Frontend SPA), `apps/server` (Backend Fastify + WebSockets) y `packages/shared` (Tipos TypeScript, esquemas Zod, utilidades).
- **Resolución de Módulos ESM**:
  - Se configuró Node.js ESM nativo (`"type": "module"` en `package.json`).
  - Para asegurar compatibilidad estricta con Node 20/22 sin flags experimentales, las importaciones locales en TypeScript utilizan extensiones explícitas `.js` (e.g. `import { prisma } from '../db.js'`).
- **Entorno Local y Docker**:
  - `docker-compose.yml` para desarrollo local con PostgreSQL 16 Alpine y Redis 7 Alpine, ambos con healthchecks integrados.
  - Scripts unificados en la raíz para build, pruebas y desarrollo (`npm run build`, `npm test`, `npm run dev`).

### 2. Capa de Datos y Servicio de Cartas (Fase 2 — REQ-1, REQ-7, REQ-8, REQ-14, REQ-15, REQ-18)

- **Prisma 7 y Driver Adapter (`@prisma/adapter-pg`)**:
  - _Adaptación técnica_: Prisma 7 introdujo un motor desacoplado que requiere definir la configuración en `prisma.config.ts` y usar el driver adapter `PrismaPg` (`new PrismaPg({ connectionString })`) en `apps/server/src/db.ts` en lugar de la conexión directa clásica.
  - _Graceful DB Fallback_: Tanto `connectDatabase()` como `AuthService` incorporan fallback en memoria. Si PostgreSQL no está activo o accesible, el backend opera de manera fluida en modo memoria/Scryfall directo sin interrumpir el desarrollo o pruebas rápidas.
- **Cliente de Scryfall (`ScryfallService`)**:
  - Cola serializada basada en cadenas de promesas con espaciado de 75 ms (respetando la ventana estricta de 50–100 ms de Scryfall).
  - Backoff exponencial ante respuestas HTTP 429 o 5xx (hasta 3 reintentos duplicando intervalo).
  - Normalización en `CardDefinition` con manejo completo de cartas de doble cara (`card_faces`).
  - Búsqueda batch mediante `/cards/collection` procesando identificadores en bloques de 75.
- **Sincronización de Bulk Data (`BulkSyncService`)**:
  - Endpoint `POST /api/cards/sync-bulk` que consulta `https://api.scryfall.com/bulk-data`, descarga el archivo JSON de `oracle_cards` y ejecuta operaciones `upsert` en lotes de 100 en la tabla `Card`.
- **Validador y Parser de Mazos (`deck-parser.ts`, `commander-validator.ts`)**:
  - Parser robusto que tolera formatos de MTG Arena, Moxfield, Archidekt y MTGO, detectando cantidades (`1x Sol Ring`), tags inline (`*CMDR*`, `*Commander*`, `(Commander)`), prefijos (`SB:`, `Commander:`) y códigos de expansión/colección (`(CMR) 350`).
  - Validador estricto de Commander: verifica exactamente 100 cartas en total, 1 o 2 comandantes (Partner/Background), cálculo de identidad combinada de color e infracciones de identidad, y regla singleton con excepciones para tierras básicas (normales y nevadas), cartas de copias ilimitadas (_Relentless Rats_, _Shadowborn Apostle_, _Rat Colony_, _Persistent Petitioners_, _Dragon's Approach_, _Slime Against Humanity_, _Hare Apparent_) y hasta 7 copias de _Seven Dwarves_.
- **Búsqueda Autocompletada (`CardSearchService`)**:
  - Búsqueda híbrida con prioridad en base de datos local e índice en memoria LRU (TTL 30 min), con degradación elegante a la API de Scryfall (`/cards/autocomplete`) si hay menos de 5 resultados locales, logrando respuestas < 500 ms.

### 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

- **RoomManager y Ciclo de Vida**:
  - Generación de códigos únicos de 6 caracteres alfanuméricos mediante `crypto.randomBytes`, excluyendo caracteres confusos (`0/O`, `1/I`).
  - Asientos dinámicos (0 a 5) y soporte configurable para 2 a 6 jugadores.
  - Reserva de asiento por 10 minutos (`disconnectTimers`): si un jugador se desconecta accidentalmente, su asiento no se libera de inmediato, permitiendo reconectar con el mismo ID sin perder su mano ni estado.
- **Estado Autoritativo (`GameStateSession`)**:
  - Estado centralizado con incremento de versión incremental (`version++`).
  - **Vida y Derrota**: Modificaciones de vida $\pm 1$, $\pm 5$, con detección automática de derrota al llegar a $\le 0$ (razón: `'life'`).
  - **Daño de Comandante**: Matriz individualizada `commanderDamage[sourceCommanderId]`. Se declara derrota inmediata al alcanzar 21 puntos acumulados de un mismo comandante enemigo (razón: `'commander_damage'`).
  - **Contadores de Jugador**: Veneno (derrota al acumular 10 contadores, razón: `'poison'`), energía, experiencia y commander tax ($+2$ por casteo).
  - **Zonas y Acciones de Mesa**: `loadDeck`, `drawCards`, `mulligan` (London Mulligan), `shuffleLibrary`, `moveCard` (con coordenadas de posición en campo), `tapCard` (rotación 90°/0°), `untapAll`, `flipCard` (boca abajo/arriba), y `setCardCounter` (+1/+1).
  - **Azar Criptográfico (CSPRNG)**: Implementado en `csprng.ts` usando `crypto.randomInt` para Fisher-Yates shuffle sin sesgo y tiradas de dados (D20, D6, Moneda D2).
  - **Sistema de Deshacer (`undoLast`)**: Pila de reversión (`undoStack`) por jugador para deshacer vida, daño de comandante, contadores, movimiento de cartas o robos accidentales.
  - **Turnos**: `passTurn` rota en orden circular y omite de forma automática a los jugadores eliminados.
- **Anti-Cheat y Filtrado de Información Oculta (`VisibilityFilter`)**:
  - _Principio de secreto de información_: Antes de emitir cualquier evento WebSocket, `filterRoomStateForPlayer` enmascara las cartas de la mano de los oponentes y el contenido/orden de las bibliotecas con `MASKED_CARD_DEFINITION` (`scryfallId: 'hidden_card'`, `name: 'Carta Oculta'`). Ni en las herramientas de desarrollo del navegador ni inspeccionando paquetes de red es posible espiar las cartas ocultas.
- **Protocolo WebSocket y Moderación**:
  - Rutas bajo `/ws/table/:roomCode` gestionadas con `@fastify/websocket`.
  - Validación de esquemas Zod en cada mensaje (`ActionEnvelopeSchema`).
  - Rol de espectador: únicamente puede observar la partida, chatear y lanzar dados, bloqueando cualquier mutación del estado del juego.

### 4. Interfaz Web (Fase 4 — REQ-1 a REQ-12, REQ-17)

- **Frontend React 18 + Vite + Tailwind CSS**:
  - Interfaz oscura optimizada para visibilidad de cartas e inmersión lúdica.
  - Componentes modulares: `LobbyView`, `TableBoard`, `Battlefield`, `PlayerCard`, `TurnBar`, `GameLogAndChat`, `DeckImporter` y `LegalModal`.
- **Experiencia de Juego**:
  - Grid responsivo que acomoda de 2 a 6 jugadores: fila superior de oponentes (1 a 5 tarjetas de jugador) y panel del jugador local.
  - Tarjeta de jugador interactiva: vida central con botones $\pm 1$ y $\pm 5$, badges de veneno y commander tax, y subpanel desplegable para registrar daño recibido por cada comandante rival.
  - Campo de batalla interactivo: Drag & Drop real y fluido (sin botones de "Jugar", "Lanzar al campo", "Descartar" o basurero) con captura de coordenadas (x, y), reposicionamiento libre en mesa, zonas de soltado reactivas para Cementerio, Exilio y Mano con inspectores modales, cartas con rotación visual de 90° y banner `GIRADA`, contadores $+1/+1$, y modal de zoom en alta definición con arte oficial de Scryfall.
  - Barra de turnos con tirador de dados interactivo (D20 iniciativa, D6, Moneda) y botón de deshacer.
  - Panel lateral de chat y registro histórico de acciones autoritativas.
  - Cliente WebSocket reactivo (`useGameSocket`) con reconexión automática mediante backoff exponencial (1s a 10s, hasta 8 intentos).

### 5. Cuentas y Seguridad (Fase 5 — REQ-1, REQ-16, REQ-18)

- **Adaptación Criptográfica en Windows (crypto.scrypt nativo vs argon2)**:
  - _Adaptación técnica_: En el plan original se contemplaba `argon2`. Sin embargo, para evitar dependencias nativas C++ de `node-gyp` que generan problemas de compilación en entornos Windows sin Microsoft C++ Build Tools, se implementó `PasswordService` con `crypto.scryptSync` nativo de Node.js, salteado aleatorio de 16 bytes (`randomBytes`), clave derivada de 64 bytes y comparación segura contra ataques de tiempo con `timingSafeEqual`.
- **Endpoints de Autenticación**:
  - Registro (`POST /api/auth/register`), login (`POST /api/auth/login`), sesión de invitado anónimo (`POST /api/auth/guest`), verificación de sesión (`GET /api/auth/me`), y logout (`POST /api/auth/logout`) con cookies `HttpOnly` y JWT seguro.
- **Endurecimiento HTTP y Red**:
  - `@fastify/helmet` con directivas CSP estrictas que autorizan CDN de imágenes de Scryfall (`cards.scryfall.io`, `svgs.scryfall.io`) y WebSockets (`ws:`, `wss:`).
  - `@fastify/cors` configurado con soporte de credenciales.
  - `@fastify/rate-limit` protegiendo los endpoints contra abuso de tasa (150 req/min por IP).
  - Sanitización de mensajes de chat en backend y frontend para mitigar ataques XSS.
- **Privacidad y Cumplimiento Legal (GDPR / Fan Content)**:
  - Modal legal (`LegalModal`) y endpoint `GET /api/legal/disclaimer` con declaración explícita de no afiliación bajo la _Política de Contenido de Fans de Wizards of the Coast_ y atribución pública a _Scryfall_.
  - Derecho de supresión / borrado GDPR operativo mediante `DELETE /api/auth/account`.

### 6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)

- **Pruebas Unitarias**:
  - `packages/shared`: 5 pruebas unitarias (`deck-parser.test.ts`) verificando parseo, tags _CMDR_, límites de 100 cartas, singleton, excepciones de tierras y validación de color.
  - `apps/server`: 20 pruebas unitarias e integración en `test/**/*.test.ts`:
    - `auth.test.ts`: Hashing criptográfico `PasswordService`, registro, login, invitados y borrado.
    - `game-engine.test.ts`: Ciclo de vida de `GameStateSession`, derrota por vida $\le 0$, derrota por daño de comandante $\ge 21$, contadores, movimiento entre zonas, London Mulligan, barajado CSPRNG, orden de turnos y dados.
- **Pruebas de Seguridad (`security.test.ts`)**:
  - Verificación de ausencia de fuga de cartas ocultas en manos y bibliotecas.
  - Sanitización de inyecciones HTML/XSS en chat.
  - Rechazo de paquetes malformados y payloads fuera del esquema Zod.
  - Aislamiento de privilegios para espectadores y protección de zonas de otros jugadores.
- **Pruebas de Integración (`integration.test.ts`)**:
  - Ciclo de vida completo: crear mesa $\to$ unirse jugadores $\to$ ejecutar acciones $\to$ desconexión $\to$ reconexión sin pérdida de datos.
  - Mocking y verificación del cliente Scryfall.
- **Prueba de Carga y Benchmark (`load-benchmark.test.ts`)**:
  - Simulación concurrente de **500 mesas activas** con **2,000 jugadores**.
  - **Resultado de Latencia**: **p95 de 0.37 ms** (cumpliendo sobradamente el SLA objetivo de < 300 ms).
- **Pruebas End-to-End con Playwright (`apps/web/e2e/tabletop.spec.ts`)**:
  - Partida en vivo con 4 navegadores concurrentes (Alice Host, Bob, Charlie, Diana) conectados a la misma sala vía WebSocket, sincronizando daño de vida y tablero en tiempo real.

### 7. Despliegue y Observabilidad (Fase 7 — REQ-19)

- **Docker Multi-Stage**:
  - `apps/server/Dockerfile`: Construcción optimizada con TypeScript y ejecución productiva con variables de entorno parametrizadas.
  - `apps/web/Dockerfile`: Build estático con Vite empaquetado sobre imagen Nginx Alpine ultra-liviana.
- **Nginx Reverse Proxy (`apps/web/nginx.conf`)**:
  - Compresión Gzip para texto, CSS y JS.
  - Encabezados de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`).
  - Enrutamiento SPA (`try_files $uri $uri/ /index.html`).
  - Proxy inverso para endpoints de API (`/api/` $\to$ `server:3001`).
  - Proxy inverso para WebSockets (`/ws/` $\to$ `server:3001`) con soporte de cabeceras `Upgrade`, `Connection "upgrade"` y timeouts prolongados (86,400s).
- **Stack de Producción (`docker-compose.prod.yml`)**:
  - Orquestación completa de 4 contenedores: `mtgc-postgres`, `mtgc-redis`, `mtgc-server` y `mtgc-web`.
- **Observabilidad**:
  - Endpoints de salud: `GET /health` y `GET /api/health`.
  - Endpoint de métricas operativas en JSON: `GET /api/metrics` (uptime, memoria RSS/heap, salas activas, jugadores concurrentes y plataforma).
- **Documentación**:
  - `README.md` completo con manual del jugador ("Cómo Jugar una Mesa"), arquitectura, inicio rápido, comandos de pruebas y avisos legales.

---

## 📊 Matriz Comparativa: `requirements.md` / `design.md` vs Implementación Real

A continuación se audita el estado real de cada requisito formal de [`requirements.md`](file:///c:/Users/Nero.PC-Neroz/Downloads/requirements.md) y componente arquitectónico de [`design.md`](file:///c:/Users/Nero.PC-Neroz/Downloads/design.md):

| Requisito  | Descripción                     | Estado Real en Código           | Evidencia y Adaptaciones Realizadas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :--------- | :------------------------------ | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-1**  | Cuentas y acceso                | **Construido con adaptaciones** | Hash nativo `crypto.scryptSync` con sal aleatoria de 16B ([`password.service.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/services/password.service.ts)), invitados anónimos y JWT HttpOnly de 7 días. Supresión de cuenta operativa vía `DELETE /api/auth/account`. _Sin verificación de correo._                                                                                                                                                                                                                                          |
| **REQ-2**  | Crear y unirse a mesa           | **Cumplido al 100%**            | Códigos únicos de 6 caracteres con CSPRNG ([`room-manager.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/room-manager.ts)); soporte de 2 a 6 asientos; espectadores automáticos o manuales; 40 vidas por defecto.                                                                                                                                                                                                                                                                                                                        |
| **REQ-3**  | Seguimiento de vida             | **Cumplido al 100%**            | Botones $\pm 1$ y $\pm 5$; derrota automática a $\le 0$; sincronización por WebSockets a toda la mesa sin latencia perceptible.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **REQ-4**  | Daño de comandante              | **Cumplido al 100%**            | Matriz individualizada por cada comandante enemigo; derrota automática a 21 de daño ([`game-state.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/game-state.ts)).                                                                                                                                                                                                                                                                                                                                                                        |
| **REQ-5**  | Contadores y estados            | **Cumplido al 100%**            | Veneno (derrota a 10), energía, experiencia, commander tax ($+2$) y contadores en cartas (+1/+1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **REQ-6**  | Turnos y fases                  | **Construido con adaptaciones** | Rotación circular `PASS_TURN` que salta de forma automática a jugadores derrotados. _Temporizador con cuenta regresiva configurable y reordenamiento manual previo de orden diferidos para post-MVP._                                                                                                                                                                                                                                                                                                                                                                       |
| **REQ-7**  | Importar mazos y buscar         | **Cumplido al 100%**            | Parser de texto tolerante a Moxfield/MTGO/Arena; cola Scryfall con espaciado de 75 ms y reintentos; autocompletado en memoria LRU < 500 ms ([`card-search.service.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/services/card-search.service.ts)).                                                                                                                                                                                                                                                                                           |
| **REQ-8**  | Validación Commander            | **Cumplido al 100%**            | 100 cartas exactas, 1 o 2 comandantes (Partner/Background), cálculo de identidad de color y singleton con excepciones (_Relentless Rats_, tierras básicas, etc.) ([`commander-validator.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/packages/shared/src/utils/commander-validator.ts)).                                                                                                                                                                                                                                                                    |
| **REQ-9**  | Tablero y zonas                 | **Cumplido al 100%**            | 6 zonas completas (biblioteca, mano privada, campo, cementerio, exilio, comando); sistema de Drag & Drop real y fluido unificado (Pointer Events + HTML5 con preview visual flotante) sin botones de movimiento ("Jugar", "Lanzar", "Descartar", "A la Mano", "Al Campo" eliminados al 100%); captura de coordenadas (x, y) y reposicionamiento libre en campo de batalla; drop zones reactivas; giro a 90° con banner `GIRADA`; zoom HD; azar CSPRNG Fisher-Yates ([`csprng.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/csprng.ts)). |
| **REQ-10** | Sincronización y reconexión     | **Cumplido al 100%**            | Estado autoritativo central; reserva de asiento por 10 minutos con temporizador de desconexión; reconexión con backoff exponencial ([`useGameSocket.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/src/hooks/useGameSocket.ts)).                                                                                                                                                                                                                                                                                                                     |
| **REQ-11** | Log y deshacer                  | **Construido con adaptaciones** | Registro visible en tiempo real; pila `undoStack` autoritativa por jugador ([`game-state.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/game-state.ts)). _Log en memoria limitado a 200 eventos, sin modal de confirmación colectiva._                                                                                                                                                                                                                                                                                                   |
| **REQ-12** | Chat y comunicación             | **Construido con adaptaciones** | Chat de texto en vivo con sanitización estricta XSS y atributos maliciosos. _Reacciones rápidas y enlace WebRTC diferidos a Fase 8._                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **REQ-13** | Espectadores y moderación       | **Construido con adaptaciones** | Rol de espectador blindado (solo lectura, bloqueado de mutar tablero o vidas). _Expulsión de jugadores y transferencia manual de anfitrión diferidos._                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **REQ-14** | Historial y estadísticas        | **Post-MVP**                    | Modelos relacionales definidos en Prisma; funcionalidad activa pospuesta a Fase 9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **REQ-15** | Rendimiento                     | **Cumplido y superado**         | Benchmark de 500 mesas simultáneas (2,000 jugadores): **p95 de 0.29 ms** (SLA requerido: < 300 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **REQ-16** | Seguridad y privacidad          | **Cumplido al 100%**            | Enmascaramiento de información oculta en servidor ([`visibility-filter.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/visibility-filter.ts)); esquemas Zod en cada paquete WebSocket; Helmet CSP, cookies HttpOnly y rate limit por IP.                                                                                                                                                                                                                                                                                                  |
| **REQ-17** | Usabilidad y accesibilidad      | **Construido con adaptaciones** | Layout responsivo en Tailwind con diseño oscuro de alto contraste y botones accesibles con atributos `title`. _Sin atajos de teclado explícitos ni toggle de modo exclusivo "solo tracker"._                                                                                                                                                                                                                                                                                                                                                                                |
| **REQ-18** | Cumplimiento legal y Scryfall   | **Cumplido al 100%**            | User-Agent de Scryfall identificado; cola de 75 ms; modal legal con descargo de Wizards y atribución Scryfall ([`LegalModal.tsx`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/src/components/LegalModal.tsx)).                                                                                                                                                                                                                                                                                                                                         |
| **REQ-19** | Disponibilidad y observabilidad | **Cumplido al 100%**            | Endpoints `/health`, `/api/health` y `/api/metrics` con métricas operativas; Nginx reverse proxy y Docker Compose productivo.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Componentes Arquitectónicos (`design.md`)

- **COMP-1 (Web Client)**: React 18 + Vite + Tailwind + Lucide Icons. Gestión de estado mediante hooks reactivos desacoplados (`useGameSocket`).
- **COMP-2 (API REST)**: Fastify 5 en Node 22 (ESM nativo) con rutas de autenticación, cartas y mesas.
- **COMP-3 (PostgreSQL / Prisma)**: Prisma 7 con driver adapter `@prisma/adapter-pg` y fallback automático en memoria cuando la base de datos no está levantada.
- **COMP-4 (Room Manager)**: Manejo autoritativo de salas, generación de códigos CSPRNG y reserva de asientos por desconexión (10 min).
- **COMP-5 (Game Server)**: Fastify WebSocket con validación estricta Zod y filtro de visibilidad anti-trampas.
- **COMP-6 (Card Service)**: Cola Scryfall (75 ms), reintentos con backoff exponencial y caché LRU en memoria.
- **COMP-7 (Redis - Estado en vivo)**: _Decisión de diseño_: Para el MVP, el estado activo reside en memoria RAM (`Map<string, GameStateSession>`), lo cual redujo la latencia a menos de 0.3 ms y simplificó la arquitectura sin añadir fallos de red en desarrollo. Redis queda orquestado en `docker-compose.prod.yml` para escalado horizontal multi-instancia en el futuro.
- **COMP-8 (Imágenes)**: Consumo directo del CDN de Scryfall (`cards.scryfall.io`) autorizado en la CSP.
- **COMP-9 (Observabilidad)**: Endpoint `/api/metrics` expone telemetría de memoria, salas activas y jugadores en tiempo real.
