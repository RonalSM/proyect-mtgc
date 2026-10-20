# Mesa Virtual de Commander (MTG) ⚔️

Plataforma web tipo **sandbox en tiempo real** para jugar Commander (Magic: The Gathering) entre 2 y 6 jugadores, diseñada con arquitectura de servidor autoritativo, filtrado de información oculta anti-trampas, sincronización bidireccional vía WebSockets y rendimiento ultra-rápido.

---

## 🌟 Características Principales

- **Sandbox Multijugador (2 a 6 jugadores)**: Sin motor de reglas forzado; máxima libertad de juego como en una mesa física.
- **Seguridad y Anti-Cheat**: Filtrado de información en el servidor. Las cartas de manos y bibliotecas de los oponentes nunca se envían al cliente.
- **Integración con Scryfall**: Búsqueda autocompletada, importación masiva mediante endpoint `/cards/collection` respetando estrictamente el límite de tasa (75 ms de cola con backoff exponencial).
- **Validador de Mazos de Commander**: Valida formato de 100 cartas, regla de singleton (1 copia salvo tierras básicas) e identidad de color respecto al comandante.
- **Contadores de Juego**:
  - Vida central con botones rápidos $\pm 1$ y $\pm 5$.
  - Matriz de daño de comandante individual (derrota al recibir 21 de un mismo comandante).
  - Contadores de veneno (derrota al acumular 10), energía, experiencia y commander tax ($+2$ por casteo).
- **Zonas y Tablero**: Biblioteca, Mano privada, Campo de batalla interactivo con rotación de 90° (girar/enderezar), Cementerio, Exilio y Zona de comando.
- **Acciones y Azar Criptográfico**:
  - Barajado de mazo con CSPRNG (`crypto.randomBytes`).
  - London Mulligan automatizado.
  - Tirada de dados segura (D20, D6, D2 / moneda) con log visible para todos los jugadores.
  - Botón "Deshacer" para revertir la última acción por jugador.
- **Rendimiento Comprobado**: p95 de latencia de **0.22 ms** bajo carga de 500 mesas concurrentes (2,000 jugadores simultáneos).
- **Resilencia y Reconexión**: Reserva de asiento por 10 minutos en caso de desconexión accidental, con reconexión transparente usando código de 6 caracteres.

---

## 🏗️ Arquitectura del Monorepo

```
.
├── apps/
│   ├── web/                     # Frontend SPA (React 18 + Vite + Tailwind CSS + Lucide)
│   │   ├── e2e/                 # Pruebas End-to-End con Playwright (4 jugadores simultáneos)
│   │   ├── nginx.conf           # Configuración de proxy inverso Nginx para producción
│   │   └── Dockerfile           # Dockerfile multi-stage para despliegue web
│   └── server/                  # Backend autoritativo (Fastify + TypeScript + WebSockets)
│       ├── prisma/              # Esquema de base de datos PostgreSQL
│       ├── src/
│       │   ├── game/            # GameStateSession, RoomManager, VisibilityFilter, CSPRNG
│       │   ├── services/        # ScryfallService, BulkSyncService, CardSearchService, AuthService
│       │   └── index.ts         # Servidor HTTP/WS, rutas REST, autenticación, métricas
│       ├── test/                # Pruebas unitarias, integración, seguridad y benchmark de carga
│       └── Dockerfile           # Dockerfile multi-stage para backend
├── packages/
│   └── shared/                  # Librería compartida (Esquemas Zod, tipos TypeScript, parseador)
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 para desarrollo local
├── docker-compose.prod.yml      # Stack completo de producción (Postgres, Redis, Server, Web)
├── tasks.md                     # Plan maestro y estado de desarrollo
└── README.md
```

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos

- **Node.js**: v20+ (recomendado v22+)
- **npm**: v10+
- **Docker** (para bases de datos locales)

### 2. Instalación y dependencias

```bash
npm install
```

### 3. Configuración de variables de entorno

```bash
cp .env.example .env
```

### 4. Iniciar base de datos local (PostgreSQL + Redis)

```bash
docker compose up -d
```

### 5. Compilar librerías compartidas

```bash
npm run build --workspace=@mtgc/shared
```

### 6. Ejecutar servidor y cliente en modo desarrollo

```bash
npm run dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API & WebSockets**: [http://localhost:3001](http://localhost:3001)

---

## 📖 Manual del Jugador ("Cómo Jugar una Mesa")

### 1. Crear o Unirse a una Sala

1. Abre la plataforma web en tu navegador.
2. **Para ser Anfitrión**: Haz clic en **"Crear Nueva Mesa"**, asigna un nombre a la partida, elige tu apodo y el número de jugadores (2 a 6). El sistema generará un **código alfanumérico único de 6 caracteres** (ej. `FW6KYE`).
3. **Para Unirte**: Haz clic en **"Unirse con Código"**, escribe el código de 6 caracteres y tu apodo. También puedes marcar la casilla **"Unirse como Espectador"** para observar la partida sin ocupar asiento.

### 2. Cargar tu Mazo

1. En la parte superior de la mesa, haz clic en **"Cargar Mazo"** (o en la pestaña **"Validador de Mazos"**).
2. Pega tu lista de cartas exportada desde Moxfield, Archidekt o MTGO (ej. `1 Sol Ring`, `1 Atraxa, Praetors' Voice *CMDR*`).
3. La aplicación valida automáticamente las 100 cartas, la regla de singleton y la identidad de color.
4. Al hacer clic en **"Cargar Mazo en la Mesa"**, tu comandante se colocará en la Zona de Comando, tu biblioteca se barajará con aleatoriedad criptográfica y robarás automáticamente tu mano inicial de 7 cartas.

### 3. Jugar en el Tablero

- **Bajar cartas**: Arrastra o pulsa sobre una carta de tu mano para moverla al campo de batalla.
- **Girar / Enderezar**: Haz clic sobre cualquier carta en tu campo de batalla para girarla 90° (tap) o enderezarla (untap).
- **Enderezar Todo**: Haz clic en el botón **"Enderezar Todo"** al inicio de tu turno para enderezar todos tus permanentes de una sola vez.
- **Contadores de cartas**: Utiliza los controles de la carta para colocar contadores $+1/+1$ o marcadores personalizados.
- **Rendir cuentas de vida**: Usa los botones $+1$, $-1$, $+5$ y $-5$ en tu tarjeta de jugador.
- **Daño de comandante**: Despliega la sección de daño de comandante y suma el daño recibido por cada comandante rival.
- **Tirar dados**: Usa el menú **"Dados"** para tirar un D20, D6 o lanzar una moneda. El resultado se mostrará en el log para todos los jugadores.
- **Deshacer**: Si te equivocaste de botón o robaste sin querer, presiona **"Deshacer"** para revertir tu última acción.
- **Pasar turno**: Presiona **"Pasar Turno"** para transferir el turno activo al siguiente jugador en el orden de la mesa.

---

## 🚢 Despliegue en Producción

### Despliegue con Docker Compose

1. Configura el archivo `.env.production`:

   ```bash
   cp .env.production.example .env.production
   # Edita las contraseñas seguras y el dominio en .env.production
   ```

2. Construye e inicia todos los contenedores en modo producción:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. El contenedor Nginx (`mtgc-web`) expondrá el puerto 80 con:
   - Archivos estáticos optimizados con compresión Gzip y encabezados de seguridad.
   - Proxy inverso transparente para `/api/` y WebSockets `/ws/` al backend Fastify.

---

## 🃏 Mazos Listos de Commander (Presets)

La plataforma incluye entre 6 y 8 mazos de Commander predeterminados, 100% legales y jugables (Mono-Red, Mono-Green, Azorius, Golgari, Boros, Izzet, Esper e Incoloro), listados de forma prioritaria en la sala de espera con arte de comandante, colores y lista plegable.

### Cómo Añadir Nuevos Mazos Listos

Para añadir nuevos mazos predeterminados a la plataforma:
1. Crea un archivo `.txt` en la carpeta `apps/server/prisma/seed/preset-decks/` (por ejemplo `09-mi-nuevo-mazo.txt`).
2. Sigue el formato estándar con encabezados en español o inglés:
   ```txt
   // Comandante
   1 Nombre del Comandante *CMDR*

   // Mazo
   1 Sol Ring
   1 Arcane Signet
   ... (hasta completar 99 cartas de mazo)
   ```
3. Ejecuta la siembra y validación automática:
   ```bash
   npm run seed:presets --workspace=@mtgc/server
   ```
   El script validará automáticamente que el mazo tenga exactamente 100 cartas, respete la regla singleton y la identidad de color de Commander.
4. Al reiniciar el servidor o entrar a la sala de espera, el nuevo mazo aparecerá inmediatamente en la pestaña **Mazos Listos** con su arte, colores e idioma en español.

---

## 📊 Observabilidad y Monitoreo

El servidor incluye endpoints de salud y observabilidad en tiempo real:

- `GET /health` y `GET /api/health`: Comprobación rápida para balanceadores de carga y sondas de Docker/Kubernetes.
- `GET /api/metrics`: Métricas de producción estructuradas en JSON:
  ```json
  {
    "uptimeSeconds": 3600,
    "activeRooms": 12,
    "activePlayers": 48,
    "memory": {
      "rssMb": 85,
      "heapTotalMb": 42,
      "heapUsedMb": 28
    },
    "nodeVersion": "v20.18.0",
    "platform": "linux",
    "timestamp": "2026-10-12T21:45:00.000Z"
  }
  ```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite integral de pruebas que cubren todos los niveles:

```bash
# 1. Pruebas unitarias y de integración del backend
npm test --workspace=@mtgc/server

# 2. Pruebas unitarias de esquemas y parser
npm test --workspace=@mtgc/shared

# 3. Pruebas de carga (500 mesas simultáneas / 2,000 jugadores)
node --import tsx --test apps/server/test/load-benchmark.test.ts

# 4. Pruebas End-to-End con Playwright (4 clientes en vivo)
npm run test:e2e --workspace=@mtgc/web
```

---

## ⚖️ Avisos Legales y Privacidad

- **No afiliado con Wizards of the Coast**: Este software es un proyecto no comercial para aficionados bajo la [Política de Contenido de Fans de Wizards of the Coast](https://company.wizards.com/en/legal/fancontentpolicy). Magic: The Gathering, sus expansiones, símbolos y nombres de cartas son marcas registradas y derechos de autor de Wizards of the Coast LLC, una subsidiaria de Hasbro, Inc.
- **Atribución de Scryfall**: Los datos de cartas e imágenes son proporcionados por la API pública de [Scryfall](https://scryfall.com/).
- **Privacidad y RGPD**: No comercializamos datos personales ni usamos cookies publicitarias o rastreadores de terceros. Los usuarios pueden solicitar la eliminación total de sus datos y cuentas en cualquier momento.
