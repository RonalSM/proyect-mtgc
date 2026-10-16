# Documento de Requisitos — Mesa Virtual de Commander (MTG)

## Introducción

**Nombre de trabajo:** *CommanderTable*.
Aplicación web en tiempo real que permite a 2–6 jugadores (objetivo principal: pods de 4) jugar Magic: The Gathering en formato Commander desde el navegador. Funciona como una **mesa sandbox**: los jugadores mueven cartas, llevan vidas y contadores, y se ponen de acuerdo en las reglas, igual que en una mesa física. El sistema **no** automatiza las reglas del juego (stack, prioridad, habilidades).

**Usuarios objetivo:** jugadores casuales y de playgroup que quieren jugar a distancia, con o sin videollamada externa (Discord, Meet, etc.).
**Modelo de despliegue:** aplicación web multiusuario, un servidor, salas efímeras.

### Supuestos (confirmar con el cliente)
1. MVP = mesa con trackers + tablero virtual de cartas; sin video integrado.
2. Datos de cartas e imágenes vienen de la API pública de Scryfall.
3. Proyecto no comercial / fan content, sujeto a la política de contenido de fans de Wizards of the Coast.
4. Idioma de la interfaz: español (con inglés como segundo idioma).

## Glosario

- **Commander (EDH):** formato multijugador, mazo de 100 cartas singleton con un comandante, 40 de vida iniciales.
- **Mesa / Sala (Table):** sesión de juego con 2–6 asientos y un código de invitación.
- **Pod:** grupo de jugadores de una partida (normalmente 4).
- **Zona:** biblioteca, mano, campo de batalla, cementerio, exilio, zona de comando.
- **Daño de comandante:** daño de combate recibido de un mismo comandante; 21 o más = derrota.
- **Impuesto de comandante:** +2 de coste genérico por cada vez que el comandante se lanza desde la zona de comando.
- **Identidad de color:** colores presentes en el coste y texto de reglas de una carta.
- **Contador:** marcador numérico (veneno, energía, experiencia, loyalty, +1/+1, etc.).
- **Sandbox:** modo en que el sistema registra acciones pero no aplica reglas.
- **Scryfall:** servicio externo de datos e imágenes de cartas de Magic.
- **Sala de espera (Lobby):** pantalla previa a la partida donde cada jugador elige mazo y marca "Listo".
- **Iniciativa:** tirada inicial de d20 que fija el orden de turnos.
- **Mazo guardado:** mazo asociado a la cuenta del usuario (REQ-7.5).
- **Mazo de sesión:** mazo importado por un invitado, válido solo durante su sesión.
- **Celda:** cada una de las hasta 6 divisiones de la cuadrícula de 2 filas × 3 columnas; una por jugador, a sangre (sin márgenes entre celdas).
- **Playmat:** ilustración de fondo de una celda; por defecto, el arte del comandante del jugador.
- **Pastilla de vida:** indicador grande del total de vida, colocado en la esquina interior de la celda.
- **Barra flotante:** barra semitransparente centrada en la parte superior de la pantalla, con ronda, historial, espectadores, ayuda y ajustes.
- **Zona de jugador:** área de la mesa asignada a un jugador (vida, contadores, comandante, pilas y campo de batalla).
- **Pila (pile):** representación visual apilada de biblioteca, cementerio o exilio.

## Requisitos funcionales

### REQ-1 Cuentas y acceso
**Historia:** Como jugador, quiero entrar con una cuenta o como invitado, para guardar mis mazos o jugar rápido.
1. WHEN el usuario se registra con correo y contraseña, THE sistema SHALL crear la cuenta y enviar verificación por correo.
2. WHERE el usuario elige "Entrar como invitado", THE sistema SHALL asignar un nombre temporal sin requerir datos personales.
3. IF las credenciales son inválidas, THEN THE sistema SHALL mostrar un error genérico sin revelar cuál campo falló.
4. THE sistema SHALL almacenar contraseñas con hash adaptativo (Argon2id o bcrypt).

### REQ-2 Crear y unirse a una mesa
**Historia:** Como anfitrión, quiero crear una mesa e invitar amigos, para empezar a jugar rápido.
1. WHEN el anfitrión crea una mesa, THE sistema SHALL generar un código único de 6 caracteres y un enlace de invitación.
2. THE sistema SHALL permitir configurar entre 2 y 6 asientos, vida inicial (por defecto 40) y mesa pública o privada.
3. WHEN un jugador abre el enlace, THE sistema SHALL asignarle un asiento libre en menos de 3 segundos.
4. IF la mesa está llena, THEN THE sistema SHALL ofrecer entrar como espectador.
5. WHERE la mesa es privada, THE sistema SHALL requerir el código para entrar.

### REQ-3 Seguimiento de vida
**Historia:** Como jugador, quiero ajustar mi vida y la de otros, para llevar el marcador sin papel.
1. THE sistema SHALL mostrar la vida de cada jugador de forma visible para todos.
2. WHEN un jugador pulsa +1/−1 o ingresa daño o vida, THE sistema SHALL actualizar su vida y propagarla a todos en menos de 300 ms. Se eliminan los botones de +-5 (Punto 7).
3. WHEN la vida llega a 0 o menos, THE sistema SHALL marcar al jugador como "en riesgo de derrota" (sin eliminarlo automáticamente).
4. THE sistema SHALL ofrecer en el panel de vida interactivo dos entradas numéricas: "Daño recibido" (resta a la vida actual) y "Vida ganada" (suma a la vida actual). Ambas aplican la variación al presionar la tecla Enter y limpian inmediatamente la entrada para la siguiente operación. Solo aceptan números enteros positivos, descartando cualquier otro carácter (Punto 7).

### REQ-4 Daño de comandante
**Historia:** Como jugador, quiero registrar el daño de comandante por oponente, para detectar derrotas por 21.
1. THE sistema SHALL mantener un contador de daño de comandante por cada par (jugador dañado, comandante origen).
2. WHEN un contador alcanza 21, THE sistema SHALL resaltar al jugador como derrotado por daño de comandante.
3. WHERE el jugador tiene partner/compañero, THE sistema SHALL llevar contadores separados por cada comandante.

### REQ-5 Contadores y estados
**Historia:** Como jugador, quiero llevar veneno, energía, experiencia e impuesto de comandante.
1. THE sistema SHALL ofrecer contadores de veneno, energía, experiencia y impuesto de comandante por jugador.
2. WHEN el contador de veneno llega a 10, THE sistema SHALL resaltar al jugador.
3. WHERE el jugador lo habilite, THE sistema SHALL permitir contadores personalizados con nombre.
4. THE sistema SHALL permitir añadir contadores a cualquier carta del campo de batalla.

### REQ-6 Turnos y fases
**Historia:** Como jugador, quiero ver de quién es el turno y en qué fase, para no perder el hilo.
1. THE sistema SHALL mostrar el jugador activo y el sentido de turno.
2. WHEN el jugador activo pulsa "Terminar turno", THE sistema SHALL pasar al siguiente jugador vivo.
3. WHERE el temporizador esté activado, THE sistema SHALL mostrar cuenta regresiva configurable por turno.
4. THE sistema SHALL permitir que el anfitrión pueda corregir el orden de turnos antes del primer turno.

### REQ-7 Importar mazos y buscar cartas
**Historia:** Como jugador, quiero cargar mi mazo de Commander, para jugarlo en la mesa.
1. WHEN el usuario pega una lista de texto (formato "1 Sol Ring"), THE sistema SHALL resolver cada carta contra Scryfall y reportar las no encontradas.
2. THE sistema SHALL permitir importar desde enlace de Moxfield o Archidekt cuando sus APIs lo permitan (fase 2).
3. THE sistema SHALL ofrecer buscador de cartas por nombre con autocompletado en menos de 500 ms.
4. IF una carta no se reconoce, THEN THE sistema SHALL sugerir coincidencias cercanas.
5. THE sistema SHALL guardar mazos en la cuenta del usuario registrado.

### REQ-8 Validación de mazo Commander (informativa)
**Historia:** Como jugador, quiero saber si mi mazo cumple las reglas de formato.
1. WHEN se importa un mazo, THE sistema SHALL verificar 100 cartas, singleton (salvo tierras básicas y excepciones) y comandante legal.
2. THE sistema SHALL verificar identidad de color contra el comandante.
3. THE sistema SHALL marcar cartas prohibidas según la legalidad provista por Scryfall.
4. IF hay incumplimientos, THEN THE sistema SHALL listarlos como advertencias sin bloquear el juego.

### REQ-9 Tablero virtual y zonas
**Historia:** Como jugador, quiero mover cartas entre zonas, para simular la partida.
1. THE sistema SHALL ofrecer las zonas: biblioteca, mano, campo de batalla, cementerio, exilio y zona de comando.
2. WHEN un jugador arrastra una carta a otra zona, THE sistema SHALL reflejarlo a todos en menos de 300 ms.
3. THE sistema SHALL mantener la mano y la biblioteca ocultas para los demás jugadores.
4. THE sistema SHALL permitir girar (tap/untap), voltear, clonar token y agregar contadores a cartas.
   4.1. **Rotación estricta y única de permanente (Punto 3):** Al girar (tap) una carta en el campo de batalla, la transformación de rotación ($90^\circ$ horario) SHALL aplicarse una sola vez y exclusivamente sobre el contenedor externo de la carta (`origin-center`). La cara frontal, la cara posterior y los elementos internos (`CardDisplay`, `img`) SHALL NOT heredar ni aplicar rotaciones adicionales ni transformaciones `rotateY` conflictivas, garantizando que el texto permanezca perfectamente legible a $90^\circ$ en sentido horario (verificado: cara frontal a $90^\circ$, imagen interna a $0^\circ$, dorso a $90^\circ$, enderezado a $0^\circ$).
   4.2. **Interacciones de ratón y táctiles sobre cartas de la mesa (Punto 4):**
       - **Clic simple:** Únicamente selecciona o deselecciona la carta (anillo visual). THE sistema SHALL NOT mostrar menús ni botones con clic simple.
       - **Doble clic:** Gira (tap) o endereza (untap) el permanente inmediatamente, sin disparar ampliaciones de celda ni abrir menús.
       - **Clic derecho / Pulsación larga (500 ms en táctil):** Abre el menú contextual con las opciones rápidas: Girar/Enderezar, Contador +1/+1, Clonar y Boca abajo/Boca arriba. Clic fuera o presionar `Escape` cierra el menú.
5. WHEN el jugador roba, baraja o hace mulligan, THE sistema SHALL ejecutar la acción con aleatoriedad generada en el servidor.
6. **Vista previa de carta centrada en la mitad opuesta sin contenedor (Punto 9):**
   - WHEN el cursor se posa sobre cualquier carta (mano, mesa, pilas o inspector), THE sistema SHALL mostrar su versión ampliada centrada en la mitad de la pantalla opuesta al cursor (si el cursor está en la mitad izquierda $x < W/2$, la vista previa se proyecta en la mitad derecha a $x = 75\% W, y = 50\% H$; si está en la derecha, a $x = 25\% W, y = 50\% H$), sin tapar la carta original ni el espacio de juego inmediato.
   - THE vista previa SHALL renderizarse sin contenedor, sin marco gris, sin botón de cerrar y sin fondo adicional, presentando exclusivamente la imagen limpia de la carta flotando con sombra suave (`drop-shadow`).
   - THE vista previa SHALL desaparecer inmediatamente al retirar el puntero del ratón o al presionar la tecla `Escape`.
7. THE superficie de juego (MesaTotal) SHALL ser UNA sola superficie que ocupa todo el viewport (`fixed inset-0`). Es la única zona de soltado (un solo droppable de mesa). Cualquier punto de la pantalla es mesa:
   7.1. Las divisiones de jugador son exclusivamente visuales (playmat de fondo y línea divisoria), NO son droppables, no recortan las cartas (sin overflow-hidden que las afecte) y el playmat cubre el 100% del área de cada división (incluyendo debajo del dock de controles, eliminando franjas separadas).
   7.2. THE sistema SHALL mantener una capa única de cartas dentro de MesaTotal con posiciones en coordenadas globales normalizadas de la mesa ($x, y \in [0, 1]$ sobre toda la pantalla), limitando únicamente para que la carta quede completamente visible dentro del viewport (sin restricción arbitraria de 0.05 a 0.85).
   7.3. Todos los clientes SHALL ver la misma disposición canónica de asientos y divisiones en todas las pantallas (sin reordenamiento por cliente). La mano privada y el dock de cada jugador flotan en la división asignada a ese jugador.
   7.4. Cualquier carta en la mesa puede arrastrarse a cualquier punto de la pantalla, incluso sobre otras divisiones. Al transferirse al campo de otro jugador (100% dentro de su división), dicho jugador se convierte en su titular temporal (`holderId`), adquiriendo permiso de movimiento sobre ella sin alterar su propietario original inmutable (`ownerId`).
   7.5. **Regla de autorización de movimiento (Punto 5):** Reemplaza la regla de que cualquiera mueve cualquier carta. CardInstance guarda `ownerId` (inmutable, jugador de cuya zona salió o quien creó la ficha) y `holderId` (titular temporal oculto en UI). Al soltar, `holderId` es el jugador cuya división contiene la caja visual de la carta (ya girada) al 100%; si queda entre divisiones o fuera, `holderId` queda vacío. Quién puede mover una carta: su `ownerId` siempre (incluso para recuperarla de la mesa de otro) y cualquier otro jugador solo si es su `holderId`. Si A recupera su carta de la mesa de B, B ya no puede volver a moverla. Se valida en cliente (cursor `not-allowed` y aviso breve) y en servidor (rechaza `MOVE_CARD` no autorizado y emite advertencia).
   7.6. Los elementos flotantes (comandante, mano, biblioteca, cementerio, exilio, vida, nombre, barra, chat) flotan por encima de la mesa sobre el playmat; la capa contenedora flotante SHALL tener `pointer-events: none` y únicamente los controles interactivos `pointer-events: auto`, permitiendo que los clics y arrastres sobre espacio vacío lleguen a la mesa.
   7.7. Soltar una carta sobre las ranuras de cementerio, exilio o biblioteca de un jugador la envía a dicha pila (manual), resaltando la pila bajo el puntero mientras se arrastra. Soltarla en cualquier otro punto la deja en el campo en sus coordenadas globales. THE sistema SHALL NOT mostrar rectángulos amarillos ni resaltados de celda en la mesa.
   7.8. THE sistema SHALL renderizar el DragOverlay en un portal a document.body para que ninguna carta se recorte al cruzar la pantalla o las divisiones.
   7.9. **Precisión WYSIWYG del DragOverlay y arrastre de carta girada (Punto 2):** Al agarrar una carta, el overlay mantiene el tamaño exacto que tendrá sobre la mesa. WHEN se agarra una carta girada (`isTapped: true`), THE overlay y el fantasma remoto SHALL conservar el giro apaisado ($90^\circ$ horario) durante todo el arrastre sin enderezarse. La carta girada se modela como una caja apaisada (ancho visual = `cardPixelHeight`, alto visual = `cardPixelWidth`) con rotación interior alrededor del centro; el desplazamiento entre el puntero del ratón y la carta se mide sobre su caja visual apaisada y permanece estrictamente constante durante todo el movimiento sin que el puntero quede en el aire. La posición final se calcula a partir de esa misma caja apaisada, garantizando que el overlay y la carta soltada coincidan en 2 px o menos y que el ancho y el alto no cambien (verificado mediante pruebas E2E automatizadas).
   7.10. **Cálculo de posición final sin colocación automática:** La posición final de la carta en la mesa se calcula a partir del rectángulo real del overlay en el instante de soltar (`active.rect.current.translated`), con error de coincidencia $\le 2$ px verificado por pruebas automatizadas E2E. El único ajuste permitido es restringir la carta dentro del viewport tanto en vivo como al soltar.
   7.11. **Detección estricta de colisión por puntero:** El soltado a pilas (biblioteca, cementerio, exilio) utiliza detección estricta por puntero (`pointerWithin`). La carta entra a una pila únicamente si el puntero se encuentra físicamente dentro del rectángulo de dicha pila; en cualquier otro caso queda colocada libremente en la mesa sin imanes ni atracciones magnéticas.
   7.12. **Difusión efímera en vivo para rivales:** Durante el arrastre de una carta, el cliente emite mensajes efímeros throttled a ~30 fps (`CARD_DRAG_MOVE`) con `isDragging: true` y posición normalizada, retransmitidos por el servidor a los demás jugadores de la sala como `REMOTE_CARD_DRAGGING`. Los rivales renderizan un fantasma suavemente interpolado con etiqueta del jugador. El servidor aplica un rate limit separado e independiente (~60 msg/s) que no computa contra el límite de chat. El soltado final es autoritativo y escribe en la bitácora (`MOVE_CARD`).
   7.13. **Cierre fluido del abanico en la mano:** Al iniciar el arrastre desde la mano privada, la ranura de la carta en el abanico reduce su ancho y márgenes a cero con animación suave (`transition: width 250ms, margin-left 250ms`), cerrando el hueco entre cartas sin alterar el resto del dock. Si el arrastre se cancela, la ranura se reabre fluidamente.
   7.14. **Cancelación con tecla Escape:** Presionar `Escape` durante el arrastre cancela inmediatamente la acción en curso, restaura la carta a su zona de origen y notifica a los rivales con `isDragging: false`.
   7.15. **Ausencia de parpadeo al soltar (Actualización optimista síncrona):** Al soltar una carta en el campo de batalla, THE sistema SHALL aplicar la posición final calculada de forma optimista y síncrona en el mismo frame de renderizado (`flushSync`), manteniendo oculto el origen en el overlay (`dropAnimation={null}`) y reconciliando síncronamente con la confirmación autoritativa del servidor sin retrocesos ni regresiones temporales ante ecos de red desactualizados (0 frames en posición vieja verificado por `requestAnimationFrame`).
   7.16. **Ocultamiento de carta real y eliminación de parpadeo en receptores (Punto 1):** Al recibir `REMOTE_CARD_DRAGGING` con `isDragging: true`, THE sistema en los clientes receptores SHALL ocultar la carta real correspondiente en el tablero (`opacity: 0`, `pointer-events: none`) sin retirarla del layout ni del estado, mostrando únicamente el fantasma remoto interpolado. Al soltar la carta, el emisor emite `CARD_DRAG_MOVE` con `isDragging: false` y la posición final calculada `{ position: { x, y } }`. El receptor B mantiene el fantasma visible en dicha posición final y la carta fija oculta (`opacity: 0`) bajo la bandera `pendingSync: true` hasta la llegada del evento autoritativo `ROOM_STATE_SYNC`. En ese idéntico frame de renderizado, se retira `pendingSync` y se revela la carta fija en su nueva posición autoritativa, garantizando cero frames visibles en la posición anterior y cero duplicados (verificado mediante muestreo con `requestAnimationFrame` en el contexto B durante y tras el soltado). Si transcurre 1 segundo sin respuesta o el emisor se desconecta, THE sistema cancela `pendingSync` como salvaguarda.
   7.17. **Flujos zona a zona y desacoplamiento de playerId (Punto 5):**
       - **Zona de comando al campo:** Arrastrar el comandante desde su ranura en el dock hacia la mesa lo coloca en el campo en las coordenadas soltadas y deja la ranura de comando en estado vacío `(En campo)`.
       - **Campo a la mano:** Arrastrar un permanente desde la mesa hacia el abanico de la mano propia lo devuelve a la mano privada incrementando el conteo de mano.
       - **Biblioteca a mano y campo:** Clic en la biblioteca roba a la mano de forma autoritativa sin requerir `playerId` explícito en la carga útil; arrastrar la carta superior de la biblioteca hacia la mesa la juega directamente al campo de batalla.
       - **Robustez del servidor:** Los esquemas de acciones (`DrawCardsSchema`, `AdjustLifeSchema`, `SetPlayerCounterSchema`, etc.) resuelven `playerId` como opcional recurriendo de forma segura a `client.playerId`.
       - **Estratificación y compresión del dock:** Las ranuras de Comandante, Biblioteca y Pilas cuentan con elevación `z-20` y el abanico de la mano adapta su solapamiento negativo según el número de cartas para garantizar que las cartas de la mano nunca se encimen ni tapen la zona de comando.
   7.18. **La mano como destino de soltado (Punto 6):**
       - **Devolución a la mano:** THE sistema SHALL permitir arrastrar cualquier carta desde la mesa o desde las pilas hacia el abanico de la mano propia, emitiendo la acción autoritativa `MOVE_CARD` con `toZone: 'hand'` y `toPlayerId: localPlayerId`.
       - **Resalte suave en destino:** WHEN el puntero del ratón o el toque táctil pasa por encima del abanico propio durante un arrastre (`isHandOver = true`), THE sistema SHALL mostrar un resalte suave (`ring-2 ring-amber-400/80 bg-amber-400/15 shadow-[0_0_30px_rgba(251,191,36,0.3)]`).
       - **Manos ajenas no son destino:** Las manos de los oponentes SHALL NOT ser zonas de soltado (`disabled: true` en su hook de droppable y descarte estricto en el cliente y servidor).
   7.19. **Interacción completa con pilas (biblioteca, cementerio, exilio) (Punto 7):**
       - **Carta superior con arte y contador:** La ranura de cementerio y la de exilio SHALL mostrar la ilustración de la última carta llegada como cara principal (`DraggablePileCard`), con una insignia superpuesta que indica el nombre de la zona y el conteo numérico total de cartas. Si la pila está vacía, muestra la ranura con estilo sutil y contador en 0.
       - **Arrastre directo desde la pila:** La carta superior de cada pila SHALL ser arrastrable (`useDraggable` con `data: { fromZone: 'graveyard' | 'exile', card }`), permitiendo moverla directamente al campo de batalla o a la mano.
       - **Modal inspector con menú contextual:** Al hacer clic en cualquier pila, THE sistema SHALL abrir un modal en portal con la cuadrícula completa de cartas de dicha zona. Hacer clic derecho sobre una carta dentro del modal despliega un menú flotante con las opciones: "Enviar a la mano", "Enviar al campo" (y en cementerio, "Enviar al exilio").
       - **Privacidad de zonas:** Cualquier jugador puede inspeccionar libremente el cementerio y el exilio de todos los participantes. La biblioteca privada únicamente puede ser inspeccionada por su respectivo dueño; los rivales reciben los datos de las cartas enmascarados desde el servidor.

    7.20. **Zona de comando interactiva y gestión autoritativa de impuesto (Punto 6):**
       - **Ranura droppable:** La zona de comando en el dock de cada jugador SHALL ser un destino droppable (`useDroppable` con `data: { zone: 'command', playerId }`, deshabilitado para rivales), permitiendo devolver al comandante arrastrándolo desde la mesa o pilas.
       - **Botón explícito de devolución:** WHEN la zona de comando está vacía (comandante en el campo u otra zona), THE sistema SHALL mostrar un botón explícito "Devolver al comando" (`data-testid="return-to-command-btn"`), permitiendo devolverlo inmediatamente sin necesidad de arrastre.
       - **Auto-incremento de Tax:** Al devolver al comandante a la zona de comando (sea mediante arrastre, mediante el botón explícito o mediante el menú contextual clic derecho "A Comando"), THE servidor SHALL incrementar automáticamente el impuesto de comandante (`commanderTax`) en +2 de forma autoritativa.
       - **Sacar a la mesa no altera el tax:** Sacar el comandante desde la zona de comando hacia el campo de batalla SHALL mantener inalterado el valor actual de `commanderTax`.
       - **Badge de Tax interactivo:** La ranura de comando SHALL mostrar permanentemente un badge con el valor actual del impuesto (`Tax: +0`, `Tax: +2`, etc., `data-testid="commander-tax-badge"`) y dos controles interactivos (`+` y `-`, `data-testid="commander-tax-plus"` / `commander-tax-minus`) que sumen o resten de 2 en 2 (`SET_PLAYER_COUNTER` con delta ±2; el impuesto nunca varía de 1 en 1).
       - **Eliminación de duplicidad en la pastilla de vida:** Los controles de `commanderTax` SHALL ser eliminados de la pastilla de vida (`LifePill`), centralizando toda la gestión del impuesto exclusivamente en la zona de comando.

    7.21. **Modal inspector de biblioteca con buscador, filtros e indicador de cola Scryfall (Punto 8):**
       - **Buscador en tiempo real por nombre:** El modal inspector de la biblioteca privada SHALL incorporar una barra de búsqueda (`data-testid="library-search-input"`) que filtre en tiempo real las cartas de la biblioteca cuyo nombre coincida con el texto ingresado (búsqueda sin distinción de mayúsculas/minúsculas).
       - **Filtros rápidos por tipo:** El modal SHALL proporcionar botones de filtrado rápido por categoría de carta: Criaturas, Instantáneos, Conjuros, Artefactos, Encantamientos, Tierras y Planeswalkers (además de una opción para ver "Todos" o deseleccionar el filtro activo), evaluando la línea de tipos (`typeLine`) de cada carta.
       - **Indicador de sincronización con Scryfall:** WHEN existan peticiones en cola o reintentos pendientes con Scryfall (`syncQueueCount > 0`), THE sistema SHALL mostrar un indicador visual en una esquina del modal (`data-testid="scryfall-sync-indicator"`) con el texto exacto `"Sincronizando cartas... (X en cola)"`. WHEN la cola se vacíe o finalice la sincronización, dicho indicador SHALL desaparecer por completo del DOM.

### REQ-10 Sincronización y reconexión
**Historia:** Como jugador, quiero volver a la partida si se cae mi conexión.
1. THE sistema SHALL mantener el estado autoritativo de la mesa en el servidor.
2. WHEN un jugador pierde conexión, THE sistema SHALL conservar su asiento por al menos 10 minutos.
3. WHEN el jugador reconecta, THE sistema SHALL restaurar el estado completo en menos de 3 segundos.
4. IF dos acciones entran en conflicto, THEN THE sistema SHALL aplicar el orden de llegada al servidor y notificar a los afectados.

### REQ-11 Registro de partida y deshacer
**Historia:** Como jugador, quiero ver qué pasó y corregir errores.
1. THE sistema SHALL registrar cada acción (quién, qué, cuándo) en un log visible.
2. WHEN un jugador solicita deshacer su última acción, THE sistema SHALL revertirla si ningún otro jugador la ha modificado.
3. WHERE la acción afecta a otros jugadores, THE sistema SHALL pedir confirmación de la mesa.

### REQ-12 Chat y comunicación
**Historia:** Como jugador, quiero comunicarme con la mesa.
1. THE sistema SHALL ofrecer chat de texto por mesa.
2. THE sistema SHALL ofrecer reacciones rápidas (por ejemplo "respóndeme", "pasar prioridad").
3. [Descartado por decisión del cliente] Integración de videollamada externa (el grupo jugará mediante Discord externo; la web no incluirá voz ni videollamada).
4. THE sistema SHALL limitar los mensajes a 500 caracteres y 5 por 10 segundos por usuario.

### REQ-13 Espectadores y moderación
1. THE sistema SHALL permitir espectadores sin acceso a manos ni bibliotecas.
2. WHEN el anfitrión expulsa a un jugador, THE sistema SHALL liberar su asiento y revocar su sesión en la mesa.
3. THE sistema SHALL ofrecer al anfitrión transferir el rol a otro jugador.

### REQ-14 Historial y estadísticas (fase 2)
1. WHEN una mesa termina, THE sistema SHALL guardar resultado, comandantes y duración.
2. THE sistema SHALL mostrar al usuario su historial y porcentaje de victorias por mazo.

### REQ-20 Sala de espera previa a la partida
**Historia:** Como jugador, quiero elegir o importar mi mazo en una sala de espera antes de empezar, para que la partida arranque solo cuando todos estén listos.
1. WHEN un jugador crea o se une a una mesa, THE sistema SHALL llevarlo a la sala de espera y NO a la mesa de juego.
2. THE sala de espera SHALL mostrar un asiento por jugador con nombre, mazo elegido (nombre y comandante) y estado "Listo / No listo".
3. THE sala de espera SHALL listar los mazos guardados del usuario y los mazos de sesión importados, con nombre, comandante, identidad de color y resultado de validación (REQ-8).
4. WHERE el usuario no tiene mazos, THE sala de espera SHALL mostrar el botón "Importar mazo" como acción principal.
5. WHEN el jugador pulsa "Importar mazo", THE sistema SHALL abrir el importador (REQ-7) sin salir de la sala y, al terminar, preseleccionar el mazo importado.
6. WHERE el usuario está registrado, THE sistema SHALL ofrecer "Guardar en mi cuenta" al importar; IF es invitado, THEN THE sistema SHALL conservar el mazo solo durante la sesión y avisarlo.
7. IF el mazo tiene advertencias de validación (REQ-8), THEN THE sistema SHALL mostrarlas y permitir continuar (modo sandbox).
8. THE sistema SHALL permitir "Listo" solo si hay un mazo seleccionado, y permitir cambiar de mazo o quitar "Listo" mientras la partida no haya iniciado.
9. THE sistema SHALL mostrar a los demás jugadores únicamente el nombre del mazo y su comandante; la lista completa de cartas permanece privada.
10. WHERE todos los jugadores sentados están "Listos" y hay al menos 2, THE sistema SHALL habilitar el botón "Iniciar partida" solo para el anfitrión.
11. WHEN el anfitrión inicia la partida, THE sistema SHALL: barajar cada biblioteca en el servidor, colocar cada comandante en su zona de comando y repartir mano inicial de 7 cartas.
12. THE sala de espera SHALL permitir al anfitrión expulsar jugadores y transferir el rol de anfitrión (REQ-13) y mostrar el código y enlace de invitación (REQ-2).
13. THE sala de espera SHALL actualizar los cambios de otros jugadores (mazo elegido, listo, entradas y salidas) en menos de 300 ms.

### REQ-21 Iniciativa con D20 y orden de turnos
**Historia:** Como jugador, quiero que el orden de turnos se decida con un dado de 20 caras, para que sea justo y visible para todos.
1. WHEN la partida inicia, THE sistema SHALL abrir la fase de iniciativa en la que cada jugador lanza un d20.
2. THE sistema SHALL generar cada resultado en el servidor con un generador criptográficamente seguro (valores 1 a 20); el cliente nunca decide el valor.
3. WHEN un jugador pulsa "Lanzar d20", THE sistema SHALL mostrar la animación y el resultado a toda la mesa en menos de 2 segundos.
4. IF un jugador no lanza en 15 segundos o está desconectado, THEN THE sistema SHALL lanzar por él automáticamente.
5. WHEN todos los jugadores han lanzado, THE sistema SHALL ordenar los turnos de mayor a menor resultado; el mayor juega primero.
6. IF hay empate, THEN THE sistema SHALL repetir la tirada solo entre los jugadores empatados, hasta un máximo de 5 rondas; si persiste, THE sistema SHALL desempatar por número de asiento.
7. THE sistema SHALL mostrar el orden resultante (1.º, 2.º, 3.º…) en la barra de turnos y junto a cada zona de jugador.
8. WHEN la iniciativa termina, THE sistema SHALL pasar la mesa a estado `playing` e iniciar el turno del primer jugador; REQ-6 (pasar turno) usa este orden.
9. THE botón "Dados" existente SHALL seguir disponible durante la partida para tiradas libres (d6, d20, moneda).

### REQ-22 Interfaz de mesa inmersiva (estilo playgroup.gg)
**Referencia visual:** concepto de cuadrícula a sangre, playmats, vida en la esquina interior, mano y pilas en el borde inferior, barra flotante (sin copiar código, imágenes ni marca de playgroup.gg).
**Historia:** Como jugador, quiero ver a todos en una cuadrícula a pantalla completa, cada uno con su propio fondo y su propio espacio, para sentir que estamos jugando juntos en una mesa.
1. THE pantalla de partida SHALL ocupar toda la ventana (100 % del ancho y alto) sin scroll, sin márgenes exteriores y sin barra lateral permanente; las celdas SHALL tocarse entre sí separadas solo por una línea fina (1 px) oscura.
2. THE pantalla SHALL dividirse en una cuadrícula de **2 filas y hasta 3 columnas** (máximo 6 celdas), una por jugador; `--cols = ceil(jugadores / 2)`:
   - 2 jugadores: 2 filas × 1 columna
   - 3 jugadores: 2 × 2 (3 jugadores + 1 celda libre para registro/chat)
   - 4 jugadores: 2 × 2
   - 5 jugadores: 2 × 3 (5 jugadores + 1 celda libre)
   - 6 jugadores: 2 × 3
   2.1. THE jugador local SHALL ocupar la celda inferior izquierda; los oponentes ocupan las demás en orden de asiento.
   2.2. THE contenido de todas las celdas SHALL mostrarse en posición vertical, sin rotar.
3. THE cada celda SHALL tener un **playmat** como fondo a celda completa:
   3.1. Por defecto, el recorte de arte (`art_crop`) del comandante del jugador, obtenido de Scryfall, con una capa oscura degradada en los bordes superior e inferior para mantener la legibilidad.
   3.2. WHERE el jugador lo elija, THE sistema SHALL permitir usar el arte de otra carta de su mazo o un color liso; la elección SHALL ser visible para toda la mesa.
   3.3. THE sistema SHALL mostrar la atribución de Scryfall y el aviso de no afiliación (REQ-18) en el pie de la pantalla.
   3.4. WHEN una imagen de playmat o de carta falla al cargar (error 404, indisponibilidad de red o bloqueo de CSP), THE sistema SHALL capturar el evento `onError` y renderizar un fondo degradado atmosférico oscuro o marco de texto legible sin mostrar nunca un icono de imagen rota en la pantalla (Punto 11).
4. THE contenedor de nombre SHALL ubicarse centrado en el borde superior de cada división conteniendo únicamente el nombre del jugador y el botón de expandir celda (Punto 8):
   4.1. WHILE sea el turno de un jugador, THE sistema SHALL resaltar este contenedor con fondo ámbar y borde iluminado, además de resaltar el contorno de la división.
   4.2. THE orden de iniciativa (1.º, 2.º…), corona de anfitrión 👑, píldora 'Tú' y punto indicador de conexión se trasladan a la barra superior desplegable (FloatingToolbar), con dropdown interactivo de jugadores.
   4.3. WHEN un jugador se desconecta, su nombre en el contenedor superior se atenuará con opacidad reducida y un tooltip explícito `${player.name} (Desconectado)`.
   4.4. THE pastilla de vida se mantiene en el dock inferior sobre el playmat, garantizando aislamiento total sin solapar elementos.
5. THE pastilla de vida SHALL ubicarse en la **esquina interior** de cada celda, es decir, la más cercana al centro de la pantalla:
   5.1. Fila superior → borde inferior de la celda; fila inferior → borde superior de la celda.
   5.2. Columna izquierda → lado derecho; columna derecha o central → lado izquierdo.
   5.3. WHEN el jugador hace clic en la pastilla, THE sistema SHALL abrir el panel de vida interactivo con controles directos de −1 y +1 (eliminando botones de +-5) y dos campos numéricos "Daño recibido" y "Vida ganada" accionados mediante Enter (REQ-3, Punto 7).
   5.4. THE veneno, energía, experiencia, impuesto de comandante y daño de comandante SHALL mostrarse como insignias pequeñas desplegables junto a la pastilla (REQ-4, REQ-5).
6. THE campo de batalla SHALL ocupar el resto de la celda, con cartas colocadas libremente y que pueden solaparse parcialmente:
   6.1. THE posición de cada carta SHALL guardarse **normalizada** (valores de 0 a 1 respecto al tamaño de la celda), para que coincida en pantallas de distinto tamaño.
   6.2. WHEN el jugador arrastra una carta, THE sistema SHALL traerla al frente (orden `z`) y sincronizar su nueva posición a la mesa en menos de 300 ms (REQ-9.2).
   6.3. THE tamaño de carta SHALL calcularse como el menor valor entre el límite por alto (cerca del 20% del alto de la celda) y el límite por ancho de la división (`(cellWidth - 130) / 5.5 / 0.714`), garantizando que vida, comandante, mano comprimida, biblioteca y pilas quepan en la celda sin solapamientos a 1366x768 y resoluciones estrechas (Punto 9).
   6.3.1. WHEN la mano acumula cartas, THE abanico SHALL incrementar progresivamente su solape (hasta 0.85) comprimiéndose dinámicamente antes de invadir las ranuras de comandante o biblioteca, y ningún elemento de un jugador SHALL invadir la división de otro (Punto 9).
   6.3.2. THE dimensiones de las cartas en la mano (propia y rival), en el campo de batalla, en la zona de comando y en el overlay visual de arrastre SHALL ser estrictamente idénticas en cualquier resolución y disposición de jugadores, vinculadas a las variables globales `--card-w` y `--card-h` sin discrepancias de zoom o escala (Punto 10).
   6.4. WHEN el cursor se detiene sobre una carta (o con pulsación larga en táctil), THE sistema SHALL mostrar su versión grande flotante centrada en la mitad opuesta de la pantalla sin contenedor ni fondo adicional, con sombra suave (`drop-shadow`), y cierre inmediato por `Escape` o retiro del cursor (REQ-9.6, Punto 9).
7. THE mano SHALL mostrarse en el borde inferior de cada celda, parcialmente asomada:
   7.1. La mano del jugador local, boca arriba; sube al pasar el cursor y las cartas se arrastran al campo de batalla.
   7.2. La mano de los oponentes, como reversos de cartas junto al texto "N cartas en mano"; THE sistema SHALL NOT enviar su contenido (REQ-16.3).
   7.3. THE cartas visibles de la mano propia SHALL renderizarse en relación de aspecto 5:7 exacto (`aspect-[5/7]` con `object-fill`) y esquinas redondeadas naturales (`rounded-[6px]`), sin `overflow-hidden` en el contenedor del dock ni en los ítems de carta que corte bordes, textos o esquinas (Punto 4).
   7.4. THE imágenes de las cartas de la mano SHALL resolverse y cargarse siempre en resolución normal de Scryfall (versión `normal`, nunca la versión pequeña ampliada) garantizando máxima nitidez, y las cartas SHALL permanecer 100 % completas dentro del viewport, incluso al elevarse con el cursor hover (`hover:-translate-y-5`) (Punto 4).
8. THE pilas y la zona de comando SHALL mostrarse como ranuras pequeñas alineadas en el borde inferior derecho de cada celda: biblioteca (con cantidad de cartas), cementerio, exilio y zona de comando; las ranuras vacías SHALL mostrarse con contorno punteado:
   8.1. WHEN el jugador hace clic en una ranura, THE sistema SHALL abrir su contenido; cementerio, exilio y zona de comando son visibles para todos y la biblioteca solo para su dueño (REQ-9.3).
9. THE barra flotante SHALL ubicarse centrada en la parte superior, superpuesta a las celdas y plegable con un botón de flecha, con:
   9.1. ronda actual y temporizador de turno si está activo (REQ-6.3);
   9.2. historial de la partida (REQ-11) y acceso al chat (REQ-12);
   9.3. cantidad de espectadores (REQ-13) y botón de compartir/invitar (REQ-2);
   9.4. dados (REQ-21.9), ayuda y ajustes (incluye "reducir fondos").
10. WHERE hay una celda libre (3 o 5 jugadores), THE sistema SHALL usarla para mostrar el registro y el chat fijos.
11. WHEN el jugador pulsa el botón de ampliar de una celda o hace doble clic sobre ella, THE sistema SHALL encuadrar y hacer zoom sobre dicha división como un encuadre de la misma mesa global única (no una segunda mesa ni modal desvinculado); THE sistema SHALL calcular las coordenadas de arrastre mediante transformación inversa ($x_{global} = x_{min} + u \times W$, $y_{global} = y_{min} + v \times H$), manteniendo activos el DndContext, los droppables de mano y pilas, y el menú contextual de clic derecho, permitiendo sacar cartas de la mano, mover cartas en el campo y devolverlas a la mano, volviendo a la cuadrícula completa con Esc o al pulsar "Cerrar" (Punto 3).
12. THE sala de espera (REQ-20) y la fase de iniciativa (REQ-21) SHALL compartir el mismo estilo oscuro; durante la iniciativa, THE sistema SHALL mostrar el resultado del d20 de cada jugador dentro de su celda.
13. WHERE el usuario es espectador, THE sistema SHALL mostrar las celdas con las manos ocultas y una etiqueta "Espectando".
14. THE interfaz SHALL mantener 60 fps con 6 jugadores y 60 cartas en el campo; las imágenes de fondo SHALL cargarse en formato optimizado, con carga diferida y precarga del playmat propio.
15. THE texto sobre los playmats SHALL cumplir contraste mínimo 4.5:1 (WCAG AA); WHERE el usuario active "reducir fondos" o `prefers-reduced-motion`, THE sistema SHALL sustituir los playmats por color liso y desactivar animaciones.
16. WHERE el ancho es menor a 1024 px, THE sistema SHALL ofrecer el modo simplificado (REQ-17); en escritorio y tableta apaisada SHALL mostrar la cuadrícula completa.
17. THE interacciones de cartas SHALL conservar el arrastrar y soltar (REQ-9.2) como método principal.
18. **Matriz de resoluciones y jugadores (Punto 12):** THE sistema SHALL soportar de forma adaptativa y verificada pods de 2, 3, 4, 5 y 6 jugadores en resoluciones de escritorio estándar (1920x1080 Full HD, 1366x768 laptop HD y 1280x720 720p HD) garantizando:
    18.1. Cero solapamiento entre elementos del dock de zonas (vida, comandante, mano, biblioteca, cementerio y exilio).
    18.2. Todos los elementos del dock contenidos dentro de los márgenes horizontales de la división de su jugador sin invadir celdas vecinas.
    18.3. Todas las cartas de la mano visibles y contenidas dentro del viewport sin desbordes.
    18.4. Cero scroll vertical u horizontal en el documento (`window.scrollX === 0`, `window.scrollY === 0`, `overflow: hidden`).
    18.5. Tamaño de cartas homogéneo e idéntico entre todas las zonas (mano, campo, comandante, drag overlay) calculado con relación de aspecto MTG (0.714) y acotado entre 65 px y 135 px de alto para optimizar el espacio útil según la cuadrícula y resolución.

## Requisitos no funcionales

### REQ-15 Rendimiento
1. THE sistema SHALL propagar acciones de juego en menos de 300 ms (p95) con 6 jugadores.
2. THE sistema SHALL cargar la pantalla de la mesa en menos de 3 s en conexión 4G.
3. THE sistema SHALL soportar 500 mesas simultáneas (objetivo inicial) con un solo clúster pequeño.

### REQ-16 Seguridad y privacidad
1. THE sistema SHALL usar HTTPS/WSS en todas las conexiones.
2. THE sistema SHALL validar toda acción en el servidor; el cliente nunca decide el estado.
3. THE sistema SHALL NOT enviar al cliente el contenido de la mano o biblioteca de otros jugadores.
4. THE sistema SHALL aplicar limitación de tasa por IP y por usuario.
5. THE sistema SHALL cumplir la Ley 1581 de 2012 (Colombia) de protección de datos personales, con política de privacidad y opción de eliminar la cuenta.
6. THE sistema SHALL sanitizar entradas de chat y nombres para prevenir XSS.

### REQ-17 Usabilidad y accesibilidad
1. THE sistema SHALL ser responsivo (escritorio, tableta; móvil como mínimo para trackers).
2. THE sistema SHALL cumplir contraste WCAG 2.1 AA.
3. THE sistema SHALL ser operable por teclado en los controles de vida y turnos.

### REQ-18 Cumplimiento legal y atribución
1. THE sistema SHALL mostrar aviso de que no está afiliado ni respaldado por Wizards of the Coast.
2. THE sistema SHALL respetar las pautas de uso de Scryfall (identificación en el User-Agent, cabeceras, límite de peticiones, caché y atribución de imágenes sin recortes engañosos).
3. THE sistema SHALL NOT vender cartas ni contenido protegido ni exigir pago por acceder a las imágenes.

### REQ-19 Disponibilidad y observabilidad
1. THE sistema SHALL tener disponibilidad objetivo de 99% mensual.
2. THE sistema SHALL registrar errores y métricas (conexiones activas, latencia, mesas abiertas).

## Límites del sistema

| Dentro del alcance (MVP) | Fuera del alcance |
|---|---|
| Mesas 2–6 jugadores, trackers, zonas, importación de mazos, chat, reconexión | Automatización de reglas y stack |
| Datos de cartas vía Scryfall | Compra/venta de cartas o marketplace |
| Cuentas básicas e invitados | Torneos y emparejamiento (fase 3) |
| Log de partida y deshacer | Video/voz propios (fase 2) |
| Validación informativa del mazo | Aplicación móvil nativa |
| Sala de espera, iniciativa d20, mesa inmersiva cuadrícula (v2) | |

## Métricas de éxito
- 80 % de las mesas de prueba completan una partida sin abandonar por fallos técnicos.
- Latencia de acciones p95 < 300 ms.
- Tiempo desde abrir la web hasta estar sentado en una mesa < 60 s.
- Importación correcta de al menos 98 % de las cartas de mazos reales de prueba.

## Matriz de trazabilidad (resumen)

| Requisito | Componente(s) |
|---|---|
| REQ-1 | COMP-2, COMP-3 |
| REQ-2, 6, 13 | COMP-4, COMP-5 |
| REQ-3, 4, 5 | COMP-5, COMP-1 |
| REQ-7, 8 | COMP-6, COMP-3 |
| REQ-9, 10, 11 | COMP-5, COMP-1 |
| REQ-12 | COMP-5, COMP-1 |
| REQ-15 a 19 | Transversales |
| REQ-20 | COMP-1, COMP-4, COMP-5, COMP-6, COMP-3 |
| REQ-21 | COMP-1, COMP-5 |
| REQ-22 | COMP-1, COMP-5, COMP-6, COMP-8 |

**Dependencias con requisitos previos:** REQ-20 requiere REQ-7.5 (guardar mazos en la cuenta) y REQ-13 (expulsar, transferir anfitrión).
