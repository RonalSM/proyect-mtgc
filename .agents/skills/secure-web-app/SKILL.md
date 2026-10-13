---
name: secure-web-app
description: "Lista de verificación de seguridad para la app web multijugador: autenticación, contraseñas, sesiones y cookies, CSP, rate limiting, validación de entradas, WebSocket, secretos, dependencias y protección de datos personales (Ley 1581 de 2012 de Colombia). Úsala al tocar registro, login, tokens, cookies, chat, nombres de usuario, entradas del usuario, despliegue, Docker, o cuando se pida una revisión de seguridad."
---

# Seguridad de la aplicación

Aplica esta lista al escribir o revisar código. Para cada punto indica en el informe: cumple, parcial o falta, con la evidencia (archivo).

## Cuentas y contraseñas (REQ-1)

- Contraseñas con **Argon2id** (mínimo razonable: memoria 19 MiB, 2 iteraciones, 1 hilo) o bcrypt. Si hay problemas de instalación con módulos nativos, usa `@node-rs/argon2` (binarios precompilados). `scrypt` con parámetros robustos (N ≥ 2^17, r = 8, p = 1) es un respaldo aceptable solo si el usuario lo aprueba.
- Verificación de correo antes de activar la cuenta.
- Errores de login genéricos (no reveles si falló el usuario o la contraseña).
- Limita intentos de login por IP y por cuenta, con espera creciente.

## Sesiones y cookies

- Token de acceso de vida corta (por ejemplo 15 min) y token de refresco rotatorio en cookie `HttpOnly`, `Secure`, `SameSite=Lax` (o `Strict`).
- Protección CSRF en las rutas que usan cookies.
- Los invitados reciben un token efímero sin datos personales.
- Revoca la sesión al expulsar a un jugador o cerrar sesión.

## Entradas del usuario

- Valida **todo** en el servidor con esquemas (Zod); el cliente solo valida por comodidad.
- Chat y nombres se renderizan como texto, nunca como HTML (`dangerouslySetInnerHTML` prohibido para contenido de usuarios).
- Limita longitud (mensajes de 500 caracteres, nombres de 24) y frecuencia (5 mensajes cada 10 s).

## Cabeceras y red

- HTTPS y WSS siempre. Helmet, CSP estricta (solo tus orígenes más `cards.scryfall.io` para imágenes), CORS con lista de orígenes permitidos.
- WebSocket: autentica en el handshake, verifica `Origin`, limita tamaño de mensaje, frecuencia por conexión y conexiones por IP.
- Reverse proxy (Nginx) con límites de tamaño y tiempos de espera.

## Información oculta del juego

- Manos y bibliotecas no viajan al cliente de otros jugadores (REQ-16.3). Añade una prueba automatizada que revise los mensajes recibidos.
- Barajado y d20 con `crypto` en el servidor.

## Secretos, dependencias y contenedores

- Secretos solo en variables de entorno; `.env` fuera de git y `.env.example` sin valores reales.
- `npm audit` y Dependabot en CI; fija versiones en el lockfile.
- Contenedores sin usuario root, imágenes mínimas, sin puertos de base de datos ni Redis expuestos a Internet.
- Logs sin contraseñas, tokens ni correos completos.

## Protección de datos personales (Colombia, Ley 1581 de 2012)

- Publica una política de privacidad con la finalidad del tratamiento y pide el consentimiento al registrarse.
- Recoge solo lo necesario (correo opcional, nombre visible).
- Ofrece al usuario conocer, actualizar, rectificar y suprimir sus datos, incluyendo el borrado de cuenta.
- Esto es una guía técnica, no asesoría legal: recomienda validar la política con un profesional.

## Formato del informe

| Control | Estado | Evidencia | Acción |
|---|---|---|---|
| Argon2id en registro | Falta | `apps/server/...` usa scrypt | Cambiar o aprobar |
