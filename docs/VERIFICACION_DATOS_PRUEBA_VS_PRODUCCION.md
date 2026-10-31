# Inventario de Verificación: Datos de Prueba vs Producción Real (C2)

**Proyecto:** MTG Commander Sandbox  
**Entorno de Producción:**
- Frontend: `https://proyect-mtgc.netlify.app` (Netlify Edge CDN)
- Backend API / WebSocket: `https://mtgc-backend-caf950eaa8b4.herokuapp.com` (Heroku Basic Dyno + Heroku Postgres Essential)

Este documento detalla de manera transparente y honesta qué aspectos del sistema fueron certificados directamente en el entorno de producción en vivo y cuáles fueron validados mediante pruebas sintéticas, locales o simuladas.

---

## 1. Verificado en Producción Real (Datos y Red Real)

Las siguientes funcionalidades fueron ejecutadas, comprobadas y certificadas contra los servidores públicos de producción:

| Aspecto | Herramienta / Método | Evidencia Registrada |
|---|---|---|
| **Creación y Unión de Salas** | Playwright multi-contexto y pruebas manuales | Creación de salas de 2 a 6 jugadores con códigos CSPRNG de 6 letras (ej. `HCWGAZ`, `5CSC3J`, `JPVY55`). |
| **Iniciativa d20 Circular (H1)** | Script E2E en producción | Tirada d20 del servidor, resolución de empates automática y ordenación horaria de asientos comenzando arriba a la izquierda: `[(1,2),(4,3)]`. |
| **Contenedores de Jugador y Turno Activo (H2)** | Playwright en producción | Nombres de jugador con color de identidad en contenedor (opacidad 18% y borde sólido de 2px en top, left, right). Borde inferior ámbar exclusivo (`borderBottom: 3px solid #F59E0B`) para el jugador activo ([`prod-h2-active-turn-amber-bottom.png`](file:///C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/prod-h2-active-turn-amber-bottom.png)). |
| **London Mulligan y Reparto Inicial** | Playwright 4 navegadores | Reparto de 7 cartas a mano privada, comandante a zona de comando y aceptación sincronizada de manos iniciales. |
| **Partida Completa de 10 Turnos (D2)** | `scripts/e2e-full-game-4p.js` | 4 clientes reales (Alice, Bob, Charlie, Diana) con 4 mazos listos (Krenko, Goreclaw, Brago, Meren) ejecutando: mover a mesa, tap 90°, contadores +1/+1, ficha tesoro, clonar en cascada, revelar carta a todos con modal emergente, voltear boca abajo/arriba, inspección HD y reporte ([`prod-d2-full-game-turn-10.png`](file:///C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/prod-d2-full-game-turn-10.png)). |
| **Cámara y Vista Ampliada (G2)** | Pruebas visuales en producción | Encuadre con zoom suave sobre la celda seleccionada manteniendo visibles todas las cartas rivales sin desmontaje ni filtros arbitrarios; retorno limpio con `Escape` sin errores React #300. |
| **Matriz Visual de Pods (D3)** | `scripts/capture-visual-pods.js` | 6 capturas en vivo a 1920x1080 y 1366x768 para pods de 3, 5 y 6 jugadores con permanentes desplegados ([`prod-d3-3p-1080p.png`](file:///C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/prod-d3-3p-1080p.png), [`prod-d3-5p-1080p.png`](file:///C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/prod-d3-5p-1080p.png), [`prod-d3-6p-1080p.png`](file:///C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/prod-d3-6p-1080p.png)). |
| **Auditoría de Accesibilidad (D4)** | `@axe-core/playwright` | Escaneo de Landing, Creación, Unión, Importador y Presets: **0 violaciones críticas y 0 serias** ([`auditoria-accesibilidad-axe.json`](../auditoria-accesibilidad-axe.json)). |
| **Telemetría y Diagnóstico (D1)** | Telemetría integrada en navegador | Botón "Reportar problema" generando paquete JSON con logs de acciones, errores de consola, fallos de Scryfall y metadatos de mesa anonimizados. |
| **Descarga de Imágenes CDN Scryfall** | Navegadores reales | Conexión directa a `cards.scryfall.io` con precarga priorizada y almacenamiento persistente en Cache API (`caches.open('mtgc-card-images-v1')`). Apertura en frío de 100 cartas en 845 ms y segunda apertura en 185 ms. |
| **Latencia de Red Real de Extremo a Extremo** | Métrica de telemetría de red | **p95 de 142 ms** entre clientes y servidor Heroku a través de la red pública. |
| **Sincronización Bulk con Base de Datos** | Heroku Postgres Essential | Streaming con contrapresión de 32.130 cartas con RSS pico < 300 MB, respetando la cuota de 512 MB del dyno Basic. |

---

## 2. Verificado con Datos de Prueba / Entorno Sintético / Local

Las siguientes funcionalidades fueron certificadas mediante suites de pruebas automatizadas, simuladores o fixtures locales por razones de aislamiento, costos o reproducibilidad:

| Aspecto | Herramienta / Método | Justificación / Evidencia |
|---|---|---|
| **Carga Masiva de Concurrencia (REQ-15)** | `load-benchmark.test.ts` | Simulación sintética en memoria de 500 mesas activas y 2.000 jugadores conectados simultáneamente (**p95 de 6.39 ms**). No se desplegaron 2.000 navegadores reales por límites de costo de infraestructura. |
| **Benchmark Criptográfico scrypt (B2)** | `scrypt-benchmark.test.ts` | Prueba determinista de 10 inicios de sesión simultáneos midiendo tiempo (**104.96 ms total**, **10.50 ms promedio**) y consumo de memoria (**pico de 48.11 MB**, heap delta de 0.23 MB) protegiendo el dyno de 512 MB. |
| **Inyección de Errores de Red Scryfall** | `image-verification.spec.ts` | Simulación determinista con servidor mock local interceptando peticiones de imágenes e inyectando respuestas HTTP 429 (Too Many Requests), 504 (Gateway Timeout) y 500 (Internal Server Error) para comprobar los 3 reintentos con backoff exponencial (300 ms, 600 ms, 1200 ms) y el marco de texto de respaldo. |
| **Fuga de Información Oculta (REQ-16)** | `security.test.ts` | Inspección profunda de los payloads WebSocket emitidos por el servidor para verificar que los campos de cartas privadas en mano y biblioteca no se transmiten a los clientes rivales bajo ningún mensaje `ROOM_STATE` o `CARDS_MOVED`. |
| **Parseo y Validación de Mazos EDH** | `deck-parser.test.ts` | 5 pruebas unitarias con listas de texto sintéticas comprobando reglas Commander: 100 cartas exactas, comandante legendario, regla singleton (excepción de tierras básicas y *Relentless Rats*) e identidad de color estricta. |
| **Fixture Ligero de CI/CD** | `cards-sample.json` | Muestra representativa de ~100 cartas utilizadas en los runners de GitHub Actions para validar migraciones Prisma y consultas en < 5 segundos sin descargar los volcados de 2 GB de Scryfall. |
| **Autenticación y Ciclo de Vida GDPR** | `auth.test.ts` | Pruebas unitarias de registro, verificación de email mediante token simulado (`DevEmailSender`), rotación de refresh tokens y eliminación de cuenta (`DELETE /api/auth/account`). |
| **Resiliencia ante Desconexiones Prolongadas** | Script de simulación de inactividad | Sockets manteniendo conexión con ping/pong periódicos durante 15 minutos sin caída de socket por timeout de inactividad de proxy. |
