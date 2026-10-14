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
2. WHEN un jugador pulsa +1/−1 o +5/−5, THE sistema SHALL actualizar su vida y propagarla a todos en menos de 300 ms.
3. WHEN la vida llega a 0 o menos, THE sistema SHALL marcar al jugador como "en riesgo de derrota" (sin eliminarlo automáticamente).
4. THE sistema SHALL permitir ingresar un valor numérico arbitrario.

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
5. WHEN el jugador roba, baraja o hace mulligan, THE sistema SHALL ejecutar la acción con aleatoriedad generada en el servidor.
6. THE sistema SHALL permitir ampliar una carta al pasar el cursor o mantener pulsado (móvil).
7. THE superficie de juego (MesaTotal) SHALL ser UNA sola superficie que ocupa todo el viewport (`fixed inset-0`). Es la única zona de soltado (un solo droppable de mesa). Cualquier punto de la pantalla es mesa:
   7.1. Las divisiones de jugador son exclusivamente visuales (playmat de fondo y línea divisoria), NO son droppables, no recortan las cartas (sin overflow-hidden que las afecte) y el playmat cubre el 100% del área de cada división (incluyendo debajo del dock de controles, eliminando franjas separadas).
   7.2. THE sistema SHALL mantener una capa única de cartas dentro de MesaTotal con posiciones en coordenadas globales normalizadas de la mesa ($x, y \in [0, 1]$ sobre toda la pantalla), limitando únicamente para que la carta quede completamente visible dentro del viewport (sin restricción arbitraria de 0.05 a 0.85).
   7.3. Todos los clientes SHALL ver la misma disposición canónica de asientos y divisiones en todas las pantallas (sin reordenamiento por cliente). La mano privada y el dock de cada jugador flotan en la división asignada a ese jugador.
   7.4. Cualquier carta en la mesa puede arrastrarse a cualquier punto de la pantalla, incluso encima de otras divisiones. Entregar una carta a otro jugador consiste en dejarla cerca de su división o playmat, de forma inmediata, sin aceptación ni confirmación, sin restricciones de dueño o controlador y sin motor de reglas.
   7.5. Cualquier jugador en la mesa puede mover cualquier carta ya presente en el campo de batalla, como en una mesa real física. THE sistema SHALL registrar en la bitácora autoritativa quién movió qué carta ("X movió [Carta]"). Las manos permanecen privadas y desde la mano solo se juega hacia la mesa.
   7.6. Los elementos flotantes (comandante, mano, biblioteca, cementerio, exilio, vida, nombre, barra, chat) flotan por encima de la mesa sobre el playmat; la capa contenedora flotante SHALL tener `pointer-events: none` y únicamente los controles interactivos `pointer-events: auto`, permitiendo que los clics y arrastres sobre espacio vacío lleguen a la mesa.
   7.7. Soltar una carta sobre las ranuras de cementerio, exilio o biblioteca de un jugador la envía a dicha pila (manual), resaltando la pila bajo el puntero mientras se arrastra. Soltarla en cualquier otro punto la deja en el campo en sus coordenadas globales. THE sistema SHALL NOT mostrar rectángulos amarillos ni resaltados de celda en la mesa.
   7.8. THE sistema SHALL renderizar el DragOverlay en un portal a document.body para que ninguna carta se recorte al cruzar la pantalla o las divisiones.
   7.9. **Precisión WYSIWYG del DragOverlay:** Al agarrar una carta, el overlay mantiene el tamaño exacto que tendrá sobre la mesa (en píxeles, sin `scale`, sin rotación y sin hover-scale de mano, únicamente una sombra sutil). La carta sigue al puntero en vivo conservando el punto exacto de agarre sin retardo.
   7.10. **Cálculo de posición final sin colocación automática:** La posición final de la carta en la mesa se calcula a partir del rectángulo real del overlay en el instante de soltar (`active.rect.current.translated`), con error de coincidencia $\le 2$ px verificado por pruebas automatizadas E2E. El único ajuste permitido es restringir la carta dentro del viewport tanto en vivo como al soltar.
   7.11. **Detección estricta de colisión por puntero:** El soltado a pilas (biblioteca, cementerio, exilio) utiliza detección estricta por puntero (`pointerWithin`). La carta entra a una pila únicamente si el puntero se encuentra físicamente dentro del rectángulo de dicha pila; en cualquier otro caso queda colocada libremente en la mesa sin imanes ni atracciones magnéticas.
   7.12. **Difusión efímera en vivo para rivales:** Durante el arrastre de una carta, el cliente emite mensajes efímeros throttled a ~30 fps (`CARD_DRAG_MOVE`) con `isDragging: true` y posición normalizada, retransmitidos por el servidor a los demás jugadores de la sala como `REMOTE_CARD_DRAGGING`. Los rivales renderizan un fantasma suavemente interpolado con etiqueta del jugador. El servidor aplica un rate limit separado e independiente (~60 msg/s) que no computa contra el límite de chat. El soltado final es autoritativo y escribe en la bitácora (`MOVE_CARD`).
   7.13. **Cierre fluido del abanico en la mano:** Al iniciar el arrastre desde la mano privada, la ranura de la carta en el abanico reduce su ancho y márgenes a cero con animación suave (`transition: width 250ms, margin-left 250ms`), cerrando el hueco entre cartas sin alterar el resto del dock. Si el arrastre se cancela, la ranura se reabre fluidamente.
   7.14. **Cancelación con tecla Escape:** Presionar `Escape` durante el arrastre cancela inmediatamente la acción en curso, restaura la carta a su zona de origen y notifica a los rivales con `isDragging: false`.

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
4. THE etiqueta de nombre SHALL ubicarse en el borde superior central de cada celda, con el nombre del jugador, un botón de ampliar celda y un punto de estado de conexión:
   4.1. WHILE sea el turno de un jugador, THE sistema SHALL resaltar su etiqueta con un borde de color y un brillo suave en la celda.
   4.2. THE etiqueta SHALL mostrar el orden de iniciativa (1.º, 2.º…) definido en REQ-21.
5. THE pastilla de vida SHALL ubicarse en la **esquina interior** de cada celda, es decir, la más cercana al centro de la pantalla:
   5.1. Fila superior → borde inferior de la celda; fila inferior → borde superior de la celda.
   5.2. Columna izquierda → lado derecho; columna derecha o central → lado izquierdo.
   5.3. WHEN el jugador hace clic en la pastilla, THE sistema SHALL abrir los controles de −1, +1, −5, +5 y valor numérico (REQ-3).
   5.4. THE veneno, energía, experiencia, impuesto de comandante y daño de comandante SHALL mostrarse como insignias pequeñas desplegables junto a la pastilla (REQ-4, REQ-5).
6. THE campo de batalla SHALL ocupar el resto de la celda, con cartas colocadas libremente y que pueden solaparse parcialmente:
   6.1. THE posición de cada carta SHALL guardarse **normalizada** (valores de 0 a 1 respecto al tamaño de la celda), para que coincida en pantallas de distinto tamaño.
   6.2. WHEN el jugador arrastra una carta, THE sistema SHALL traerla al frente (orden `z`) y sincronizar su nueva posición a la mesa en menos de 300 ms (REQ-9.2).
   6.3. THE tamaño de carta SHALL calcularse en proporción al alto de la celda.
   6.4. WHEN el cursor se detiene sobre una carta (o con pulsación larga en táctil), THE sistema SHALL mostrar su vista ampliada (REQ-9.6).
7. THE mano SHALL mostrarse en el borde inferior de cada celda, parcialmente asomada:
   7.1. La mano del jugador local, boca arriba; sube al pasar el cursor y las cartas se arrastran al campo de batalla.
   7.2. La mano de los oponentes, como reversos de cartas junto al texto "N cartas en mano"; THE sistema SHALL NOT enviar su contenido (REQ-16.3).
8. THE pilas y la zona de comando SHALL mostrarse como ranuras pequeñas alineadas en el borde inferior derecho de cada celda: biblioteca (con cantidad de cartas), cementerio, exilio y zona de comando; las ranuras vacías SHALL mostrarse con contorno punteado:
   8.1. WHEN el jugador hace clic en una ranura, THE sistema SHALL abrir su contenido; cementerio, exilio y zona de comando son visibles para todos y la biblioteca solo para su dueño (REQ-9.3).
9. THE barra flotante SHALL ubicarse centrada en la parte superior, superpuesta a las celdas y plegable con un botón de flecha, con:
   9.1. ronda actual y temporizador de turno si está activo (REQ-6.3);
   9.2. historial de la partida (REQ-11) y acceso al chat (REQ-12);
   9.3. cantidad de espectadores (REQ-13) y botón de compartir/invitar (REQ-2);
   9.4. dados (REQ-21.9), ayuda y ajustes (incluye "reducir fondos").
10. WHERE hay una celda libre (3 o 5 jugadores), THE sistema SHALL usarla para mostrar el registro y el chat fijos.
11. WHEN el jugador pulsa el botón de ampliar de una celda o hace doble clic sobre ella, THE sistema SHALL ampliarla a casi toda la pantalla y volver a la cuadrícula con Esc o al cerrar.
12. THE sala de espera (REQ-20) y la fase de iniciativa (REQ-21) SHALL compartir el mismo estilo oscuro; durante la iniciativa, THE sistema SHALL mostrar el resultado del d20 de cada jugador dentro de su celda.
13. WHERE el usuario es espectador, THE sistema SHALL mostrar las celdas con las manos ocultas y una etiqueta "Espectando".
14. THE interfaz SHALL mantener 60 fps con 6 jugadores y 60 cartas en el campo; las imágenes de fondo SHALL cargarse en formato optimizado, con carga diferida y precarga del playmat propio.
15. THE texto sobre los playmats SHALL cumplir contraste mínimo 4.5:1 (WCAG AA); WHERE el usuario active "reducir fondos" o `prefers-reduced-motion`, THE sistema SHALL sustituir los playmats por color liso y desactivar animaciones.
16. WHERE el ancho es menor a 1024 px, THE sistema SHALL ofrecer el modo simplificado (REQ-17); en escritorio y tableta apaisada SHALL mostrar la cuadrícula completa.
17. THE interacciones de cartas SHALL conservar el arrastrar y soltar (REQ-9.2) como método principal.

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
