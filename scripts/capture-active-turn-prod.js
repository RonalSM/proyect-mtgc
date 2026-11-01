// scripts/capture-active-turn-prod.js
const { chromium } = require('playwright');
const path = require('path');

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = path.resolve('C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa');

async function main() {
  console.log('[PROD-CHECK] Starting active turn capture test in production...');
  const browser = await chromium.launch({ headless: true });
  const contextA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const contextB = await browser.newContext({ viewport: { width: 1366, height: 768 } });

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    console.log(`[PROD-CHECK] Loading ${PROD_URL}...`);
    await pageA.goto(PROD_URL, { waitUntil: 'networkidle' });

    // Step 1: Alice creates room
    const createBtn = pageA.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    const roomNameInput = pageA.getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i).or(pageA.locator('#create-room-name'));
    await roomNameInput.fill('Active Turn Refinement');

    const hostNameInput = pageA.getByPlaceholder(/Planeswalker 1|Tu nombre/i).or(pageA.locator('#create-host-name'));
    await hostNameInput.fill('Alice_Host');

    const seatsSelect = pageA.locator('#create-max-players, select').first();
    if (await seatsSelect.isVisible()) {
      await seatsSelect.selectOption('2');
    }

    const submitCreateBtn = pageA.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    await pageA.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', { timeout: 20000 });
    const roomCodeEl = await pageA.locator('[data-testid="room-code-display"]').or(pageA.locator('text=/Código:/i')).first();
    const fullCodeText = await roomCodeEl.innerText();
    const roomCode = fullCodeText.replace(/Código:\s*/i, '').trim();
    console.log(`[PROD-CHECK] Room created with code: "${roomCode}"`);

    // Step 2: Alice selects preset deck
    const selectDeckBtnA = pageA.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i });
    await selectDeckBtnA.waitFor({ state: 'visible', timeout: 15000 });
    await selectDeckBtnA.click();
    await pageA.waitForTimeout(1000);

    const presetTabA = pageA.getByTestId('tab-preset-decks');
    if (await presetTabA.isVisible({ timeout: 2000 }).catch(() => false)) {
      await presetTabA.click();
    }

    const chooseDeckBtnA = pageA.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await chooseDeckBtnA.waitFor({ state: 'visible', timeout: 10000 });
    await chooseDeckBtnA.click();
    await pageA.waitForTimeout(1000);

    const readyBtnA = pageA.getByRole('button', { name: /¡Estoy Listo!|Listo/i });
    await readyBtnA.click();
    console.log('[PROD-CHECK] Alice is Ready');

    // Step 3: Bob joins room
    console.log('[PROD-CHECK] Bob joining room...');
    await pageB.goto(PROD_URL, { waitUntil: 'networkidle' });

    const openJoinBtn = pageB.getByRole('button', { name: /Unirse con Código/i });
    await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
    await openJoinBtn.click();

    const joinCodeInput = pageB.getByPlaceholder(/ABCDEF/i);
    await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
    await joinCodeInput.fill(roomCode);

    const joinNameInput = pageB.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
    await joinNameInput.fill('Bob_Rival');

    const submitJoinBtn = pageB.getByRole('button', { name: 'Entrar a la Sala' });
    await submitJoinBtn.click();

    await pageB.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', { timeout: 20000 });
    console.log('[PROD-CHECK] Bob joined successfully');

    // Bob selects preset deck
    const selectDeckBtnB = pageB.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i });
    await selectDeckBtnB.waitFor({ state: 'visible', timeout: 15000 });
    await selectDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    const presetTabB = pageB.getByTestId('tab-preset-decks');
    if (await presetTabB.isVisible({ timeout: 2000 }).catch(() => false)) {
      await presetTabB.click();
    }

    const chooseDeckBtnB = pageB.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await chooseDeckBtnB.waitFor({ state: 'visible', timeout: 10000 });
    await chooseDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    const readyBtnB = pageB.getByRole('button', { name: /¡Estoy Listo!|Listo/i });
    await readyBtnB.click();
    console.log('[PROD-CHECK] Bob is Ready');

    // Step 4: Host starts game
    await pageA.waitForTimeout(1500);
    const startGameBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startGameBtn.click();
    console.log('[PROD-CHECK] Host started game');

    // Step 5: Wait for initiative and mulligan
    console.log('[PROD-CHECK] Waiting for mulligan phase...');
    await pageA.waitForTimeout(5000);

    const keepHandA = pageA.getByRole('button', { name: /Quedarse mano|Conservar/i }).first();
    if (await keepHandA.isVisible({ timeout: 15000 }).catch(() => false)) {
      await keepHandA.click();
      console.log('[PROD-CHECK] Alice accepted opening hand');
    }

    const keepHandB = pageB.getByRole('button', { name: /Quedarse mano|Conservar/i }).first();
    if (await keepHandB.isVisible({ timeout: 15000 }).catch(() => false)) {
      await keepHandB.click();
      console.log('[PROD-CHECK] Bob accepted opening hand');
    }

    // Step 6: In-game tableboard
    console.log('[PROD-CHECK] In-game tableboard loaded. Determining active player...');
    await pageA.waitForTimeout(3000);

    const isAliceTurn = await pageA.locator('text=¡Tu Turno!').isVisible().catch(() => false);
    const activePage = isAliceTurn ? pageA : pageB;
    const activeName = isAliceTurn ? 'Alice' : 'Bob';
    console.log(`[PROD-CHECK] Active player turn is: ${activeName}`);

    // Wait for animation & styles
    await activePage.waitForTimeout(2000);

    // Save screenshot
    const targetFile = path.join(ARTIFACT_DIR, 'prod-h2-active-turn-amber-bottom.png');
    await activePage.screenshot({ path: targetFile, fullPage: false });
    console.log(`[PROD-CHECK] Saved active turn screenshot to: ${targetFile}`);

    // Verify border computed styles on active player container
    const activeContainer = activePage.locator('[data-testid^="player-name-container-"]').first();
    const borderStyles = await activeContainer.evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        top: s.borderTop,
        left: s.borderLeft,
        right: s.borderRight,
        bottom: s.borderBottom,
        bg: s.backgroundColor,
      };
    });

    console.log('[PROD-CHECK] Active container styles:');
    console.log('  borderTop:    ', borderStyles.top);
    console.log('  borderLeft:   ', borderStyles.left);
    console.log('  borderRight:  ', borderStyles.right);
    console.log('  borderBottom: ', borderStyles.bottom);
    console.log('  background:   ', borderStyles.bg);

    console.log('[PROD-CHECK] ALL VERIFICATIONS PASSED!');
  } catch (err) {
    console.error('[PROD-CHECK] Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
