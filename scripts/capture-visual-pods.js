const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TARGET_URL = process.env.TARGET_URL || 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

const POD_SIZES = [3, 5, 6];
const RESOLUTIONS = [
  { name: '1080p', width: 1920, height: 1080 },
  { name: '768p', width: 1366, height: 768 },
];

async function capturePod(browser, podSize) {
  console.log(`\n======================================================`);
  console.log(`🎮 CAPTURANDO POD DE ${podSize} JUGADORES EN PRODUCCIÓN`);
  console.log(`======================================================`);

  const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona'].slice(0, podSize);
  const contexts = await Promise.all(
    playerNames.map(() => browser.newContext({ viewport: { width: 1920, height: 1080 } }))
  );
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const pageHost = pages[0];

  try {
    // 1. Host creates room with maxPlayers = podSize
    console.log(`[Host] Creando sala para ${podSize} jugadores...`);
    await pageHost.goto(TARGET_URL, { waitUntil: 'networkidle' });

    const createBtn = pageHost.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    const roomNameInput = pageHost
      .getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i)
      .or(pageHost.locator('input[type="text"]').first());
    await roomNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await roomNameInput.fill(`Pod ${podSize}P Visual`);

    const hostNameInput = pageHost
      .getByPlaceholder(/Planeswalker 1|Tu nombre/i)
      .or(pageHost.locator('input[type="text"]').nth(1));
    await hostNameInput.fill('Alice');

    // Select max players
    const selectElem = pageHost.locator('select').first();
    await selectElem.selectOption(String(podSize));

    const submitCreateBtn = pageHost.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    await pageHost.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
      timeout: 20000,
    });
    const roomCodeEl = await pageHost
      .locator('[data-testid="room-code-display"]')
      .or(pageHost.locator('text=/Código:/i'))
      .first();
    const fullCodeText = await roomCodeEl.innerText();
    const match = fullCodeText.match(/([A-Z0-9]{6})/);
    if (!match) throw new Error(`Could not find room code in text: "${fullCodeText}"`);
    const roomCode = match[1];
    console.log(`✅ Sala creada con código: "${roomCode}"`);

    // Helper: Select Preset Deck & Set Ready
    async function selectPresetAndReady(page, pName, presetIndex) {
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

      const chooseBtns = page.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i });
      await chooseBtns.first().waitFor({ state: 'visible', timeout: 10000 });
      const targetBtn =
        (await chooseBtns.count()) > presetIndex ? chooseBtns.nth(presetIndex) : chooseBtns.first();
      await targetBtn.click();
      await page.waitForTimeout(600);

      const readyBtn = page.getByRole('button', { name: /¡Estoy Listo!|Listo/i });
      await readyBtn.click();
      console.log(`✅ ${pName} está LISTO.`);
    }

    // Host selects preset 0
    await selectPresetAndReady(pageHost, 'Alice', 0);

    // Other players join
    for (let i = 1; i < podSize; i++) {
      const p = pages[i];
      const pName = playerNames[i];
      console.log(`[Unión] ${pName} uniéndose a ${roomCode}...`);
      await p.goto(TARGET_URL, { waitUntil: 'networkidle' });

      const openJoinBtn = p.getByRole('button', { name: /Unirse con Código/i });
      await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
      await openJoinBtn.click();

      const joinCodeInput = p.getByPlaceholder(/ABCDEF/i);
      await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
      await joinCodeInput.fill(roomCode);

      const joinNameInput = p.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
      await joinNameInput.fill(pName);

      const submitJoinBtn = p.getByRole('button', { name: /Entrar a la Sala/i });
      await submitJoinBtn.click();

      await p.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
        timeout: 20000,
      });

      await selectPresetAndReady(p, pName, i % 8);
    }

    // 2. Start Game
    console.log(`[Host] Todos listos. Iniciando partida de ${podSize} jugadores...`);
    const startGameBtn = pageHost.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startGameBtn.click();

    // Accept hands on all pages
    await Promise.all(
      pages.map(async (page, idx) => {
        await page
          .locator('[data-testid="opening-hand-modal"]')
          .waitFor({ state: 'visible', timeout: 35000 });
        const keepBtn = page.getByTestId('keep-btn');
        await keepBtn.waitFor({ state: 'visible', timeout: 10000 });
        await keepBtn.click();
        console.log(`Mano aceptada por ${playerNames[idx]}`);
      })
    );

    await pageHost.waitForSelector('[data-table-board], [data-player-header]', { timeout: 20000 });
    await pageHost.waitForTimeout(2000);
    console.log(`✅ Tablero activo con ${podSize} jugadores.`);

    // 3. Move cards to battlefield on at least 2 players so table has permanents
    for (let pIdx = 0; pIdx < Math.min(2, podSize); pIdx++) {
      const page = pages[pIdx];
      const handCard = page.locator('[data-hand-card="true"]').last();
      if (await handCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await handCard.click({ button: 'right', force: true });
        await page.waitForTimeout(400);
        const toBattlefield = page
          .locator('[data-testid="context-to-battlefield"], button:has-text("Mesa")')
          .first();
        if (await toBattlefield.isVisible({ timeout: 3000 }).catch(() => false)) {
          await toBattlefield.click();
          console.log(`Carta enviada a la mesa por ${playerNames[pIdx]}`);
        }
        await page.keyboard.press('Escape');
      }
    }
    await pageHost.waitForTimeout(2000);

    // 4. Capture at both resolutions (1920x1080 and 1366x768)
    for (const res of RESOLUTIONS) {
      await pageHost.setViewportSize({ width: res.width, height: res.height });
      await pageHost.waitForTimeout(1000);

      const filename = `prod-d3-${podSize}p-${res.name}.png`;
      const screenshotPath = path.join(ARTIFACT_DIR, filename);
      await pageHost.screenshot({ path: screenshotPath });
      console.log(`📸 Capturada mesa de ${podSize}P a ${res.width}x${res.height}: ${filename}`);
    }
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => {});
    }
  }
}

async function run() {
  console.log('=================================================================');
  console.log('📸 PUNTO D3: Capturas de 3, 5 y 6 Jugadores en 1080p y 768p');
  console.log('Target URL:', TARGET_URL);
  console.log('Artifacts Directory:', ARTIFACT_DIR);
  console.log('=================================================================');

  const browser = await chromium.launch({ headless: true });

  try {
    for (const size of POD_SIZES) {
      await capturePod(browser, size);
    }
    console.log('\n=================================================================');
    console.log('🎉 PUNTO D3 CUMPLIDO: TODAS LAS CAPTURAS DE 3P, 5P Y 6P GENERADAS');
    console.log('=================================================================');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Fatal error in D3:', err);
  process.exit(1);
});
