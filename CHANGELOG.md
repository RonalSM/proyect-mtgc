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
- La plataforma de producción se mantiene exclusivamente sobre Heroku y Netlify.

---

## [Ronda de Producción: Bloque A3 y A4] - 2026-10-30

### Corregido / Agregado
- **A3.1 / A4.1 Memoria en sincronización real:** Sincronización de Scryfall acotada mediante contrapresión de streaming (`stream.pause()` / `stream.resume()`), lote reducido y control de memoria para asegurar consumo acotado bajo 300 MB de RSS.
- **A3.2 / A4.2 Verificación de inactividad:** Soporte y ejecución en `smoke:prod` para auditoría de inactividad de 15 minutos sin desconexión de sockets (H15).
- **A3.3 / A4.3 Redes compartidas y seguridad de tokens:** Clave de limitación de tasa basada en verificación criptográfica del token de invitado con tope global por IP para prevenir ataques de fuerza bruta de tokens.
- **A3.4 / A4.4 Persistencia continua del estado de juego:** Almacenamiento optimizado en PostgreSQL (`room_snapshots`) con throttling a máx 1/seg por sala y guardado inmediato en transiciones de turno. Restauración íntegra de zonas (manos, biblioteca ordenada, cementerio, exilio, comando, cartas boca abajo y contadores).
