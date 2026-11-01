# Graph Report - Proyect MTGC  (2026-10-31)

## Corpus Check
- 221 files · ~534,842 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .example 2, .css 2)

## Summary
- 1587 nodes · 3465 edges · 127 communities (87 shown, 40 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 354 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0fdfad86`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cluster 0: filter
- web/package.json
- game-state.ts
- RoomState
- Cluster 4: config
- imageLoaderQueue
- GameStateSession
- shared/src/index.ts
- diagnosticsService
- CardPreviewContext.tsx
- CardDisplay
- generate-preset-decks.ts
- Cluster 12: compose
- InitiativeService
- Cluster 14: base
- db.ts
- room-manager.ts
- server/src/index.ts
- Documento de Requisitos — Mesa Virtual de Commander (MTG)
- CardDefinition
- Cluster 20: package
- LanguageContext.tsx
- Cluster 22: tsconfig
- Cluster 23: ci
- dependencies
- Essential service definitions only
- auth.service.ts
- Guía de Prueba de Aceptación (Playtest) — MTG Commander Sandbox
- dependencies
- MulliganService
- DevEmailSender
- Cluster 31: spec
- Cluster 32: prod
- Flujos de datos
- WebSocketHandler
- Cluster 35: scryfallqueue
- server/package.json
- deckService
- Cluster 38: tsconfig
- Cluster 39: context
- Cluster 40: origin
- Cluster 41: db
- Cluster 42: scripts
- 3. Mecanismo de Sincronización para Evitar Divergencias
- Cluster 44: postgres
- Cluster 45: dependabot
- Requisitos funcionales
- pg
- Cluster 48: spec
- CreateTokenModal.tsx
- capture-visual-pods.js
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- center-convention-drag.spec.ts
- ref_path
- Mesa Virtual de Commander (MTG) ⚔️
- App.tsx
- TableBoard.tsx
- ref_playwright
- ref_fs
- Dominio: Magic: The Gathering, formato Commander
- deck.service.ts
- shared/src/index.ts
- scripts
- Changelog del Proyecto MTG Commander (EDH)
- LobbyManager
- test-g1-latency-bank.ts
- fastify
- e2e-full-game-4p.js
- menu-battlefield-send.test.ts
- Plan de Implementación — Mesa Virtual de Commander (MTG)
- 🛠️ Estado de Construcción y Adaptaciones Arquitectónicas (Fases 1 a 7)
- vite-env.d.ts
- Externos
- Documento de Diseño — Mesa Virtual de Commander (MTG)
- vite.config.ts
- ws
- Arquitectura
- Servidor de juego en tiempo real
- bulkSyncService
- @electric-sql/pglite-socket
- Seguridad de la aplicación
- Pantalla de partida: cuadrícula a sangre
- bulk-sync.service.ts
- Avisos de Terceros y Licencias de Software (Third-Party Notices)
- Pruebas de la mesa multijugador
- @fastify/cors
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- Tareas
- PlayerCell.tsx
- Frontend Design
- Auditoría de conformidad con la especificación
- CardPTBadge
- tokenService
- authService
- .syncRulings
- @fastify/rate-limit
- ioredis
- App.tsx
- client-corrections.spec.ts
- prisma@^7.10.0
- cardImageResolver
- player-colors.ts
- @mtgc/shared@*
- zod@^3.24.2
- autoprefixer@^10.4.20
- tailwindcss@^3.4.17
- Requisitos no funcionales
- @types/react-dom@^18.3.5
- Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal
- ErrorBoundary
- command-zone.test.ts
- ownership.test.ts
- card-details.spec.ts
- visual-tabletop.spec.ts
- @fastify/jwt
- @prisma/client
- @types/node@^22.13.0
- @types/ws@^8.5.14

## God Nodes (most connected - your core abstractions)
1. `GameStateSession` - 82 edges
2. `CardDefinition` - 74 edges
3. `RoomState` - 63 edges
4. `CardInstance` - 54 edges
5. `Requisitos funcionales` - 54 edges
6. `Tareas` - 44 edges
7. `react` - 42 edges
8. `GameActionType` - 39 edges
9. `@playwright/test` - 36 edges
10. `CardDisplay()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `COMP-4 Room Manager` --references--> `LobbyManager`  [INFERRED]
  design.md → apps/server/src/game/lobby-manager.ts
- `Decisiones arquitectónicas y de producción aprobadas (Bloque B1)` --references--> `bulkSyncService`  [INFERRED]
  design.md → apps/server/src/services/bulk-sync.service.ts
- `Decisiones de Arquitectura y Producción Aprobadas (Bloque B1)` --references--> `bulkSyncService`  [INFERRED]
  requirements.md → apps/server/src/services/bulk-sync.service.ts
- `REQ-46 Menú Contextual sin Encabezado Redundante de Nombre (Punto 10 de Correcciones del Cliente - C.10)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `REQ-48 Orden Estricto de Opciones en Menú Contextual (Punto 12 de Correcciones del Cliente - C.12)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx

## Import Cycles
- None detected.

## Communities (127 total, 40 thin omitted)

### Community 0 - "Cluster 0: filter"
Cohesion: 0.08
Nodes (42): ClientConnection, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema, ChatMessageSchema, ClearTargetingArrowsSchema, CloneTokenSchema (+34 more)

### Community 1 - "web/package.json"
Cohesion: 0.15
Nodes (12): clsx@^2.1.1, keyrune@^3.19.0, typescript@^5.7.3, devDependencies, @playwright/test@^1.64.0, typescript, name, private (+4 more)

### Community 2 - "game-state.ts"
Cohesion: 0.07
Nodes (42): secureRoll(), secureShuffle(), UndoRecord, DroppableZoneProps, AdjustLifePayload, CardDragMovePayload, CardRevealedPayload, ChatMessagePayload (+34 more)

### Community 3 - "RoomState"
Cohesion: 0.18
Nodes (19): CreateTokenModalProps, ExpandedCellViewProps, FloatingToolbarProps, GameLogAndChatProps, InitiativeOverlayProps, LobbyWaitingRoomProps, OpeningHandModalProps, PlayerCardProps (+11 more)

### Community 4 - "Cluster 4: config"
Cohesion: 0.05
Nodes (44): dependencies, prisma@^7.10.0, description, devDependencies, axe-core@^4.14.0, @axe-core/playwright@^4.14.0, concurrently@^10.0.6, eslint@^9.20.0 (+36 more)

### Community 6 - "GameStateSession"
Cohesion: 0.15
Nodes (3): GameStateSession, runG3Tests(), 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

### Community 7 - "shared/src/index.ts"
Cohesion: 0.09
Nodes (8): roomManager, filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, createMockCard(), createMockDeck(), getContrastRatio(), getLuminance(), runF2ConcurrencyTest()

### Community 9 - "CardPreviewContext.tsx"
Cohesion: 0.13
Nodes (22): CardBadgesProps, CardContextMenuProps, cardTokensClientCache, FontGlyphsAudit(), CardPreviewContext, CardPreviewContextType, COUNTER_ICON_CLASSES, COUNTER_ICONS (+14 more)

### Community 10 - "CardDisplay"
Cohesion: 0.23
Nodes (26): Capas de una celda (de atrás hacia delante), BattlefieldCanvas(), BattlefieldCardItem(), CardBadges(), CardContextMenu(), CardDisplay(), ExpandedCellView(), getRevealedTooltipForOwner() (+18 more)

### Community 11 - "generate-preset-decks.ts"
Cohesion: 0.15
Nodes (9): main(), DeckConfig, DECKS, PRESET_DIR, runGenerator(), SCREENSHOT_DIR, ParsedDeckLine, parseDecklist() (+1 more)

### Community 12 - "Cluster 12: compose"
Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 14 - "Cluster 14: base"
Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "db.ts"
Cohesion: 0.16
Nodes (12): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getRootDataDir(), isPortOpen(), pool, prisma (+4 more)

### Community 17 - "server/src/index.ts"
Cohesion: 0.09
Nodes (16): ALLOWED_ORIGINS, CardErrorLogEntry, cookieSameSite, __dirname, failedCodeAttempts, __filename, ipGlobalRequestCounts, JoinRoomInputSchema (+8 more)

### Community 18 - "Documento de Requisitos — Mesa Virtual de Commander (MTG)"
Cohesion: 0.25
Nodes (8): Decisiones de Arquitectura y Producción Aprobadas (Bloque B1), Documento de Requisitos — Mesa Virtual de Commander (MTG), Glosario, Introducción, Límites del sistema, Matriz de trazabilidad (resumen), Métricas de éxito, Supuestos (confirmar con el cliente)

### Community 19 - "CardDefinition"
Cohesion: 0.12
Nodes (9): cardLocaleService, cardSearchService, scryfallService, CardDetailsModalProps, CardDisplayProps, DeckTokenGroup, DeckImporterProps, CardDefinition (+1 more)

### Community 20 - "Cluster 20: package"
Cohesion: 0.12
Nodes (18): dependencies, zod@^3.24.2, devDependencies, typescript@^5.7.3, exports, typescript, zod, main (+10 more)

### Community 21 - "LanguageContext.tsx"
Cohesion: 0.22
Nodes (7): mana-font@^1.18.0, LanguageContext, LanguageContextType, LanguageProvider(), apiBase, SupportedLanguage, mana-font

### Community 22 - "Cluster 22: tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 23 - "Cluster 23: ci"
Cohesion: 0.07
Nodes (28): DATABASE_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, jobs, validate, name, env (+20 more)

### Community 24 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, lucide-react@^0.475.0, postcss@^8.5.1, react@^18.3.1, react-dom@^18.3.1, tailwind-merge@^3.0.1 (+5 more)

### Community 25 - "Essential service definitions only"
Cohesion: 0.05
Nodes (43): 1. Project Architect Role Definition, 2. Initial Project Understanding, 3. Deliverable Definition (Set Upfront), 4. Generate Requirements Document, 5. Generate Design Document, 6. Generate Implementation Plan, Acceptance Criteria Patterns, Benefits of Upfront Definition (+35 more)

### Community 26 - "auth.service.ts"
Cohesion: 0.21
Nodes (7): AuthUser, InMemoryUserRecord, emailSender, SentEmailRecord, PasswordService, ScrypthOptions, scryptLimiter

### Community 27 - "Guía de Prueba de Aceptación (Playtest) — MTG Commander Sandbox"
Cohesion: 0.29
Nodes (7): 1. Cómo Crear una Mesa de Commander (Anfitrión / Host), 2. Cómo Unirse a una Mesa (Jugadores 2, 3 y 4), 3. Cómo Elegir un Mazo Listo (Presets de Commander), 4. Qué Hacer si Algo Falla (Soporte y Diagnóstico Técnico), 5. Checklist de Aceptación de 15 Minutos, 6. Resultado Final de la Prueba, Guía de Prueba de Aceptación (Playtest) — MTG Commander Sandbox

### Community 28 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @electric-sql/pglite@^0.4.3, @fastify/cookie@^11.1.3, @fastify/helmet@^13.1.2, @fastify/static@^10.1.6, @fastify/websocket@^11.0.2, @mtgc/shared@*, @node-rs/argon2@^2.2.2 (+9 more)

### Community 30 - "DevEmailSender"
Cohesion: 0.22
Nodes (4): DevEmailSender, 1. Verificado en Producción Real (Datos y Red Real), 2. Verificado con Datos de Prueba / Entorno Sintético / Local, Inventario de Verificación: Datos de Prueba vs Producción Real (C2)

### Community 31 - "Cluster 31: spec"
Cohesion: 0.08
Nodes (5): SCREENSHOT_DIR, FailedRequest, ViewAuditResult, SCREENSHOT_DIR, @playwright/test

### Community 32 - "Cluster 32: prod"
Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 33 - "Flujos de datos"
Cohesion: 0.25
Nodes (8): Flujo 1: Crear mesa y unirse, Flujo 2: Acción de juego (mover carta en MesaTotal con coordenadas globales, titularidad temporal y sincronización sin parpadeo), Flujo 3: Importar mazo, Flujo 4: Reconexión, Flujo 5: Sala de espera → inicio de partida (v2), Flujo 6: Iniciativa Automática (Punto 4, REQ-21), Flujo 7: Fase de Mulligan y Mano Inicial (Punto 5, REQ-23), Flujos de datos

### Community 35 - "Cluster 35: scryfallqueue"
Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "server/package.json"
Cohesion: 0.16
Nodes (13): @prisma/adapter-pg@^7.10.0, tsx@^4.19.2, devDependencies, pino-pretty@^13.0.0, @types/pg@^8.23.1, name, private, type (+5 more)

### Community 37 - "deckService"
Cohesion: 0.18
Nodes (5): deckService, mockCommander, mockSolRing, REQ-29 Mazos Listos de Commander (Presets) (Punto 8 de Correcciones del Cliente - F.8), REQ-39 Mazos Listos con Resolución Real y Purga de URLs Sintéticas (Punto 3 de Correcciones del Cliente - A.3)

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

### Community 43 - "3. Mecanismo de Sincronización para Evitar Divergencias"
Cohesion: 0.25
Nodes (8): 1. Contexto y Justificación del Desacoplamiento, 3.1. Regla Canónica de Modificación, 3.2. Estrategia 1: Exportación mediante Git Subtree (Flujo Primario), 3.3. Estrategia 2: Script Automatizado de Sincronización (`scripts/sync-shared.js`), 3.4. Estrategia 3: Automatización en CI/CD (GitHub Action `sync-contracts.yml`), 3. Mecanismo de Sincronización para Evitar Divergencias, 4. Verificación de Compatibilidad y Prevención de Rompimiento, Estrategia de Sincronización de `packages/shared` entre Repositorios (B3)

### Community 44 - "Cluster 44: postgres"
Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"
Cohesion: 0.06
Nodes (34): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20.F1 Inventario exhaustivo de funciones de sala y estados (Punto F1), REQ-20 Sala de espera previa a la partida (+26 more)

### Community 47 - "pg"
Cohesion: 0.40
Nodes (3): pg@^8.23.1, pg, pool

### Community 48 - "Cluster 48: spec"
Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 49 - "CreateTokenModal.tsx"
Cohesion: 0.27
Nodes (15): CardDetailsModal(), FormattedOracleText(), FormattedSymbol(), CreateTokenModal(), LobbyWaitingRoom(), OpeningHandModal(), TurnBar(), useLanguage() (+7 more)

### Community 50 - "capture-visual-pods.js"
Cohesion: 0.33
Nodes (5): ARTIFACT_DIR, capturePod(), POD_SIZES, RESOLUTIONS, run()

### Community 51 - "Cluster 51: tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 52 - "Cluster 52: interval"
Cohesion: 0.53
Nodes (6): interval, retries, test, timeout, healthcheck, healthcheck

### Community 55 - "ref_path"
Cohesion: 0.11
Nodes (5): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 56 - "Mesa Virtual de Commander (MTG) ⚔️"
Cohesion: 0.09
Nodes (21): 1. Crear o Unirse a una Sala, 1. Requisitos, 2. Cargar tu Mazo, 2. Instalación y dependencias, 3. Configuración de variables de entorno, 3. Jugar en el Tablero, 4. Iniciar base de datos local (PostgreSQL + Redis), 5. Compilar librerías compartidas (+13 more)

### Community 58 - "App.tsx"
Cohesion: 0.18
Nodes (17): App(), Battlefield(), DraggableCard(), DroppableZone(), DeckImporter(), DiagnosticPanel(), LegalModal(), RevealedCardModal() (+9 more)

### Community 59 - "TableBoard.tsx"
Cohesion: 0.16
Nodes (14): BattlefieldCanvasProps, ViewFraming, Props, State, TableBoardProps, ConnectionStatus, RemoteDragState, UseGameSocketOptions (+6 more)

### Community 60 - "ref_playwright"
Cohesion: 0.11
Nodes (3): runA11yAudit(), summarizeAxeResults(), ARTIFACT_DIR

### Community 61 - "ref_fs"
Cohesion: 0.12
Nodes (4): testConfigs, ARTIFACT_DIR, ARTIFACT_DIR, ARTIFACT_DIR

### Community 62 - "Dominio: Magic: The Gathering, formato Commander"
Cohesion: 0.33
Nodes (5): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea)

### Community 63 - "deck.service.ts"
Cohesion: 0.16
Nodes (13): PRESET_METAS, PresetMeta, SavedDeck, CardColor, CardFace, CardLocaleData, CardRuling, CardDisplayData (+5 more)

### Community 64 - "shared/src/index.ts"
Cohesion: 0.10
Nodes (18): BattlefieldProps, DraggableCardProps, BattlefieldCardItemProps, HandCardItemProps, HandFanProps, RevealedCardData, VirtualizedCardGridProps, BatchRequestItem (+10 more)

### Community 65 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:e2e, typecheck

### Community 66 - "Changelog del Proyecto MTG Commander (EDH)"
Cohesion: 0.33
Nodes (5): Changelog del Proyecto MTG Commander (EDH), Corregido / Agregado, Crédito GitHub Student Developer Pack (Heroku), [Infraestructura & Créditos Estudiantiles] - 2026-10-30, [Ronda de Producción: Bloque A3 y A4] - 2026-10-30

### Community 67 - "LobbyManager"
Cohesion: 0.14
Nodes (6): LobbyManager, PendingPlayerDeck, SelectDeckPayload, SetReadyPayload, PlayerSelectedDeck, toArtCropUrl()

### Community 68 - "test-g1-latency-bank.ts"
Cohesion: 0.50
Nodes (4): CardItem, main(), OptimisticTransfer, runLatencySimulation()

### Community 72 - "menu-battlefield-send.test.ts"
Cohesion: 0.33
Nodes (5): createDummyCard(), createRoomWithPlayers(), CardDimensions, getCardDimensions(), ViewportDimensions

### Community 73 - "Plan de Implementación — Mesa Virtual de Commander (MTG)"
Cohesion: 0.29
Nodes (7): Cronograma estimado (equipo pequeño, 1–2 desarrolladores), Fases posteriores (post-MVP), Grafo de dependencias (resumen), Hitos, Límites del proyecto, Plan de Implementación — Mesa Virtual de Commander (MTG), Riesgos principales

### Community 74 - "🛠️ Estado de Construcción y Adaptaciones Arquitectónicas (Fases 1 a 7)"
Cohesion: 0.33
Nodes (5): 1. Infraestructura y Monorepo (Fase 1 — REQ-16, REQ-19), 5. Cuentas y Seguridad (Fase 5 — REQ-1, REQ-16, REQ-18), 6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16), 7. Despliegue y Observabilidad (Fase 7 — REQ-19), 🛠️ Estado de Construcción y Adaptaciones Arquitectónicas (Fases 1 a 7)

### Community 77 - "Externos"
Cohesion: 0.33
Nodes (6): Externos, Importadores de mazos (fase 2), Internos, Puntos de integración, Scryfall API, Videollamada externa (fase 1) / LiveKit o WebRTC (fase 2)

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"
Cohesion: 0.15
Nodes (13): Decisiones arquitectónicas y de producción aprobadas (Bloque B1), Despliegue, Documento de Diseño — Mesa Virtual de Commander (MTG), Estrategia de pruebas, Manejo de errores, Modelo de amenazas (resumen), Modelos de datos, Máquina de estados de la mesa (v2) (+5 more)

### Community 81 - "vite.config.ts"
Cohesion: 0.40
Nodes (4): vite@^6.1.0, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 82 - "ws"
Cohesion: 0.13
Nodes (3): ws@^8.18.0, ws, LatencyMeasurement

### Community 83 - "Arquitectura"
Cohesion: 0.67
Nodes (3): Arquitectura, Diagrama de alto nivel, Mapa de componentes

### Community 84 - "Servidor de juego en tiempo real"
Cohesion: 0.18
Nodes (10): Aleatoriedad, Ciclo de una acción, Deshacer, Límites y abuso, Medición de latencia, Optimismo en el cliente, Permisos, Principios (+2 more)

### Community 87 - "Seguridad de la aplicación"
Cohesion: 0.20
Nodes (9): Cabeceras y red, Cuentas y contraseñas (REQ-1), Entradas del usuario, Formato del informe, Información oculta del juego, Protección de datos personales (Colombia, Ley 1581 de 2012), Secretos, dependencias y contenedores, Seguridad de la aplicación (+1 more)

### Community 88 - "Pantalla de partida: cuadrícula a sangre"
Cohesion: 0.20
Nodes (9): Accesibilidad, Drag & drop (dnd-kit), Esquina de la pastilla de vida, Estilo, Estructura, Información oculta en pantalla, Pantalla de partida: cuadrícula a sangre, Posiciones normalizadas (+1 more)

### Community 89 - "bulk-sync.service.ts"
Cohesion: 0.15
Nodes (9): getAppMetadata(), setAppMetadata(), args, fileArgIndex, LocaleCandidate, RawScryfallCard, BulkDataResponse, OFFICIAL_SOL_RING_RULINGS (+1 more)

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

### Community 95 - "Tareas"
Cohesion: 0.33
Nodes (14): GameStarter, FloatingToolbar(), GameLogAndChat(), InitiativeOverlay(), LobbyView(), TableGrid(), VirtualizedCardGrid(), Componentes nuevos o ampliados (v2) (+6 more)

### Community 96 - "PlayerCell.tsx"
Cohesion: 0.17
Nodes (13): LibraryContextMenu(), LibraryContextMenuProps, LibraryRevealModal(), LibraryRevealModalProps, CARD_TYPE_FILTERS, Portal(), PortalProps, ImageLoadStatus (+5 more)

### Community 97 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 98 - "Auditoría de conformidad con la especificación"
Cohesion: 0.29
Nodes (6): Anti-patrones que debes evitar, Auditoría de conformidad con la especificación, Informe final, Plantilla de matriz, Procedimiento, Reglas de oro

### Community 99 - "CardPTBadge"
Cohesion: 0.16
Nodes (8): CardPTBadge(), persistentImageCache, COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1), computeCardPT(), REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8), REQ-34 Cadena de Respaldo Progresiva de Carga de Cartas y Resolución Segura de Fichas (Puntos 5 y 6 de Correcciones del Cliente - D.5 y D.6), REQ-42 Métrica Honesta y Benchmark de Red con Cero Fallos (Punto 6 de Correcciones del Cliente - A.6), REQ-43 Indicador P/T en Esquina Inferior Izquierda con Datos Reales (Punto 7 de Correcciones del Cliente - B.7)

### Community 100 - "tokenService"
Cohesion: 0.22
Nodes (7): tokenService, COMP-4 Room Manager, COMP-5 Game Server, COMP-6 Card Service, COMP-8 Image Loading & Caching Service, Componentes en detalle, REQ-26 Creación y Gestión de Fichas (Tokens) (Punto 4 de Correcciones del Cliente - B.4)

### Community 101 - "authService"
Cohesion: 0.14
Nodes (3): authService, ConcurrencyLimiter, scryptAsync()

### Community 105 - "App.tsx"
Cohesion: 0.15
Nodes (19): COMMON_TOKENS_CLIENT, DeckInspectorModal(), DeckInspectorModalProps, getCategoryIcon(), ManaCostRenderer(), CardHealthData, LegalModalProps, LobbyViewProps (+11 more)

### Community 109 - "player-colors.ts"
Cohesion: 0.52
Nodes (5): calculateContrastRatio(), calculateRelativeLuminance(), getPlayerColorDef(), PLAYER_PALETTE, PlayerColorDef

### Community 114 - "Requisitos no funcionales"
Cohesion: 0.33
Nodes (6): REQ-15 Rendimiento, REQ-16 Seguridad y privacidad, REQ-17 Usabilidad y accesibilidad, REQ-18 Cumplimiento legal y atribución, REQ-19 Disponibilidad y observabilidad, Requisitos no funcionales

### Community 117 - "Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal"
Cohesion: 0.40
Nodes (5): Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal, Modelo de Capas (MesaTotal: Rojo = Mesa, Naranja = Divisiones, Verde = Elementos Flotantes), Privacidad y Reglas de Visibilidad de Mensajes, Privacidad y Reglas de Visibilidad de Mensajes, Rutas

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 667 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameStateSession` connect `GameStateSession` to `shared/src/index.ts`, `Cluster 0: filter`, `game-state.ts`, `LobbyManager`, `RoomState`, `shared/src/index.ts`, `menu-battlefield-send.test.ts`, `🛠️ Estado de Construcción y Adaptaciones Arquitectónicas (Fases 1 a 7)`, `InitiativeService`, `server/src/index.ts`, `command-zone.test.ts`, `ownership.test.ts`, `MulliganService`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._
- **Why does `@axe-core/playwright` connect `Cluster 4: config` to `ref_playwright`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `game-state.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0653061224489796 - nodes in this community are weakly interconnected._