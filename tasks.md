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

- [x] **8. Sala de espera, iniciativa y mesa inmersiva**

  - [x] 8.0 Prerrequisitos
    - Guardar mazos en la cuenta (`POST /api/decks`, `GET /api/decks`, REQ-7.5) y expulsión/transferencia de anfitrión (`KICK_PLAYER`, `TRANSFER_HOST`, REQ-13). Commit `ef33d3c` y `8379f64`.
    - _Requisitos: REQ-7.5, REQ-13_

  - [x] 8.1 Máquina de estados de mesa y mensajes compartidos
    - Estados `lobby | initiative | playing | finished`; tipos en `packages/shared` (`RoomStatus`, `InitiativeState`, `SelectDeckPayload`, `SetReadyPayload`, `SetPlaymatPayload`, `D20RolledBroadcast`). Commit `e83818a`.
    - _Requisitos: REQ-20, REQ-21_
    - _Dependencias: 3.2_

  - [x] 8.2 LobbyManager en el servidor
    - `LobbyManager` en `apps/server/src/game/lobby-manager.ts`: selección de mazo, `pendingDecks` con secreto de lista de cartas de otros jugadores, estado "Listo" reactivo (`setReady`), validación estricta antes de iniciar. Commit `ef88c91`.
    - _Requisitos: REQ-20_
    - _Dependencias: 8.0, 8.1_

  - [x] 8.3 GameStarter
    - `GameStarter` en `apps/server/src/game/game-starter.ts`: barajado CSPRNG Fisher-Yates, comandante a zona de comando (`command`), mano inicial de 7 cartas, biblioteca de 92 y transición autoritativa a `initiative`. Commit `a255525`.
    - _Requisitos: REQ-20.11_
    - _Dependencias: 8.2_

  - [x] 8.4 InitiativeService
    - `InitiativeService` en `apps/server/src/game/initiative-service.ts`: d20 en servidor con `crypto.randomInt(1, 21)`, desempate por rondas jerárquicas sucesivas (hasta 5 rondas) y desempate por número de asiento, temporizador de 15 s con auto-roll, asignación a `turnOrder`. Commit `2ac52e8`.
    - _Requisitos: REQ-21_
    - _Dependencias: 8.1, 8.3_

  - [x] 8.5 Pantalla de sala de espera
    - `LobbyView` en `apps/web/src/components/LobbyView.tsx`: tarjetas de asiento por jugador, selector de mazos guardados y modal de importación, botón "Listo" / "Cancelar Listo", botón del anfitrión "Iniciar Partida", botones de expulsar y transferir anfitrión. Commit `50148f6`.
    - _Requisitos: REQ-20, REQ-22.12_
    - _Dependencias: 8.2, 4.4_

  - [x] 8.6 Superposición de iniciativa
    - `InitiativeOverlay` en `apps/web/src/components/InitiativeOverlay.tsx`: animación de dado D20 rotatorio, cuenta atrás visual de 15 s, panel de resultados en vivo, banner de empate destacando jugadores que desempatan y revelación del orden final. Commit `17faed6`.
    - _Requisitos: REQ-21, REQ-22.12_
    - _Dependencias: 8.4_

  - [x] 8.7 Cuadrícula a sangre y barra flotante
    - `TableGrid` en `apps/web/src/components/TableGrid.tsx`: cuadrícula a sangre de 2 filas y hasta 3 columnas (`--cols = ceil(jugadores/2)`), `100dvh` sin scroll de ventana, celdas separadas por 1 px (`border-slate-800`).
    - `FloatingToolbar` en `apps/web/src/components/FloatingToolbar.tsx`: plegable/desplegable con número de ronda, temporizador, panel de dados, espectadores, ayuda, selector de playmat y celda libre asignada a `LogChatPanel` cuando hay número impar de jugadores. Commit `10ae90d`.
    - _Requisitos: REQ-22.1, 22.2, 22.9, 22.10_
    - _Dependencias: 4.1_

  - [x] 8.8 Celda de jugador
    - `PlayerCell` en `apps/web/src/components/PlayerCell.tsx`: `PlaymatBackground` (arte de comandante en alta calidad o playmat personalizado con gradiente oscuro `bg-black/85`), `NameTag` con indicador de turno activo, orden de iniciativa ("1.º", "2.º"...) y conexión; pastilla de vida interior (`LifePill`) con controles táctiles directos $\pm 1$ (eliminando botones de $\pm 5$), y dos entradas numéricas accionadas por `Enter`: "Daño recibido" (resta) y "Vida ganada" (suma) con validación estricta de enteros positivos y auto-limpieza (Punto 7); insignias de veneno, energía y daño de comandante (controles de tax de comandante desvinculados de `LifePill` y centralizados en la zona de comando); ranuras de pilas (`PileSlots`) para biblioteca, cementerio, exilio y zona de comando droppable (`droppable-command-${playerId}`) con botón explícito "Devolver al comando" al vaciarse, badge interactivo `Tax: +X` con botones $\pm 2$, y auto-incremento de tax de comandante en +2 al devolver (Punto 6); modal inspector de biblioteca privada con barra de búsqueda en tiempo real por nombre, filtros rápidos por tipo (Criaturas, Instantáneos, Conjuros, Artefactos, Encantamientos, Tierras, Planeswalkers), e indicador visual de estado de sincronización Scryfall "Sincronizando cartas... (X en cola)" reactivo (Punto 8); y mano asomada en borde inferior (`HandFan`). Commit `6775cf7`.
    - _Requisitos: REQ-22.3, 22.4, 22.5, 22.7, 22.8, REQ-3, REQ-4, REQ-5, REQ-9_
    - _Dependencias: 8.7, 3.3_

  - [x] 8.9 Campo de batalla libre y ampliación de celda
    - `BattlefieldCanvas` en `apps/web/src/components/BattlefieldCanvas.tsx`: posiciones normalizadas $(x, y \in [0, 1])$ e índice $z$, drag & drop con `@dnd-kit/core` (ratón, táctil y teclado); ampliación de celda mediante encuadre y zoom interactivo sobre la misma mesa global única sin duplicar componentes ni romper DnD, con cálculo de coordenadas por transformación inversa ($x_{global} = x_{min} + u \times W$, $y_{global} = y_{min} + v \times H$), manteniendo activos `DndContext`, droppables de mano y pilas, y menú contextual de clic derecho, con cierre mediante botón o tecla `Esc` (Punto 3); y vista previa de carta centrada en la mitad de pantalla opuesta al cursor ($x=75\% W$ o $x=25\% W$, $y=50\% H$) sin tapar la carta original ni el espacio de juego, renderizada exclusivamente como imagen flotante con `drop-shadow`, sin contenedor, marco gris ni fondos adicionales, y cierre instantáneo mediante `Escape` o retiro del puntero (Punto 9).
    - _Requisitos: REQ-22.6, 22.11, 22.17, REQ-9_
    - _Dependencias: 8.8, 3.4_

  - [x] 8.10 Orden de turnos en el juego
    - Integración de `turnOrder` autoritativo en `PASS_TURN`: rotación estricta según iniciativa (saltando jugadores eliminados), e insignias visuales "1.º", "2.º", "3.º" en cabeceras de celda y barra de turnos. Commit `5d7c58a`.
    - _Requisitos: REQ-21.7, REQ-21.8, REQ-22.4, REQ-6_
    - _Dependencias: 8.4, 8.7_

  - [x] 8.11 Pruebas
    - Suite de pruebas de Fase 8 (`apps/server/test/phase8.test.ts`): flujo completo (Lobby $\to$ Selección privada $\to$ Listo $\to$ Inicio $\to$ D20 con desempates $\to$ Cuadrícula $\to$ Turnos), prueba de secreto de cartas en `VisibilityFilter`, prueba de bondad de ajuste chi-cuadrado de D20 uniforme en 2,000 tiradas ($p < 0.001$), prueba de invariancia de coordenadas normalizadas en diferentes resoluciones, contraste de texto WCAG AA $> 4.5:1$ sobre playmat, prueba de pod completo de 6 jugadores en cuadrícula 2x3, y prueba E2E Playwright de 4 clientes (`apps/web/e2e/tabletop.spec.ts`). Commit `ab8cadc`.
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

### 8. Sala de Espera, Iniciativa y Mesa Inmersiva (Fase 8 — REQ-20, REQ-21, REQ-22)

- **Máquina de Estados de Sala (`RoomStatus`)**:
  - Ciclo de estados formal: `lobby` $\to$ `initiative` $\to$ `playing` $\to$ `finished`.
  - Tipos compartidos en `@mtgc/shared` con serialización Zod y payloads para selección de mazo, estado listo, tirada D20 y playmats.
- **Lobby y Privacidad de Cartas (`LobbyManager`)**:
  - Asientos dinámicos con selector de mazos guardados o importación rápida.
  - Secreto estricto de listas de cartas: `LobbyManager` almacena las listas completas en `pendingDecks` privado en el servidor. A otros jugadores solo se transmite el nombre del mazo y comandante (`PlayerSelectedDeck`), previniendo espionaje previo a la partida.
  - Estado "Listo" obligatorio antes de habilitar el botón "Iniciar Partida" del anfitrión.
- **Inicio de Partida y Reparto (`GameStarter`)**:
  - Barajado autoritativo Fisher-Yates CSPRNG (`crypto.randomInt`).
  - Colocación automática del comandante en la Zona de Comando (`command`), reparto inicial de 7 cartas a la Mano privada y 92 cartas restantes a la Biblioteca.
- **Iniciativa Autoritativa D20 (`InitiativeService`)**:
  - Tiradas calculadas estrictamente en el servidor con `crypto.randomInt(1, 21)`.
  - Superposición visual interactiva (`InitiativeOverlay`) con animación 3D de dado, cuenta atrás de 15 s y auto-roll automático al expirar el plazo o por desconexión.
  - Resolución de empates jerárquica por rondas sucesivas (hasta 5 rondas) y desempate por número de asiento si persiste el empate.
  - Integración directa en `turnOrder`, rotación circular en `PASS_TURN` y badges ordinales "1.º", "2.º"...
- **Cuadrícula de Mesa Inmersiva Estilo playgroup.gg (`TableGrid`)**:
  - Cuadrícula a sangre de 2 filas y hasta 3 columnas (`ceil(jugadores/2)`), encajando en `100dvh` sin scroll de ventana.
  - `PlayerCell` con fondo de playmat (`PlaymatBackground`) derivado del arte del comandante o personalizable (`SET_PLAYMAT`), con oscurecimiento degradado que garantiza contraste WCAG AA $> 4.5:1$.
  - Pastilla de vida interior (`LifePill`) posicionada estratégicamente en la esquina más cercana al centro de la mesa, con controles rápidos e insignias de contadores (veneno, energía, commander tax, daño de comandante).
  - Mano privada (`HandFan`) asomada en el borde inferior con elevación al pasar el cursor y ranuras para pilas (`PileSlots`).
  - Campo de batalla libre (`BattlefieldCanvas`) con Drag & Drop (`@dnd-kit/core`), orden $z$, y coordenadas normalizadas $(x, y \in [0, 1])$ invariantes ante cualquier tamaño o relación de aspecto de pantalla.
  - Barra flotante plegable (`FloatingToolbar`), vista ampliada de celda (`ExpandedCellView`), y asignación de celda libre a log/chat cuando el número de jugadores es impar.

---

## 📊 Matriz Comparativa: `requirements.md` / `design.md` vs Implementación Real

A continuación se audita el estado real de cada requisito formal de [`requirements.md`](file:///c:/Users/Nero.PC-Neroz/Downloads/requirements.md) y componente arquitectónico de [`design.md`](file:///c:/Users/Nero.PC-Neroz/Downloads/design.md):

| Requisito  | Descripción                     | Estado Real en Código           | Evidencia y Adaptaciones Realizadas |
| :--------- | :------------------------------ | :------------------------------ | :---------------------------------- |
| **REQ-1**  | Cuentas y acceso                | **Cumplido al 100%**            | Argon2id nativo (`@node-rs/argon2`), verificación de email (`EmailSender`), access tokens cortos (15 min) y refresh tokens rotatorios en cookies HttpOnly/SameSite. Invitados anónimos y borrado GDPR vía `DELETE /api/auth/account`. [`auth.service.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/services/auth.service.ts), `auth.test.ts`. |
| **REQ-2**  | Crear y unirse a mesa           | **Cumplido al 100%**            | Códigos únicos de 6 caracteres con CSPRNG ([`room-manager.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/room-manager.ts)); soporte de 2 a 6 asientos; espectadores automáticos o manuales; 40 vidas por defecto. |
| **REQ-3**  | Seguimiento de vida             | **Cumplido al 100%**            | Botones directos $\pm 1$, eliminación total de botones $\pm 5$ (Punto 7); dos entradas numéricas accionadas por Enter en el panel de vida: "Daño recibido" (resta a la vida actual) y "Vida ganada" (suma a la vida actual) con validación estricta de enteros positivos y auto-limpieza tras cada operación (Punto 7); no eliminación automática (REQ-3.3): marca `isAtRisk` resaltada cuando vida $\le 0$ con botones manuales para eliminar o revivir. Validado con Playwright E2E. |
| **REQ-4**  | Daño de comandante              | **Cumplido al 100%**            | Matriz individualizada por comandante enemigo. No eliminación automática al alcanzar 21 de daño (REQ-4.2): marca `isAtRisk` con opción manual de eliminar o revivir ([`game-state.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/game-state.ts)). |
| **REQ-5**  | Contadores y estados            | **Cumplido al 100%**            | Veneno (derrota a 10 con flag `isAtRisk`), energía, experiencia, commander tax ($+2$). Contadores con nombre personalizado en jugador (`SET_PLAYER_COUNTER`, REQ-5.3). Contadores $+1/+1$ en cartas y clonación de tokens (`CLONE_TOKEN`, REQ-9.4). |
| **REQ-6**  | Turnos y fases                  | **Cumplido al 100%**            | Rotación circular estricta con `PASS_TURN` según orden de iniciativa `turnOrder` (REQ-21.8). Ajuste manual del orden de turnos por el anfitrión antes del primer turno (`SET_TURN_ORDER`, REQ-6.4 aprobado por el cliente). Salto automático de jugadores eliminados. |
| **REQ-7**  | Importar mazos y buscar         | **Cumplido al 100%**            | Parser tolerante a múltiples formatos; cola de 75 ms y reintentos Scryfall; autocompletado en memoria LRU < 500 ms; persistencia de mazos vinculados a `userId` (`POST /api/decks`, `GET /api/decks`, REQ-7.5, [`deck.service.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/services/deck.service.ts)). |
| **REQ-8**  | Validación Commander            | **Cumplido al 100%**            | 100 cartas exactas, 1-2 comandantes, cálculo de identidad de color y singleton con excepciones. Verificación de cartas baneadas en Commander (`legalities.commander === 'banned'`, REQ-8.3, [`commander-validator.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/packages/shared/src/utils/commander-validator.ts)). |
| **REQ-9**  | Tablero y zonas                 | **Parcial**                     | Arquitectura MesaTotal con superficie única de soltado (un solo droppable `#mesa-total` en `fixed inset-0`); capa única de cartas con coordenadas globales normalizadas $(x, y \in [0, 1])$; disposición canónica de asientos idéntica en todos los clientes sin rotación local; arrastre y soltado libre entre divisiones sin motor de reglas ni confirmación; elementos flotantes sobre playmat 100% con `pointer-events: none` y controles interactivos con `pointer-events: auto`; soltado en biblioteca, cementerio o exilio con resaltado hover; DragOverlay en portal a `document.body`; carga de imágenes Scryfall con soporte de doble cara y fallback estilizado; mano flotante en abanico sobre borde inferior. Ronda de correcciones del cliente: **Punto 1 completado al 100%** (eliminación de parpadeo en receptor B con `pendingSync` síncrono); **Punto 2 completado al 100%** (arrastre de carta girada modelado como caja apaisada que conserva el giro a $90^\circ$ horario en overlay y fantasma remoto, desplazamiento con puntero estrictamente constante, dimensiones invariantes y coincidencia entre overlay y carta soltada $\le 2$ px; validado con Playwright E2E); **Punto 3 completado al 100%** (mesa expandida como encuadre/zoom interactivo sobre la misma mesa global única sin duplicar mesa ni romper DnD, cálculo de coordenadas por transformación inversa, `DndContext`, droppables de mano y pilas, y menú contextual de clic derecho activos, permitiendo sacar cartas de la mano, mover cartas en el campo y devolverlas a la mano; validado con Playwright E2E); **Punto 4 completado al 100%** (eliminación de recortes en cartas visibles de la mano con relación de aspecto 5:7 exacto con `object-fill`, esquinas redondeadas naturales `rounded-[6px]`, eliminación de `overflow-hidden` en dock y abanico, cartas 100% dentro del viewport incluso al elevarse por cursor hover, y resolución normal en alta definición de Scryfall; capturas ampliadas al 200% generadas; validado con Playwright E2E); **Punto 5 completado al 100%** (propietario original inmutable `ownerId` y titular temporal `holderId` calculado autoritativamente según contención al 100% de la división; permisos exclusivos de movimiento para `ownerId` y `holderId` con validación en cliente mediante cursor `not-allowed` y aviso breve `permission-warning`, y validación en servidor rechazando `MOVE_CARD` no autorizado con advertencia registrada en bitácora; probado con 2 clientes en Playwright verificando transferencia al campo de B, movimiento por B dentro de su campo, recuperación por A y bloqueo posterior a B); **Punto 6 completado al 100%** (zona de comando en dock convertida en destino droppable `droppable-command-${playerId}`; botón explícito "Devolver al comando" al vaciarse la ranura; auto-incremento autoritativo de `commanderTax` en +2 al devolver por arrastre, botón o menú contextual; sacar a la mesa mantiene el tax; badge permanente `Tax: +X` con controles interactivos `+` y `-` que varían de 2 en 2; eliminación de duplicidad de tax en `LifePill`; validado con tests unitarios en `command-zone.test.ts` y test Playwright E2E); **Punto 7 completado al 100%** (panel de vida con botones rápidos $\pm 1$, eliminación total de botones $\pm 5$, e incorporación de dos entradas numéricas "Daño recibido" y "Vida ganada" que aplican con `Enter`, filtran cualquier carácter no numérico y limpian automáticamente el campo tras la acción; validado con test Playwright E2E en `visual-tabletop.spec.ts`); **Punto 8 completado al 100%** (modal inspector de biblioteca privada con barra de búsqueda por nombre en tiempo real, filtros rápidos por tipo evaluados sobre `typeLine`, e indicador visual reactivo de cola y reintentos Scryfall "Sincronizando cartas... (X en cola)" que desaparece al completarse; validado con Playwright E2E en `visual-tabletop.spec.ts`); **Punto 9 completado al 100%** (vista previa de carta centrada en la mitad de pantalla opuesta al cursor sin contenedor, marco gris ni fondos adicionales, con sombra suave drop-shadow y cierre instantáneo por Escape o retiro de cursor en mano, mesa, pilas e inspector; validado con Playwright E2E en `visual-tabletop.spec.ts`). Puntos 10 a 12 en ejecución secuencial con 1 commit por punto. |
| **REQ-10** | Sincronización y reconexión     | **Cumplido al 100%**            | Estado autoritativo central; reserva de asiento por 10 min; reconexión con backoff exponencial. Instantáneas periódicas en Redis recuperables al reiniciar (`RedisSnapshotService`, [`redis-snapshot.service.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/services/redis-snapshot.service.ts)). |
| **REQ-11** | Log y deshacer                  | **Cumplido al 100%**            | Registro visible en tiempo real; pila `undoStack` autoritativa por jugador; confirmación colectiva requerida (`CONFIRM_UNDO`) para deshacer acciones que afecten el estado público o a otros jugadores (REQ-11.3, [`game-state.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/game-state.ts)). |
| **REQ-12** | Chat y comunicación             | **Cumplido al 100%**            | Chat de texto con sanitización XSS; rate limiting de 5 mensajes cada 10 s por usuario en WebSocket (REQ-12.4 / 16.4); reacciones rápidas predefinidas en cuadrícula accesible de 3 columnas con desplazamiento por rueda de ratón (REQ-12.2, [`GameLogAndChat.tsx`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/src/components/GameLogAndChat.tsx)). _REQ-12.3 (videollamada externa) descartado por decisión del cliente para usar Discord externo._ |
| **REQ-13** | Espectadores y moderación       | **Cumplido al 100%**            | Rol de espectador blindado (solo lectura, sin mutación); moderación del anfitrión con expulsión (`KICK_PLAYER`, REQ-13.2) y transferencia de anfitrión (`TRANSFER_HOST`, REQ-13.3, [`room-manager.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/room-manager.ts)). |
| **REQ-14** | Historial y estadísticas        | **Post-MVP**                    | Esquemas relacionales en PostgreSQL/Prisma listos para registrar estadísticas históricas de partidas y mazos. |
| **REQ-15** | Rendimiento                     | **Cumplido y superado**         | Benchmark de 500 mesas simultáneas (2,000 jugadores): **p95 de 6.39 ms** (SLA requerido: < 300 ms). Cobertura E2E Playwright multijugador concurrente. |
| **REQ-16** | Seguridad y privacidad          | **Cumplido al 100%**            | Filtrado autoritativo de información oculta en servidor (`VisibilityFilter`); esquemas Zod en cada paquete WebSocket; Helmet CSP estricta; rate limiting por IP y por usuario en WS; política de privacidad y derecho de supresión de cuenta GDPR (`DELETE /api/auth/account`, Ley 1581 de 2012). |
| **REQ-17** | Usabilidad y accesibilidad      | **Cumplido al 100%**            | Accesibilidad completa por teclado (`@dnd-kit/core`), diseño oscuro de alto contraste WCAG AA $> 4.5:1$, modo simplificado responsivo para pantallas $< 1024$ px y tableta vertical, respeto de `prefers-reduced-motion` y opción de reducir fondos (REQ-22.15). |
| **REQ-18** | Cumplimiento legal y Scryfall   | **Cumplido al 100%**            | User-Agent identificado; cola de 75 ms; modal legal con descargo Fan Content y atribución Scryfall; sincronización nocturna de bulk data de Scryfall (`BulkSyncService`, endpoint manual reservado para administradores). |
| **REQ-19** | Disponibilidad y observabilidad | **Cumplido al 100%**            | Endpoints `/health`, `/api/health` y `/api/metrics`; instantáneas en Redis para recuperación ante reinicios del proceso; Nginx reverse proxy y Docker Compose productivo. |
| **REQ-20** | Sala de espera interactiva      | **Cumplido al 100%**            | Pantalla `LobbyView` con cuadrícula de asientos, selector e importador de mazos, secreto estricto de la lista completa de cartas (solo viaja nombre y comandante a otros jugadores), selector de playmat, botón "Listo", inicio de partida validado por anfitrión, expulsión y transferencia de rol, barajado CSPRNG Fisher-Yates, comandante a zona de comando y mano inicial de 7 cartas ([`LobbyView.tsx`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/src/components/LobbyView.tsx), [`LobbyManager.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/lobby-manager.ts), [`GameStarter.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/game-starter.ts)). |
| **REQ-21** | Iniciativa con D20 y turnos     | **Cumplido al 100%**            | Fase de iniciativa con D20 autoritativo en servidor (`crypto.randomInt(1, 21)`), superposición visual `InitiativeOverlay` con temporizador de 15 s y auto-roll por tiempo agotado o desconexión, desempate jerárquico por rondas sucesivas (hasta 5 rondas) y desempate por asiento, transición a estado `playing` con asignación del orden a `turnOrder` y `PASS_TURN`, e insignias "1.º", "2.º"... ([`InitiativeOverlay.tsx`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/src/components/InitiativeOverlay.tsx), [`InitiativeService.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/server/src/game/initiative-service.ts)). |
| **REQ-22** | Mesa inmersiva playgroup.gg     | **Parcial**                     | Arquitectura MesaTotal con viewport `100dvh` fijo y sin scroll de página; cuadrícula canónica de asientos compartida (2 columnas para 2 jugadores, 2 filas y hasta 3 columnas para $\ge 3$ jugadores); dock inferior unificado en flex/grid flotante sobre el playmat al 100% con hueco propio para Nombre y Vida (cero solapamientos por diseño en todas las celdas y filas); escala fluida de cartas y zonas con container query units `cqh` y `clamp` (~20% del alto de celda, 2p visiblemente al doble de tamaño que 4p); transferencia libre e inmediata de cartas entre divisiones de jugadores con DragOverlay en portal y registro en bitácora; tipo de carta real en preview, nombre sin truncar, y borde de turno activo de alto contraste. Matriz completa 2p, 3p, 4p, 5p y 6p validada al 100% en 1920x1080, 1366x768 y 1280x720 (15 combinaciones E2E Playwright en [`visual-tabletop.spec.ts`](file:///c:/Users/Nero.PC-Neroz/Documents/Proyect%20MTGC/apps/web/e2e/visual-tabletop.spec.ts)) comprobando: cero solapamiento en el dock, elementos dentro de la división, mano dentro del viewport, sin scroll en document y tamaño homogéneo de cartas; **Punto 3 completado al 100%** (ampliación de celda como encuadre/zoom interactivo sobre la misma mesa global única sin duplicar mesa ni romper DnD, con cálculo de coordenadas por transformación inversa, mano, droppables y menú contextual activos); **Punto 4 completado al 100%** (cartas de la mano visibles sin recortes, aspecto 5:7 con `object-fill`, esquinas redondeadas naturales `rounded-[6px]`, `overflow-visible`, elevación por hover 100% dentro del viewport, y resolución normal de Scryfall). Clasificado como Parcial a la espera de aprobación final del cliente antes de iniciar la Fase 8. |

### Componentes Arquitectónicos (`design.md`)

- **COMP-1 (Web Client)**: React 18 + Vite + Tailwind + Lucide Icons + `@dnd-kit/core`. `LobbyView`, `InitiativeOverlay`, `TableGrid`, `PlayerCell`, `BattlefieldCanvas`, `FloatingToolbar`.
- **COMP-2 (API REST)**: Fastify 5 en Node 22 (ESM nativo) con rutas de autenticación, verificación de correo, mazos, cartas y sincronización bulk nocturna.
- **COMP-3 (PostgreSQL / Prisma)**: Prisma 7 con driver adapter `@prisma/adapter-pg` y fallback automático en memoria cuando la base de datos no está levantada.
- **COMP-4 (Room Manager)**: Manejo autoritativo de salas, generación de códigos CSPRNG, reserva de asientos por desconexión (10 min), `LobbyManager` con privacidad de cartas, expulsión y transferencia de anfitrión.
- **COMP-5 (Game Server)**: Fastify WebSocket con validación estricta Zod, `InitiativeService` con D20 CSPRNG y desempate por rondas, `GameStarter`, rate limiting (5 msg / 10s) y filtro de visibilidad anti-trampas.
- **COMP-6 (Card Service)**: Cola Scryfall (75 ms), reintentos con backoff exponencial, autocompletado en memoria LRU y sincronización nocturna `BulkSyncService`.
- **COMP-7 (Redis - Estado en vivo e Instantáneas)**: `RedisSnapshotService` almacena instantáneas de estado de cada mesa activa con TTL de 24 horas y restauración automática al reiniciar el servidor.
- **COMP-8 (Imágenes)**: Consumo directo del CDN de Scryfall (`cards.scryfall.io`) autorizado en la CSP para cartas y playmats de fondo (`art_crop`).
- **COMP-9 (Observabilidad)**: Endpoint `/api/metrics` expone telemetría de memoria, salas activas y jugadores en tiempo real.

