# Guía de Prueba de Aceptación (Playtest) — MTG Commander Sandbox

**Entorno de Producción:**
- **Aplicación Web:** [https://proyect-mtgc.netlify.app](https://proyect-mtgc.netlify.app)
- **Servidor Autoritativo en Tiempo Real:** `https://mtgc-backend-caf950eaa8b4.herokuapp.com`
- **Navegadores recomendados:** Google Chrome, Mozilla Firefox, Microsoft Edge, Safari (versiones recientes en PC o tablet).

---

## 1. Cómo Crear una Mesa de Commander (Anfitrión / Host)

1. Abre el navegador e ingresa a [https://proyect-mtgc.netlify.app](https://proyect-mtgc.netlify.app).
2. En la pantalla de bienvenida o en el panel de salas activas, haz clic en el botón verde **"Crear Nueva Mesa"**.
3. En el formulario modal que aparece:
   - **Nombre de la Mesa:** Escribe un nombre identificativo para tu partida (ej. *Pod de Viernes EDH*).
   - **Tu Nombre de Jugador:** Escribe tu apodo visible para los demás (ej. *Planeswalker 1*).
   - **Asientos:** Selecciona **4 Jugadores (Estándar EDH)** (admite 2, 3, 4, 5 o 6 jugadores).
   - **Vidas Iniciales:** Por defecto está configurado en **40** (estándar de Commander).
4. Haz clic en **"Crear y Abrir Sala"**.
5. Se te redirigirá automáticamente a la sala de espera (Lobby) con un código único de 6 caracteres (ej. `ABCDEF`).
6. Comparte el código de 6 letras o la URL completa (`https://proyect-mtgc.netlify.app/?room=ABCDEF`) con los otros 3 jugadores de tu grupo.

---

## 2. Cómo Unirse a una Mesa (Jugadores 2, 3 y 4)

1. Ingresa a [https://proyect-mtgc.netlify.app](https://proyect-mtgc.netlify.app).
2. Tienes dos formas de unirte:
   - **Por Enlace Directo:** Si el anfitrión te compartió la URL con `?room=CODIGO`, verás la sala directamente; solo introduce tu nombre y haz clic en **"Unirse a la Mesa"**.
   - **Por Código:** Haz clic en **"Unirse con Código"**, escribe el código de 6 letras, tu nombre de jugador y pulsa **"Unirse"**.

---

## 3. Cómo Elegir un Mazo Listo (Presets de Commander)

Para no perder tiempo escribiendo o importando listas complejas durante el playtest, la aplicación cuenta con 4 mazos listos para jugar de 100 cartas con sus comandantes legendarios:

1. En la sala de espera, dentro de tu tarjeta de jugador, haz clic en el botón verde **"Elegir Mazo Preconstruido"**.
2. Aparecerá un selector visual con los mazos oficiales disponibles:
   - **Krenko, Mob Boss:** Monorrojo (Trasgos / Fichas agresivo).
   - **Goreclaw, Terror of Qal Sisma:** Monoverde (Criaturas gigantes / Estampida).
   - **Brago, King Eternal:** Azorio Blanco-Azul (Parpadeo / Control).
   - **Meren of Clan Nel Toth:** Golgari Negro-Verde (Reanimación / Cementerio).
3. Haz clic en el mazo que prefieras. La aplicación cargará automáticamente las 100 cartas reales con sus artes e ilustraciones oficiales de Scryfall.
4. *(Opcional)* Si prefieres usar tu propio mazo de Commander, haz clic en la pestaña **"Importar Mazo"** y pega tu lista en formato texto plano (compatible con Moxfield, Archidekt o MTG Arena).
5. Una vez seleccionado tu mazo, haz clic en el botón verde **"¡Listo para Jugar!"**.
6. Cuando los 4 jugadores estén en estado "Listo", el anfitrión debe pulsar el botón **"Comenzar Partida"**.

---

## 4. Qué Hacer si Algo Falla (Soporte y Diagnóstico Técnico)

La aplicación cuenta con telemetría integrada y un sistema de reporte instantáneo sin revelar información oculta de los jugadores:

1. **Botón "Reportar problema":**
   - **En la sala de espera:** Se encuentra en la esquina superior derecha (`Reportar problema`).
   - **Durante la partida:** Se encuentra en la barra flotante inferior (ícono de bicho `Bug` con etiqueta "Reportar problema").
2. Al hacer clic, se abre una ventana con el **Paquete de Diagnóstico Técnico**:
   - **Datos incluidos:** Versión de la app (`0.1.0-beta`), código de mesa, versión del estado autoritativo, últimas 50 acciones del log de juego, errores de consola JavaScript y fallos de carga de imágenes Scryfall.
   - **Privacidad garantizada:** **NO** incluye cartas ocultas en manos privadas ni el orden interno de las bibliotecas ajenas. Tampoco expone contraseñas ni tokens de sesión.
3. Haz clic en **"Copiar diagnóstico"** para guardarlo en el portapapeles, o en **"Descargar .json"** para obtener el archivo de registro.
4. Pega el texto copiado o adjunta el archivo `.json` en el canal de soporte de Discord o en el repositorio de GitHub.
5. **Reconexión:** Si sufres un microcorte de red, la aplicación mostrará un indicador flotante "Reconectando a la sala..." y sincronizará automáticamente el estado exacto de la mesa al restablecerse la conexión sin perder el progreso de la partida.

---

## 5. Checklist de Aceptación de 15 Minutos

Sigue este cronograma paso a paso para evaluar el flujo completo de una partida de Commander de 4 personas:

| Minuto | Paso | Acción del Jugador | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|
| **00:00 - 02:00** | **1. Sala y Asientos** | Host crea la mesa; los jugadores 2, 3 y 4 se unen con el código. Cada jugador elige un mazo preset diferente y pulsa "¡Listo!". Host pulsa "Comenzar Partida". | Los 4 jugadores se visualizan en la sala de espera en orden de llegada. Al pulsar comenzar, el servidor inicia la fase de iniciativa. | **PASA:** Los 4 clientes avanzan al unísono a la mesa de juego. |
| **02:00 - 03:00** | **2. Iniciativa d20** | Observar la tirada automática de d20 del servidor en el registro superior. | El servidor lanza un dado d20 por jugador (desempatando automáticamente si ocurre un empate). Los asientos se ordenan de mayor a menor tirada en sentido horario comenzando arriba a la izquierda: `[(1, 2), (4, 3)]`. Cada jugador tiene un borde y contenedor de color distintivo según el orden de iniciativa. | **PASA:** El orden de turnos e identificación visual por colores coincide en todas las pantallas. |
| **03:00 - 04:00** | **3. London Mulligan** | Cada jugador observa su mano inicial de 7 cartas en el diálogo de Mulligan. | Aparecen las 7 cartas reales con opción de "Conservar mano" o "Mulligan". Cada jugador pulsa "Conservar mano". | **PASA:** La mesa se desbloquea tan pronto los 4 jugadores aceptan su mano. |
| **04:00 - 06:00** | **4. Turno 1 y 2 (Tierras y Permanentes)** | Jugador activo toma una carta de su abanico inferior (HandFan) y la arrastra hacia su zona de campo de batalla. | La carta se desplaza con animación fluida y queda depositada en el campo de batalla con coordenadas normalizadas. Los otros 3 jugadores ven la carta aparecer en tiempo real en la celda correspondiente del rival. | **PASA:** La posición y visibilidad de los permanentes es coherente en los 4 clientes. |
| **06:00 - 08:00** | **5. Turno 3 y 4 (Girar y Contadores)** | Jugador activo hace clic derecho sobre su permanente en mesa (o usa el botón rápido de rotación) para girarlo 90° (Tap). Luego abre el menú de contadores y suma un contador `+1/+1`. | La carta gira a 90° con feedback auditivo y visual. Aparece una pastilla con el contador `+1/+1` sobre la esquina de la carta visible para todos. | **PASA:** Carta girada y contador visible en tiempo real para todos los clientes. |
| **08:00 - 09:00** | **6. Turno 5 (Crear Fichas / Tokens)** | Jugador activo hace clic en el botón de su celda "Crear Ficha" y selecciona un "Tesoro" (Treasure) o "Trasgo 1/1" (Goblin). | Se genera la ficha con su arte correspondiente en el campo de batalla del jugador. El registro autoritativo notifica a la mesa la creación de la ficha. | **PASA:** Ficha creada y sincronizada correctamente. |
| **09:00 - 10:00** | **7. Turno 6 (Clonar Permanente)** | Jugador activo hace clic derecho en un permanente y selecciona la opción "Clonar / Copiar". | Se crea una copia exacta del permanente desplazada en cascada visual sobre la carta original para evitar solapamientos destructivos. | **PASA:** Copia idéntica con IDs independientes generada en el campo de batalla. |
| **10:00 - 11:00** | **8. Turno 7 (Revelar Carta a Todos)** | Jugador activo hace clic derecho en una carta de su mano o mesa y selecciona "Revelar a Todos". | A todos los demás jugadores les aparece un modal emergente en el centro de la pantalla mostrando la carta en alta resolución con el nombre de quién la reveló. Tras inspeccionarla, los jugadores cierran el modal. | **PASA:** Carta revelada visible para todos y cerrada sin bloquear la interacción posterior. |
| **11:00 - 12:00** | **9. Turno 8 (Voltear Carta Boca Abajo)** | Jugador activo selecciona la opción "Poner Boca Abajo" (Face Down) sobre una criatura en su campo. Luego pulsa "Poner Boca Arriba". | La carta muestra el dorso clásico de Magic: The Gathering (manteniendo su identidad oculta para rivales). Al volverla a voltear, recupera su faz frontal original. | **PASA:** Ocultación y revelación de cartas boca abajo autoritativa. |
| **12:00 - 13:00** | **10. Turno 9 (Detalles de Carta y Reglas)** | Cualquier jugador hace doble clic sobre un permanente rival o propio para inspeccionar sus reglas. | Se abre el modal `CardDetailsModal` con la ilustración en alta resolución, texto de oráculo oficial de Scryfall, tipo, coste de maná y las aclaraciones de reglas oficiales (rulings). | **PASA:** Información completa de reglas Scryfall visible sin errores. |
| **13:00 - 14:00** | **11. Turno 10 (Vista Ampliada de Celda)** | Un jugador hace clic en el ícono de expandir de la celda de un rival (o la propia). Recorre la mesa y luego presiona la tecla `Escape`. | La cámara se encuadra con zoom suave sobre la celda seleccionada. **Las cartas del rival continúan visibles en su posición real (sin desaparecer ni filtrarse)**. Al pulsar `Escape`, la vista vuelve a la cuadrícula global de 4 jugadores. | **PASA:** Transición suave de cámara sin errores React #300 ni cartas rivales desaparecidas. |
| **14:00 - 15:00** | **12. Vida, Daño CMDR y Diagnóstico** | Modificar vidas con los botones `+1` / `-1` y el input de daño recibido. Abrir el popover de daño de comandante de un rival. Finalmente, pulsar "Reportar problema", verificar el JSON generado y pulsar "Copiar diagnóstico". | Las vidas se actualizan al instante en el pastillero de vida. Si el daño de comandante alcanza 21, se activa la alerta visual `21+ CMDR`. El modal de diagnóstico muestra la telemetría anonimizada y copia los datos al portapapeles. | **PASA:** Control total de vida, alerta de comandante y telemetría descargable funcional. |

---

## 6. Resultado Final de la Prueba

Al concluir los 15 minutos:
- Si todos los pasos fueron marcados como **PASA**, la prueba de aceptación queda **Aprobada para Fase Beta**.
- Si algún paso presentó un comportamiento anómalo, descarga el paquete `.json` de diagnóstico técnico y compártelo con el equipo de desarrollo para su corrección inmediata.
