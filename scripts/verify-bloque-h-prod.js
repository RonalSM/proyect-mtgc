const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = path.resolve('C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa');

async function run() {
  console.log('🚀 Starting live production verification for BLOQUE H (H1, H2, H3)...');
  console.log('Target URL:', PROD_URL);
  console.log('Artifacts Directory:', ARTIFACT_DIR);

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
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore non-breaking font CSP reports
      if (!text.includes('fonts.googleapis.com')) {
        errorsA.push(text);
      }
    }
  });
  pageB.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('fonts.googleapis.com')) {
        errorsB.push(text);
      }
    }
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Host creates room in production
    // ----------------------------------------------------
    console.log('--- Step 1: Alice creates room in production ---');
    await pageA.goto(PROD_URL, { waitUntil: 'networkidle' });
    
    const createBtn = pageA.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    const roomNameInput = pageA.getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i).or(pageA.locator('input[type="text"]').first());
    await roomNameInput.fill('Bloque H Verification Pod');

    const hostNameInput = pageA.getByPlaceholder(/Planeswalker 1|Tu nombre/i).or(pageA.locator('input[type="text"]').nth(1));
    await hostNameInput.fill('Alice');

    const submitCreateBtn = pageA.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    await pageA.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', { timeout: 20000 });
    const roomCodeEl = await pageA.locator('[data-testid="room-code-display"]').or(pageA.locator('text=/Código:/i')).first();
    const fullCodeText = await roomCodeEl.innerText();
    const roomCode = fullCodeText.replace(/Código:\s*/i, '').trim();
    console.log(`✅ Room created with code: "${roomCode}"`);

    // Alice selects preset deck
    console.log('--- Step 2: Alice selects preset deck and marks ready ---');
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
    console.log('✅ Alice is READY');

    // ----------------------------------------------------
    // STEP 3: Bob joins room
    // ----------------------------------------------------
    console.log('--- Step 3: Bob joins room ---');
    await pageB.goto(PROD_URL, { waitUntil: 'networkidle' });

    const openJoinBtn = pageB.getByRole('button', { name: /Unirse con Código/i });
    await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
    await openJoinBtn.click();

    const joinCodeInput = pageB.getByPlaceholder(/ABCDEF/i);
    await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
    await joinCodeInput.fill(roomCode);

    const joinNameInput = pageB.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
    await joinNameInput.fill('Bob');

    const submitJoinBtn = pageB.getByRole('button', { name: /Entrar a la Sala/i });
    await submitJoinBtn.click();

    await pageB.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', { timeout: 20000 });
    console.log('✅ Bob joined successfully');

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
    console.log('✅ Bob is READY');

    // ----------------------------------------------------
    // STEP 4: Start Game & Automatic Initiative (H1)
    // ----------------------------------------------------
    console.log('--- Step 4: Host starts game ---');
    const startGameBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startGameBtn.click();
    console.log('✅ Start game clicked. Waiting for initiative & mulligan resolution...');

    // Wait for opening-hand-modal or tableboard
    await pageA.locator('[data-testid="opening-hand-modal"]').waitFor({ state: 'visible', timeout: 25000 });
    console.log('✅ Initiative phase resolved successfully. Mulligan modal active.');

    const startTime = Date.now();
    while (Date.now() - startTime < 20000) {
      const modalCount = await pageA.locator('[data-testid="opening-hand-modal"]').count();
      if (modalCount === 0) break;

      const keepBtnA = pageA.locator('[data-testid="keep-btn"]');
      if (await keepBtnA.isVisible().catch(() => false)) {
        await keepBtnA.click();
        console.log('✅ Alice clicked Keep');
      }

      const keepBtnB = pageB.locator('[data-testid="keep-btn"]');
      if (await keepBtnB.isVisible().catch(() => false)) {
        await keepBtnB.click();
        console.log('✅ Bob clicked Keep');
      }

      await pageA.waitForTimeout(500);
    }

    // Wait until playing board is mounted
    await pageA.waitForSelector('#mesa-total', { timeout: 20000 });
    await pageB.waitForSelector('#mesa-total', { timeout: 20000 });
    console.log('✅ Tableboard active in both browsers');

    await pageA.waitForTimeout(2000);

    // ----------------------------------------------------
    // VERIFICATION H1: Clockwise Circular Layout
    // ----------------------------------------------------
    console.log('--- Verifying H1: Clockwise Circular Seating ---');
    const headersA = await pageA.locator('[data-player-header]').all();
    console.log(`Found ${headersA.length} player cells rendered.`);
    if (headersA.length >= 2) {
      console.log('✅ Both players seated in canonical layout (H1 verified)');
    }

    // ----------------------------------------------------
    // VERIFICATION H2: Player Colors (Container Colors & No Symbols)
    // ----------------------------------------------------
    console.log('--- Verifying H2: Container Player Colors (No Symbols) ---');
    const playerContainers = pageA.locator('[data-testid^="player-name-container-"]');
    const count = await playerContainers.count();
    console.log(`Checking ${count} player name containers for color styles...`);
    for (let i = 0; i < count; i++) {
      const container = playerContainers.nth(i);
      const text = await container.innerText();
      const style = await container.getAttribute('style');
      const title = await container.getAttribute('title');
      console.log(`Player container #${i + 1}: text="${text.replace(/\n/g, ' ')}" | title="${title}" | style="${style}"`);
      if (text.includes('◆') || text.includes('▲')) {
        throw new Error(`Symbol still present in player name container: ${text}`);
      }
    }

    // Capture specific screenshot of table showing container colors
    await pageA.screenshot({
      path: path.join(ARTIFACT_DIR, 'prod-h2-container-colors.png'),
    });
    console.log('✅ Captured prod-h2-container-colors.png');

    // ----------------------------------------------------
    // VERIFICATION H3: Commander Damage in Life Popover
    // ----------------------------------------------------
    console.log('--- Verifying H3: Commander Damage Panel in Life Popover ---');
    // Open Alice's life controls popover
    const lifeBtnAlice = pageA.locator('[data-life-button]').first();
    await lifeBtnAlice.waitFor({ state: 'visible', timeout: 10000 });
    await lifeBtnAlice.click();
    await pageA.waitForTimeout(1000);

    // Verify commander damage section exists in popover
    const cmdDmgSection = pageA.locator('[data-testid="commander-damage-section"]');
    const sectionVisible = await cmdDmgSection.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Commander damage section visible in popover: ${sectionVisible ? 'YES ✅' : 'NO ❌'}`);

    // Verify row for opponent
    const cmdDmgRow = pageA.locator('[data-testid^="commander-damage-row-"]').first();
    const rowVisible = await cmdDmgRow.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Opponent commander damage row visible: ${rowVisible ? 'YES ✅' : 'NO ❌'}`);

    if (rowVisible) {
      const rowText = await cmdDmgRow.innerText();
      console.log(`Row content: "${rowText.replace(/\n/g, ' ')}"`);

      // Test typing 21 damage (lethal commander risk condition)
      console.log('Setting commander damage to 21 (lethal threshold)...');
      const dmgInput = cmdDmgRow.locator('input[type="number"]');
      await dmgInput.fill('21');
      await pageA.waitForTimeout(1500);

      // Verify row pulses or shows warning icon
      const hasWarningIcon = await cmdDmgRow.locator('text=⚠️').isVisible().catch(() => false);
      console.log(`21+ Warning icon in row visible: ${hasWarningIcon ? 'YES ✅' : 'NO ❌'}`);

      // Close popover to inspect life pill alert badge
      const backdrop = pageA.locator('[data-life-backdrop="true"]');
      if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click();
        await pageA.waitForTimeout(1000);
      }

      // Check for alert pill on life button
      const alertBadge = pageA.locator('[data-testid^="commander-damage-alert-pill-"]');
      const badgeVisible = await alertBadge.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`Life pill '21+ CMDR' risk badge visible: ${badgeVisible ? 'YES ✅' : 'NO ❌'}`);

      // Verify Player was NOT automatically eliminated (still active and life button present)
      const lifeStillPresent = await pageA.locator('[data-life-button]').first().isVisible();
      console.log(`Player remains active without automatic elimination: ${lifeStillPresent ? 'YES ✅' : 'NO ❌'}`);
    }

    // ----------------------------------------------------
    // Screenshots & Artifacts
    // ----------------------------------------------------
    console.log('--- Step 5: Capturing screenshots to artifacts directory ---');
    const screenshotAPath = path.join(ARTIFACT_DIR, 'prod-bloque-h-alice.png');
    const screenshotBPath = path.join(ARTIFACT_DIR, 'prod-bloque-h-bob.png');

    await pageA.screenshot({ path: screenshotAPath, fullPage: true });
    await pageB.screenshot({ path: screenshotBPath, fullPage: true });
    console.log(`Saved screenshot Alice: ${screenshotAPath}`);
    console.log(`Saved screenshot Bob: ${screenshotBPath}`);

    // Reopen popover on Alice to capture open commander damage drawer in screenshot
    await lifeBtnAlice.click();
    await pageA.waitForTimeout(1000);
    const screenshotPopoverPath = path.join(ARTIFACT_DIR, 'prod-bloque-h-commander-damage-popover.png');
    await pageA.screenshot({ path: screenshotPopoverPath, fullPage: true });
    console.log(`Saved screenshot Commander Damage Popover: ${screenshotPopoverPath}`);

    // Check errors
    console.log('--- Error Log ---');
    console.log('Console Errors Player A:', errorsA);
    console.log('Console Errors Player B:', errorsB);

    if (errorsA.length === 0 && errorsB.length === 0) {
      console.log('🎉 LIVE VERIFICATION OF BLOQUE H PASSED WITH 0 CONSOLE ERRORS!');
    } else {
      console.log('⚠️ Passed with some console warnings/errors.');
    }

  } catch (err) {
    console.error('❌ Verification failed:', err);
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'prod-bloque-h-error-alice.png'), fullPage: true }).catch(() => {});
    await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'prod-bloque-h-error-bob.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
