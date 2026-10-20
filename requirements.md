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
1. THE sistema SHALL ofrecer contadores de veneno, energía y experiencia por jugador, y contador de impuesto de comandante (`commanderTax`) gestionado de forma centralizada en la ranura de comando mediante incrementos autoritativos automáticos (+2) al devolver y controles interactivos $\pm 2$ (REQ-9.7.20, Punto 6).
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
    7.16. **Ocultamiento de carta real, posición inicial exacta y eliminación de animación anómala en receptores (Punto 1):** Al recibir `REMOTE_CARD_DRAGGING` con `isDragging: true`, THE sistema en los clientes receptores SHALL ocultar la carta real correspondiente en el tablero (`opacity: 0`, `pointer-events: none`) sin retirarla del layout ni del estado, mostrando únicamente el fantasma remoto interpolado. El primer mensaje de arrastre emitido por el jugador emisor lleva de inmediato la posición normalizada real de la carta (tomada directamente de su posición previa en el campo o de las coordenadas exactas de pantalla mediante `getBoundingClientRect`), evitando cualquier valor por defecto en el centro de la pantalla (50%, 50%). En los clientes receptores, el fantasma remoto se instancia en esa posición inicial exacta sin transición CSS (`transition-none`), activando la interpolación suave (`transition-[left,top] duration-75 ease-linear`) únicamente a partir del segundo mensaje recibido, garantizando que el fantasma no se anime erráticamente desde el centro de la mesa (coincidencia del primer frame con la posición original de la carta $\le 2$ px y 0 frames en el centro de la mesa comprobado con `requestAnimationFrame`). Al soltar la carta, el emisor emite `CARD_DRAG_MOVE` con `isDragging: false` y la posición final calculada `{ position: { x, y } }`. El receptor B mantiene el fantasma visible en dicha posición final y la carta fija oculta (`opacity: 0`) bajo la bandera `pendingSync: true` hasta la llegada del evento autoritativo `ROOM_STATE_SYNC`. En ese idéntico frame de renderizado, se retira `pendingSync` y se revela la carta fija en su nueva posición autoritativa, garantizando cero frames visibles en la posición anterior y cero duplicados (verificado mediante muestreo con `requestAnimationFrame` en el contexto B durante y tras el soltado). Si transcurre 1 segundo sin respuesta o el emisor se desconecta, THE sistema cancela `pendingSync` como salvaguarda.
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
        - **Modal inspector con menú contextual y envío al campo centrado en sección jugable sin dock (Punto 7 / Punto 2 y Punto 8):** Al hacer clic en cualquier pila, THE sistema SHALL abrir un modal en portal con la cuadrícula completa de cartas de dicha zona. Hacer clic derecho sobre una carta dentro del modal (o en la mano) despliega un menú contextual con las opciones: "Enviar a la mano", "Enviar al campo" (y en cementerio, "Enviar al exilio"). Al seleccionar "Enviar al campo", THE sistema SHALL calcular las coordenadas normalizadas en el centro de la sección jugable del propio jugador (excluyendo el dock inferior en 2, 4 y 6 jugadores), aplicando un desplazamiento progresivo en cascada (+0.015 en $x, y$) para evitar que las cartas se apilen en el mismo punto exacto. La carta SHALL quedar registrada autoritativamente con su `ownerId` inmutable y su titular temporal `holderId` asignado al propio jugador. Coordenadas medidas en 1080p: 2p en (436.80, 407.70) con centro jugable (480.00, 459.00); 4p en (436.80, 151.20) con centro jugable (480.00, 202.50); 6p en (276.80, 151.20) con centro jugable (320.00, 202.50).
       - **Privacidad de zonas:** Cualquier jugador puede inspeccionar libremente el cementerio y el exilio de todos los participantes. La biblioteca privada únicamente puede ser inspeccionada por su respectivo dueño; los rivales reciben los datos de las cartas enmascarados desde el servidor.

    7.20. **Zona de comando interactiva y gestión autoritativa de impuesto (Punto 6):**
       - **Ranura droppable:** La zona de comando en el dock de cada jugador SHALL ser un destino droppable (`useDroppable` con `data: { zone: 'command', playerId }`, deshabilitado para rivales), permitiendo devolver al comandante arrastrándolo desde la mesa o pilas.
       - **Botón explícito de devolución:** WHEN la zona de comando está vacía (comandante en el campo u otra zona), THE sistema SHALL mostrar un botón explícito "Devolver al comando" (`data-testid="return-to-command-btn"`), permitiendo devolverlo inmediatamente sin necesidad de arrastre.
       - **Impuesto exclusivamente manual sin auto-incremento (Punto 3):** Devolver al comandante a la zona de comando (sea por arrastre, mediante botón explícito o mediante menú contextual) SHALL NOT incrementar automáticamente el impuesto de comandante. El impuesto de comandante no posee motor de reglas automatizado y es gestionado exclusivamente de forma manual por el jugador mediante los botones interactivos ±2 de la zona de comando.
       - **Sacar a la mesa no altera el tax:** Sacar el comandante desde la zona de comando hacia el campo de batalla SHALL mantener inalterado el valor actual de `commanderTax`.
       - **Badge de Tax interactivo:** La ranura de comando SHALL mostrar permanentemente un badge con el valor actual del impuesto (`Tax: +0`, `Tax: +2`, etc., `data-testid="commander-tax-badge"`) y dos controles interactivos (`+` y `-`, `data-testid="commander-tax-plus"` / `commander-tax-minus`) que sumen o resten de 2 en 2 (`SET_PLAYER_COUNTER` con delta ±2; el impuesto nunca varía de 1 en 1).
       - **Eliminación de duplicidad en la pastilla de vida:** Los controles de `commanderTax` SHALL ser eliminados de la pastilla de vida (`LifePill`), centralizando toda la gestión del impuesto exclusivamente en la zona de comando.

    7.21. **Modal inspector de biblioteca con buscador, filtros e indicador de cola Scryfall (Punto 8):**
       - **Buscador en tiempo real por nombre:** El modal inspector de la biblioteca privada SHALL incorporar una barra de búsqueda (`data-testid="library-search-input"`) que filtre en tiempo real las cartas de la biblioteca cuyo nombre coincida con el texto ingresado (búsqueda sin distinción de mayúsculas/minúsculas).
       - **Filtros rápidos por tipo:** El modal SHALL proporcionar botones de filtrado rápido por categoría de carta: Criaturas, Instantáneos, Conjuros, Artefactos, Encantamientos, Tierras y Planeswalkers (además de una opción para ver "Todos" o deseleccionar el filtro activo), evaluando la línea de tipos (`typeLine`) de cada carta.
       - **Indicador de sincronización con Scryfall:** WHEN existan peticiones en cola o reintentos pendientes con Scryfall (`syncQueueCount > 0`), THE sistema SHALL mostrar un indicador visual en una esquina del modal (`data-testid="scryfall-sync-indicator"`) con el texto exacto `"Sincronizando cartas... (X en cola)"`. WHEN la cola se vacíe o finalice la sincronización, dicho indicador SHALL desaparecer por completo del DOM.

    7.22. **Arrastre a la biblioteca a la parte superior (Punto 6):**
       - Arrastrar una carta (desde el campo de batalla, mano o pilas) hacia la ranura droppable de la biblioteca la transfiere autoritativamente a la parte superior (arriba, índice 0 de `zones.library` mediante `unshift`), garantizando que sea la próxima carta que se roba al ejecutar una acción de robo (`DRAW_CARDS`).
       - La acción emite `MOVE_CARD` con `toZone: 'library'` y `destinationIndex: 0`, resuelto tanto en cliente como por defecto en el servidor ante la ausencia de índice explícito. Al entrar a la biblioteca, la posición en la mesa y el estado girado (`isTapped`) se limpian automáticamente.

    7.23. **Menú contextual integral (Mano, Mesa y Pilas), submenú de biblioteca y revelación privada (Punto 7):**
       - **Menú contextual:** Al hacer clic derecho (o pulsación prolongada) sobre una carta en la mano (`HandFan`), en el campo de batalla (`BattlefieldCanvas`) o dentro del modal inspector de pilas (`PlayerCell`), THE sistema SHALL desplegar un menú contextual unificado con los destinos:
         - *Enviar a Cementerio:* Inserta la carta en la parte superior del cementerio (índice 0).
         - *Enviar a Exilio:* Inserta la carta en la parte superior del exilio (índice 0).
         - *Enviar a Mesa:* Mueve la carta al centro de la sección jugable del propio jugador en la cuadrícula sin contar el dock con desplazamiento en cascada (+0.015 en x, y), asignando `ownerId` inmutable y `holderId` del jugador local (Punto 2 y Punto 8: 2p en (436.80, 407.70), 4p en (436.80, 151.20) y 6p en (276.80, 151.20)).
         - *Enviar a Biblioteca:* Despliega opciones de colocación (Arriba, Abajo, Aleatoria):
           - "Arriba": Inserta la carta en el índice 0 (próxima carta a ser robada).
           - "Abajo": Inserta la carta en el fondo (`zones.library.length`).
           - "Aleatoria": Inserta la carta en una posición al azar uniforme entre todas las posiciones posibles ($0$ a $L$) mediante CSPRNG criptográficamente seguro en el servidor (`crypto.randomInt(0, library.length + 1)`). La bitácora registra autoritativamente "X envió una carta a su biblioteca" sin revelar la posición.
         - *Revelar:* Despliega un submenú con opciones de destino:
           - "A toda la mesa": Emite `REVEAL_CARD` sin destinatario específico; el servidor difunde la identidad a todos los clientes y registra en la bitácora `X reveló "[Nombre]" a todos`.
           - "A [Jugador X]": Emite `REVEAL_CARD` con `targetPlayerId`; el servidor envía la identidad exclusivamente al jugador objetivo y al emisor (`VisibilityFilter`). En la bitácora pública registra `X reveló una carta a Y` (sin exponer el nombre a los rivales).
       - **Efecto de revelado:** La acción de revelar NO desplaza la carta de su zona. Los clientes que reciben el evento `CARD_REVEALED` muestran una ventana flotante temporal (`RevealedCardModal`) con la imagen y metadatos de la carta, cerrable mediante botón o tecla `Escape`.
    7.24. **Expansión en línea de submenús del menú contextual y navegación con teclado (Punto 1 de Correcciones del Menú Contextual):**
        - **Eliminación total de submenús flotantes:** Se eliminan los contenedores absolutos flotantes (`absolute left-full`) y los temporizadores/eventos de `onMouseEnter` y `onMouseLeave` que provocaban el cierre accidental del submenú al mover el ratón o trackpad a través del espacio intersticial.
        - **Expansión en línea dentro del mismo menú:** Al pulsar sobre "Biblioteca" se despliegan sus opciones de colocación directamente debajo en el mismo flujo vertical del menú (`data-testid="context-library-submenu"`). Al pulsar sobre "Revelar", se despliegan debajo la opción "A toda la mesa" y un botón por cada jugador rival conectado (`data-testid="context-reveal-submenu"`).
        - **Permanencia y cierre estricto:** El menú contextual permanece abierto de forma estable e independiente de la velocidad del puntero, cerrándose únicamente al hacer clic fuera (backdrop), al pulsar la tecla Escape (`Esc`), o al seleccionar una opción de acción.
        - **Navegación completa por teclado:** Al abrir el menú, el foco se sitúa en el primer botón disponible. Las teclas de flecha abajo (`ArrowDown`) y flecha arriba (`ArrowUp`) permiten recorrer cíclicamente todos los elementos interactivos visibles (incluyendo las opciones expandidas en línea). La tecla `Enter` activa el elemento enfocado (desplegando las opciones o ejecutando la acción), y la tecla `Escape` cierra el menú.
    7.25. **Colocación aleatoria en biblioteca y privacidad de posición (Punto 2 de Correcciones del Menú Contextual):**
        - **Eliminación de posición específica N:** Se retiran por completo la opción de posición específica y el campo numérico del cliente y servidor para evitar microgestión y fugas de información.
        - **Opciones autoritativas de biblioteca:** El menú contextual ofrece exactamente tres opciones: "Arriba", "Abajo" y "Aleatoria".
        - **CSPRNG uniforme en servidor:** La opción "Aleatoria" (`randomPosition: true`) selecciona de forma uniforme un índice entre $0$ y la longitud de la biblioteca inclusive mediante `crypto.randomInt(0, library.length + 1)`.
        - **Registro sin filtrado en bitácora:** Para preservar la incertidumbre estratégica, cualquier envío de cartas a la biblioteca se registra en la bitácora pública como `X envió una carta a su biblioteca`, sin exponer a los rivales si quedó arriba, abajo o en qué posición se insertó.
    7.26. **Certificación E2E de menú contextual inline, pausas diagonales y privacidad de biblioteca y revelado (Punto 3 de Correcciones del Menú Contextual):**
        - **Invarianza ante movimientos diagonales y pausas:** THE sistema SHALL mantener el menú contextual y sus opciones desplegadas 100% abiertas ante trayectorias del puntero arbitrarias o diagonales con desvíos laterales (+35 px) y pausas prolongadas (0 ms, 300 ms y 800 ms), sin cerrarse por falsos eventos de `mouseleave` ni depender de la velocidad del puntero del ratón o trackpad.
        - **Verificación de colocación Arriba:** La carta enviada al tope (`destinationIndex: 0`) SHALL ser la carta inmediatamente devuelta al ejecutar la acción de robar (`DRAW_CARDS`).
        - **Verificación de colocación Abajo:** La carta enviada al fondo (`destinationIndex: library.length`) SHALL permanecer en el fondo y NO ser entregada en el siguiente robo individual de la biblioteca.
        - **Verificación de colocación Aleatoria:** La carta insertada de forma aleatoria mediante CSPRNG SHALL entrar a la biblioteca y salir de la mano del jugador emisor; la bitácora pública en clientes remotos SHALL registrar `"X envió una carta a su biblioteca"` sin exponer jamás el índice numérico ni la posición elegida.
        - **Verificación de Revelado Privado:** La acción de revelar a un jugador rival SHALL transmitir la identidad de la carta exclusivamente al destinatario especificado (`RevealedCardModal`), sin difundir la identidad a terceros ni mover la carta de su zona.
    7.27. **Panel modal "Ver carta" con metadatos oficiales, símbolos, artista, copyright y dictámenes (Punto 4 de Correcciones del Cliente):**
        - **Disponibilidad:** THE sistema SHALL presentar la opción "Ver carta" (`data-testid="context-view-card"`) en el menú contextual de cartas visibles (mano propia, campo de batalla boca arriba, cementerio, exilio y comandantes).
        - **Contenido del panel:** Al activarse, THE sistema SHALL desplegar el modal `CardDetailsModal` (`data-testid="card-details-modal"`) con imagen de alta definición (large o normal), nombre, coste de maná con insignias MTG, línea de tipo, texto Oracle en inglés con símbolos formateados, fuerza/resistencia o lealtad, identidad de color, edición/set, rareza, número de coleccionista, atribución al artista, aviso de copyright oficial ("™ & © Wizards of the Coast"), indicador de legalidad en Commander y sección de dictámenes oficiales (rulings) con fecha y fuente, o "Sin dictámenes" si no registra entradas.
        - **Cartas de doble cara (DFC):** Selector interactivo (`card-details-face-switcher`) que conmuta entre cara frontal y posterior actualizando imagen, estadísticas y texto Oracle.
        - **Cierre:** Cierra mediante clic en backdrop, botón de aspas o tecla `Escape`.
    7.28. **Sincronización local de dictámenes oficiales (Rulings) y privacidad de consultas (Punto 5 de Correcciones del Cliente):**
        - **Origen 100% local:** THE sistema SHALL proveer la totalidad de datos para "Ver carta" exclusivamente desde la base de datos local (PostgreSQL con Prisma y fallback en memoria). Cero llamadas a APIs externas (Scryfall o Gatherer) en tiempo real al interactuar con cartas en mesa o mano.
        - **Tabla y modelo de Rulings:** Modelo relacional `Ruling` indexado por `oracleId`, con campos de fecha de publicación (`publishedAt`), fuente oficial (`source`), y texto del dictamen (`comment`).
        - **Integración con sincronización nocturna:** Adición de la descarga del bulk `rulings` a la tarea cron nocturna automatizada (`BulkSyncService`), junto a Oracle Cards.
        - **Comprobación de fecha para evitar descargas redundantes:** Verificación del campo `updated_at` contra la última sincronización (`lastRulingsUpdatedAt`); si no hay cambios, se omite la descarga retornando `skipped: true`.
        - **Cabeceras obligatorias:** Uso estricto de cabeceras `User-Agent` identificado y `Accept: application/json` en todas las consultas al catálogo bulk de Scryfall.
        - **Cartas sin dictámenes:** Si una carta no registra dictámenes en la base de datos local, la interfaz presenta el estado visual accesible "Sin dictámenes".
    7.29. **Restricción estricta de privacidad en "Ver carta" y anonimización de información oculta (Punto 6 de Correcciones del Cliente):**
        - **Condición de visibilidad estricta:** THE sistema SHALL restringir la opción "Ver carta" (`data-testid="context-view-card"`) exclusivamente a cartas públicas o de información ya conocida por el jugador local.
        - **Cartas boca abajo:** Para cualquier carta boca abajo (`isFaceDown: true`) —sea propia o ajena en el campo de batalla, cementerio o exilio—, THE sistema SHALL NEVER ofrecer "Ver carta", ocultar la opción en el menú contextual y mostrar el encabezado `"Carta boca abajo"`.
        - **Manos ajenas:** Para cartas en manos de jugadores rivales, THE sistema SHALL NEVER ofrecer "Ver carta" y mostrar el encabezado anonimizado `"Carta oculta"`.
        - **Protección contra mutación de cartas rivales:** Cuando el menú contextual se activa sobre permanentes boca arriba de un oponente, THE sistema SHALL suprimir todas las opciones de mutación (girar, contadores, clonar, voltear o traslados a zonas), permitiendo exclusivamente la lectura de información pública mediante "Ver carta".
    7.30. **Certificación automatizada E2E de Ver Carta, Dictámenes, DFC, Privacidad y Atribución Playmat (Punto 8 de Correcciones del Cliente):**
        - **Carta con dictámenes oficiales:** THE suite de pruebas SHALL verificar que una carta con dictámenes (p. ej. Sol Ring) exponga en el panel modal todos sus campos oficiales: imagen en alta resolución, nombre, coste de maná, tipo, texto Oracle con símbolos formateados, artista, copyright legal y la lista completa de dictámenes con fecha y fuente oficial.
        - **Cartas de doble cara (DFC):** THE suite de pruebas SHALL certificar que una carta de doble cara (p. ej. Delver of Secrets // Insectile Aberration) permita alternar dinámicamente entre caras con el selector interactivo, actualizando en tiempo real la imagen, nombre, tipo, estadísticas P/T (1/1 a 3/2 con Flying) y texto Oracle.
        - **Cartas sin dictámenes:** THE suite de pruebas SHALL validar que una carta sin dictámenes registrados presente de manera visible y accesible el estado "Sin dictámenes".
        - **Privacidad y anonimización:** THE suite de pruebas SHALL validar que al interactuar con una carta boca abajo ajena en el campo de batalla, el menú contextual NO ofrezca "Ver carta" y anonimice el título a "Carta boca abajo".
        - **Comprobación de fecha en sync nocturno:** THE suite de pruebas SHALL verificar que la sincronización de dictámenes omita la descarga si la fecha del archivo bulk no ha cambiado (`skipped: true, reason: 'not_modified'`).
        - **Atribución en selector de playmat:** THE suite de pruebas SHALL certificar que en el modal de personalización de playmat con fondo art_crop se muestren el artista, el copyright oficial y el botón "Ver carta" que abre el panel de inspección.
        - **Artefactos visuales:** THE suite de pruebas SHALL capturar y preservar capturas al 200% de la carta simple y de la DFC con dictámenes en el directorio de artefactos (`card-details-single-faced.png` y `card-details-double-faced.png`).
    7.31. **Revelación persistente en mano con filtrado autoritativo e insignias visuales (Punto 1 de Correcciones del Cliente - A.1):**
        - **Persistencia de destinatarios (`revealedTo`):** Cada carta en la mano almacena en su instancia autoritativa la propiedad `revealedTo?: string[] | 'all'`, indicando la lista de IDs de jugadores destinatarios o todos los jugadores de la mesa.
        - **Filtrado autoritativo en VisibilityFilter:** El servidor transmite la identidad real (`definition`) de la carta únicamente al propietario y a los destinatarios especificados en `revealedTo`. Para cualquier cliente no destinatario, la definición es enmascarada a `MASKED_CARD_DEFINITION` ("Carta Oculta", scryfallId `hidden_card`) y el campo `revealedTo` se elimina por completo para impedir fugas de información por inspección de red o devtools.
        - **Renderizado en cliente destinatario y no destinatario:** En el abanico de mano del jugador emisor (`HandFan`), los clientes destinatarios ven esa carta boca arriba con su imagen real (`CardDisplay`) y las demás cartas boca abajo; los no destinatarios ven toda la mano rival boca abajo con dorsos tradicionales.
        - **Insignia de ojo rojo y tooltips contextuales:** La carta revelada muestra una insignia con icono de ojo rojo (`data-testid="revealed-eye-badge"`). Para el propietario, el tooltip indica `"Revelada a [Nombre de rivales]"` (o `"Revelada a todos"`). Para los destinatarios, indica `"Revelada por [Nombre del propietario]"`.
        - **Terminación de la revelación:** La condición de revelación expira automáticamente cuando la carta sale de la mano (jugar al campo de batalla, enviar a cementerio, exilio o biblioteca), cuando se produce un barajado de biblioteca (`shuffleLibrary`), al ejecutarse un mulligan, o cuando el propietario selecciona la opción "Dejar de revelar" (`data-testid="context-unreveal-btn"` / acción `UNREVEAL_CARD`), visible únicamente en cartas de la mano con revelación activa.
        - **Ventana temporal y bitácora:** La ventana emergente temporal (`CARD_REVEALED` / `RevealedCardModal`) y el registro en la bitácora pública se mantienen inalterados.
    7.32. **Indicador de Poder y Resistencia (P/T) efectivo en mesa (Punto 2 de Correcciones del Cliente - B.2):**
        - **Cálculo de P/T efectivo:** Toda carta en la mesa que cuente con estadísticas de poder y resistencia (impresa o definida por el jugador) muestra un indicador con el valor efectivo: $\text{P/T Efectivo} = \text{Base} + \text{Contadores } +1/+1 - \text{Contadores } -1/-1$ (admitiendo tanto `-1/-1` como `−1/−1` Unicode).
        - **Anclaje e invarianza de rotación:** El indicador va anclado a la esquina inferior izquierda de la caja visual de la carta (`card-slot-container`, que ya adopta las dimensiones orientadas $w \times h$ o $h \times w$ al girarse), pero permanece 100% erguido sin girar con la carta (`transform: none`).
        - **Ubicación exterior:** Se sitúa estrictamente por fuera del borde de la imagen de la carta (`absolute -bottom-2.5 -left-1`), garantizando que la línea inferior con el nombre del artista y el aviso de copyright legal permanezcan 100% visibles y libres de oclusión en cumplimiento de las directrices de Scryfall.
        - **Código cromático reactivo:** Color verde (`text-emerald-400`, borde y resplandor esmeralda) si el valor efectivo supera el valor base, rojo (`text-rose-400`, borde y resplandor carmesí) si queda por debajo del valor base, y neutro (`text-slate-200`, borde pizarra) si es exactamente igual al base.
        - **Cartas con `*` o expresiones variables:** Cartas con `*` (p. ej. `*/*`, `1+*`) muestran `*` en el indicador hasta que el jugador asigne un valor base numérico en el menú contextual.
        - **Valores nulos o negativos sin motor de reglas:** El valor de poder o resistencia puede alcanzar 0 o cifras negativas (p. ej. `-1/-1`), manteniéndose en mesa sin destrucción ni descarte automático al carecer la aplicación de motor de reglas.
        - **Reinicio al salir de la mesa:** Cuando la carta abandona el campo de batalla (hacia cementerio, exilio, mano o biblioteca), todos sus contadores y valores de poder/resistencia base son reseteados automáticamente.
    7.33. **Sección en línea de Poder y Resistencia en menú contextual (Punto 3 de Correcciones del Cliente - B.3):**
        - **Expansión vertical en línea:** En el menú contextual de cualquier carta visible del campo de batalla (`fromZone === 'battlefield' && !card.isFaceDown`), THE sistema SHALL presentar una sección desplegable en línea titulada "Poder y resistencia" (`data-testid="context-pt-toggle-btn"` / `data-testid="context-pt-section"`), accesible para cualquier jugador de la mesa sin exclusión por titularidad (`canMutate`).
        - **Cuatro campos numéricos interactivos:** La sección contiene cuatro campos de entrada numérica (`<input type="number">`), modificables mediante escritura directa, teclas de flechas arriba/abajo o rueda del ratón (`onWheel`):
            1. "Poder base" (`data-testid="pt-input-base-power"`): inicializado con el valor de fuerza impreso de la carta (o vacío/placeholder para cartas sin P/T como tierras a animar).
            2. "Resistencia base" (`data-testid="pt-input-base-toughness"`): inicializado con el valor de resistencia impreso de la carta (o vacío/placeholder para cartas sin P/T). Permite edición desacoplada para efectos asimétricos (+1/+0 o 0/+1).
            3. "Contadores +1/+1" (`data-testid="pt-input-plus-counters"`): inicializado con el total de contadores $+1/+1$ en la carta ($min=0$).
            4. "Contadores −1/−1" (`data-testid="pt-input-minus-counters"`): inicializado con el total de contadores $-1/-1$ en la carta ($min=0$).
        - **Sin botones de incremento:** La interfaz no incluye botones del tipo "agregar 1" ni "+1", operando exclusivamente con los campos numéricos directos.
        - **Recálculo automático y sincronización autoritativa:** Al modificar cualquier campo, el P/T efectivo se recalcula de forma reactiva en pantalla y se envía al servidor mediante la acción `SET_CARD_PT`, guardándose en la `CardInstance` (`basePower`, `baseToughness`, contadores) y sincronizándose a todos los clientes (`ROOM_STATE_SYNC`).
        - **Registro en bitácora:** El servidor registra autoritativamente en la bitácora pública qué jugador modificó el P/T y el resultado final (`[Jugador] modificó poder/resistencia de "[Nombre]" a X/Y`).
        - **Ciclo de vida:** Al abandonar la mesa hacia cualquier otra zona, los contadores y las bases numéricas modificadas se resetean a sus valores iniciales.
    - **REQ-9.7.30 (Fila de insignias para contadores y palabras clave, Punto 4):**
      - **Insignias e iconos:** Cada contador y palabra clave presente en una carta en la mesa muestra una insignia con icono representativo, distribuida en una fila horizontal pegada al borde superior de la carta, sin cubrir la línea inferior de artista y copyright (pautas de Scryfall).
      - **Contadores admitidos (11 tipos):** $+1/+1$, $−1/−1$, Lealtad (`loyalty`), Carga (`charge`), Tradición (`lore`), Escudo (`shield`), Aturdimiento (`stun`), Tiempo (`time`), Finalidad (`finality`), Genérico (`generic`) y Personalizado (`custom`, con nombre libre editable).
      - **Palabras clave admitidas (14 oficiales MTG):** Toque mortal (Deathtouch), Defensor (Defender), Daña dos veces (Double strike), Miedo (Fear), Daña primero (First strike), Vuela (Flying), Prisa (Haste), Antimaleficio (Hexproof), Indestructible (Indestructible), Vínculo vital (Lifelink), Amenaza (Menace), Alcance (Reach), Arrollar (Trample) y Vigilancia (Vigilance). Mostradas con nombre oficial en español y, entre paréntesis, el original en inglés.
      - **Secciones en línea en el menú contextual:**
        1. "Contadores" (`data-testid="context-counters-section"`): desplegable en línea con campos numéricos directos (teclado, rueda del ratón y flechas) para cada tipo de contador; Finalidad opera como un interruptor on/off exclusivo ($0$ o $1$); y sección de Contadores Personalizados con creación de nuevos marcadores con nombre y eliminación.
        2. "Palabras clave" (`data-testid="context-keywords-section"`): desplegable en línea con los 14 términos oficiales y un interruptor on/off (`role="switch"`) individual para cada una.
      - **Modificación universal y registro:** Cualquier jugador puede modificar los contadores y las palabras clave de cualquier carta visible en la mesa; el servidor valida y registra autoritativamente la acción en la bitácora pública con el nombre del autor.
      - **Ciclo de vida y reseteo:** Al salir la carta del campo de batalla (hacia cementerio, exilio, mano o biblioteca), todos sus contadores y palabras clave activas son reseteados y eliminados de la instancia.
    - **REQ-9.7.31 (Vista previa grande con panel explicativo de contadores y palabras clave, Punto 5):**
      - **Panel anexo en vista previa:** Al pasar el ratón (hover) sobre una carta con contadores o palabras clave activas, THE sistema SHALL desplegar junto a la vista previa grande un panel explicativo anexo (`data-testid="preview-keywords-counters-panel"`).
      - **Contenido del panel explicativo:** Lista detallada de cada contador y palabra clave presentes, con su icono gráfico, nombre oficial en español con original en inglés entre paréntesis (p. ej. "Vuela (Flying)"), cantidad numérica para contadores y el texto de ayuda oficial (reminder text en español).
      - **Tooltips en cartas pequeñas:** Las insignias de la carta pequeña en mesa disponen de tooltip nativo con esa misma información detallada.


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

### REQ-21 Iniciativa con D20 y orden de turnos (Actualizado Punto 4)
**Historia:** Como jugador, quiero que el orden de turnos se decida con un dado de 20 caras de forma 100% automática por el servidor, para que sea justo, visible y sin demoras.
1. WHEN la partida inicia, THE sistema SHALL abrir la fase de iniciativa en la que el servidor genera automáticamente una tirada de d20 para cada jugador participante.
2. THE sistema SHALL generar cada resultado en el servidor de forma 100% automática con un generador criptográficamente seguro (CSPRNG, valores 1 a 20): ningún jugador pulsa un botón en la interfaz y el cliente no puede enviar ninguna acción de tirada de iniciativa (cualquier intento se rechaza autoritativamente con error en el servidor).
3. THE sistema SHALL mostrar la animación de los resultados y desempates a toda la mesa de forma sincronizada y avanzar la fase automáticamente sin intervención del usuario.
4. THE sistema SHALL ordenar los turnos de mayor a menor resultado; el mayor juega primero.
5. IF hay empate, THEN THE sistema SHALL repetir automáticamente la tirada solo entre los jugadores empatados en rondas sucesivas, hasta un máximo de 5 rondas; si el empate persiste tras 5 rondas, THE sistema SHALL desempatar por número de asiento ascendente.
6. THE sistema SHALL mostrar el orden resultante (1.º, 2.º, 3.º…) en la barra de turnos y junto a cada zona de jugador.
7. WHEN la iniciativa termina y se muestra el orden resuelto, THE sistema SHALL pasar la mesa de forma automática a la fase de mulligan (`mulligan`); REQ-6 (pasar turno) usa este orden.
8. THE botón "Dados" existente SHALL seguir disponible en la barra flotante durante la partida para tiradas libres (d6, d20, moneda), siendo tiradas y generadas siempre de forma autoritativa por el servidor.

### REQ-23 Fase de Mano Inicial y Mulligan de Londres (Punto 5)
**Historia:** Como jugador, quiero evaluar mi mano inicial en una ventana dedicada y poder realizar mulligans siguiendo las reglas oficiales de Commander (Regla de Londres con primer mulligan gratuito), para empezar la partida con una mano jugable.
1. THE estados del ciclo de vida de la mesa SHALL ser estrictamente: `lobby`, `initiative`, `mulligan`, `playing`, `finished`.
2. WHEN la iniciativa concluye, THE servidor SHALL barajar cada biblioteca con CSPRNG (Fisher-Yates) y repartir 7 cartas iniciales a cada jugador en estado oculto. La mano NO aparece en el abanico inferior hasta que el jugador se queda y concluye la fase.
3. THE orden de decisión SHALL seguir estrictamente el orden de turno resuelto (`turnOrder`), empezando por el primer jugador y siguiendo en sentido horario. Solo decide el jugador en turno de decisión activo; el resto ve "X está decidiendo".
4. THE sistema SHALL aplicar la Regla de Londres con mulligan gratis de Commander:
   - Al hacer mulligan, la mano actual vuelve a la biblioteca, se baraja con CSPRNG y se roban 7 cartas.
   - El primer mulligan ($k = 1$) es gratis.
   - Al quedarse tras $k$ mulligans ($k \ge 2$), el jugador pone al fondo de su biblioteca $\max(0, k - 1)$ cartas, en el orden exacto que elija.
   - El jugador puede repetir mulligans hasta quedarse con 0 cartas; cuando la mano resultante sería 0 cartas, solo queda disponible el botón "Quedarme".
5. THE interfaz SHALL presentarse como "Opening hand" de playgroup.gg:
   - Ventana modal sobre la mesa atenuada con las 7 cartas grandes (imágenes de Scryfall en alta resolución).
   - Botones "Quedarme con la mano" y "Mulligan".
   - Avisos informativos: "El primer mulligan es gratis" y "Si te quedas, pondrás N carta(s) al fondo".
   - Si $N > 0$, el jugador marca $N$ cartas interactivamente, visualizando el orden numérico de selección antes de confirmar la devolución al fondo de la biblioteca.
6. **Privacidad estricta:** Los rivales solo ven el estado ("X está decidiendo", "X se quedó con N cartas"), nunca las cartas ni identidades de la mano ajena. La reconexión durante la fase restaura la ventana modal (`RESUME`). Si un jugador está desconectado, el anfitrión puede hacer que se quede con su mano actual para no bloquear la partida.
7. WHEN todos los jugadores se han quedado, la fase pasa automáticamente a `playing` y empieza el turno del primer jugador. La bitácora registra "X hizo mulligan" y "X se quedó con N cartas".
8. THE sistema SHALL rechazar y eliminar cualquier acción de mulligan suelta durante la partida (`playing`); el mulligan solo existe en esta fase.


### REQ-24 Flexibilización de mutaciones sobre permanentes visibles de la mesa (Punto 7 de Correcciones del Cliente - D.7)
1. **Interacción universal sobre permanentes visibles del campo de batalla:**
   - CUALQUIER jugador de la mesa CAN girar o enderezar (`onTap`, mediante doble clic o menú contextual), voltear boca arriba/abajo (`onFlip`), clonar fichas o permanentes (`onClone`), definir o modificar contadores (`setCardCounter`), ajustar poder/resistencia base y contadores (`setCardPT`) y alternar palabras clave (`toggleCardKeyword`) sobre cualquier carta visible del campo de batalla (`fromZone === 'battlefield' && !card.isFaceDown`).
   - El servidor registra autoritativamente la autoría en la bitácora pública de la partida (`this.addLog(playerId, ...)`).
2. **Protección estricta de traslados entre zonas y propiedad:**
   - El movimiento y arrastre de cartas entre zonas (hacia la mano, cementerio, exilio, biblioteca o zona de comando) SHALL continuar gobernado estrictamente por el propietario original (`ownerId`) o el titular temporal (`holderId`) (`canMove` / `canMutate`).
3. **Protección inviolable de información oculta:**
   - La identidad de las cartas ocultas (manos ajenas no reveladas, bibliotecas ajenas y cartas boca abajo) SHALL permanecer estrictamente protegida por el servidor (`VisibilityFilter`) sin ofrecer nunca opciones de inspección («Ver carta») ni mutación.

### REQ-25 Certificación E2E integral de correcciones del cliente (Punto 8 de Correcciones del Cliente - E.8)
1. **Suite de pruebas automatizada Playwright:**
   - Implementada en [`apps/web/e2e/client-features-audit.spec.ts`](apps/web/e2e/client-features-audit.spec.ts), ejecutada de extremo a extremo en pod real de 3 participantes (1920x1080).
2. **Revelación persistente en mano y privacidad estricta:**
   - Al seleccionar un destinatario específico («Bob»), la carta se revela exclusivamente a dicho destinatario con arte real, nombre e insignia de ojo rojo (`[data-testid="revealed-eye-badge"]`), tooltip `"Revelada por Alice"`.
   - El emisor visualiza el ojo rojo con tooltip `"Revelada a Bob"`.
   - El cliente no destinatario («Charlie») permanece estrictamente ciego ante la carta (`count === 0`, sin fuga de texto o metadatos en DOM o WebSocket).
   - Al pulsar «Dejar de revelar», la identidad se enmascara de inmediato para todos los destinatarios.
3. **Poder y Resistencia efectivo, fórmulas, colores y soporte de valores negativos:**
   - Indicador P/T exterior (`CardPTBadge`) anclado a la esquina inferior izquierda.
   - P/T efectivo = base + contadores $+1/+1$ − contadores $-1/-1$.
   - Colores verificados: verde (`up`) al superar el base, rojo (`down`) al quedar por debajo, neutro (`neutral`) cuando es igual.
   - Soporte de valores 0 y negativos (ej. poder base 0 y resistencia base -1 resultando en P/T efectivo -1/-2, rojo/down).
   - Soporte para cartas sin P/T impreso (ej. tierras o artefactos a animar): muestra 0 indicadores P/T inicialmente; al definir base manual (5/5), se calcula y muestra de forma reactiva (5/5).
4. **Insignias y panel explicativo de palabras clave y contadores:**
   - Fila de insignias (`CardBadges.tsx`) pegada al borde superior de la carta con 6 distintivos activos (flying, deathtouch, loyalty, shield, +1/+1, -1/-1).
   - Tooltip oficial con traducción al español y término original en inglés entre paréntesis más texto recordatorio («Vuela (Flying) - Esta criatura no puede ser bloqueada...»).
   - Panel lateral desacoplado en la vista previa hover (`preview-keywords-counters-panel`) mostrando icono, nombre, cantidad y recordatorio oficial en español.
5. **Geometría y posicionamiento exterior en carta erguida y girada:**
   - Posición invariable fuera del marco: `badgeBottomDiff = 10 px` (proyecta 10 px por debajo del borde de la imagen, sin tapar la línea de artista y copyright).
   - En permanente girado a 90°: el cuerpo rota 90° (`rotate(90deg)`), el indicador P/T permanece erguido (`transform: none`, `isBadgeErguido: true`) y mantiene `badgeBottomDiff = 10 px`.
6. **Reinicio autoritativo al abandonar el campo de batalla:**
   - Al trasladar el permanente al cementerio, el servidor resetea `counters = {}`, `basePower`, `baseToughness` y `keywords`.
7. **Capturas y métricas certificadas:**
   - `audit-persistent-reveal-bob.png` (1,527,693 bytes, varianza 5423.3)
   - `audit-persistent-reveal-charlie.png` (1,491,464 bytes, varianza 5433.8)
   - `audit-pt-indicator-colors.png` (1,621,129 bytes)
   - `audit-preview-keywords-counters.png` (1,788,671 bytes)
   - `audit-pt-indicator-tapped-untapped.png` (1,537,560 bytes)
   - Cero errores de consola de React o del navegador (`cleanErrors: []`).

### REQ-22 Interfaz de mesa inmersiva (estilo playgroup.gg)
**Referencia visual:** concepto de cuadrícula a sangre, playmats, vida en la esquina interior, mano y pilas en el borde inferior, barra flotante (sin copiar código, imágenes ni marca de playgroup.gg).
**Historia:** Como jugador, quiero ver a todos en una cuadrícula a pantalla completa, cada uno con su propio fondo y su propio espacio, para sentir que estamos jugando juntos en una mesa.
1. THE pantalla de partida SHALL ocupar toda la ventana (100 % del ancho y alto) sin scroll, sin márgenes exteriores y sin barra lateral permanente; las celdas SHALL tocarse entre sí separadas solo por una línea fina (1 px) oscura.
2. THE pantalla SHALL dividirse en una cuadrícula de **2 columnas** para 2 jugadores (1 fila × 2 columnas lado a lado, `--cols = 2`) o de **2 filas y hasta 3 columnas** para 3–6 jugadores (máximo 6 celdas), una por jugador:
   - 2 jugadores: 1 fila × 2 columnas (2 columnas lado a lado, `--cols = 2`)
   - 3 jugadores: 2 filas × 2 columnas (3 jugadores + 1 celda libre para registro/chat)
   - 4 jugadores: 2 filas × 2 columnas
   - 5 jugadores: 2 filas × 3 columnas (5 jugadores + 1 celda libre)
   - 6 jugadores: 2 filas × 3 columnas
   2.1. Todos los clientes SHALL ver la misma disposición canónica de asientos y divisiones en todas las pantallas (disposición idéntica para todos, sin rotar ni reordenar según el jugador local).
   2.2. THE contenido de todas las celdas SHALL mostrarse en posición vertical, sin rotar.
3. THE cada celda SHALL tener un **playmat** como fondo a celda completa:
   3.1. Por defecto, el recorte de arte (`art_crop`) del comandante del jugador, obtenido de Scryfall, con una capa oscura degradada en los bordes superior e inferior para mantener la legibilidad.
   3.2. WHERE el jugador lo elija, THE sistema SHALL permitir usar el arte de otra carta de su mazo o un color liso; la elección SHALL ser visible para toda la mesa.
   3.3. THE sistema SHALL mostrar la atribución de Scryfall y el aviso de no afiliación (REQ-18) en el pie de la pantalla.
   3.4. WHEN una imagen de playmat o de carta falla al cargar (error 404, indisponibilidad de red o bloqueo de CSP), THE sistema SHALL capturar el evento `onError` y renderizar un fondo degradado atmosférico oscuro o marco de texto legible sin mostrar nunca un icono de imagen rota en la pantalla (Punto 11).
   3.5. **Diagnóstico y origen de imágenes de cartas (Punto 1):** THE sistema SHALL obtener las imágenes de cartas exclusivamente de las URLs directas del CDN de `cards.scryfall.io` almacenadas en la base de datos desde el bulk data; THE sistema SHALL NOT realizar peticiones al endpoint de la API (`api.scryfall.com/cards/named`) durante el renderizado de cartas en la mesa o en la biblioteca, tras medirse empíricamente que dichas ráfagas concurrentes reciben HTTP 429 (Too Many Requests) o HTTP 302 saturando el límite de peticiones por segundo.
   3.6. **Cola de descarga, reintentos y virtualización (Punto 4):**
      - **Concurrencia limitada:** La descarga de imágenes se gestiona mediante una cola centralizada (`imageLoaderQueue`) con concurrencia máxima de 6 peticiones simultáneas.
      - **Reintentos con backoff y timeout:** Cada descarga cuenta con un timeout de 8000 ms y hasta 3 reintentos con retroceso exponencial (300 ms, 600 ms, 1200 ms) sin bloquear slots de concurrencia activos.
      - **Esqueletos animados:** Durante el estado de carga (`pending` o `loading`), las cartas muestran un marcador de posición esqueleto animado (`data-testid="card-image-skeleton"`).
      - **Lista virtualizada e indicadores:** El modal de biblioteca renderiza las cartas mediante una cuadrícula virtualizada (`VirtualizedCardGrid`) que gestiona ventanas de desplazamiento y buffers. La cabecera del modal muestra el progreso reactivo `"Cargando N de M"` (`data-testid="image-queue-progress"`) y un botón para `"Reintentar N fallidas"` (`data-testid="image-queue-retry-btn"`).
      - **Cero bloqueos indefinidos:** Ninguna carta permanece en carga indefinida; al agotar reintentos se presenta el marco de texto estructurado de respaldo junto con un botón para reintentar la descarga individual (`data-testid="card-retry-image-btn"`).
   3.7. **Precarga con prioridad y caché persistente del navegador (Punto 5):**
      - **Precarga por fases y prioridad:** THE sistema SHALL aprovechar las fases previas para anticipar la descarga de imágenes en la cola con prioridades escalonadas:
        - *Prioridad 1 (máxima, prioridad 10):* Las 7 cartas de la mano inicial y el comandante en versión `normal` (resolución estándar de Scryfall 488×680 para mano, mesa y apertura).
        - *Prioridad 2 (segundo plano, prioridad 1):* El resto de la biblioteca en versión `small` (146×204) precargada durante sala de espera, iniciativa y mulligan para que al inspeccionar la biblioteca abra casi al instante.
        - *Prioridad 3:* La versión `normal` del resto de la biblioteca solo se solicita cuando una carta concreta es movida a la mano, al campo o a la vista previa.
      - **Caché persistente local en el navegador (Cache API):** THE cliente SHALL almacenar las imágenes en la Cache API local del navegador (`caches.open('mtgc-card-images-v1')`), asegurando que sucesivas partidas con el mismo mazo carguen casi al instante desde el almacenamiento en disco local sin tráfico de red a Scryfall.
      - **Aislamiento del servidor:** THE sistema SHALL NOT almacenar, espejar ni actuar como proxy de imágenes en el servidor backend (decisión estricta del cliente y cumplimiento de las directrices de Scryfall).
   3.8. **Verificación de carga de bibliotecas con 100 cartas (Punto 6 y Corrección Punto 5):**
      - **Diagnóstico y explicación de métricas previas (287 ms vs 491 ms):**
        - *Primera apertura previa (287 ms):* Se ejecutó contra un servidor simulado loopback local (`http://localhost:3892`) que devolvía PNGs mínimos de 1×1 píxel en < 1 ms. Además, durante las fases previas de sala de espera, iniciativa y mulligan, el servicio `imagePreloadService` ya había precargado casi la totalidad de las cartas en segundo plano; por tanto, al abrir la biblioteca por primera vez sólo se esperó el remanente de la cola simulada en 287 ms.
        - *Segunda apertura previa (491 ms):* No midió el tiempo de descarga de imágenes (que ya estaban en memoria), sino el ciclo completo de desmontaje y re-montaje de componentes React más la aserción de visibilidad de Playwright (`expect(p1.locator('h3:has-text("Biblioteca")')).toBeVisible()`), incurriendo en 491 ms de interacción DOM y serialización IPC de pruebas. No constituía una comparación fría vs caliente bajo red real.
      - **Ejecución E2E contra Scryfall real (`@network`) con caché limpio:**
        - *Apertura en frío con `caches.delete` y reinicio de cola:* Los 4 clientes abren simultáneamente su biblioteca de 100 cartas (372 cartas en biblioteca tras descartar mano y comandante) con la cuadrícula completa montada (`loading="eager"`).
        - *Tiempo hasta que TODAS las imágenes tienen `naturalWidth > 0`:* **845 ms** (límite establecido: 35,000 ms, PASS).
        - *Peticiones totales a Scryfall CDN (`cards.scryfall.io`):* 37 peticiones directas.
        - *Códigos de respuesta HTTP:* 100% exitosos (`{"200": 37}`). Cero errores 429, 403 o 5xx.
        - *Número de reintentos ejecutados:* 5 reintentos automáticos en cola con retroceso exponencial.
        - *Lista de URLs fallidas con código:* Cero códigos de error HTTP de servidor. Las interrupciones iniciales (`code: 0` por ráfaga simultánea de prefetch) se recuperaron de inmediato en el primer reintento.
        - *Verificación de renderizado completo:* Jugador 1: 93/93; Jugador 2: 93/93; Jugador 3: 93/93; Jugador 4: 93/93 con `naturalWidth > 0` (372/372 cartas cargadas con éxito, 0 fallidas).
        - *Segunda apertura con Cache API persistente:* **185 ms** (notablemente más rápida que la apertura en frío de 845 ms, PASS).
        - *Verificación de cartas DFC y marco de respaldo:* Comprobados al 100% en vivo.
   3.9. **Atribución de artista y copyright en el selector de playmat (Punto 7):**
       - WHILE se use una ilustración `art_crop` de Scryfall como fondo de playmat (sea por defecto el comandante del mazo o una URL directa), THE modal de personalización de playmat SHALL mostrar de forma destacada el nombre del artista («Ilustrado por [artista]») y el copyright oficial de Wizards («™ & © Wizards of the Coast»).
       - THE modal SHALL incluir un botón interactivo «Ver carta» (`data-testid="playmat-view-card-btn"`) que abre el panel de inspección detallada de la carta con sus dictámenes oficiales, además de permitir restablecer en un clic al arte del comandante asignado.
   3.10. **Adaptación fluida y visibilidad en pantalla completa y modo expandido (Punto 6 de Correcciones del Cliente - C.6):**
       - **Caso 1 (Botón de expandir de cada jugador):** Cada celda de jugador cuenta con un botón de expandir (`data-expand-cell-btn={player.id}`). Al activarlo, la celda se expande al 100% de la ventana sin pantallas azules, renderizando el playmat a sangre, el dock inferior flotante, la mano y las cartas de la mesa con cálculo dinámico de dimensiones y encuadre coordinado (`viewFraming`). El cierre se realiza de manera accesible mediante el botón interactivo «Cerrar (Esc)» (`data-testid="close-expanded-view"`) o pulsando la tecla `Escape`.
       - **Caso 2 (Botón de pantalla completa del navegador):** La esquina superior derecha de la pantalla (`fixed top-2 right-4 z-40`) incorpora un botón de pantalla completa del navegador (`data-testid="fullscreen-btn"`) que alterna interactivamente entre modo ventana y pantalla completa mediante la Fullscreen API (`document.documentElement.requestFullscreen()` / `document.exitFullscreen()`), escuchando reactivamente los eventos `fullscreenchange` del navegador para sincronizar su icono (`Maximize2` / `Minimize2`) y estado accesible.
       - **Resets y contención CSS:** Resets explícitos para `:fullscreen`, `:-webkit-full-screen`, `::backdrop`, `html`, `body`, `#root` y `#mesa-total` con fondo `#000000`, dimensiones del 100% y `overflow: hidden`, previniendo fondos planos de color azul pizarra (`bg-slate-950`), desfases con `100dvh` o márgenes desalineados.
       - **Certificación visual automatizada:** Suite de pruebas Playwright en [`apps/web/e2e/fullscreen-visual.spec.ts`](apps/web/e2e/fullscreen-visual.spec.ts) certificando en pods de 2, 4 y 6 jugadores que el playmat (`naturalWidth > 0`), las cartas, el dock y la mano son 100% visibles, las capturas presentan una alta varianza de píxeles ($> 5000$) descartando pantallas vacías, y no se registra ningún error de consola de React o del navegador.
4. THE contenedor de nombre SHALL ubicarse centrado en el borde superior de cada división conteniendo únicamente el nombre del jugador y el botón de expandir celda (Punto 8):
   4.1. WHILE sea el turno de un jugador, THE sistema SHALL resaltar este contenedor con fondo ámbar y borde iluminado, además de resaltar el contorno de la división.
   4.2. THE orden de iniciativa (1.º, 2.º…), corona de anfitrión 👑, píldora 'Tú' y punto indicador de conexión se trasladan a la barra superior desplegable (FloatingToolbar), con dropdown interactivo de jugadores.
   4.3. WHEN un jugador se desconecta, su nombre en el contenedor superior se atenuará con opacidad reducida y un tooltip explícito `${player.name} (Desconectado)`.
   4.4. THE pastilla de vida se mantiene en el dock inferior sobre el playmat, garantizando aislamiento total sin solapar elementos.
5. THE pastilla de vida SHALL ubicarse en la **esquina interior** de cada celda, es decir, la más cercana al centro de la pantalla:
   5.1. Fila superior → borde inferior de la celda; fila inferior → borde superior de la celda.
   5.2. Columna izquierda → lado derecho; columna derecha o central → lado izquierdo.
   5.3. WHEN el jugador hace clic en la pastilla, THE sistema SHALL abrir el panel de vida interactivo con controles directos de −1 y +1 (eliminando botones de +-5) y dos campos numéricos "Daño recibido" y "Vida ganada" accionados mediante Enter (REQ-3, Punto 7).
   5.4. THE veneno, energía, experiencia y daño de comandante SHALL mostrarse como insignias pequeñas desplegables junto a la pastilla (REQ-4, REQ-5); el impuesto de comandante se gestiona y visualiza exclusivamente en la zona de comando (REQ-9.7.20, Punto 6).
6. THE campo de batalla SHALL ocupar el resto de la celda, con cartas colocadas libremente y que pueden solaparse parcialmente:
   6.1. THE posición de cada carta en el campo de batalla SHALL guardarse normalizada en coordenadas globales de la mesa ($x, y \in [0, 1]$ sobre toda la pantalla / MesaTotal), para que la disposición y colocación coincida de forma idéntica en pantallas de distinto tamaño y entre todos los participantes (posición global, eliminando coordenadas relativas a la celda).
   6.2. WHEN el jugador arrastra una carta, THE sistema SHALL traerla al frente (orden `z`) y sincronizar su nueva posición a la mesa en menos de 300 ms (REQ-9.2).
   6.3. THE tamaño de carta SHALL calcularse como el menor valor entre el límite por alto (cerca del 20% del alto de la celda) y el límite por ancho de la división (`(cellWidth - 130) / 5.5 / 0.714`), garantizando que vida, comandante, mano comprimida, biblioteca y pilas quepan en la celda sin solapamientos a 1366x768 y resoluciones estrechas (Punto 9).
   6.3.1. WHEN la mano acumula cartas, THE abanico SHALL incrementar progresivamente su solape (hasta 0.85) comprimiéndose dinámicamente antes de invadir las ranuras de comandante o biblioteca, y ningún elemento de un jugador SHALL invadir la división de otro (Punto 9).
   6.3.2. THE dimensiones de las cartas en la mano (propia y rival), en el campo de batalla, en la zona de comando y en el overlay visual de arrastre SHALL ser estrictamente idénticas en cualquier resolución y disposición de jugadores, vinculadas a las variables globales `--card-w` y `--card-h` sin discrepancias de zoom o escala (Punto 10).
   6.4. WHEN el cursor se detiene sobre una carta (o con pulsación larga en táctil), THE sistema SHALL mostrar su versión grande flotante centrada en la mitad opuesta de la pantalla sin contenedor ni fondo adicional, con sombra suave (`drop-shadow`), y cierre inmediato por `Escape` o retiro del cursor (REQ-9.6, Punto 9).
   6.5. **Animación de girar y enderezar sobre el centro invariante (Punto 7):**
      - **Centro geométrico fijo:** THE centro de la carta SHALL permanecer estrictamente fijo ($\le 1.0\text{ px}$ de variación, medido empíricamente en $0.00\text{ px}$) durante todo el giro y después de él, sin saltos ni desplazamientos visuales.
      - **Estructura de slot y contenedor apaisado:** THE carta SHALL estructurarse con un contenedor exterior (*slot*, `.card-slot-container`) y un cuerpo de carta interior rotatorio (`.card-rotator`). Al girar, la carta rota $90^\circ$ en sentido horario alrededor del centro y el contenedor exterior pasa de vertical a apaisado intercambiando ancho y alto con transición de 180 ms `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`), manteniendo el centro fijo mediante anclaje `translate(-50%, -50%)`. Así la caja de colisión, la selección y el soltado coinciden con lo que se ve.
      - **Transición restringida y accesibilidad:** THE transición de giro y apaisado SHALL actuar únicamente sobre `transform` y las dimensiones del slot (`width`, `height`), NUNCA sobre `left` o `top`. WHEN el usuario tenga habilitado `prefers-reduced-motion`, THE sistema SHALL realizar el cambio de forma instantánea sin animación (`transition: none !important`).
      - **Camino más corto en enderezado (untap):** WHEN la carta se endereza, THE rotación retornará de vuelta $-90^\circ$ por el camino más corto ($90^\circ \to 0^\circ$ monótonamente decreciente), nunca mediante una rotación de $270^\circ$.
      - **Contadores, insignias y resalte de selección solidarios:** THE contadores (+1/+1, contadores de lealtad, etc.), insignias y el resalte de selección SHALL ubicarse dentro del rotador de la carta para acompañarla suavemente durante el giro sin saltos ni desfases.
      - **Sincronía idéntica en clientes remotos:** Los clientes receptores SHALL reproducir idéntico comportamiento animado e interpolación sin saltos ni duplicados.
      - **Desacoplamiento de titularidad y movimiento:** Girar o enderezar una carta SHALL enviar únicamente `TAP_CARD` y SHALL NOT recalcular `holderId` ni enviar `MOVE_CARD`.
      - **Análisis de posición por centro en el modelo de datos:** Guardar o anclar la posición de la carta por su centro matemático desvincula la orientación de las coordenadas de colocación en el campo de batalla, garantizando invarianza matemática total y eliminando desalineaciones entre clientes locales y remotos.
      - **Preservación de nitidez y eliminación de desenfoque al girar (Corrección Punto 1):**
        - *Dimensiones enteras y pares:* THE dimensiones de la carta (`--card-w`, `--card-h`) y del slot contenedor SHALL ser estrictamente números enteros y pares (e.g. 96×134 en 2p, 78×108 en 4p y 6p a 1080p), garantizando que las mitades W/2 y H/2 resulten en enteros exactos sin décimas ni medio píxel (.5px).
        - *Posición entera aplicada:* THE posición del centro de la carta en el campo de batalla SHALL redondearse a píxeles enteros exactos del viewport (`Math.round`), eliminando cualquier desplazamiento subpixel en `left` y `top`.
        - *Gestión temporal de will-change:* `will-change: transform` (en el rotador) y `will-change: width, height` (en el slot) SHALL activarse únicamente durante la transición (`.is-animating-tap`, ~180 ms) y SHALL removerse al completarse la animación para permitir a Chromium re-rasterizar la carta con nitidez nativa en reposo.
        - *Transform 2D libre de 3D:* THE transformación final de la carta girada SHALL ser puramente 2D (`rotate(90deg)` y `rotate(0deg)`), libre de `translateZ`, `rotate3d`, escalas o filtros que alteren la rasterización de la capa.
        - *Criterio de nitidez objetiva:* La región de la carta girada SHALL conservar al menos el 90% de la nitidez de la carta enderezada medida mediante varianza del Laplaciano en `devicePixelRatio` 1 y 2 (verificado empíricamente con ratios de 103.07% en DPR 1 y 105.05% en DPR 2 en `sharpness-tap.spec.ts`).
       - **Fuente de verdad única para el arrastre y overlay idéntico (Corrección Punto 2):**
         - *Medición con `getBoundingClientRect()`:* Al comenzar el arrastre (`handleDragStart`), THE sistema SHALL medir la caja visual real de la carta con `getBoundingClientRect()` (ya rotada si está girada) y calcular el desplazamiento exacto entre el puntero del cursor y el centro de dicha caja (`grabOffsetFromCenter`), así como respecto a su esquina superior izquierda (`grabOffsetFromTopLeft`).
         - *Overlay con estructura idéntica de slot y rotador:* THE `DragOverlay` SHALL renderizarse con la misma arquitectura que la carta en el campo (`.card-slot-container` centrando un `.card-rotator`), conservando dimensiones exactas (`cardPixelWidth`, `cardPixelHeight`) y ángulo de giro (`rotate(90deg)` si está girada).
         - *Modificador `snapToVisualBoxModifier` sin saltos:* THE overlay visual SHALL desplazarse solidariamente con el cursor manteniendo el desplazamiento inicial medido (`initialBox.left + transform.x`), eliminando saltos o desalineaciones visuales al superar el umbral de activación de 8 px (`activationConstraint`).
         - *Estabilidad de la mano durante el arrastre:* THE carta en la mano (`HandCardItem`) SHALL mantener su anchura fija (`var(--card-w)`) con `opacity: 0` mientras se arrastra, impidiendo el colapso a 0 px de anchura y evitando cualquier desajuste o alteración del rectángulo capturado.
         - *Cálculo de posición final desde el overlay:* THE posición final en el campo de batalla SHALL calcularse directamente desde el centro de la caja visual delimitada del overlay (`centerScreenX = clampedX + overlayWidth / 2`, `centerScreenY = clampedY + overlayHeight / 2`), asegurando correspondencia matemática 1:1 entre lo visible bajo el puntero y las coordenadas normalizadas asignadas.
       - **Seguimiento estricto del puntero durante el arrastre (Corrección Punto 3):**
         - *Invarianza del punto agarrado:* En cada movimiento del ratón a lo largo de toda la trayectoria de arrastre, THE punto agarrado del overlay visual (`puntero - overlayCorner`) SHALL ser idéntico al desplazamiento inicial con una diferencia de 1.0 px o menos.
         - *Cero saltos al superar el umbral de 8 px:* En el fotograma exacto en el que se supera el umbral de activación de 8 px (`activationConstraint`), THE posición del overlay SHALL sincronizarse en tiempo real con las coordenadas actuales del puntero (`latestPointerRef`), eliminando cualquier desfase o salto abrupto.
         - *Verificación empírica completa:* Comprobado con 0.00 px de desviación máxima en todos los fotogramas muestreados en `apps/web/e2e/pointer-tracking.spec.ts` (16 combinaciones certificadas: mano, mesa enderezada, mesa girada y mesa expandida; a 1920x1080 y 1366x768; con 2 y 4 jugadores).
        - **Centrado exacto al enviar al campo con dimensiones reales de carta (Corrección Punto 4):**
          - *Dimensiones reales dinámicas:* THE cálculo de la posición centrada al enviar una carta al campo de batalla (`computePlayerDivisionCenter` en servidor y `getPlayerBattlefieldCascadePosition` en cliente) SHALL basarse en las dimensiones exactas de la carta en el pod y resolución correspondientes (`getCardDimensions(totalPlayers, viewport)`), en lugar de constantes estáticas fijas (43.2 px × 51.3 px).
          - *Convergencia exacta al centro de la sección jugable:* THE centro geométrico resultante de la carta enviada al campo SHALL coincidir con el centro de la sección jugable (descontando el dock inferior) con un error <= 1.0 px en pods de 2, 4 y 6 jugadores, tanto a 1920x1080 como a 1366x768 (verificado empíricamente con <= 0.50 px en Playwright E2E y 0.00 px en tests unitarios del servidor).
        - **Diagnóstico y medición empírica del salto de carta girada (Corrección Posición Punto 1):**
          - *Síntoma reproducido:* Al arrastrar una carta girada (tapped), el overlay se desplaza de la posición del cursor al soltar, cayendo hacia abajo y a la izquierda en el emisor local A; y en el receptor remoto B, el fantasma salta de posición en el primer fotograma tras iniciar el arrastre.
          - *Medición empírica en emisor A:*
            - Overlay durante arrastre: Centro `(540.00, 499.00)`, Top-Left `(473.00, 451.00)`.
            - Carta colocada tras soltar: Centro `(521.00, 518.00)`, Top-Left `(454.00, 470.00)`.
            - Discrepancia medida: $\Delta\text{Centro}: dx = -19.00\text{ px}, dy = +19.00\text{ px}$; $\Delta\text{TopLeft}: dLeft = -19.00\text{ px}, dTop = +19.00\text{ px}$.
            - Correspondencia con la hipótesis: La diferencia es matemáticamente idéntica a $(h - w) / 2 = (134 - 96) / 2 = 19.00\text{ px}$, confirmando la mezcla de dos convenciones (esquina superior izquierda de la caja vertical sumándole mitades fijas $w/2, h/2$ a una caja apaisada de $h \times w$).
          - *Medición empírica en receptor B (primeros 5 fotogramas del fantasma):*
            - Carta original antes de mover: Centro `(480.00, 459.00)`.
            - Fotogramas 1 a 4 del fantasma: Centro `(473.00, 486.00)` ($dx = -7.00\text{ px}, dy = +27.00\text{ px}$).
            - Fotograma 5 del fantasma: Centro `(481.02, 491.34)` ($dx = +1.02\text{ px}, dy = +32.34\text{ px}$).
            - Confirmación del salto: El fantasma remoto nace desplazado debido a que la posición inicial transmitida se interpreta con las dimensiones verticales en vez de las orientadas actuales.
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
19. **Convención única de posición normalizada en el centro (Punto 2 de Corrección de Posición):**
    19.1. THE posición global normalizada $(x, y \in [0, 1])$ de una carta en el campo de batalla SHALL representar estrictamente su **centro geométrico**, sin importar si la carta está enderezada o girada (tapped).
    19.2. Toda operación de coordenadas en cliente y servidor (renderizado en canvas, overlay de arrastre, fantasma remoto, cálculo final al soltar, contención 100% para `holderId`, límites al viewport, centrado al enviar al campo y cascada) SHALL basarse en el centro junto con las dimensiones orientadas actuales ($w \times h$ en vertical, $h \times w$ en horizontal).
    19.3. THE sistema SHALL eliminar cualquier convención que trate $(x, y)$ como la esquina superior izquierda de la caja vertical, eliminando la discrepancia $(h - w) / 2$ (~19 px).
    19.4. THE instantáneas de mesa persistidas en Redis anteriores a esta convención SHALL ser migradas automáticamente sumando el semiancho y semialto orientados, marcándose con `positionConvention: 'center'`.
20. **Fantasma remoto orientado desde el primer fotograma (Punto 3 de Corrección de Posición):**
    20.1. WHEN un jugador inicia el arrastre de una carta (`onDragStart`), THE primer mensaje efímero de arrastre (`CARD_DRAG_MOVE`) emitido al servidor y retransmitido a los rivales SHALL incluir explícitamente el estado de giro (`isTapped`) y el centro exacto normalizado de la carta.
    20.2. THE cliente receptor remoto (B) SHALL renderizar el fantasma (`data-remote-card-ghost="true"`) utilizando la estructura gemela de contenedor slot apaisado (`.card-slot-container`) y rotador interno (`.card-rotator`), naciendo girado 90° desde el primer fotograma, sin mutación dimensional ni salto visual de orientación.
21. **Cero salto al soltar carta en la mesa (Punto 4 de Corrección de Posición):**
    21.1. WHEN un jugador suelta una carta en el campo de batalla (`onDragEnd`), THE centro geométrico de la última posición del overlay de arrastre y el centro de la primera posición de la carta colocada en la mesa SHALL coincidir con una diferencia máxima $\le 1.0\text{ px}$ (0.00 px medido), manteniéndose invariante tras recibir la sincronización autoritativa del servidor.
    21.2. THE cálculo de contención dentro del viewport SHALL utilizar las dimensiones orientadas efectivas de la carta ($w \times h$ o $h \times w$), garantizando que ni el overlay ni la carta soltada desborden los límites de la pantalla ni del dock.
22. **Certificación E2E de invarianza de posición en arrastre y soltado (Punto 5 de Corrección de Posición):**
    22.1. THE suite de pruebas automatizadas en Playwright (`apps/web/e2e/center-convention-drag.spec.ts`) SHALL certificar empíricamente la ausencia total de saltos tanto para cartas enderezadas como giradas (tapped), con 2 y 4 jugadores a 1920x1080 y 1366x768 a través de 5 casos: reposicionamiento en mesa, mesa expandida, ciclo girada/enderezada/re-girada, y cercanía a bordes de pantalla y dock.
    22.2. En el cliente emisor local (A), el muestreo continuo por `requestAnimationFrame` desde el último movimiento hasta 500 ms posteriores al drop SHALL certificar $\Delta\text{Centro} \le 1.0\text{ px}$ (0.00 px medido) respecto al overlay, y saltos entre fotogramas consecutivos $\le 1.0\text{ px}$ (0.00 px medido).
    22.3. En el cliente receptor remoto (B), los primeros fotogramas del fantasma efímero SHALL certificar centro idéntico al de la carta original antes del arrastre ($\le 1.0\text{ px}$, 0.00 px medido) y dimensiones orientadas idénticas (0.00 px medido), sin saltos al sincronizar tras soltar.
23. **Garantía y delimitación de pruebas de puntero y límites de viewport (Punto 6 de Corrección de Posición):**
    23.1. THE pruebas automatizadas de arrastre sobre cartas en abanico (`HandFan`) SHALL direccionar los eventos de puntero hacia áreas descubiertas de la carta visible para evitar colisiones con cartas solapadas contiguas del abanico inferior.
    23.2. THE verificación de seguimiento de puntero puro (`pointer - cardCenter == initialOffset`) SHALL ejecutarse en trayectorias interiores al viewport y sobre la mesa de juego para evaluar la fidelidad cinemática de arrastre sin la intervención restrictiva deliberada del acotamiento (`clamping`) a bordes de pantalla y dock, la cual se certifica de forma aislada y explícita en sus propios casos de prueba de contención perimetral, confirmando que ninguna casuística real ha sido ocultada.
24. **Consolidación de métricas empíricas de posición y dimensiones orientadas (Punto 7 de Corrección de Posición):**
    24.1. THE sistema SHALL certificar y preservar en la documentación técnica las métricas empíricas de invarianza de centro:
         - Discrepancia del defecto original: $\Delta\text{Centro}: dx = -19.00\text{ px}, dy = +19.00\text{ px}$ al soltar carta girada (idéntica a $(h - w) / 2 = 19.00\text{ px}$); salto en frames 1 a 4 del fantasma remoto de $dy = +27.00\text{ px}$.
         - Resultados post-corrección: $\Delta\text{Centro}$ fantasma frame 1 en B = $0.00\text{ px}$ ($\le 1.0\text{ px}$); $\Delta\text{Dimensiones}$ fantasma = $0.00\text{ px}$; $\Delta\text{Centro}$ al soltar overlay vs mesa en A = $0.00\text{ px}$ ($\le 1.0\text{ px}$); máximo salto en frames consecutivos durante 500 ms post-drop = $0.00\text{ px}$ ($\le 1.0\text{ px}$); verificado al 100% en las 20 pruebas de Playwright sobre 2P y 4P a 1080p y 768p.

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
| REQ-23 | COMP-1, COMP-5 |
| REQ-24 | COMP-1, COMP-5 |
| REQ-25 | COMP-1, COMP-5 |

**Dependencias con requisitos previos:** REQ-20 requiere REQ-7.5 (guardar mazos en la cuenta) y REQ-13 (expulsar, transferir anfitrión).
