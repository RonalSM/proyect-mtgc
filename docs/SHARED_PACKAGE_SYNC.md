# Estrategia de Sincronización de `packages/shared` entre Repositorios (B3)

**Proyecto:** MTG Commander Sandbox  
**Componente Compartido:** `@mtgc/shared` ([`packages/shared`](../packages/shared))  
**Repositorios involucrados:**
- **Monorepo Principal / Frontend:** `https://github.com/RonalSM/proyect-mtgc` (Despliegue perimetral en Netlify: `https://proyect-mtgc.netlify.app`)
- **Backend / API WebSocket:** Despliegue en Heroku (`https://mtgc-backend-caf950eaa8b4.herokuapp.com` / Git Remote Heroku / Repositorio independiente)

---

## 1. Contexto y Justificación del Desacoplamiento

El frontend y el backend del proyecto poseen arquitecturas de despliegue y ciclos de vida completamente diferentes:
- **Frontend (`apps/web`):** Single Page Application (SPA) en React 18 / Vite. Desplegado en Netlify mediante CD (Continuous Deployment) sobre su CDN global a costo $0.
- **Backend (`apps/server`):** Servidor Fastify 5 en Node.js 22 con WebSockets autoritativos 24/7 y base de datos PostgreSQL gestionada en Heroku (Basic Dyno).

Para evitar que los dos servicios diverjan en los esquemas de validación de datos, tipos de mensajes en tiempo real o reglas de Commander, el paquete `@mtgc/shared` actúa como la **Única Fuente de Verdad (Single Source of Truth - SSOT)**.

---

## 2. Contenido Crítico de `packages/shared`

El paquete compartido encapsula todos los contratos de interfaz que no deben desincronizarse bajo ninguna circunstancia:

1. **Modelos y Estados de Juego ([`types.ts`](../packages/shared/src/types.ts)):**
   - `RoomState`, `PlayerState`, `CardInstance`, `InitiativeState`.
   - Máquina de estados: `'lobby' | 'initiative' | 'mulligan' | 'playing' | 'finished'`.
   - Coordenadas de tablero normalizadas $(x, y \in [0, 1])$ y orden de apilado $z$.
2. **Protocolo WebSocket ([`schemas.ts`](../packages/shared/src/schemas.ts)):**
   - Esquemas Zod para todos los mensajes del cliente (`WSClientMessage`): `JOIN_ROOM`, `SELECT_DECK`, `PLAYER_READY`, `ROLL_INITIATIVE`, `KEEP_HAND`, `MULLIGAN`, `MOVE_CARD`, `TAP_CARD`, `ADD_COUNTER`, `CREATE_TOKEN`, `CLONE_CARD`, `REVEAL_CARD`, `SET_TURN_ORDER`, etc.
   - Esquemas Zod para eventos del servidor (`WSServerMessage`): `ROOM_STATE`, `INITIATIVE_ROLLED`, `ERROR`, `PLAYER_JOINED`, `PLAYER_LEFT`.
3. **Reglas de Commander ([`format-rules.ts`](../packages/shared/src/format-rules.ts), [`deck-parser.ts`](../packages/shared/src/deck-parser.ts)):**
   - Validación de 100 cartas exactas, comandante legendario, regla singleton (1 copia de cada carta salvo tierras básicas) e identidad de color estricta.
4. **Identidad Visual ([`color-palette.ts`](../packages/shared/src/color-palette.ts)):**
   - Paleta de 6 colores con contraste WCAG AA (`getPlayerColor()`) utilizada tanto por el servidor para asignar el color del asiento como por el cliente para los contenedores de los jugadores.

---

## 3. Mecanismo de Sincronización para Evitar Divergencias

Para mantener la paridad absoluta entre repositorios sin duplicar código ni permitir desfasajes accidentales, se establecen las siguientes reglas operativas:

### 3.1. Regla Canónica de Modificación
- **El Monorepo Principal es el único autoritativo:** Ningún cambio en tipos, esquemas Zod o contratos de API debe originarse en el repositorio aislado del backend. Todos los cambios se desarrollan, tipan y prueban primero en `packages/shared` del monorepo principal.

### 3.2. Estrategia 1: Exportación mediante Git Subtree (Flujo Primario)
El monorepo cuenta con un flujo de sincronización mediante `git subtree` que permite extraer y empujar el historial de `packages/shared` directamente al repositorio del backend:

```bash
# 1. En el monorepo principal, extraer el commit de shared a una rama temporal
git subtree split --prefix=packages/shared -b shared-latest

# 2. Empujar los cambios directamente al remoto del backend
git push git@github.com:RonalSM/proyect-mtgc-backend.git shared-latest:shared-sync

# 3. En el repositorio del backend, fusionar la rama sincronizada
git checkout main
git merge shared-sync --allow-unrelated-histories -m "chore: sync @mtgc/shared contract"
```

### 3.3. Estrategia 2: Script Automatizado de Sincronización (`scripts/sync-shared.js`)
Para entornos locales o pipelines de despliegue directo a Heroku, se utiliza el script de sincronización espejo:

```javascript
// scripts/sync-shared.js
const fs = require('fs-extra');
const path = require('path');

const SOURCE_SHARED = path.resolve(__dirname, '../packages/shared');
const TARGET_BACKEND_SHARED = process.env.BACKEND_REPO_PATH 
  ? path.resolve(process.env.BACKEND_REPO_PATH, 'packages/shared')
  : null;

if (TARGET_BACKEND_SHARED && fs.existsSync(TARGET_BACKEND_SHARED)) {
  fs.copySync(SOURCE_SHARED, TARGET_BACKEND_SHARED, {
    overwrite: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('dist')
  });
  console.log('✅ @mtgc/shared synchronized successfully to backend repository.');
}
```

### 3.4. Estrategia 3: Automatización en CI/CD (GitHub Action `sync-contracts.yml`)
En cada `push` a la rama `main` del monorepo que incluya modificaciones en `packages/shared/**`:
1. El job de CI compila y ejecuta las pruebas de `packages/shared` (`npm test --workspace=@mtgc/shared`).
2. Si las pruebas pasan, un Personal Access Token (PAT) autenticado clona el repositorio del backend, copia el contenido de `packages/shared/`, genera un commit con el hash del commit padre (`sync: @mtgc/shared from RonalSM/proyect-mtgc@<sha>`) y realiza el push automático a la rama de despliegue de Heroku.

---

## 4. Verificación de Compatibilidad y Prevención de Rompimiento

Para garantizar que un cambio en `@mtgc/shared` no rompa clientes antiguos o servidores desactualizados:
1. **Versionado de Esquemas:** Todo cambio en los esquemas de WebSocket o estado de sala debe ser aditivo (campos opcionales con valores predeterminados) o incluir incremento de versión en `roomState.version`.
2. **Validación Zod Bidireccional:** Si el servidor recibe un payload que no cumple el esquema Zod de `@mtgc/shared`, responde con un mensaje `ERROR` estructurado (`INVALID_PAYLOAD`) en lugar de provocar una excepción no capturada.
3. **Auditoría Continua:** En cada ronda de auditoría de especificaciones (`spec-conformance-audit`), se verifica que la suma de verificación (checksum) de los archivos `.ts` en `packages/shared` coincida con la versión desplegada en producción.
