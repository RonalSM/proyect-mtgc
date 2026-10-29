# Graph Report - Proyect MTGC (2026-10-24)

## Corpus Check

- 168 files · ~217,864 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .example 2, .css 2)

## Summary

- 1358 nodes · 2934 edges · 112 communities (70 shown, 42 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 322 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `db25606b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- Cluster 0: filter
- web/package.json
- Cluster 2: starter
- RoomState
- Cluster 4: config
- Cluster 5: diagnosticpanel
- Cluster 6: gamestatesession
- Cluster 7: db
- Cluster 8: battlefieldcanvas
- Cluster 9: cardbadges
- bulk-sync.service.ts
- Cluster 11: service
- Cluster 12: compose
- Cluster 13: app
- Cluster 14: base
- card.ts
- shared/src/index.ts
- CardDefinition
- CardDisplay.tsx
- Cluster 19: prisma
- Cluster 20: package
- Cluster 21: csprng
- Cluster 22: tsconfig
- Cluster 23: ci
- Cluster 24: secureroll
- Essential service definitions only
- Estilo visual
- Cluster 27: redissnapshotservice
- Cluster 28: dependencies
- Cluster 29: roommanager
- Cluster 30: spec
- Cluster 31: spec
- Cluster 32: prod
- Cluster 33: package
- Cluster 34: spec
- Cluster 35: scryfallqueue
- Cluster 36: constructor
- Cluster 37: deckservice
- Cluster 38: tsconfig
- Cluster 39: context
- Cluster 40: origin
- Cluster 41: db
- Cluster 42: scripts
- Cluster 43: battlefield
- Cluster 44: postgres
- Cluster 45: dependabot
- Requisitos funcionales
- Cluster 47: test
- Cluster 48: spec
- Cluster 49: cardimageresolver
- Tareas
- Cluster 51: tsconfig
- Cluster 52: interval
- Cluster 53: dotenv
- Cluster 54: spec
- Cluster 55: spec
- Mesa Virtual de Commander (MTG) ⚔️
- Cluster 58: spec
- Cluster 59: spec
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
- dependencies
- LanguageContext.tsx
- diagnosticsService
- Servidor de juego en tiempo real
- bulkSyncService
- CardInstance
- Seguridad de la aplicación
- Pantalla de partida: cuadrícula a sangre
- Plan de Implementación — Mesa Virtual de Commander (MTG)
- Avisos de Terceros y Licencias de Software (Third-Party Notices)
- Pruebas de la mesa multijugador
- room.ts
- Sala de espera e iniciativa (REQ-20 y REQ-21)
- Integración con Scryfall
- processAllCardsLocales
- Flujos de datos
- Frontend Design
- Auditoría de conformidad con la especificación
- scripts
- Documento de Requisitos — Mesa Virtual de Commander (MTG)
- Dominio: Magic: The Gathering, formato Commander
- Externos
- Requisitos no funcionales
- vite.config.ts
- token.service.ts
- client-corrections.spec.ts
- Arquitectura
- autoprefixer@^10.4.20
- postcss@^8.5.1
- tailwind-merge@^3.0.1
- @types/react-dom@^18.3.5

## God Nodes (most connected - your core abstractions)

1. `GameStateSession` - 77 edges
2. `CardDefinition` - 71 edges
3. `RoomState` - 53 edges
4. `Requisitos funcionales` - 52 edges
5. `CardInstance` - 45 edges
6. `Tareas` - 41 edges
7. `react` - 35 edges
8. `CardDisplay()` - 35 edges
9. `GameActionType` - 35 edges
10. `@playwright/test` - 30 edges

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

## Communities (112 total, 42 thin omitted)

### Community 0 - "Cluster 0: filter"

Cohesion: 0.07
Nodes (40): ClientConnection, WebSocketHandler, wsHandler, ActionEnvelopeSchema, AdjustLifeSchema, CardDragMoveSchema, ChatMessageSchema, CloneTokenSchema (+32 more)

### Community 1 - "web/package.json"

Cohesion: 0.15
Nodes (12): clsx@^2.1.1, @dnd-kit/utilities@^3.2.2, typescript@^5.7.3, devDependencies, @playwright/test@^1.64.0, typescript, name, private (+4 more)

### Community 2 - "Cluster 2: starter"

Cohesion: 0.08
Nodes (34): secureShuffle(), UndoRecord, AdjustLifePayload, CardDragMovePayload, ChatMessagePayload, CommanderDamagePayload, ConfirmUndoPayload, DrawCardsPayload (+26 more)

### Community 3 - "RoomState"

Cohesion: 0.20
Nodes (17): BattlefieldCanvasProps, CreateTokenModalProps, FloatingToolbarProps, InitiativeOverlayProps, LobbyWaitingRoomProps, OpeningHandModalProps, PlayerCardProps, PlayerCellProps (+9 more)

### Community 4 - "Cluster 4: config"

Cohesion: 0.06
Nodes (37): dependencies, prisma@^7.10.0, description, devDependencies, concurrently@^10.0.6, eslint@^9.20.0, @eslint/js@^9.20.0, prettier@^3.5.1 (+29 more)

### Community 7 - "Cluster 7: db"

Cohesion: 0.13
Nodes (19): adapter, connectDatabase(), disconnectDatabase(), ensureTablesExist(), getRootDataDir(), isPortOpen(), pool, prisma (+11 more)

### Community 8 - "Cluster 8: battlefieldcanvas"

Cohesion: 0.20
Nodes (19): ViewFraming, CardContextMenu(), cardTokensClientCache, getRevealedTooltipForOwner(), getRevealedTooltipForRecipient(), HandCardItem(), HandFan(), CARD_TYPE_FILTERS (+11 more)

### Community 9 - "Cluster 9: cardbadges"

Cohesion: 0.15
Nodes (25): CardBadges(), FontGlyphsAudit(), PlayerCard(), CardPreviewContext, CardPreviewProvider(), COUNTER_ICON_CLASSES, COUNTER_ICONS, CustomCounterSvg() (+17 more)

### Community 10 - "bulk-sync.service.ts"

Cohesion: 0.18
Nodes (7): args, fileArgIndex, LocaleCandidate, RawScryfallCard, BulkDataResponse, OFFICIAL_SOL_RING_RULINGS, RulingItem

### Community 11 - "Cluster 11: service"

Cohesion: 0.09
Nodes (12): authService, AuthUser, InMemoryUserRecord, DevEmailSender, emailSender, SentEmailRecord, PasswordService, 1. Infraestructura y Monorepo (Fase 1 — REQ-16, REQ-19) (+4 more)

### Community 12 - "Cluster 12: compose"

Cohesion: 0.08
Nodes (28): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+20 more)

### Community 13 - "Cluster 13: app"

Cohesion: 0.20
Nodes (17): App(), DeckImporter(), LegalModal(), LegalModalProps, LobbyView(), LobbyViewProps, LobbyWaitingRoom(), RevealedCardModal() (+9 more)

### Community 14 - "Cluster 14: base"

Cohesion: 0.08
Nodes (24): compilerOptions, alwaysStrict, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+16 more)

### Community 15 - "card.ts"

Cohesion: 0.13
Nodes (12): CardFace, CardLocaleData, CardRuling, CardDisplayData, CardImageSize, CardPTInfo, BASIC_LANDS, DeckCardWithQuantity (+4 more)

### Community 16 - "shared/src/index.ts"

Cohesion: 0.10
Nodes (10): filterRoomStateForPlayer(), MASKED_CARD_DEFINITION, createCommanderCard(), setupCommanderSession(), createMockCard(), createMockDeck(), createDummyCard(), setup2PlayerSession() (+2 more)

### Community 17 - "CardDefinition"

Cohesion: 0.11
Nodes (14): PendingPlayerDeck, cardSearchService, ScryfallCardFace, ScryfallCardRaw, scryfallService, CardDetailsModalProps, CardDisplayProps, DeckTokenGroup (+6 more)

### Community 18 - "CardDisplay.tsx"

Cohesion: 0.13
Nodes (20): CardDetailsModal(), FormattedOracleText(), FormattedSymbol(), COMMON_TOKENS_CLIENT, CreateTokenModal(), CardHealthData, OpeningHandModal(), useLanguage() (+12 more)

### Community 19 - "Cluster 19: prisma"

Cohesion: 0.13
Nodes (8): CardErrorLogEntry, __dirname, __filename, recentCardErrors, server, webDistPath, CardLocaleRecord, cardLocaleService

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

### Community 26 - "Estilo visual"

Cohesion: 0.16
Nodes (11): tokenService, GameLogAndChat(), TurnBar(), Diseño de la interfaz de mesa inmersiva (v2) - Arquitectura MesaTotal, Estilo visual, Modelo de Capas (MesaTotal: Rojo = Mesa, Naranja = Divisiones, Verde = Elementos Flotantes), Privacidad y Reglas de Visibilidad de Mensajes, Privacidad y Reglas de Visibilidad de Mensajes (+3 more)

### Community 28 - "Cluster 28: dependencies"

Cohesion: 0.15
Nodes (13): dependencies, @electric-sql/pglite@^0.4.3, @fastify/helmet@^13.1.2, ioredis@^6.0.0, @prisma/client@^7.10.0, typescript@^5.7.3, zod@^3.24.2, typescript (+5 more)

### Community 30 - "Cluster 30: spec"

Cohesion: 0.12
Nodes (4): SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR, SCREENSHOT_DIR

### Community 31 - "Cluster 31: spec"

Cohesion: 0.14
Nodes (5): FailedRequest, SCREENSHOT_DIR, SCREENSHOT_DIR, ViewAuditResult, @playwright/test

### Community 32 - "Cluster 32: prod"

Cohesion: 0.17
Nodes (11): command, container_name, image, restart, volumes, services, redis, version (+3 more)

### Community 33 - "Cluster 33: package"

Cohesion: 0.24
Nodes (9): devDependencies, pino-pretty@^13.0.0, @types/pg@^8.23.1, name, private, type, version, pino-pretty (+1 more)

### Community 35 - "Cluster 35: scryfallqueue"

Cohesion: 0.27
Nodes (3): scryfallQueue, ScryfallQueueListener, ScryfallQueueService

### Community 36 - "Cluster 36: constructor"

Cohesion: 0.20
Nodes (3): LobbyManager, PlayerCounters, PlayerSelectedDeck

### Community 37 - "Cluster 37: deckservice"

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

### Community 43 - "Cluster 43: battlefield"

Cohesion: 0.31
Nodes (8): Battlefield(), BattlefieldProps, DraggableCard(), DraggableCardProps, DroppableZone(), DroppableZoneProps, ExpandedCellViewProps, PlayerZones

### Community 44 - "Cluster 44: postgres"

Cohesion: 0.25
Nodes (8): postgres, redis, condition, condition, container_name, depends_on, restart, server

### Community 45 - "Cluster 45: dependabot"

Cohesion: 0.25
Nodes (7): interval, updates, directory, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 46 - "Requisitos funcionales"

Cohesion: 0.05
Nodes (37): REQ-10 Sincronización y reconexión, REQ-11 Registro de partida y deshacer, REQ-12 Chat y comunicación, REQ-13 Espectadores y moderación, REQ-14 Historial y estadísticas (fase 2), REQ-1 Cuentas y acceso, REQ-20 Sala de espera previa a la partida, REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4) (+29 more)

### Community 47 - "Cluster 47: test"

Cohesion: 0.18
Nodes (7): createDummyCard(), createRoomWithPlayers(), CloneTokenPayload, CreateTokenPayload, CardDimensions, getCardDimensions(), ViewportDimensions

### Community 48 - "Cluster 48: spec"

Cohesion: 0.33
Nodes (4): completeMulliganPhase(), MINIMAL_PNG, MockServerStats, setupPodWith100Cards()

### Community 49 - "Cluster 49: cardimageresolver"

Cohesion: 0.29
Nodes (3): BatchRequestItem, cardImageResolver, REQ-40 Resolvedor Canónico por Lotes `POST /api/cards/resolve` (Punto 4 de Correcciones del Cliente - A.4)

### Community 50 - "Tareas"

Cohesion: 0.16
Nodes (32): Capas de una celda (de atrás hacia delante), GameStarter, BattlefieldCanvas(), BattlefieldCardItem(), CardPTBadge(), CardDisplay(), DiagnosticPanel(), ExpandedCellView() (+24 more)

### Community 51 - "Cluster 51: tsconfig"

Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 52 - "Cluster 52: interval"

Cohesion: 0.53
Nodes (6): interval, retries, test, timeout, healthcheck, healthcheck

### Community 56 - "Mesa Virtual de Commander (MTG) ⚔️"

Cohesion: 0.09
Nodes (21): 1. Crear o Unirse a una Sala, 1. Requisitos, 2. Cargar tu Mazo, 2. Instalación y dependencias, 3. Configuración de variables de entorno, 3. Jugar en el Tablero, 4. Iniciar base de datos local (PostgreSQL + Redis), 5. Compilar librerías compartidas (+13 more)

### Community 80 - "Documento de Diseño — Mesa Virtual de Commander (MTG)"

Cohesion: 0.15
Nodes (13): Decisiones resueltas y abiertas, Despliegue, Documento de Diseño — Mesa Virtual de Commander (MTG), Estrategia de pruebas, Manejo de errores, Modelo de amenazas (resumen), Modelos de datos, Máquina de estados de la mesa (v2) (+5 more)

### Community 81 - "dependencies"

Cohesion: 0.17
Nodes (12): dependencies, @dnd-kit/core@^6.3.1, keyrune@^3.19.0, lucide-react@^0.475.0, @mtgc/shared@*, react@^18.3.1, tailwindcss@^3.4.17, @types/react@^18.3.18 (+4 more)

### Community 82 - "LanguageContext.tsx"

Cohesion: 0.20
Nodes (8): mana-font@^1.18.0, react-dom@^18.3.1, LanguageContext, LanguageContextType, LanguageProvider(), SupportedLanguage, mana-font, react-dom

### Community 84 - "Servidor de juego en tiempo real"

Cohesion: 0.18
Nodes (10): Aleatoriedad, Ciclo de una acción, Deshacer, Límites y abuso, Medición de latencia, Optimismo en el cliente, Permisos, Principios (+2 more)

### Community 86 - "CardInstance"

Cohesion: 0.20
Nodes (10): BattlefieldCardItemProps, CardBadgesProps, CardContextMenuProps, HandCardItemProps, HandFanProps, RevealedCardData, VirtualizedCardGridProps, CardPreviewContextType (+2 more)

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

### Community 92 - "room.ts"

Cohesion: 0.25
Nodes (7): GameLogAndChatProps, GameLogEntry, InitiativeState, MulliganPlayerState, MulliganState, RoomSettings, UndoProposal

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

### Community 99 - "scripts"

Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:e2e, typecheck

### Community 100 - "Documento de Requisitos — Mesa Virtual de Commander (MTG)"

Cohesion: 0.29
Nodes (7): Documento de Requisitos — Mesa Virtual de Commander (MTG), Glosario, Introducción, Límites del sistema, Matriz de trazabilidad (resumen), Métricas de éxito, Supuestos (confirmar con el cliente)

### Community 101 - "Dominio: Magic: The Gathering, formato Commander"

Cohesion: 0.33
Nodes (5): Dominio: Magic: The Gathering, formato Commander, Modelo de datos sugerido, Qué NO hacer, Reglas del formato, Validación de mazo (informativa, nunca bloquea)

### Community 102 - "Externos"

Cohesion: 0.33
Nodes (6): Externos, Importadores de mazos (fase 2), Internos, Puntos de integración, Scryfall API, Videollamada externa (fase 1) / LiveKit o WebRTC (fase 2)

### Community 103 - "Requisitos no funcionales"

Cohesion: 0.33
Nodes (6): REQ-15 Rendimiento, REQ-16 Seguridad y privacidad, REQ-17 Usabilidad y accesibilidad, REQ-18 Cumplimiento legal y atribución, REQ-19 Disponibilidad y observabilidad, Requisitos no funcionales

### Community 104 - "vite.config.ts"

Cohesion: 0.40
Nodes (4): vite@^6.1.0, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 107 - "Arquitectura"

Cohesion: 0.67
Nodes (3): Arquitectura, Diagrama de alto nivel, Mapa de componentes

## Knowledge Gaps

- **2 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 565 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `CardDefinition` connect `CardDefinition` to `Cluster 2: starter`, `Cluster 37: deckservice`, `Cluster 6: gamestatesession`, `Cluster 7: db`, `Cluster 8: battlefieldcanvas`, `token.service.ts`, `Cluster 9: cardbadges`, `Cluster 13: app`, `Cluster 47: test`, `shared/src/index.ts`, `Cluster 49: cardimageresolver`, `CardDisplay.tsx`, `Cluster 19: prisma`, `card.ts`, `Tareas`, `CardInstance`, `Estilo visual`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GameStateSession` (e.g. with `3. Servidor de Juego en Tiempo Real (Fase 3 — REQ-2 a REQ-6, REQ-9 a REQ-13, REQ-16)` and `6. Pruebas y Validación (Fase 6 — REQ-2 a REQ-12, REQ-15, REQ-16)`) actually correct?**
  _`GameStateSession` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cluster 0: filter` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._
- **Why does `Requisitos funcionales` connect `Requisitos funcionales` to `Documento de Requisitos — Mesa Virtual de Commander (MTG)`, `Cluster 37: deckservice`, `Cluster 8: battlefieldcanvas`, `Cluster 9: cardbadges`, `Cluster 49: cardimageresolver`, `CardDisplay.tsx`, `Tareas`, `diagnosticsService`, `bulkSyncService`, `Estilo visual`, `processAllCardsLocales`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `CardDefinition` (e.g. with `COMP-8 Gestión de Imágenes y Diagnóstico de Red (Punto 1)` and `REQ-41 Resolución Unificada de URLs de Imágenes sin Manipulación de Texto (Punto 5 de Correcciones del Cliente - A.5)`) actually correct?**
  _`CardDefinition` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Cluster 2: starter` be split into smaller, more focused modules?**
  _Cohesion score 0.07926829268292683 - nodes in this community are weakly interconnected._
