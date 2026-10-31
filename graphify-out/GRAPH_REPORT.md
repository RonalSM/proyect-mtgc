# Graph Report - Proyect MTGC  (2026-10-31)

## Corpus Check
- 214 files · ~526,454 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .example 2, .css 2)

## Summary
- 1572 nodes · 3402 edges · 113 communities (80 shown, 33 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 354 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3dd5faf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cluster 0: filter
- web/package.json
- Cluster 2: starter
- RoomState
- Cluster 4: config
- imageLoaderQueue
- .addLog
- shared/src/index.ts
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
- game-state.ts
- Cluster 22: tsconfig
- Cluster 23: ci
- Cluster 24: secureroll
- Essential service definitions only
- .findBattlefieldCard
- imageLoaderQueue.ts
- dependencies
- roomManager
- Cluster 30: spec
- Cluster 31: spec
- Cluster 32: prod
- tokenService
- dependencies
- Cluster 35: scryfallqueue
- server/package.json
- generate-preset-decks.ts
- Cluster 38: tsconfig
- Cluster 39: context
- Cluster 40: origin
- Cluster 41: db
- Cluster 42: scripts
- .moveCard
- Cluster 44: postgres
- Cluster 45: dependabot
- Requisitos funcionales
- pg
- Cluster 48: spec
- LanguageContext.tsx
- capture-visual-pods.js
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- Cluster 54: spec
- Cluster 55: spec
- Mesa Virtual de Commander (MTG) ⚔️
- cardImageResolver
- card.ts
- ref_playwright
- run
- Dominio: Magic: The Gathering, formato Commander
- ref_fs
- room.ts
- scripts
- Changelog del Proyecto MTG Commander (EDH)
- @electric-sql/pglite-socket
- test-g1-latency-bank.ts
- fastify
- @fastify/cors
- @fastify/jwt
- vite.config.ts
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
- Battlefield.tsx
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- diagnosticsService.ts
- shared/src/index.ts
- Frontend Design
- Auditoría de conformidad con la especificación
- COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1)
- @prisma/client
- auth.service.ts
- @types/node@^22.13.0
- @types/ws@^8.5.14
- zod@^3.24.2
- App.tsx
- client-corrections.spec.ts
- tap-animation.spec.ts
- token-creation.spec.ts
- autoprefixer@^10.4.20
- postcss@^8.5.1
- tailwind-merge@^3.0.1
- @types/react-dom@^18.3.5

## God Nodes (most connected - your core abstractions)
1. `GameStateSession` - 82 edges
2. `CardDefinition` - 74 edges
3. `RoomState` - 63 edges
4. `CardInstance` - 54 edges
5. `Requisitos funcionales` - 54 edges
6. `Tareas` - 44 edges
7. `react` - 41 edges
8. `GameActionType` - 39 edges
9. `@playwright/test` - 35 edges
10. `CardDisplay()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `COMP-4 Room Manager` --references--> `LobbyManager`  [INFERRED]
  design.md → apps/server/src/game/lobby-manager.ts
- `Decisiones arquitectónicas y de producción aprobadas (Bloque B1)` --references--> `bulkSyncService`  [INFERRED]
  design.md → apps/server/src/services/bulk-sync.service.ts
- `Decisiones de Arquitectura y Producción Aprobadas (Bloque B1)` --references--> `bulkSyncService`  [INFERRED]
  requirements.md → apps/server/src/services/bulk-sync.service.ts
- `2. Verificado con Datos de Prueba / Entorno Sintético / Local` --references--> `DevEmailSender`  [INFERRED]
  docs/VERIFICACION_DATOS_PRUEBA_VS_PRODUCCION.md → apps/server/src/services/email.service.ts
- `REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8)` --references--> `CardPTBadge()`  [INFERRED]
  requirements.md → apps/web/src/components/BattlefieldCanvas.tsx

## Import Cycles
- None detected.

## Communities (113 total, 33 thin omitted)

### Community 0 - "Cluster 0: filter"
Cohesion: 0.06
Nodes (45): filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, ClientConnection, WebSocketHandler, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema (+37 more)

### Community 1 - "web/package.json"
Cohesion: 0.15
Nodes (12): clsx@^2.1.1, keyrune@^3.19.0, typescript@^5.7.3, devDependencies, @playwright/test@^1.64.0, typescript, name, private (+4 more)

### Community 2 - "Cluster 2: starter"
Cohesion: 0.09
Nodes (24): DroppableZoneProps, CardDragMovePayload, CardRevealedPayload, ChatMessagePayload, DrawCardsPayload, KickPlayerPayload, LoadDeckCardItem, LoadDeckPayload (+16 more)

### Community 3 - "RoomState"
Cohesion: 0.12
Nodes (36): BattlefieldProps, BattlefieldCanvasProps, BattlefieldCardItemProps, ViewFraming, CardContextMenuProps, CreateTokenModalProps, ExpandedCellViewProps, FloatingToolbarProps (+28 more)

### Community 4 - "Cluster 4: config"
Cohesion: 0.05
Nodes (44): dependencies, prisma@^7.10.0, description, devDependencies, axe-core@^4.14.0, @axe-core/playwright@^4.14.0, concurrently@^10.0.6, eslint@^9.20.0 (+36 more)

### Community 6 - ".addLog"
Cohesion: 0.14
Nodes (7): AdjustLifePayload, CommanderDamagePayload, ConfirmUndoPayload, SetLifePayload, SetPlayerCounterPayload, SetPlayerStatusPayload, runG3Tests()

### Community 7 - "shared/src/index.ts"
Cohesion: 0.10
Nodes (9): createCommanderCard(), setupCommanderSession(), createDummyCard(), createRoomWithPlayers(), createDummyCard(), setup2PlayerSession(), getContrastRatio(), getLuminance() (+1 more)

### Community 9 - "CardPreviewContext.tsx"
Cohesion: 0.11
Nodes (30): CardBadges(), CardBadgesProps, CardDetailsModalProps, FormattedOracleText(), FormattedSymbol(), FontGlyphsAudit(), PlayerCard(), CardPreviewContext (+22 more)

### Community 10 - "Tareas"
Cohesion: 0.17
Nodes (44): Capas de una celda (de atrás hacia delante), GameStarter, BattlefieldCanvas(), BattlefieldCardItem(), CardPTBadge(), CardContextMenu(), CardDetailsModal(), CardDisplay() (+36 more)

### Community 11 - "ErrorBoundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 12 - "Cluster 12: compose"
Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 13 - ".syncPlayerCounts"
Cohesion: 0.19
Nodes (3): GameStateSession, MulliganService, 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

### Community 14 - "Cluster 14: base"
Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "db.ts"
Cohesion: 0.08
Nodes (25): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getAppMetadata(), getRootDataDir(), isPortOpen(), pool (+17 more)

### Community 17 - "server/src/index.ts"
Cohesion: 0.12
Nodes (12): ALLOWED_ORIGINS, CardErrorLogEntry, cookieSameSite, __dirname, failedCodeAttempts, __filename, ipGlobalRequestCounts, RateLimit429Entry (+4 more)

### Community 18 - "Plan de Implementación — Mesa Virtual de Commander (MTG)"
Cohesion: 0.05
Nodes (39): 1. Contexto y Justificación del Desacoplamiento, 3.1. Regla Canónica de Modificación, 3.2. Estrategia 1: Exportación mediante Git Subtree (Flujo Primario), 3.3. Estrategia 2: Script Automatizado de Sincronización (`scripts/sync-shared.js`), 3.4. Estrategia 3: Automatización en CI/CD (GitHub Action `sync-contracts.yml`), 3. Mecanismo de Sincronización para Evitar Divergencias, 4. Verificación de Compatibilidad y Prevención de Rompimiento, Estrategia de Sincronización de `packages/shared` entre Repositorios (B3) (+31 more)

### Community 19 - "CardDefinition"
Cohesion: 0.11
Nodes (11): CardLocaleRecord, cardLocaleService, cardSearchService, ScryfallCardFace, ScryfallCardRaw, scryfallService, CardDisplayProps, DeckTokenGroup (+3 more)

### Community 20 - "Cluster 20: package"
Cohesion: 0.12
Nodes (18): dependencies, zod@^3.24.2, devDependencies, typescript@^5.7.3, exports, typescript, zod, main (+10 more)

### Community 21 - "game-state.ts"
Cohesion: 0.28
Nodes (6): secureShuffle(), UndoRecord, createMock4PlayerRoom(), createMockCard(), createMockDeck(), ClearTargetingArrowsPayload

### Community 22 - "Cluster 22: tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 23 - "Cluster 23: ci"
Cohesion: 0.07
Nodes (28): DATABASE_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, jobs, validate, name, env (+20 more)

### Community 25 - "Essential service definitions only"
Cohesion: 0.05
Nodes (43): 1. Project Architect Role Definition, 2. Initial Project Understanding, 3. Deliverable Definition (Set Upfront), 4. Generate Requirements Document, 5. Generate Design Document, 6. Generate Implementation Plan, Acceptance Criteria Patterns, Benefits of Upfront Definition (+35 more)

### Community 26 - ".findBattlefieldCard"
Cohesion: 0.15
Nodes (6): FlipCardPayload, SetCardCounterPayload, SetCardPTPayload, SetTargetingArrowPayload, TapCardPayload, ToggleCardKeywordPayload

### Community 27 - "imageLoaderQueue.ts"
Cohesion: 0.15
Nodes (7): ImageLoadStatus, ImageQueueListener, ImageQueueStats, QueueItem, persistentImageCache, REQ-34 Cadena de Respaldo Progresiva de Carga de Cartas y Resolución Segura de Fichas (Puntos 5 y 6 de Correcciones del Cliente - D.5 y D.6), REQ-42 Métrica Honesta y Benchmark de Red con Cero Fallos (Punto 6 de Correcciones del Cliente - A.6)

### Community 28 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @electric-sql/pglite@^0.4.3, @fastify/cookie@^11.1.3, @fastify/helmet@^13.1.2, @fastify/static@^10.1.6, @fastify/websocket@^11.0.2, @mtgc/shared@*, @node-rs/argon2@^2.2.2 (+9 more)

### Community 29 - "roomManager"
Cohesion: 0.16
Nodes (4): roomManager, REQ-20.F1 Inventario exhaustivo de funciones de sala y estados (Punto F1), runF2ConcurrencyTest(), 7. Despliegue y Observabilidad (Fase 7 — REQ-19)

### Community 30 - "Cluster 30: spec"
Cohesion: 0.11
Nodes (5): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 31 - "Cluster 31: spec"
Cohesion: 0.11
Nodes (4): FailedRequest, ViewAuditResult, SCREENSHOT_DIR, @playwright/test

### Community 32 - "Cluster 32: prod"
Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 33 - "tokenService"
Cohesion: 0.27
Nodes (3): COMMON_TOKENS, tokenService, REQ-26 Creación y Gestión de Fichas (Tokens) (Punto 4 de Correcciones del Cliente - B.4)

### Community 34 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, lucide-react@^0.475.0, @mtgc/shared@*, react@^18.3.1, tailwindcss@^3.4.17, @types/react@^18.3.18 (+4 more)

### Community 35 - "Cluster 35: scryfallqueue"
Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "server/package.json"
Cohesion: 0.16
Nodes (13): @prisma/adapter-pg@^7.10.0, tsx@^4.19.2, devDependencies, pino-pretty@^13.0.0, @types/pg@^8.23.1, name, private, type (+5 more)

### Community 37 - "generate-preset-decks.ts"
Cohesion: 0.11
Nodes (13): DeckConfig, DECKS, PRESET_DIR, runGenerator(), deckService, DeckImporter(), DeckImporterProps, validateCommanderDeck() (+5 more)

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

### Community 43 - ".moveCard"
Cohesion: 0.22
Nodes (5): CloneTokenPayload, CreateTokenPayload, CardDimensions, getCardDimensions(), ViewportDimensions

### Community 44 - "Cluster 44: postgres"
Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"
Cohesion: 0.06
Nodes (35): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20 Sala de espera previa a la partida, REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4) (+27 more)

### Community 47 - "pg"
Cohesion: 0.40
Nodes (3): pg@^8.23.1, pg, pool

### Community 48 - "Cluster 48: spec"
Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 49 - "LanguageContext.tsx"
Cohesion: 0.18
Nodes (9): mana-font@^1.18.0, react-dom@^18.3.1, LanguageContext, LanguageContextType, LanguageProvider(), apiBase, SupportedLanguage, mana-font (+1 more)

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
Cohesion: 0.18
Nodes (11): PresetMeta, SavedDeck, CardColor, CardFace, CardLocaleData, CardDisplayData, CardImageSize, BASIC_LANDS (+3 more)

### Community 60 - "ref_playwright"
Cohesion: 0.17
Nodes (3): ARTIFACT_DIR, ARTIFACT_DIR, ARTIFACT_DIR

### Community 62 - "Dominio: Magic: The Gathering, formato Commander"
Cohesion: 0.33
Nodes (5): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea)

### Community 63 - "ref_fs"
Cohesion: 0.17
Nodes (4): testConfigs, ARTIFACT_DIR, runA11yAudit(), summarizeAxeResults()

### Community 64 - "room.ts"
Cohesion: 0.22
Nodes (7): PlayerCounters, GameLogEntry, MulliganPlayerState, MulliganState, RoomSettings, TargetingArrow, UndoProposal

### Community 65 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:e2e, typecheck

### Community 66 - "Changelog del Proyecto MTG Commander (EDH)"
Cohesion: 0.33
Nodes (5): Changelog del Proyecto MTG Commander (EDH), Corregido / Agregado, Crédito GitHub Student Developer Pack (Heroku), [Infraestructura & Créditos Estudiantiles] - 2026-10-30, [Ronda de Producción: Bloque A3 y A4] - 2026-10-30

### Community 68 - "test-g1-latency-bank.ts"
Cohesion: 0.50
Nodes (4): CardItem, main(), OptimisticTransfer, runLatencySimulation()

### Community 73 - "vite.config.ts"
Cohesion: 0.40
Nodes (4): vite@^6.1.0, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 77 - "ws"
Cohesion: 0.13
Nodes (3): ws@^8.18.0, ws, LatencyMeasurement

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"
Cohesion: 0.06
Nodes (34): Arquitectura, Decisiones arquitectónicas y de producción aprobadas (Bloque B1), Despliegue, Diagrama de alto nivel, Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal, Documento de Diseño — Mesa Virtual de Commander (MTG), Estrategia de pruebas, Externos (+26 more)

### Community 82 - "LobbyManager"
Cohesion: 0.14
Nodes (6): LobbyManager, PendingPlayerDeck, SelectDeckPayload, SetReadyPayload, PlayerSelectedDeck, toArtCropUrl()

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

### Community 92 - "Battlefield.tsx"
Cohesion: 0.60
Nodes (4): Battlefield(), DraggableCard(), DraggableCardProps, DroppableZone()

### Community 93 - "Sala de espera e iniciativa (REQ-20 y REQ-21)"
Cohesion: 0.25
Nodes (7): Casos límite que debes cubrir, Después de la iniciativa, Estados de la mesa, Iniciativa con d20, Sala de espera, Sala de espera e iniciativa (REQ-20 y REQ-21), Secuencia al iniciar

### Community 94 - "Integración con Scryfall"
Cohesion: 0.25
Nodes (7): Campos de carta que usarás, Endpoints útiles, Esqueleto de cola con límite de tasa, Importación de listas, Imágenes y playmats, Integración con Scryfall, Reglas de uso (verifica en la documentación vigente)

### Community 95 - "diagnosticsService.ts"
Cohesion: 0.50
Nodes (3): CardHealthData, DiagnosticFailure, DiagnosticsListener

### Community 96 - "shared/src/index.ts"
Cohesion: 0.17
Nodes (16): cardTokensClientCache, COMMON_TOKENS_CLIENT, getRevealedTooltipForOwner(), getRevealedTooltipForRecipient(), LibraryContextMenu(), LibraryRevealModal(), CARD_TYPE_FILTERS, Portal() (+8 more)

### Community 97 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 98 - "Auditoría de conformidad con la especificación"
Cohesion: 0.29
Nodes (6): Anti-patrones que debes evitar, Auditoría de conformidad con la especificación, Informe final, Plantilla de matriz, Procedimiento, Reglas de oro

### Community 99 - "COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1)"
Cohesion: 0.20
Nodes (11): DiagnosticPanel(), COMP-4 Room Manager, COMP-5 Game Server, COMP-6 Card Service, COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1), COMP-8 Image Loading & Caching Service, Componentes en detalle, computeCardPT() (+3 more)

### Community 101 - "auth.service.ts"
Cohesion: 0.07
Nodes (15): authService, AuthUser, InMemoryUserRecord, DevEmailSender, emailSender, SentEmailRecord, ConcurrencyLimiter, PasswordService (+7 more)

### Community 105 - "App.tsx"
Cohesion: 0.15
Nodes (22): App(), DeckInspectorModal(), DeckInspectorModalProps, getCategoryIcon(), ManaCostRenderer(), LegalModal(), LegalModalProps, LobbyView() (+14 more)

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 659 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameStateSession` connect `.syncPlayerCounts` to `Cluster 0: filter`, `tokenService`, `Cluster 2: starter`, `RoomState`, `auth.service.ts`, `.addLog`, `shared/src/index.ts`, `.moveCard`, `LobbyManager`, `game-state.ts`, `Cluster 24: secureroll`, `.findBattlefieldCard`, `roomManager`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.059027777777777776 - nodes in this community are weakly interconnected._
- **Why does `@axe-core/playwright` connect `Cluster 4: config` to `ref_fs`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Cluster 2: starter` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._