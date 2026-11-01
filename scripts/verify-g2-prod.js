const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

async function run() {
  console.log('🚀 Starting live production verification for G2 (Vista Ampliada y Cámara)...');
  console.log('Target:', PROD_URL);
  console.log('Artifacts Dir:', ARTIFACT_DIR);

  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const errorsA = [];
  const errorsB = [];
  pageA.on('pageerror', err => errorsA.push(err.message));
  pageB.on('pageerror', err => errorsB.push(err.message));
  pageA.on('console', msg => {
    if (msg.type() === 'error') errorsA.push(msg.text());
  });
  pageB.on('console', msg => {
    if (msg.type() === 'error') errorsB.push(msg.text());
  });

  try {
    // 1. Host (Player A) creates room
    console.log('--- Step 1: Player A creates room ---');
    await pageA.goto(PROD_URL, { waitUntil: 'networkidle' });

    const createBtn = pageA.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    // Fill room name & player name
    const roomNameInput = pageA
      .getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i)
      .or(pageA.locator('input[type="text"]').first());
    await roomNameInput.fill('G2 Camera Test Room');

    const hostNameInput = pageA
      .getByPlaceholder(/Planeswalker 1|Tu nombre/i)
      .or(pageA.locator('input[type="text"]').nth(1));
    await hostNameInput.fill('JugadorA');

    const submitCreateBtn = pageA.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    // Wait for room to be created and read room code
    await pageA.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
      timeout: 20000,
    });

    const roomCodeEl = await pageA
      .locator('[data-testid="room-code-display"]')
      .or(pageA.locator('text=/Código:/i'))
      .first();
    const fullCodeText = await roomCodeEl.innerText();
    const roomCode = fullCodeText.replace(/Código:\s*/i, '').trim();
    console.log(`✅ Room created successfully with code: "${roomCode}"`);

    // Player A selects a deck and marks ready
    console.log('--- Step 2: Player A selects deck and marks ready ---');
    const selectDeckBtnA = pageA.getByRole('button', {
      name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i,
    });
    await selectDeckBtnA.waitFor({ state: 'visible', timeout: 10000 });
    await selectDeckBtnA.click();

    const presetTabA = pageA.getByTestId('tab-preset-decks');
    if (await presetTabA.isVisible()) {
      await presetTabA.click();
    }

    const chooseDeckBtnA = pageA
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnA.waitFor({ state: 'visible', timeout: 10000 });
    await chooseDeckBtnA.click();

    const readyBtnA = pageA.getByRole('button', { name: /Marcarme Listo|Listo/i }).first();
    await readyBtnA.waitFor({ state: 'visible', timeout: 10000 });
    await readyBtnA.click();
    console.log('✅ Player A is Ready');

    // 2. Guest (Player B) joins room
    console.log('--- Step 3: Player B joins room ---');
    await pageB.goto(PROD_URL, { waitUntil: 'networkidle' });

    const openJoinBtn = pageB.getByRole('button', { name: /Unirse con Código/i });
    await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
    await openJoinBtn.click();

    const joinCodeInput = pageB.getByPlaceholder(/ABCDEF/i);
    await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
    await joinCodeInput.fill(roomCode);

    const guestNameInput = pageB.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
    await guestNameInput.fill('JugadorB');

    const joinSubmitBtn = pageB.getByRole('button', { name: /Entrar a la Sala/i });
    await joinSubmitBtn.click();

    // Player B selects deck and marks ready
    console.log('--- Step 4: Player B selects deck and marks ready ---');
    const selectDeckBtnB = pageB.getByRole('button', {
      name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i,
    });
    await selectDeckBtnB.waitFor({ state: 'visible', timeout: 15000 });
    await selectDeckBtnB.click();

    const presetTabB = pageB.getByTestId('tab-preset-decks');
    if (await presetTabB.isVisible()) {
      await presetTabB.click();
    }

    const chooseDeckBtnB = pageB
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnB.waitFor({ state: 'visible', timeout: 10000 });
    await chooseDeckBtnB.click();

    const readyBtnB = pageB.getByRole('button', { name: /Marcarme Listo|Listo/i }).first();
    await readyBtnB.waitFor({ state: 'visible', timeout: 10000 });
    await readyBtnB.click();
    console.log('✅ Player B is Ready');

    // 3. Player A starts the game
    console.log('--- Step 5: Player A starts game ---');
    const startGameBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startGameBtn.click();

    // 4. Pass Mulligan on both clients sequentially
    console.log('--- Step 6: Passing Mulligan ---');
    await pageA
      .locator('[data-testid="opening-hand-modal"]')
      .waitFor({ state: 'visible', timeout: 15000 });

    const startTime = Date.now();
    while (Date.now() - startTime < 20000) {
      const modalCount = await pageA.locator('[data-testid="opening-hand-modal"]').count();
      if (modalCount === 0) break;

      const keepBtnA = pageA.locator('[data-testid="keep-btn"]');
      if (await keepBtnA.isVisible()) {
        await keepBtnA.click();
        console.log('✅ Player A clicked Keep');
      }

      const keepBtnB = pageB.locator('[data-testid="keep-btn"]');
      if (await keepBtnB.isVisible()) {
        await keepBtnB.click();
        console.log('✅ Player B clicked Keep');
      }

      await pageA.waitForTimeout(500);
    }

    await pageA
      .locator('[data-testid="opening-hand-modal"]')
      .waitFor({ state: 'detached', timeout: 10000 });
    await pageB
      .locator('[data-testid="opening-hand-modal"]')
      .waitFor({ state: 'detached', timeout: 10000 });
    console.log('✅ Mulligan modal dismissed on both clients, game status: playing');

    // Wait for both players to enter playing state
    await pageA.waitForSelector('[data-player-cell]', { timeout: 15000 });
    await pageB.waitForSelector('[data-player-cell]', { timeout: 15000 });
    console.log('✅ Both players on the tabletop grid (Playing)');

    // (a) Jugador A pone una carta cerca de la línea divisoria de su mesa (x ≈ 630px de 1280px)
    console.log('--- (a) Jugador A pone una carta cerca de la línea divisoria de su mesa ---');
    const handCardA = pageA.locator('[data-hand-card="true"]').last();
    await handCardA.waitFor({ state: 'visible', timeout: 15000 });
    const handBoxA = await handCardA.boundingBox();
    if (!handBoxA) throw new Error('Could not get hand card bounding box');

    // Drag from hand to near the dividing line (center line is at 640px in 1280 width)
    await pageA.mouse.move(handBoxA.x + handBoxA.width / 2, handBoxA.y + handBoxA.height / 2);
    await pageA.mouse.down();
    await pageA.mouse.move(630, 350, { steps: 20 });
    await pageA.mouse.up();
    await pageA.waitForTimeout(1000);

    // Verify card is now on battlefield in both clients
    await pageA.waitForSelector('[data-battlefield-card="true"]', { timeout: 10000 });
    await pageB.waitForSelector('[data-battlefield-card="true"]', { timeout: 10000 });
    console.log('✅ Carta de Jugador A posicionada cerca de la línea divisoria (x ≈ 630px)');

    // (b) Jugador B abre la vista ampliada de su mesa (su propia celda, el segundo asiento)
    console.log('--- (b) Jugador B abre la vista ampliada de su propia mesa ---');
    const expandBtnB = pageB.locator('button[data-expand-cell-btn]').last();
    await expandBtnB.waitFor({ state: 'visible', timeout: 10000 });
    await expandBtnB.click();

    // Verify expanded view banner is displayed
    const closeBtnB = pageB.locator('[data-testid="close-expanded-view"]');
    await closeBtnB.waitFor({ state: 'visible', timeout: 5000 });
    await pageB.waitForTimeout(500);
    console.log('✅ Jugador B abrió la vista ampliada correctamente');

    // (c) Comprueba que la carta de A sigue viéndose en la pantalla de B (en la zona que abarca el zoom)
    console.log('--- (c) Comprueba que la carta de A sigue viéndose en la pantalla de B ---');
    const cardsOnBInZoom = await pageB.locator('[data-battlefield-card="true"]').count();
    console.log(`Cartas en el battlefield de Jugador B (vista ampliada): ${cardsOnBInZoom}`);
    if (cardsOnBInZoom < 1) {
      throw new Error(
        '❌ Fallo: La carta del Jugador A desapareció de la pantalla de Jugador B al ampliar la vista!',
      );
    }
    const cardElOnB = pageB.locator('[data-battlefield-card="true"]').first();
    const isCardVisibleOnB = await cardElOnB.isVisible();
    console.log('Visibilidad de la carta de A en B:', isCardVisibleOnB);
    if (!isCardVisibleOnB) {
      throw new Error('❌ Fallo: La carta de Jugador A no es visible en la pantalla de Jugador B!');
    }

    // Save screenshots for (c)
    const shotCPlayerB = path.join(ARTIFACT_DIR, 'prod-g2-rival-card-visible-playerB.png');
    await pageB.screenshot({ path: shotCPlayerB, fullPage: true });
    console.log(`📸 Captura guardada: ${shotCPlayerB}`);

    const shotCPlayerA = path.join(ARTIFACT_DIR, 'prod-g2-rival-card-visible-playerA.png');
    await pageA.screenshot({ path: shotCPlayerA, fullPage: true });
    console.log(`📸 Captura guardada: ${shotCPlayerA}`);

    // (d) Comprueba que si B arrastra su propia carta hacia el borde de la mesa, la carta de A no desaparece ni parpadea
    console.log(
      '--- (d) Comprueba que si B arrastra su propia carta hacia el borde, la carta de A no desaparece ni parpadea ---',
    );
    const handCardB = pageB.locator('[data-hand-card="true"]').last();
    await handCardB.waitFor({ state: 'visible', timeout: 15000 });
    const handBoxB = await handCardB.boundingBox();
    if (!handBoxB) throw new Error('Could not get Player B hand card bounding box');

    // Start dragging Player B's card towards the left border of their expanded view
    await pageB.mouse.move(handBoxB.x + handBoxB.width / 2, handBoxB.y + handBoxB.height / 2);
    await pageB.mouse.down();

    // Drag towards the border (x = 100px)
    await pageB.mouse.move(100, 350, { steps: 15 });
    await pageB.waitForTimeout(300);

    // Verify Player A's card is STILL visible and rendered while dragging
    const cardsDuringDrag = await pageB.locator('[data-battlefield-card="true"]').count();
    console.log(`Cartas en el battlefield mientras Jugador B arrastra: ${cardsDuringDrag}`);
    if (cardsDuringDrag < 1) {
      throw new Error(
        '❌ Fallo: La carta de Jugador A desapareció durante el arrastre de Jugador B!',
      );
    }

    // Release card onto the table near the border
    await pageB.mouse.up();
    await pageB.waitForTimeout(1000);

    // Verify both cards are now on the battlefield
    const finalCardsOnB = await pageB.locator('[data-battlefield-card="true"]').count();
    console.log(`Cartas finales en el battlefield de B (vista ampliada): ${finalCardsOnB}`);
    if (finalCardsOnB < 2) {
      throw new Error(
        `❌ Se esperaban 2 cartas en la mesa ampliada de B, pero hay: ${finalCardsOnB}`,
      );
    }

    // Save screenshots for (d)
    const shotDBorderB = path.join(ARTIFACT_DIR, 'prod-g2-card-dragged-border-playerB.png');
    await pageB.screenshot({ path: shotDBorderB, fullPage: true });
    console.log(`📸 Captura guardada: ${shotDBorderB}`);

    const shotDBorderA = path.join(ARTIFACT_DIR, 'prod-g2-card-dragged-border-playerA.png');
    await pageA.screenshot({ path: shotDBorderA, fullPage: true });
    console.log(`📸 Captura guardada: ${shotDBorderA}`);

    // Check console errors (ignoring benign font CSP/favicon/ResizeObserver warnings)
    const fatalErrorsB = errorsB.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('favicon') &&
        !e.includes('Third-party cookie') &&
        !e.includes('fonts.googleapis.com'),
    );
    const fatalErrorsA = errorsA.filter(
      e =>
        !e.includes('ResizeObserver') &&
        !e.includes('favicon') &&
        !e.includes('Third-party cookie') &&
        !e.includes('fonts.googleapis.com'),
    );

    console.log('Console errors Jugador A:', fatalErrorsA);
    console.log('Console errors Jugador B:', fatalErrorsB);

    if (fatalErrorsA.length > 0 || fatalErrorsB.length > 0) {
      throw new Error(
        `Errores de consola encontrados:\nJugador A: ${fatalErrorsA.join(', ')}\nJugador B: ${fatalErrorsB.join(', ')}`,
      );
    }

    console.log(
      '\n🎉 ¡TODAS LAS COMPROBACIONES DE PRODUCCIÓN EN G2 PASARON EXITOSAMENTE CON 0 ERRORES DE CONSOLA!',
    );
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
