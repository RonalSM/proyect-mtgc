# Graph Report - Proyect MTGC  (2026-10-30)

## Corpus Check
- 196 files · ~506,315 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .example 2, .css 2)

## Summary
- 1483 nodes · 3223 edges · 98 communities (74 shown, 24 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 331 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1352e66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Cluster 0: filter
- web/package.json
- Cluster 2: starter
- RoomState
- Cluster 4: config
- imageLoaderQueue
- Cluster 6: gamestatesession
- ref_node_assert
- diagnosticsService
- Cluster 9: cardbadges
- Tareas
- TableBoard.tsx
- Cluster 12: compose
- .syncPlayerCounts
- Cluster 14: base
- db.ts
- room-manager.ts
- server/src/index.ts
- Plan de Implementación — Mesa Virtual de Commander (MTG)
- CardDefinition
- Cluster 20: package
- room.ts
- Cluster 22: tsconfig
- Cluster 23: ci
- Cluster 24: secureroll
- Essential service definitions only
- WebSocketHandler
- persistentImageCache
- server/package.json
- roomManager
- Cluster 30: spec
- Cluster 31: spec
- Cluster 32: prod
- Flujos de datos
- Cluster 34: spec
- Cluster 35: scryfallqueue
- App.tsx
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
- CardDetailsModal.tsx
- PlayerCell.tsx
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- Cluster 54: spec
- Cluster 55: spec
- Mesa Virtual de Commander (MTG) ⚔️
- cardImageResolver
- deck.service.ts
- tokenService
- token-creation.spec.ts
- Dominio: Magic: The Gathering, formato Commander
- verify-g2-prod.js
- LobbyManager
- Documento de Requisitos — Mesa Virtual de Commander (MTG)
- Changelog del Proyecto MTG Commander (EDH)
- Externos
- test-g1-latency-bank.ts
- Requisitos no funcionales
- Componentes en detalle
- Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal
- visual-tabletop.spec.ts
- tap-animation.spec.ts
- vite-env.d.ts
- ws
- Documento de Diseño — Mesa Virtual de Commander (MTG)
- Arquitectura
- toArtCropUrl
- Servidor de juego en tiempo real
- bulkSyncService
- Seguridad de la aplicación
- Pantalla de partida: cuadrícula a sangre
- Avisos de Terceros y Licencias de Software (Third-Party Notices)
- Pruebas de la mesa multijugador
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- Frontend Design
- Auditoría de conformidad con la especificación
- CardPTBadge
- authService
- token.service.ts
- DiagnosticPanel.tsx
- client-corrections.spec.ts

## God Nodes (most connected - your core abstractions)
1. `GameStateSession` - 82 edges
2. `CardDefinition` - 74 edges
3. `RoomState` - 60 edges
4. `CardInstance` - 53 edges
5. `Requisitos funcionales` - 53 edges
6. `Tareas` - 41 edges
7. `react` - 40 edges
8. `GameActionType` - 39 edges
9. `CardDisplay()` - 35 edges
10. `@playwright/test` - 34 edges

## Surprising Connections (you probably didn't know these)
- `COMP-4 Room Manager` --references--> `LobbyManager`  [INFERRED]
  design.md → apps/server/src/game/lobby-manager.ts
- `REQ-46 Menú Contextual sin Encabezado Redundante de Nombre (Punto 10 de Correcciones del Cliente - C.10)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `REQ-48 Orden Estricto de Opciones en Menú Contextual (Punto 12 de Correcciones del Cliente - C.12)` --references--> `CardContextMenu()`  [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `Estructura` --references--> `PlayerCell()`  [INFERRED]
  .agents/skills/tabletop-grid-ui/SKILL.md → apps/web/src/components/PlayerCell.tsx
- `REQ-52 Reconexión WebSocket con Retroceso Exponencial, Jitter y Protección contra 429 (Punto 16 de Correcciones del Cliente - D.16)` --references--> `useGameSocket()`  [INFERRED]
  requirements.md → apps/web/src/hooks/useGameSocket.ts

## Import Cycles
- None detected.

## Communities (98 total, 24 thin omitted)

### Community 0 - "Cluster 0: filter"
Cohesion: 0.08
Nodes (42): ClientConnection, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema, ChatMessageSchema, ClearTargetingArrowsSchema, CloneTokenSchema (+34 more)

### Community 1 - "web/package.json"
Cohesion: 0.05
Nodes (46): dependencies, autoprefixer@^10.4.20, clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, keyrune@^3.19.0, lucide-react@^0.475.0, mana-font@^1.18.0 (+38 more)

### Community 2 - "Cluster 2: starter"
Cohesion: 0.07
Nodes (38): secureShuffle(), UndoRecord, DroppableZoneProps, AdjustLifePayload, CardDragMovePayload, CardRevealedPayload, ChatMessagePayload, ClearTargetingArrowsPayload (+30 more)

### Community 3 - "RoomState"
Cohesion: 0.10
Nodes (34): Battlefield(), BattlefieldProps, DraggableCard(), DraggableCardProps, DroppableZone(), BattlefieldCardItemProps, CardBadgesProps, CardContextMenuProps (+26 more)

### Community 4 - "Cluster 4: config"
Cohesion: 0.06
Nodes (40): dependencies, prisma@^7.10.0, description, devDependencies, concurrently@^10.0.6, eslint@^9.20.0, @eslint/js@^9.20.0, prettier@^3.5.1 (+32 more)

### Community 6 - "Cluster 6: gamestatesession"
Cohesion: 0.19
Nodes (3): GameStateSession, runG3Tests(), 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

### Community 7 - "ref_node_assert"
Cohesion: 0.11
Nodes (11): prisma, filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, createCommanderCard(), setupCommanderSession(), createDummyCard(), createRoomWithPlayers(), createDummyCard() (+3 more)

### Community 9 - "Cluster 9: cardbadges"
Cohesion: 0.17
Nodes (22): CardBadges(), FontGlyphsAudit(), CardPreviewContext, CardPreviewProvider(), COUNTER_ICON_CLASSES, COUNTER_ICONS, CustomCounterSvg(), GenericCounterSvg() (+14 more)

### Community 10 - "Tareas"
Cohesion: 0.16
Nodes (37): Capas de una celda (de atrás hacia delante), GameStarter, BattlefieldCanvas(), BattlefieldCardItem(), CardContextMenu(), CardDisplay(), ExpandedCellView(), FloatingToolbar() (+29 more)

### Community 11 - "TableBoard.tsx"
Cohesion: 0.14
Nodes (14): BattlefieldCanvasProps, ViewFraming, ErrorBoundary, Props, State, TableBoardInner(), TableBoardProps, TargetingArrowsLayer() (+6 more)

### Community 12 - "Cluster 12: compose"
Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 13 - ".syncPlayerCounts"
Cohesion: 0.14
Nodes (4): MulliganService, createMock4PlayerRoom(), createMockCard(), createMockDeck()

### Community 14 - "Cluster 14: base"
Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "db.ts"
Cohesion: 0.10
Nodes (20): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getAppMetadata(), getRootDataDir(), isPortOpen(), seedPresetFixtureIfEmpty() (+12 more)

### Community 16 - "room-manager.ts"
Cohesion: 0.12
Nodes (5): ioredis@^6.0.0, pool, redisSnapshotService, SnapshotStorage, ioredis

### Community 17 - "server/src/index.ts"
Cohesion: 0.08
Nodes (22): @fastify/cookie@^11.1.3, @fastify/cors@^10.0.2, @fastify/helmet@^13.1.2, @fastify/jwt@^10.2.4, @fastify/static@^10.1.6, ALLOWED_ORIGINS, CardErrorLogEntry, cookieSameSite (+14 more)

### Community 18 - "Plan de Implementación — Mesa Virtual de Commander (MTG)"
Cohesion: 0.20
Nodes (7): Cronograma estimado (equipo pequeño, 1–2 desarrolladores), Fases posteriores (post-MVP), Grafo de dependencias (resumen), Hitos, Límites del proyecto, Plan de Implementación — Mesa Virtual de Commander (MTG), Riesgos principales

### Community 19 - "CardDefinition"
Cohesion: 0.11
Nodes (10): PendingPlayerDeck, CardLocaleRecord, cardLocaleService, cardSearchService, ScryfallCardFace, ScryfallCardRaw, scryfallService, BatchRequestItem (+2 more)

### Community 20 - "Cluster 20: package"
Cohesion: 0.12
Nodes (18): dependencies, zod@^3.24.2, devDependencies, typescript@^5.7.3, exports, typescript, zod, main (+10 more)

### Community 21 - "room.ts"
Cohesion: 0.22
Nodes (7): PlayerCounters, InitiativeState, MulliganPlayerState, MulliganState, RoomSettings, TargetingArrow, UndoProposal

### Community 22 - "Cluster 22: tsconfig"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 23 - "Cluster 23: ci"
Cohesion: 0.07
Nodes (28): DATABASE_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, jobs, validate, name, env (+20 more)

### Community 25 - "Essential service definitions only"
Cohesion: 0.05
Nodes (43): 1. Project Architect Role Definition, 2. Initial Project Understanding, 3. Deliverable Definition (Set Upfront), 4. Generate Requirements Document, 5. Generate Design Document, 6. Generate Implementation Plan, Acceptance Criteria Patterns, Benefits of Upfront Definition (+35 more)

### Community 28 - "server/package.json"
Cohesion: 0.07
Nodes (38): dependencies, @electric-sql/pglite@^0.4.3, @electric-sql/pglite-socket@^0.1.3, fastify@^5.2.1, @fastify/rate-limit@^11.2.1, @fastify/websocket@^11.0.2, @mtgc/shared@*, prisma@^7.10.0 (+30 more)

### Community 29 - "roomManager"
Cohesion: 0.16
Nodes (4): roomManager, REQ-20.F1 Inventario exhaustivo de funciones de sala y estados (Punto F1), runF2ConcurrencyTest(), 7. Despliegue y Observabilidad (Fase 7 — REQ-19)

### Community 30 - "Cluster 30: spec"
Cohesion: 0.12
Nodes (5): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 31 - "Cluster 31: spec"
Cohesion: 0.13
Nodes (3): FailedRequest, ViewAuditResult, @playwright/test

### Community 32 - "Cluster 32: prod"
Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 33 - "Flujos de datos"
Cohesion: 0.25
Nodes (8): Flujo 1: Crear mesa y unirse, Flujo 2: Acción de juego (mover carta en MesaTotal con coordenadas globales, titularidad temporal y sincronización sin parpadeo), Flujo 3: Importar mazo, Flujo 4: Reconexión, Flujo 5: Sala de espera → inicio de partida (v2), Flujo 6: Iniciativa Automática (Punto 4, REQ-21), Flujo 7: Fase de Mulligan y Mano Inicial (Punto 5, REQ-23), Flujos de datos

### Community 35 - "Cluster 35: scryfallqueue"
Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "App.tsx"
Cohesion: 0.18
Nodes (19): App(), DeckImporter(), DeckImporterProps, DeckInspectorModal(), DeckInspectorModalProps, getCategoryIcon(), ManaCostRenderer(), LegalModal() (+11 more)

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
Cohesion: 0.20
Nodes (6): CloneTokenPayload, CreateTokenPayload, CardDimensions, getCardDimensions(), ViewportDimensions, 📊 Matriz Comparativa: `requirements.md` / `design.md` vs Implementación Real

### Community 44 - "Cluster 44: postgres"
Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"
Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"
Cohesion: 0.06
Nodes (34): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20 Sala de espera previa a la partida, REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4) (+26 more)

### Community 47 - "pg"
Cohesion: 0.40
Nodes (3): pg@^8.23.1, pg, pool

### Community 48 - "Cluster 48: spec"
Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 49 - "CardDetailsModal.tsx"
Cohesion: 0.13
Nodes (21): CardDetailsModal(), CardDetailsModalProps, FormattedOracleText(), FormattedSymbol(), CreateTokenModal(), LobbyWaitingRoom(), OpeningHandModal(), LanguageContext (+13 more)

### Community 50 - "PlayerCell.tsx"
Cohesion: 0.18
Nodes (14): cardTokensClientCache, CardDisplayProps, COMMON_TOKENS_CLIENT, DeckTokenGroup, LibraryContextMenu(), LibraryRevealModal(), CARD_TYPE_FILTERS, Portal() (+6 more)

### Community 51 - "Cluster 51: tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 52 - "Cluster 52: interval"
Cohesion: 0.53
Nodes (6): interval, retries, test, timeout, healthcheck, healthcheck

### Community 56 - "Mesa Virtual de Commander (MTG) ⚔️"
Cohesion: 0.09
Nodes (21): 1. Crear o Unirse a una Sala, 1. Requisitos, 2. Cargar tu Mazo, 2. Instalación y dependencias, 3. Configuración de variables de entorno, 3. Jugar en el Tablero, 4. Iniciar base de datos local (PostgreSQL + Redis), 5. Compilar librerías compartidas (+13 more)

### Community 59 - "deck.service.ts"
Cohesion: 0.08
Nodes (23): main(), DeckConfig, DECKS, PRESET_DIR, runGenerator(), PRESET_METAS, PresetMeta, SavedDeck (+15 more)

### Community 60 - "tokenService"
Cohesion: 0.33
Nodes (3): tokenService, REQ-26 Creación y Gestión de Fichas (Tokens) (Punto 4 de Correcciones del Cliente - B.4), REQ-34 Cadena de Respaldo Progresiva de Carga de Cartas y Resolución Segura de Fichas (Puntos 5 y 6 de Correcciones del Cliente - D.5 y D.6)

### Community 62 - "Dominio: Magic: The Gathering, formato Commander"
Cohesion: 0.33
Nodes (5): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea)

### Community 64 - "LobbyManager"
Cohesion: 0.17
Nodes (4): LobbyManager, SelectDeckPayload, SetReadyPayload, PlayerSelectedDeck

### Community 65 - "Documento de Requisitos — Mesa Virtual de Commander (MTG)"
Cohesion: 0.29
Nodes (7): Documento de Requisitos — Mesa Virtual de Commander (MTG), Glosario, Introducción, Límites del sistema, Matriz de trazabilidad (resumen), Métricas de éxito, Supuestos (confirmar con el cliente)

### Community 66 - "Changelog del Proyecto MTG Commander (EDH)"
Cohesion: 0.33
Nodes (5): Changelog del Proyecto MTG Commander (EDH), Corregido / Agregado, Crédito GitHub Student Developer Pack (Heroku), [Infraestructura & Créditos Estudiantiles] - 2026-10-30, [Ronda de Producción: Bloque A3 y A4] - 2026-10-30

### Community 67 - "Externos"
Cohesion: 0.33
Nodes (6): Externos, Importadores de mazos (fase 2), Internos, Puntos de integración, Scryfall API, Videollamada externa (fase 1) / LiveKit o WebRTC (fase 2)

### Community 68 - "test-g1-latency-bank.ts"
Cohesion: 0.50
Nodes (4): CardItem, main(), OptimisticTransfer, runLatencySimulation()

### Community 69 - "Requisitos no funcionales"
Cohesion: 0.33
Nodes (6): REQ-15 Rendimiento, REQ-16 Seguridad y privacidad, REQ-17 Usabilidad y accesibilidad, REQ-18 Cumplimiento legal y atribución, REQ-19 Disponibilidad y observabilidad, Requisitos no funcionales

### Community 70 - "Componentes en detalle"
Cohesion: 0.50
Nodes (4): COMP-4 Room Manager, COMP-5 Game Server, COMP-6 Card Service, Componentes en detalle

### Community 72 - "Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal"
Cohesion: 0.50
Nodes (4): Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal, Modelo de Capas (MesaTotal: Rojo = Mesa, Naranja = Divisiones, Verde = Elementos Flotantes), Privacidad y Reglas de Visibilidad de Mensajes, Rutas

### Community 77 - "ws"
Cohesion: 0.13
Nodes (3): ws@^8.18.0, ws, LatencyMeasurement

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"
Cohesion: 0.15
Nodes (13): Decisiones resueltas y abiertas, Despliegue, Documento de Diseño — Mesa Virtual de Commander (MTG), Estrategia de pruebas, Manejo de errores, Modelo de amenazas (resumen), Modelos de datos, Máquina de estados de la mesa (v2) (+5 more)

### Community 81 - "Arquitectura"
Cohesion: 0.67
Nodes (3): Arquitectura, Diagrama de alto nivel, Mapa de componentes

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

### Community 97 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 98 - "Auditoría de conformidad con la especificación"
Cohesion: 0.29
Nodes (6): Anti-patrones que debes evitar, Auditoría de conformidad con la especificación, Informe final, Plantilla de matriz, Procedimiento, Reglas de oro

### Community 99 - "CardPTBadge"
Cohesion: 0.60
Nodes (5): CardPTBadge(), COMP-6 Card Service y Telemetría de Base de Datos Local (Punto 1 - A.1), computeCardPT(), REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8), REQ-43 Indicador P/T en Esquina Inferior Izquierda con Datos Reales (Punto 7 de Correcciones del Cliente - B.7)

### Community 101 - "authService"
Cohesion: 0.09
Nodes (13): @node-rs/argon2@^2.2.2, authService, AuthUser, InMemoryUserRecord, DevEmailSender, emailSender, SentEmailRecord, PasswordService (+5 more)

### Community 105 - "DiagnosticPanel.tsx"
Cohesion: 0.29
Nodes (6): CardHealthData, DiagnosticPanel(), DiagnosticFailure, DiagnosticsListener, REQ-35 Panel de Diagnóstico (?debug=1) y Registro de Errores de Cartas en Servidor (Punto 7 de Correcciones del Cliente - D.7), REQ-37 Diagnóstico de Base de Datos Local y Telemetría de Presencia de Cartas (Punto 1 de Correcciones del Cliente - A.1)

## Knowledge Gaps
- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 620 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameStateSession` connect `Cluster 6: gamestatesession` to `LobbyManager`, `Cluster 0: filter`, `Cluster 2: starter`, `RoomState`, `authService`, `ref_node_assert`, `token.service.ts`, `menu-battlefield-send.test.ts`, `.syncPlayerCounts`, `Cluster 24: secureroll`, `roomManager`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Cluster 31: spec` to `web/package.json`, `Cluster 34: spec`, `visual-tabletop.spec.ts`, `client-corrections.spec.ts`, `tap-animation.spec.ts`, `Cluster 48: spec`, `Cluster 54: spec`, `Cluster 55: spec`, `Cluster 57: spec`, `deck.service.ts`, `token-creation.spec.ts`, `Cluster 30: spec`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._