# Graph Report - Proyect MTGC (2026-10-27)

## Corpus Check

- 172 files · ~221,408 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .example 2, .css 2)

## Summary

- 1367 nodes · 2977 edges · 101 communities (64 shown, 37 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 322 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `59547ea5`
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
- Cluster 7: db
- CardDisplay.tsx
- Cluster 9: cardbadges
- Estilo visual
- Cluster 11: service
- Cluster 12: compose
- PlayerCell.tsx
- Cluster 14: base
- generate-preset-decks.ts
- shared/src/index.ts
- server/src/index.ts
- card-details.spec.ts
- CardDefinition
- Cluster 20: package
- Cluster 21: csprng
- Cluster 22: tsconfig
- Cluster 23: ci
- Cluster 24: secureroll
- Essential service definitions only
- Tareas
- diagnosticsService
- Cluster 28: dependencies
- Cluster 29: roommanager
- Cluster 30: spec
- Cluster 31: spec
- Cluster 32: prod
- Cluster 33: package
- Cluster 34: spec
- Cluster 35: scryfallqueue
- useCardPreview
- Cluster 37: deckservice
- Cluster 38: tsconfig
- Cluster 39: context
- Cluster 40: origin
- Cluster 41: db
- Cluster 42: scripts
- client-corrections-audit-p1-to-p8.spec.ts
- Cluster 44: postgres
- Cluster 45: dependabot
- Requisitos funcionales
- getCardDimensions
- Cluster 48: spec
- Cluster 49: cardimageresolver
- PlayerCell.tsx
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- Cluster 54: spec
- Cluster 55: spec
- Mesa Virtual de Commander (MTG) ⚔️
- Cluster 58: spec
- card.ts
- Cluster 60: spec
- Cluster 61: socket
- Cluster 62: fastify
- Cluster 63: cookie
- Cluster 64: cors
- Cluster 65: jwt
- Cluster 66: limit
- Cluster 67: static
- Cluster 68: websocket
- Cluster 69: shared
- Cluster 70: argon2
- Cluster 71: pg
- Cluster 72: prisma
- Cluster 73: pg
- Cluster 74: tsx
- Cluster 75: node
- Cluster 76: ws
- Cluster 77: ws
- Documento de Diseño — Mesa Virtual de Commander (MTG)
- LobbyWaitingRoom.tsx
- processAllCardsLocales
- Arquitectura
- Servidor de juego en tiempo real
- bulkSyncService
- Seguridad de la aplicación
- Pantalla de partida: cuadrícula a sangre
- Plan de Implementación — Mesa Virtual de Commander (MTG)
- Avisos de Terceros y Licencias de Software (Third-Party Notices)
- Pruebas de la mesa multijugador
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- Flujos de datos
- Frontend Design
- Auditoría de conformidad con la especificación
- Documento de Requisitos — Mesa Virtual de Commander (MTG)
- Externos
- Requisitos no funcionales
- toArtCropUrl
- client-corrections.spec.ts

## God Nodes (most connected - your core abstractions)

1. `GameStateSession` - 77 edges
2. `CardDefinition` - 73 edges
3. `RoomState` - 53 edges
4. `Requisitos funcionales` - 52 edges
5. `CardInstance` - 45 edges
6. `Tareas` - 41 edges
7. `react` - 36 edges
8. `GameActionType` - 35 edges
9. `CardDisplay()` - 34 edges
10. `@playwright/test` - 33 edges

## Surprising Connections (you probably didn't know these)

- `COMP-4 Room Manager` --references--> `LobbyManager` [INFERRED]
  design.md → apps/server/src/game/lobby-manager.ts
- `REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8)` --references--> `CardPTBadge()` [INFERRED]
  requirements.md → apps/web/src/components/BattlefieldCanvas.tsx
- `REQ-46 Menú Contextual sin Encabezado Redundante de Nombre (Punto 10 de Correcciones del Cliente - C.10)` --references--> `CardContextMenu()` [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `REQ-48 Orden Estricto de Opciones en Menú Contextual (Punto 12 de Correcciones del Cliente - C.12)` --references--> `CardContextMenu()` [INFERRED]
  requirements.md → apps/web/src/components/CardContextMenu.tsx
- `REQ-35 Panel de Diagnóstico (?debug=1) y Registro de Errores de Cartas en Servidor (Punto 7 de Correcciones del Cliente - D.7)` --references--> `DiagnosticPanel()` [INFERRED]
  requirements.md → apps/web/src/components/DiagnosticPanel.tsx

## Import Cycles

- None detected.

## Communities (101 total, 37 thin omitted)

### Community 0 - "Cluster 0: filter"

Cohesion: 0.07
Nodes (40): ClientConnection, WebSocketHandler, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema, ChatMessageSchema, CloneTokenSchema (+32 more)

### Community 1 - "web/package.json"

Cohesion: 0.05
Nodes (46): dependencies, autoprefixer@^10.4.20, clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/utilities@^3.2.2, keyrune@^3.19.0, lucide-react@^0.475.0, mana-font@^1.18.0 (+38 more)

### Community 2 - "Cluster 2: starter"

Cohesion: 0.07
Nodes (36): secureShuffle(), UndoRecord, AdjustLifePayload, CardDragMovePayload, ChatMessagePayload, CloneTokenPayload, CommanderDamagePayload, ConfirmUndoPayload (+28 more)

### Community 3 - "RoomState"

Cohesion: 0.05
Nodes (49): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea), redisSnapshotService, SnapshotStorage, Battlefield() (+41 more)

### Community 4 - "Cluster 4: config"

Cohesion: 0.06
Nodes (37): dependencies, prisma@^7.10.0, description, devDependencies, concurrently@^10.0.6, eslint@^9.20.0, @eslint/js@^9.20.0, prettier@^3.5.1 (+29 more)

### Community 6 - "Cluster 6: gamestatesession"

Cohesion: 0.18
Nodes (3): GameStateSession, createMock4PlayerRoom(), 3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)

### Community 7 - "Cluster 7: db"

Cohesion: 0.11
Nodes (17): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getRootDataDir(), isPortOpen(), pool, prisma (+9 more)

### Community 8 - "CardDisplay.tsx"

Cohesion: 0.16
Nodes (8): CardHealthData, DiagnosticFailure, DiagnosticsListener, ImageLoadStatus, ImageQueueListener, ImageQueueStats, QueueItem, persistentImageCache

### Community 9 - "Cluster 9: cardbadges"

Cohesion: 0.19
Nodes (19): CardBadges(), FontGlyphsAudit(), CardPreviewContext, CardPreviewProvider(), COUNTER_ICON_CLASSES, COUNTER_ICONS, KeyruneSetIcon(), KEYWORD_ICON_CLASSES (+11 more)

### Community 10 - "Estilo visual"

Cohesion: 0.20
Nodes (11): tokenService, GameLogAndChat(), PlayerCard(), TurnBar(), CustomCounterSvg(), GenericCounterSvg(), Estilo visual, REQ-26 Creación y Gestión de Fichas (Tokens) (Punto 4 de Correcciones del Cliente - B.4) (+3 more)

### Community 11 - "Cluster 11: service"

Cohesion: 0.09
Nodes (12): authService, AuthUser, InMemoryUserRecord, DevEmailSender, emailSender, SentEmailRecord, PasswordService, 1. Infraestructura y Monorepo (Fase 1 — REQ-16, REQ-19) (+4 more)

### Community 12 - "Cluster 12: compose"

Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 13 - "PlayerCell.tsx"

Cohesion: 0.15
Nodes (16): CardContextMenu(), cardTokensClientCache, COMMON_TOKENS_CLIENT, CARD_TYPE_FILTERS, ModalCardItem(), Portal(), PortalProps, LanguageContext (+8 more)

### Community 14 - "Cluster 14: base"

Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "generate-preset-decks.ts"

Cohesion: 0.15
Nodes (14): DeckConfig, DECKS, PRESET_DIR, runGenerator(), DeckImporter(), DeckImporterProps, BASIC_LANDS, DeckCardWithQuantity (+6 more)

### Community 16 - "shared/src/index.ts"

Cohesion: 0.10
Nodes (12): filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, createCommanderCard(), setupCommanderSession(), createDummyCard(), createRoomWithPlayers(), createMockCard(), createMockDeck() (+4 more)

### Community 17 - "server/src/index.ts"

Cohesion: 0.17
Nodes (7): CardErrorLogEntry, __dirname, __filename, recentCardErrors, server, webDistPath, COMMON_TOKENS

### Community 19 - "CardDefinition"

Cohesion: 0.11
Nodes (11): CardLocaleRecord, cardLocaleService, cardSearchService, ScryfallCardFace, ScryfallCardRaw, scryfallService, CardDisplayProps, DeckTokenGroup (+3 more)

### Community 20 - "Cluster 20: package"

Cohesion: 0.12
Nodes (18): dependencies, zod@^3.24.2, devDependencies, typescript@^5.7.3, exports, typescript, zod, main (+10 more)

### Community 22 - "Cluster 22: tsconfig"

Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 23 - "Cluster 23: ci"

Cohesion: 0.11
Nodes (17): jobs, validate, name, branches, branches, name, run, uses (+9 more)

### Community 25 - "Essential service definitions only"

Cohesion: 0.05
Nodes (43): 1. Project Architect Role Definition, 2. Initial Project Understanding, 3. Deliverable Definition (Set Upfront), 4. Generate Requirements Document, 5. Generate Design Document, 6. Generate Implementation Plan, Acceptance Criteria Patterns, Benefits of Upfront Definition (+35 more)

### Community 26 - "Tareas"

Cohesion: 0.14
Nodes (25): GameStarter, App(), CardPTBadge(), DiagnosticPanel(), InitiativeOverlay(), LegalModal(), LegalModalProps, RevealedCardModal() (+17 more)

### Community 28 - "Cluster 28: dependencies"

Cohesion: 0.15
Nodes (13): dependencies, @electric-sql/pglite@^0.4.3, @fastify/helmet@^13.1.2, ioredis@^6.0.0, @prisma/client@^7.10.0, typescript@^5.7.3, zod@^3.24.2, typescript (+5 more)

### Community 30 - "Cluster 30: spec"

Cohesion: 0.12
Nodes (5): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 31 - "Cluster 31: spec"

Cohesion: 0.14
Nodes (3): FailedRequest, ViewAuditResult, @playwright/test

### Community 32 - "Cluster 32: prod"

Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 33 - "Cluster 33: package"

Cohesion: 0.24
Nodes (9): devDependencies, pino-pretty@^13.0.0, @types/pg@^8.23.1, name, private, type, version, pino-pretty (+1 more)

### Community 35 - "Cluster 35: scryfallqueue"

Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "useCardPreview"

Cohesion: 0.42
Nodes (9): DeckInspectorModal(), DeckInspectorModalProps, getCategoryIcon(), ManaCostRenderer(), LobbyView(), LobbyViewProps, useCardPreview(), getManaSymbolClass() (+1 more)

### Community 37 - "Cluster 37: deckservice"

Cohesion: 0.14
Nodes (9): deckService, PRESET_METAS, PresetMeta, SavedDeck, mockCommander, mockSolRing, CardColor, REQ-29 Mazos Listos de Commander (Presets) (Punto 8 de Correcciones del Cliente - F.8) (+1 more)

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

### Community 44 - "Cluster 44: postgres"

Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"

Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"

Cohesion: 0.05
Nodes (37): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20 Sala de espera previa a la partida, REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4) (+29 more)

### Community 47 - "getCardDimensions"

Cohesion: 0.29
Nodes (4): CreateTokenPayload, CardDimensions, getCardDimensions(), ViewportDimensions

### Community 48 - "Cluster 48: spec"

Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 50 - "PlayerCell.tsx"

Cohesion: 0.16
Nodes (30): Capas de una celda (de atrás hacia delante), BattlefieldCanvas(), BattlefieldCardItem(), ViewFraming, CardDisplay(), ExpandedCellView(), FloatingToolbar(), getRevealedTooltipForOwner() (+22 more)

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

Cohesion: 0.29
Nodes (5): CardFace, CardLocaleData, CardDisplayData, CardImageSize, CardPTInfo

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"

Cohesion: 0.15
Nodes (13): Decisiones resueltas y abiertas, Despliegue, Documento de Diseño — Mesa Virtual de Commander (MTG), Estrategia de pruebas, Manejo de errores, Modelo de amenazas (resumen), Modelos de datos, Máquina de estados de la mesa (v2) (+5 more)

### Community 81 - "LobbyWaitingRoom.tsx"

Cohesion: 0.28
Nodes (14): CardDetailsModal(), CardDetailsModalProps, FormattedOracleText(), FormattedSymbol(), CreateTokenModal(), LobbyWaitingRoom(), OpeningHandModal(), COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1) (+6 more)

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

### Community 89 - "Plan de Implementación — Mesa Virtual de Commander (MTG)"

Cohesion: 0.20
Nodes (7): Cronograma estimado (equipo pequeño, 1–2 desarrolladores), Fases posteriores (post-MVP), Grafo de dependencias (resumen), Hitos, Límites del proyecto, Plan de Implementación — Mesa Virtual de Commander (MTG), Riesgos principales

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

### Community 96 - "Flujos de datos"

Cohesion: 0.25
Nodes (8): Flujo 1: Crear mesa y unirse, Flujo 2: Acción de juego (mover carta en MesaTotal con coordenadas globales, titularidad temporal y sincronización sin parpadeo), Flujo 3: Importar mazo, Flujo 4: Reconexión, Flujo 5: Sala de espera → inicio de partida (v2), Flujo 6: Iniciativa Automática (Punto 4, REQ-21), Flujo 7: Fase de Mulligan y Mano Inicial (Punto 5, REQ-23), Flujos de datos

### Community 97 - "Frontend Design"

Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 98 - "Auditoría de conformidad con la especificación"

Cohesion: 0.29
Nodes (6): Anti-patrones que debes evitar, Auditoría de conformidad con la especificación, Informe final, Plantilla de matriz, Procedimiento, Reglas de oro

### Community 100 - "Documento de Requisitos — Mesa Virtual de Commander (MTG)"

Cohesion: 0.29
Nodes (7): Documento de Requisitos — Mesa Virtual de Commander (MTG), Glosario, Introducción, Límites del sistema, Matriz de trazabilidad (resumen), Métricas de éxito, Supuestos (confirmar con el cliente)

### Community 102 - "Externos"

Cohesion: 0.33
Nodes (6): Externos, Importadores de mazos (fase 2), Internos, Puntos de integración, Scryfall API, Videollamada externa (fase 1) / LiveKit o WebRTC (fase 2)

### Community 103 - "Requisitos no funcionales"

Cohesion: 0.33
Nodes (6): REQ-15 Rendimiento, REQ-16 Seguridad y privacidad, REQ-17 Usabilidad y accesibilidad, REQ-18 Cumplimiento legal y atribución, REQ-19 Disponibilidad y observabilidad, Requisitos no funcionales

### Community 104 - "toArtCropUrl"

Cohesion: 0.13
Nodes (7): LobbyManager, PendingPlayerDeck, SelectDeckPayload, SetReadyPayload, PlayerCounters, PlayerSelectedDeck, toArtCropUrl()

## Knowledge Gaps

- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 569 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `@playwright/test` connect `Cluster 31: spec` to `web/package.json`, `Cluster 34: spec`, `Cluster 7: db`, `client-corrections.spec.ts`, `client-corrections-audit-p1-to-p8.spec.ts`, `Cluster 48: spec`, `card-details.spec.ts`, `Cluster 54: spec`, `Cluster 55: spec`, `Cluster 57: spec`, `Cluster 58: spec`, `Cluster 60: spec`, `Cluster 30: spec`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._
- **Why does `Requisitos funcionales` connect `Requisitos funcionales` to `Documento de Requisitos — Mesa Virtual de Commander (MTG)`, `Cluster 37: deckservice`, `Estilo visual`, `LobbyWaitingRoom.tsx`, `PlayerCell.tsx`, `processAllCardsLocales`, `Cluster 49: cardimageresolver`, `bulkSyncService`, `Tareas`, `diagnosticsService`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._
