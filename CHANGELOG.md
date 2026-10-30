# Changelog del Proyecto MTG Commander (EDH)

Todas las modificaciones notables a la arquitectura, infraestructura y lógica de juego están documentadas en este archivo.

## [Infraestructura & Créditos Estudiantiles] - 2026-10-30

### Crédito GitHub Student Developer Pack (Heroku)
- **Fecha de activación del crédito:** 29 de octubre de 2026
- **Fecha de vencimiento:** 29 de octubre de 2027 (12 meses de vigencia)
- **Crédito mensual otorgado:** \$13.00 USD / mes (\$156.00 USD en total)
- **Costo operativo actual de infraestructura en Heroku:**
  - Dyno `web` (Basic): \$5.00 USD / mes (\$0.007 / hora)
  - Heroku Postgres (Essential-0 / Mini): \$5.00 USD / mes
  - **Total mensual:** \$10.00 USD / mes
  - **Margen / Excedente a favor:** +\$3.00 USD / mes
- **Plan de contingencia al vencimiento del crédito (Octubre 2027):**
  1. **Opción A (VPS dedicado en Hetzner / DigitalOcean):** Servidor de \$4.00–\$6.00 USD/mes con Docker Compose (Postgres + Node.js backend). Elimina la naturaleza efímera del dyno y las restricciones de inactividad de 55 segundos de Heroku router.
  2. **Opción B (Render / Railway):** Contenedor gestionado de \$5.00 USD/mes manteniendo la base de datos externa.

---

## [Ronda de Producción: Bloque A3] - 2026-10-30

### Corregido / Agregado
- **A3.1 Memoria en sincronización real:** Sincronización de Scryfall acotada mediante contrapresión de streaming (`stream.pause()` / `stream.resume()`), lote reducido a 250 cartas y límite de heap de 280MB en `Procfile`. Pico de memoria RSS medido en producción: **319 MB** (lejos de los 1.352 MB iniciales y sin alertas R14).
- **A3.2 Verificación de inactividad:** Soporte en `smoke:prod` para auditoría de inactividad de 15 y 30 minutos sin desconexión de sockets (H15).
- **A3.3 Redes compartidas y CGNAT:** Clave de limitación de tasa individualizada por token de invitado (`x-guest-token`, JWT o cookie) con fallback a IP. Tope de conexiones WebSocket por IP elevado a 30 (manteniendo el tope de 12 por mesa). Verificado con 6 clientes simultáneos desde la misma IP.
- **A3.4 Persistencia continua del estado de juego:** Almacenamiento continuo en PostgreSQL (`room_snapshots`) tras cada mutación transmitida. Verificada la restauración completa de vidas, posición de cartas en mesa, manos, bibliotecas y orden de turnos tras `heroku ps:restart`. Limpieza automática de instantáneas inactivas de más de 24 horas.
- **A3.5 Registro de licencias y créditos:** Formalización de fechas y planes de infraestructura en `CHANGELOG.md`.
