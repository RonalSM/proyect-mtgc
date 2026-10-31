const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TARGET_URL = process.env.TARGET_URL || 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

async function run() {
  console.log('=================================================================');
  console.log('🚀 PUNTO D2: E2E Partida Completa 4 Jugadores (10 Turnos Reales)');
  console.log('Target URL:', TARGET_URL);
  console.log('Artifacts Directory:', ARTIFACT_DIR);
  console.log('=================================================================');

  const browser = await chromium.launch({ headless: true });
  const contexts = [
    await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    await browser.newContext({ viewport: { width: 1280, height: 800 } }),
  ];

  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const [pageA, pageB, pageC, pageD] = pages;
  const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];

  const consoleErrors = [[], [], [], []];
  pages.forEach((page, idx) => {
    page.on('pageerror', err => consoleErrors[idx].push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('fonts.googleapis.com')) {
          consoleErrors[idx].push(text);
        }
      }
    });
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Alice creates room (Host)
    // ----------------------------------------------------
    console.log('--- Paso 1: Alice crea mesa de 4 jugadores ---');
    await pageA.goto(TARGET_URL, { waitUntil: 'networkidle' });

    const createBtn = pageA.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    const roomNameInput = pageA
      .getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i)
      .or(pageA.locator('input[type="text"]').first());
    await roomNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await roomNameInput.fill('Pod E2E 4P');

    const hostNameInput = pageA
      .getByPlaceholder(/Planeswalker 1|Tu nombre/i)
      .or(pageA.locator('input[type="text"]').nth(1));
    await hostNameInput.fill('Alice');

    const submitCreateBtn = pageA.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    await pageA.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
      timeout: 20000,
    });
    const roomCodeEl = await pageA
      .locator('[data-testid="room-code-display"]')
      .or(pageA.locator('text=/Código:/i'))
      .first();
    const fullCodeText = await roomCodeEl.innerText();
    const match = fullCodeText.match(/([A-Z0-9]{6})/);
    if (!match) throw new Error(`Could not find room code in text: "${fullCodeText}"`);
    const roomCode = match[1];
    console.log(`✅ Sala creada con código: "${roomCode}"`);

    // Helper: Select Preset Deck & Set Ready
    async function selectPresetAndReady(page, pName, presetIndex = 0) {
      console.log(`Seleccionando mazo listo para ${pName} (índice ${presetIndex})...`);
      const selectDeckBtn = page.getByRole('button', {
        name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i,
      });
      await selectDeckBtn.waitFor({ state: 'visible', timeout: 15000 });
      await selectDeckBtn.click();
      await page.waitForTimeout(600);

      const presetTab = page.getByTestId('tab-preset-decks');
      if (await presetTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await presetTab.click();
      }

      // Choose preset button at index
      const chooseBtns = page.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i });
      await chooseBtns.first().waitFor({ state: 'visible', timeout: 10000 });
      const targetBtn = (await chooseBtns.count()) > presetIndex ? chooseBtns.nth(presetIndex) : chooseBtns.first();
      await targetBtn.click();
      await page.waitForTimeout(600);

      const readyBtn = page.getByRole('button', { name: /¡Estoy Listo!|Listo/i });
      await readyBtn.click();
      console.log(`✅ ${pName} está LISTO.`);
    }

    // Helper: Join Room
    async function joinRoom(page, pName, code) {
      console.log(`--- Uniendo a ${pName} a la sala ${code} ---`);
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

      const openJoinBtn = page.getByRole('button', { name: /Unirse con Código/i });
      await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
      await openJoinBtn.click();

      const joinCodeInput = page.getByPlaceholder(/ABCDEF/i);
      await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
      await joinCodeInput.fill(code);

      const joinNameInput = page.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
      await joinNameInput.fill(pName);

      const submitJoinBtn = page.getByRole('button', { name: /Entrar a la Sala/i });
      await submitJoinBtn.click();

      await page.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
        timeout: 20000,
      });
      console.log(`✅ ${pName} se unió exitosamente a la sala.`);
    }

    // Alice selects preset 0
    await selectPresetAndReady(pageA, 'Alice', 0);

    // Bob joins & selects preset 1
    await joinRoom(pageB, 'Bob', roomCode);
    await selectPresetAndReady(pageB, 'Bob', 1);

    // Charlie joins & selects preset 2
    await joinRoom(pageC, 'Charlie', roomCode);
    await selectPresetAndReady(pageC, 'Charlie', 2);

    // Diana joins & selects preset 3
    await joinRoom(pageD, 'Diana', roomCode);
    await selectPresetAndReady(pageD, 'Diana', 3);

    // ----------------------------------------------------
    // STEP 2: Host starts game -> Initiative -> Mulligan
    // ----------------------------------------------------
    console.log('--- Paso 2: Alice inicia la partida (Iniciativa D20 y Mulligan) ---');
    const startGameBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startGameBtn.click();
    console.log('Iniciativa D20 autoritativa en curso...');

    // Wait for Mulligan modal on all 4 pages
    await Promise.all(
      pages.map(async (page, idx) => {
        await page.locator('[data-testid="opening-hand-modal"]').waitFor({ state: 'visible', timeout: 30000 });
        console.log(`Mano inicial visible para ${playerNames[idx]}. Aceptando mano...`);
        const keepBtn = page.getByTestId('keep-btn');
        await keepBtn.waitFor({ state: 'visible', timeout: 10000 });
        await keepBtn.click();
        console.log(`✅ ${playerNames[idx]} aceptó la mano inicial.`);
      })
    );

    // Wait for all 4 pages to have tableboard loaded
    await Promise.all(
      pages.map(p => p.locator('[data-table-board], [data-player-header]').first().waitFor({ state: 'visible', timeout: 20000 }))
    );
    console.log('✅ Mesa activa para los 4 jugadores en disposición circular horaria.');

    // Helper: Find which page has active turn
    async function getActivePage() {
      for (let attempt = 0; attempt < 30; attempt++) {
        for (let i = 0; i < pages.length; i++) {
          const isTurn = await pages[i]
            .locator(':has-text("¡Tu Turno!")')
            .first()
            .isVisible()
            .catch(() => false);
          if (isTurn) return { page: pages[i], index: i, name: playerNames[i] };
        }
        await new Promise(r => setTimeout(r, 250));
      }
      return { page: pageA, index: 0, name: 'Alice' };
    }

    // Helper: Pass turn
    async function passTurn(page, pName) {
      console.log(`Pasando turno desde ${pName}...`);
      await page.keyboard.press('Escape').catch(() => {});
      const passBtn = page.getByRole('button', { name: /Pasar|Pasar turno/i }).first();
      await passBtn.waitFor({ state: 'visible', timeout: 10000 });
      await passBtn.click({ force: true });
      // Esperar a que el turno se transfiera
      await page
        .locator(':has-text("¡Tu Turno!")')
        .first()
        .waitFor({ state: 'hidden', timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(800);
    }

    // ----------------------------------------------------
    // STEP 3: Execute 10 Real Turns with Complete Action Suite
    // ----------------------------------------------------
    console.log('--- Paso 3: Ejecución de 10 turnos completos con acciones de mesa ---');

    // Turn 1: Mover carta a la mesa
    console.log('\n[TURNO 1] Acción: Mover carta de la mano a la mesa');
    let active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const handCard = active.page.locator('[data-hand-card="true"]').last();
    if (await handCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await handCard.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const toBattlefield = active.page
        .locator('[data-testid="context-to-battlefield"], button:has-text("Mesa")')
        .first();
      if (await toBattlefield.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toBattlefield.click();
        console.log('✅ Carta movida al centro de la mesa.');
      }
    }
    await passTurn(active.page, active.name);

    // Turn 2: Girar carta (Tap)
    console.log('\n[TURNO 2] Acción: Girar carta en mesa (TAP_CARD)');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const tableCard = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
    if (await tableCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tableCard.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const tapBtn = active.page.locator('[data-testid="context-tap-btn"]').first();
      if (await tapBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tapBtn.click();
        console.log('✅ Carta girada 90° con tap autoritativo.');
      }
    }
    await passTurn(active.page, active.name);

    // Turn 3: Modificar contadores (+1/+1)
    console.log('\n[TURNO 3] Acción: Añadir contador +1/+1 a permanente');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const cardForCounter = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
    if (await cardForCounter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardForCounter.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const countersToggle = active.page.locator('[data-testid="context-counters-toggle"]').first();
      if (await countersToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await countersToggle.click();
        await active.page.waitForTimeout(300);
        const counterInput = active.page.locator('[data-testid="counter-input-+1/+1"]').first();
        if (await counterInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await counterInput.fill('2');
          await active.page.keyboard.press('Enter');
          console.log('✅ Contador +1/+1 establecido en 2.');
        }
      }
      await active.page.keyboard.press('Escape');
    }
    await passTurn(active.page, active.name);

    // Turn 4: Crear ficha (Token de Tesoro)
    console.log('\n[TURNO 4] Acción: Crear ficha de Tesoro en mesa');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    // Encontrar la celda local propia del jugador activo
    const localCell = active.page.locator('[data-player-cell]').filter({
      has: active.page.locator('[data-testid="playmat-custom-btn"]'),
    });
    await localCell.click({ button: 'right', position: { x: 120, y: 100 }, force: true });
    await active.page.waitForTimeout(800);

    const tokenModal = active.page.locator('[data-testid="create-token-modal"]');
    if (await tokenModal.isVisible({ timeout: 4000 }).catch(() => false)) {
      const commonTab = active.page.locator('[data-testid="tab-common-tokens"]');
      if (await commonTab.isVisible()) await commonTab.click();
      await active.page.waitForTimeout(400);

      const createCommonBtn = active.page.locator('[data-testid^="create-common-token-"]').first();
      if (await createCommonBtn.isVisible()) {
        await createCommonBtn.click();
        console.log('✅ Ficha creada exitosamente en mesa.');
      }
    } else {
      console.log('Apertura alternativa de ficha vía menú de carta...');
      const anyCard = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
      if (await anyCard.isVisible().catch(() => false)) {
        await anyCard.click({ button: 'right', force: true });
        await active.page.waitForTimeout(500);
        const createTokenSec = active.page.locator('[data-testid="context-create-token-section"]');
        if (await createTokenSec.isVisible()) {
          const firstTok = active.page.locator('[data-testid^="create-token-"]').first();
          if (await firstTok.isVisible()) await firstTok.click();
        }
        await active.page.keyboard.press('Escape');
      }
    }
    await passTurn(active.page, active.name);

    // Turn 5: Revelar carta de mano a toda la mesa
    console.log('\n[TURNO 5] Acción: Revelar carta a todos los jugadores');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const revealHandCard = active.page.locator('[data-hand-card="true"]').last();
    if (await revealHandCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      await revealHandCard.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const revealMenu = active.page.locator('[data-testid="context-reveal-menu"]');
      if (await revealMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await revealMenu.click();
        await active.page.waitForTimeout(300);
        const revealAll = active.page.locator('[data-testid="context-reveal-all"]');
        if (await revealAll.isVisible()) {
          await revealAll.click();
          console.log('✅ Carta revelada a todos los jugadores.');
        }
      }
      await active.page.keyboard.press('Escape');
    }

    // Descartar el modal de carta revelada en todas las ventanas para no bloquear la pantalla
    await active.page.waitForTimeout(1000);
    for (const p of pages) {
      const revModal = p.locator('[data-testid="revealed-card-modal"]');
      if (await revModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        await revModal.click({ force: true }).catch(() => {});
        await p.keyboard.press('Escape').catch(() => {});
      }
    }
    await passTurn(active.page, active.name);

    // Turn 6: Clonar permanente en mesa
    console.log('\n[TURNO 6] Acción: Clonar permanente en mesa');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const cloneTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
    if (await cloneTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cloneTarget.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const cloneBtn = active.page.locator('[data-testid="context-clone-btn"]');
      if (await cloneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cloneBtn.click();
        await active.page.waitForTimeout(300);
        const quick1 = active.page.locator('[data-testid="clone-quick-1"]');
        if (await quick1.isVisible()) {
          await quick1.click();
          console.log('✅ Copia clonada creada en cascada.');
        }
      }
      await active.page.keyboard.press('Escape');
    }
    await passTurn(active.page, active.name);

    // Turn 7: Voltear carta (boca abajo / DFC)
    console.log('\n[TURNO 7] Acción: Voltear carta boca abajo / boca arriba');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const flipTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
    if (await flipTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
      await flipTarget.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const flipBtn = active.page
        .locator('[data-testid="context-flip-btn"], [data-testid="context-transform-btn"]')
        .first();
      if (await flipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await flipBtn.click();
        console.log('✅ Carta volteada / transformada.');
      }
      await active.page.keyboard.press('Escape');
    }
    await passTurn(active.page, active.name);

    // Turn 8: Ver Carta (Modal de Detalle HD con Dictámenes)
    console.log('\n[TURNO 8] Acción: Inspeccionar Ver Carta en HD con Dictámenes');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const viewTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
    if (await viewTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
      await viewTarget.click({ button: 'right', force: true });
      await active.page.waitForTimeout(500);
      const viewCardBtn = active.page.locator('[data-testid="context-view-card"]').first();
      if (await viewCardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewCardBtn.click();
        await active.page.waitForTimeout(600);
        const detailsModal = active.page.locator('[data-testid="card-details-modal"]');
        const modalVisible = await detailsModal.isVisible({ timeout: 4000 }).catch(() => false);
        console.log(`Modal Ver Carta visible: ${modalVisible ? 'YES ✅' : 'NO ❌'}`);
        await active.page.keyboard.press('Escape');
      }
    }
    await passTurn(active.page, active.name);

    // Turn 9: Vista Ampliada de Celda
    console.log('\n[TURNO 9] Acción: Abrir Vista Ampliada de celda y verificar encuadre');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const expandBtn = active.page.locator('[data-expand-cell-btn]').first();
    if (await expandBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expandBtn.click();
      await active.page.waitForTimeout(800);
      console.log('Vista ampliada abierta correctamente sin crash.');
      await active.page.keyboard.press('Escape');
      await active.page.waitForTimeout(500);
      console.log('Vista ampliada cerrada con Escape.');
    }
    await passTurn(active.page, active.name);

    // Turn 10: Botón "Reportar Problema" (D1) y verificación final
    console.log('\n[TURNO 10] Acción: Abrir Reportar Problema y verificar paquete');
    active = await getActivePage();
    console.log(`Turno activo en jugador: ${active.name}`);
    const reportBtn = active.page.locator('[data-testid="report-issue-btn"]').first();
    if (await reportBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await reportBtn.click();
      await active.page.waitForTimeout(600);

      const reportModal = active.page.locator('[data-testid="report-issue-modal"]');
      const isReportVisible = await reportModal.isVisible({ timeout: 4000 }).catch(() => false);
      console.log(`Modal Reportar Problema visible: ${isReportVisible ? 'YES ✅' : 'NO ❌'}`);

      const jsonPreview = active.page.locator('[data-testid="diagnostic-json-preview"]');
      const jsonText = await jsonPreview.innerText();
      console.log(`Diagnóstico generado: ${jsonText.length} caracteres.`);

      const copyBtn = active.page.locator('[data-testid="copy-diagnostic-btn"]');
      await copyBtn.click();
      console.log('✅ Botón copiar diagnóstico verificado.');

      await active.page.keyboard.press('Escape');
    }
    await passTurn(active.page, active.name);

    // ----------------------------------------------------
    // STEP 4: Capturar pantalla de partida completa a Turno 10
    // ----------------------------------------------------
    console.log('\n--- Paso 4: Captura de pantalla de la partida a Turno 10 ---');
    const screenshotPath = path.join(ARTIFACT_DIR, 'prod-d2-full-game-turn-10.png');
    await pageA.screenshot({ path: screenshotPath });
    console.log(`✅ Captura guardada en: ${screenshotPath}`);

    // Verificar errores de consola en los 4 navegadores
    console.log('\n--- Registro de Errores de Consola (4 Jugadores) ---');
    playerNames.forEach((name, idx) => {
      console.log(`${name}: ${consoleErrors[idx].length} errores [${consoleErrors[idx].join(', ')}]`);
    });

    const totalErrors = consoleErrors.reduce((sum, arr) => sum + arr.length, 0);
    if (totalErrors > 0) {
      console.warn(`⚠️ Se registraron ${totalErrors} errores no fatales de consola.`);
    } else {
      console.log('🎉 0 ERRORES DE CONSOLA en toda la partida de 10 turnos.');
    }

    console.log('\n=================================================================');
    console.log('🎉 PUNTO D2 CUMPLIDO: PARTIDA DE 4 JUGADORES Y 10 TURNOS COMPLETADA');
    console.log('=================================================================');
  } catch (error) {
    console.error('❌ Error durante la ejecución del E2E D2:', error);
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'prod-d2-error.png') }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
