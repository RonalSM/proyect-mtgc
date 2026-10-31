# Graph Report - Proyect MTGC  (2026-10-30)

## Corpus Check
- 210 files · ~520,830 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .example 2, .css 2)

## Summary
- 1544 nodes · 3358 edges · 107 communities (74 shown, 33 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 344 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `60fa5d07`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cluster 0: filter
- web/package.json
- Cluster 2: starter
- RoomState
- Cluster 4: config
- imageLoaderQueue
- GameStateSession
- visibility-filter.ts
- diagnosticsService
- CardPreviewContext.tsx
- Tareas
- ErrorBoundary
- Cluster 12: compose
- .syncPlayerCounts
- Cluster 14: base
- db.ts
- room-manager.ts
- server/src/index.ts
- Plan de Implementación — Mesa Virtual de Commander (MTG)
- CardDefinition
- Cluster 20: package
- bulk-sync.service.ts
- Cluster 22: tsconfig
- Cluster 23: ci
- Cluster 24: secureroll
- Essential service definitions only
- WebSocketHandler
- imageLoaderQueue.ts
- dependencies
- roomManager
- Cluster 30: spec
- Cluster 31: spec
- Cluster 32: prod
- tokenService
- fullscreen-visual.spec.ts
- Cluster 35: scryfallqueue
- server/package.json
- deckService
- Cluster 38: tsconfig
- Cluster 39: context
- Cluster 40: origin
- Cluster 41: db
- Cluster 42: scripts
- menu-battlefield-send.test.ts
- Cluster 44: postgres
- Cluster 45: dependabot
- Requisitos funcionales
- pg
- Cluster 48: spec
- CardDisplay.tsx
- capture-visual-pods.js
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- Cluster 54: spec
- Cluster 55: spec
- Mesa Virtual de Commander (MTG) ⚔️
- cardImageResolver
- card.ts
- error-collector.ts
- run
- Dominio: Magic: The Gathering, formato Commander
- ref_fs
- command-zone.test.ts
- ownership.test.ts
- Changelog del Proyecto MTG Commander (EDH)
- @electric-sql/pglite-socket
- test-g1-latency-bank.ts
- fastify
- @fastify/cors
- @fastify/jwt
- visual-tabletop.spec.ts
- @fastify/rate-limit
- vite-env.d.ts
- ws
- Documento de Diseño — Mesa Virtual de Commander (MTG)
- ioredis
- LobbyManager
- player-colors.ts
- Servidor de juego en tiempo real
- bulkSyncService
- prisma@^7.10.0
- Seguridad de la aplicación
- Pantalla de partida: cuadrícula a sangre
- getGridSlotForSeat
- Avisos de Terceros y Licencias de Software (Third-Party Notices)
- Pruebas de la mesa multijugador
- card-details.spec.ts
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- deck.service.ts
- shared/src/index.ts
- Frontend Design
- Auditoría de conformidad con la especificación
- CardPTBadge
- @prisma/client
- auth.service.ts
- @types/node@^22.13.0
- @types/ws@^8.5.14
- zod@^3.24.2
- App.tsx
- client-corrections.spec.ts

## God Nodes (most connected - your core abstractions)
1. `GameStateSession` - 82 edges
2. `CardDefinition` - 74 edges
3. `RoomState` - 62 edges
4. `Requisitos funcionales` - 54 edges
5. `CardInstance` - 53 edges
6. `Tareas` - 44 edges
7. `react` - 41 edges
8. `GameActionType` - 39 edges
9. `@playwright/test` - 35 edges
10. `CardDisplay()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `COMP-4 Room Manager` --references--> `LobbyManager`  [INFERRED]
  design.md → apps/server/src/game/lobby-manager.ts
- `REQ-46 Menú Contextual sin Encabezado Redundante de Nombre (Punto 10 de Correcciones del Cliente - C.10)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `REQ-48 Orden Estricto de Opciones en Menú Contextual (Punto 12 de Correcciones del Cliente - C.12)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `5. Checklist de Aceptación de 15 Minutos` --references--> `CardDetailsModal()`  [INFERRED]
  PLAYTEST.md → apps/web/src/components/CardDetailsModal.tsx
- `REQ-35 Panel de Diagnóstico (?debug=1) y Registro de Errores de Cartas en Servidor (Punto 7 de Correcciones del Cliente - D.7)` --references--> `DiagnosticPanel()`  [INFERRED]
  requirements.md → apps/web/src/components/DiagnosticPanel.tsx

## Import Cycles
- None detected.

## Communities (107 total, 33 thin omitted)

### Community 0 - "Cluster 0: filter"
Cohesion: 0.08
Nodes (42): ClientConnection, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema, ChatMessageSchema, ClearTargetingArrowsSchema, CloneTokenSchema (+34 more)

### Community 1 - "web/package.json"
Cohesion: 0.05
Nodes (46): dependencies, autoprefixer@^10.4.20, clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, keyrune@^3.19.0, lucide-react@^0.475.0, mana-font@^1.18.0 (+38 more)

### Community 2 - "Cluster 2: starter"
Cohesion: 0.08
Nodes (39): UndoRecord, DroppableZoneProps, AdjustLifePayload, CardDragMovePayload, CardRevealedPayload, ChatMessagePayload, ClearTargetingArrowsPayload, CloneTokenPayload (+31 more)

### Community 3 - "RoomState"
Cohesion: 0.08
Nodes (44): Battlefield(), BattlefieldProps, DraggableCard(), DraggableCardProps, DroppableZone(), BattlefieldCanvasProps, BattlefieldCardItemProps, CardBadgesProps (+36 more)

### Community 4 - "Cluster 4: config"
Cohesion: 0.05
Nodes (44): dependencies, prisma@^7.10.0, description, devDependencies, axe-core@^4.14.0, @axe-core/playwright@^4.14.0, concurrently@^10.0.6, eslint@^9.20.0 (+36 more)

### Community 6 - "GameStateSession"
Cohesion: 0.16
Nodes (3): GameStateSession, runG3Tests(), 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

### Community 7 - "visibility-filter.ts"
Cohesion: 0.20
Nodes (7): filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, createMock4PlayerRoom(), createMockCard(), createMockDeck(), getContrastRatio(), getLuminance()

### Community 8 - "diagnosticsService"
Cohesion: 0.18
Nodes (5): CardHealthData, DiagnosticFailure, DiagnosticsListener, diagnosticsService, REQ-44 Ver Carta Completo con Datos Reales y Dictámenes Oficiales (Punto 8 de Correcciones del Cliente - B.8)

### Community 9 - "CardPreviewContext.tsx"
Cohesion: 0.17
Nodes (22): CardBadges(), FontGlyphsAudit(), CardPreviewContext, CardPreviewProvider(), COUNTER_ICON_CLASSES, COUNTER_ICONS, CustomCounterSvg(), GenericCounterSvg() (+14 more)

### Community 10 - "Tareas"
Cohesion: 0.18
Nodes (36): Capas de una celda (de atrás hacia delante), GameStarter, BattlefieldCanvas(), CardDisplay(), ExpandedCellView(), FloatingToolbar(), GameLogAndChat(), getRevealedTooltipForOwner() (+28 more)

### Community 11 - "ErrorBoundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 12 - "Cluster 12: compose"
Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 14 - "Cluster 14: base"
Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "db.ts"
Cohesion: 0.11
Nodes (16): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getRootDataDir(), isPortOpen(), pool, prisma (+8 more)

### Community 17 - "server/src/index.ts"
Cohesion: 0.12
Nodes (12): ALLOWED_ORIGINS, CardErrorLogEntry, cookieSameSite, __dirname, failedCodeAttempts, __filename, ipGlobalRequestCounts, RateLimit429Entry (+4 more)

### Community 18 - "Plan de Implementación — Mesa Virtual de Commander (MTG)"
Cohesion: 0.05
Nodes (32): 1. Cómo Crear una Mesa de Commander (Anfitrión / Host), 2. Cómo Unirse a una Mesa (Jugadores 2, 3 y 4), 3. Cómo Elegir un Mazo Listo (Presets de Commander), 4. Qué Hacer si Algo Falla (Soporte y Diagnóstico Técnico), 5. Checklist de Aceptación de 15 Minutos, 6. Resultado Final de la Prueba, Guía de Prueba de Aceptación (Playtest) — MTG Commander Sandbox, Documento de Requisitos — Mesa Virtual de Commander (MTG) (+24 more)

### Community 19 - "CardDefinition"
Cohesion: 0.10
Nodes (16): CardLocaleRecord, cardLocaleService, cardSearchService, ScryfallCardFace, ScryfallCardRaw, scryfallService, CardDetailsModalProps, CardDisplayProps (+8 more)

### Community 20 - "Cluster 20: package"
Cohesion: 0.12
Nodes (18): dependencies, zod@^3.24.2, devDependencies, typescript@^5.7.3, exports, typescript, zod, main (+10 more)

### Community 21 - "bulk-sync.service.ts"
Cohesion: 0.15
Nodes (9): getAppMetadata(), setAppMetadata(), args, fileArgIndex, LocaleCandidate, RawScryfallCard, BulkDataResponse, OFFICIAL_SOL_RING_RULINGS (+1 more)

### Community 22 - "Cluster 22: tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 23 - "Cluster 23: ci"
Cohesion: 0.07
Nodes (28): DATABASE_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, jobs, validate, name, env (+20 more)

### Community 24 - "Cluster 24: secureroll"
Cohesion: 0.18
Nodes (3): secureRoll(), secureShuffle(), InitiativeService

### Community 25 - "Essential service definitions only"
Cohesion: 0.05
Nodes (43): 1. Project Architect Role Definition, 2. Initial Project Understanding, 3. Deliverable Definition (Set Upfront), 4. Generate Requirements Document, 5. Generate Design Document, 6. Generate Implementation Plan, Acceptance Criteria Patterns, Benefits of Upfront Definition (+35 more)

### Community 27 - "imageLoaderQueue.ts"
Cohesion: 0.18
Nodes (6): ImageLoadStatus, ImageQueueListener, ImageQueueStats, QueueItem, persistentImageCache, REQ-34 Cadena de Respaldo Progresiva de Carga de Cartas y Resolución Segura de Fichas (Puntos 5 y 6 de Correcciones del Cliente - D.5 y D.6)

### Community 28 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @electric-sql/pglite@^0.4.3, @fastify/cookie@^11.1.3, @fastify/helmet@^13.1.2, @fastify/static@^10.1.6, @fastify/websocket@^11.0.2, @mtgc/shared@*, @node-rs/argon2@^2.2.2 (+9 more)

### Community 29 - "roomManager"
Cohesion: 0.18
Nodes (3): roomManager, REQ-20.F1 Inventario exhaustivo de funciones de sala y estados (Punto F1), runF2ConcurrencyTest()

### Community 30 - "Cluster 30: spec"
Cohesion: 0.11
Nodes (5): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 31 - "Cluster 31: spec"
Cohesion: 0.11
Nodes (4): FailedRequest, ViewAuditResult, SCREENSHOT_DIR, @playwright/test

### Community 32 - "Cluster 32: prod"
Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 35 - "Cluster 35: scryfallqueue"
Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "server/package.json"
Cohesion: 0.16
Nodes (13): @prisma/adapter-pg@^7.10.0, tsx@^4.19.2, devDependencies, pino-pretty@^13.0.0, @types/pg@^8.23.1, name, private, type (+5 more)

### Community 37 - "deckService"
Cohesion: 0.24
Nodes (3): deckService, REQ-29 Mazos Listos de Commander (Presets) (Punto 8 de Correcciones del Cliente - F.8), REQ-39 Mazos Listos con Resolución Real y Purga de URLs Sintéticas (Punto 3 de Correcciones del Cliente - A.3)

### Community 38 - "Cluster 38: tsconfig"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 39 - "Cluster 39: context"
Cohesion: 0.25
Nodes (9): context, dockerfile, build, web, build, container_name, depends_on, ports (+1 more)

### Community 40 - "Cluster 40: origin"
Cohesion: 0.22
Nodes (9): CORS_ORIGIN, DATABASE_URL, HOST, JWT_SECRET, NODE_ENV, PORT, REDIS_URL, SESSION_SECRET (+1 more)

### Community 41 - "Cluster 41: db"
Cohesion: 0.22
Nodes (9): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, container_name, environment, image, restart, volumes (+1 more)

### Community 42 - "Cluster 42: scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, seed:presets, start, sync:cards, test, typecheck

### Community 43 - "menu-battlefield-send.test.ts"
Cohesion: 0.33
Nodes (5): createDummyCard(), createRoomWithPlayers(), CardDimensions, getCardDimensions(), ViewportDimensions

### Community 44 - "Cluster 44: postgres"
Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"
Cohesion: 0.06
Nodes (36): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20 Sala de espera previa a la partida, REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4) (+28 more)

### Community 47 - "pg"
Cohesion: 0.40
Nodes (3): pg@^8.23.1, pg, pool

### Community 48 - "Cluster 48: spec"
Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 49 - "CardDisplay.tsx"
Cohesion: 0.17
Nodes (18): CardDetailsModal(), FormattedOracleText(), FormattedSymbol(), COMMON_TOKENS_CLIENT, CreateTokenModal(), OpeningHandModal(), LanguageContext, LanguageContextType (+10 more)

### Community 50 - "capture-visual-pods.js"
Cohesion: 0.33
Nodes (5): ARTIFACT_DIR, capturePod(), POD_SIZES, RESOLUTIONS, run()

### Community 51 - "Cluster 51: tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 52 - "Cluster 52: interval"
Cohesion: 0.53
Nodes (6): interval, retries, test, timeout, healthcheck, healthcheck

### Community 56 - "Mesa Virtual de Commander (MTG) ⚔️"
Cohesion: 0.09
Nodes (21): 1. Crear o Unirse a una Sala, 1. Requisitos, 2. Cargar tu Mazo, 2. Instalación y dependencias, 3. Configuración de variables de entorno, 3. Jugar en el Tablero, 4. Iniciar base de datos local (PostgreSQL + Redis), 5. Compilar librerías compartidas (+13 more)

### Community 59 - "card.ts"
Cohesion: 0.12
Nodes (12): CardFace, CardLocaleData, CardRuling, CardDisplayData, CardImageSize, CardPTInfo, BASIC_LANDS, DeckCardWithQuantity (+4 more)

### Community 60 - "error-collector.ts"
Cohesion: 0.40
Nodes (3): ErrorLogEntry, errorLogs, getCollectedErrors()

### Community 62 - "Dominio: Magic: The Gathering, formato Commander"
Cohesion: 0.33
Nodes (5): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea)

### Community 63 - "ref_fs"
Cohesion: 0.12
Nodes (6): ARTIFACT_DIR, runA11yAudit(), summarizeAxeResults(), ARTIFACT_DIR, ARTIFACT_DIR, ARTIFACT_DIR

### Community 66 - "Changelog del Proyecto MTG Commander (EDH)"
Cohesion: 0.33
Nodes (5): Changelog del Proyecto MTG Commander (EDH), Corregido / Agregado, Crédito GitHub Student Developer Pack (Heroku), [Infraestructura & Créditos Estudiantiles] - 2026-10-30, [Ronda de Producción: Bloque A3 y A4] - 2026-10-30

### Community 68 - "test-g1-latency-bank.ts"
Cohesion: 0.50
Nodes (4): CardItem, main(), OptimisticTransfer, runLatencySimulation()

### Community 77 - "ws"
Cohesion: 0.13
Nodes (3): ws@^8.18.0, ws, LatencyMeasurement

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"
Cohesion: 0.05
Nodes (38): Arquitectura, COMP-4 Room Manager, COMP-5 Game Server, COMP-6 Card Service, Componentes en detalle, Decisiones resueltas y abiertas, Despliegue, Diagrama de alto nivel (+30 more)

### Community 82 - "LobbyManager"
Cohesion: 0.17
Nodes (5): LobbyManager, PendingPlayerDeck, SelectDeckPayload, PlayerSelectedDeck, toArtCropUrl()

### Community 83 - "player-colors.ts"
Cohesion: 0.52
Nodes (5): calculateContrastRatio(), calculateRelativeLuminance(), getPlayerColorDef(), PLAYER_PALETTE, PlayerColorDef

### Community 84 - "Servidor de juego en tiempo real"
Cohesion: 0.18
Nodes (10): Aleatoriedad, Ciclo de una acción, Deshacer, Límites y abuso, Medición de latencia, Optimismo en el cliente, Permisos, Principios (+2 more)

### Community 85 - "bulkSyncService"
Cohesion: 0.16
Nodes (4): processAllCardsLocales(), bulkSyncService, REQ-28 Dictámenes Oficiales y Sincronización al Arranque (Punto 6 de Correcciones del Cliente - D.6), REQ-38 Sincronización Automática e Ingesta de Catálogo Scryfall Local (Punto 2 de Correcciones del Cliente - A.2)

### Community 87 - "Seguridad de la aplicación"
Cohesion: 0.20
Nodes (9): Cabeceras y red, Cuentas y contraseñas (REQ-1), Entradas del usuario, Formato del informe, Información oculta del juego, Protección de datos personales (Colombia, Ley 1581 de 2012), Secretos, dependencias y contenedores, Seguridad de la aplicación (+1 more)

### Community 88 - "Pantalla de partida: cuadrícula a sangre"
Cohesion: 0.20
Nodes (9): Accesibilidad, Drag & drop (dnd-kit), Esquina de la pastilla de vida, Estilo, Estructura, Información oculta en pantalla, Pantalla de partida: cuadrícula a sangre, Posiciones normalizadas (+1 more)

### Community 89 - "getGridSlotForSeat"
Cohesion: 0.70
Nodes (3): getGridColumns(), getGridSlotForSeat(), GridSlotCoordinate

### Community 90 - "Avisos de Terceros y Licencias de Software (Third-Party Notices)"
Cohesion: 0.20
Nodes (9): 1. Aviso de No Afiliación con Wizards of the Coast, 2. Mana Font, 3. Keyrune Font, 4. MTG Vectors (Investigamer), 5. Scryfall API, Avisos de Terceros y Licencias de Software (Third-Party Notices), Resumen de Términos MPL-2.0:, Texto de la Licencia MIT (Mana Font CSS/Code): (+1 more)

### Community 91 - "Pruebas de la mesa multijugador"
Cohesion: 0.22
Nodes (8): Carga, E2E con 4 clientes, Fuga de información oculta, Latencia de extremo a extremo, Pirámide, Pruebas de aleatoriedad y casos forzados, Pruebas de la mesa multijugador, Qué guardar como evidencia

### Community 93 - "Sala de espera e iniciativa (REQ-20 y REQ-21)"
Cohesion: 0.25
Nodes (7): Casos límite que debes cubrir, Después de la iniciativa, Estados de la mesa, Iniciativa con d20, Sala de espera, Sala de espera e iniciativa (REQ-20 y REQ-21), Secuencia al iniciar

### Community 94 - "Integración con Scryfall"
Cohesion: 0.25
Nodes (7): Campos de carta que usarás, Endpoints útiles, Esqueleto de cola con límite de tasa, Importación de listas, Imágenes y playmats, Integración con Scryfall, Reglas de uso (verifica en la documentación vigente)

### Community 95 - "deck.service.ts"
Cohesion: 0.17
Nodes (8): DeckConfig, DECKS, PRESET_DIR, PRESET_METAS, PresetMeta, SavedDeck, SCREENSHOT_DIR, CardColor

### Community 96 - "shared/src/index.ts"
Cohesion: 0.16
Nodes (21): BattlefieldCardItem(), ViewFraming, CardContextMenu(), cardTokensClientCache, LibraryContextMenu(), LibraryRevealModal(), CARD_TYPE_FILTERS, Portal() (+13 more)

### Community 97 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 98 - "Auditoría de conformidad con la especificación"
Cohesion: 0.29
Nodes (6): Anti-patrones que debes evitar, Auditoría de conformidad con la especificación, Informe final, Plantilla de matriz, Procedimiento, Reglas de oro

### Community 99 - "CardPTBadge"
Cohesion: 0.38
Nodes (6): CardPTBadge(), COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1), computeCardPT(), REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8), REQ-42 Métrica Honesta y Benchmark de Red con Cero Fallos (Punto 6 de Correcciones del Cliente - A.6), REQ-43 Indicador P/T en Esquina Inferior Izquierda con Datos Reales (Punto 7 de Correcciones del Cliente - B.7)

### Community 101 - "auth.service.ts"
Cohesion: 0.11
Nodes (7): authService, AuthUser, InMemoryUserRecord, DevEmailSender, emailSender, SentEmailRecord, PasswordService

### Community 105 - "App.tsx"
Cohesion: 0.15
Nodes (21): App(), DeckImporter(), DeckInspectorModal(), getCategoryIcon(), ManaCostRenderer(), DiagnosticPanel(), LegalModal(), LegalModalProps (+13 more)

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 645 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Requisitos funcionales` connect `Requisitos funcionales` to `CardPTBadge`, `deckService`, `diagnosticsService`, `CardPreviewContext.tsx`, `Tareas`, `App.tsx`, `CardDisplay.tsx`, `Plan de Implementación — Mesa Virtual de Commander (MTG)`, `bulkSyncService`, `cardImageResolver`, `imageLoaderQueue.ts`, `roomManager`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Cluster 31: spec` to `web/package.json`, `fullscreen-visual.spec.ts`, `visual-tabletop.spec.ts`, `client-corrections.spec.ts`, `Cluster 48: spec`, `Cluster 54: spec`, `Cluster 55: spec`, `full-game-4p.spec.ts`, `card-details.spec.ts`, `ref_fs`, `Cluster 30: spec`, `deck.service.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._