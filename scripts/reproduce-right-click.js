import { chromium } from 'playwright';

const PROD_URL = 'https://proyect-mtgc.netlify.app';

async function run() {
  console.log('=== REPRODUCCIÓN: CLIC DERECHO EN ESPACIO VACÍO ===');
  const browser = await chromium.launch({ headless: true });

  try {
    const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('pageerror', err => {
      console.error('💥 [PAGE ERROR pageA]:', err);
    });

    pageA.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🔴 [CONSOLE ERROR pageA]:', msg.text());
      }
    });

    // 1. Crear mesa
    await pageA.goto(PROD_URL);
    await pageA.waitForLoadState('networkidle');
    await pageA
      .getByRole('button', { name: /Crear Nueva Mesa/i })
      .first()
      .click();
    await pageA.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Test Right Click');
    await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Player1');
    await pageA.locator('select').selectOption('2');
    await pageA.locator('button[type="submit"]').click();

    const codeBtnA = pageA.locator('button:has-text("Código:")').first();
    await codeBtnA.waitFor({ state: 'visible', timeout: 15000 });
    const matchCode = (await codeBtnA.innerText()).match(/([A-Z0-9]{6})/);
    const roomCode = matchCode ? matchCode[1] : '';
    console.log(`Sala creada: ${roomCode}`);

    // Mazos
    await pageA
      .getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i })
      .first()
      .click();
    await pageA.waitForTimeout(1000);
    const chooseDeckBtnA = pageA
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnA.waitFor({ state: 'visible' });
    await chooseDeckBtnA.click();
    await pageA.waitForTimeout(1000);

    // Bob join
    await pageB.goto(PROD_URL);
    await pageB.waitForLoadState('networkidle');
    await pageB
      .getByRole('button', { name: /Unirse con Código/i })
      .first()
      .click();
    await pageB.fill('input[placeholder="ABCDEF"]', roomCode);
    await pageB.fill('input[placeholder="Ej. Planeswalker 2"]', 'Player2');
    await pageB.locator('button[type="submit"]').click();
    await pageB.waitForSelector(`text=${roomCode}`);

    await pageB
      .getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i })
      .first()
      .click();
    await pageB.waitForTimeout(1000);
    const chooseDeckBtnB = pageB
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnB.waitFor({ state: 'visible' });
    await chooseDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    await pageA
      .getByRole('button', { name: /¡Estoy Listo!|Listo/i })
      .first()
      .click();
    await pageB
      .getByRole('button', { name: /¡Estoy Listo!|Listo/i })
      .first()
      .click();

    const startBtn = pageA.locator('button:has-text("INICIAR PARTIDA"):not([disabled])');
    await startBtn.waitFor({ state: 'visible' });
    await startBtn.click();

    // Mulligan
    const mulliganStartTime = Date.now();
    while (Date.now() - mulliganStartTime < 45000) {
      const isMulliganA = await pageA
        .locator('[data-testid="opening-hand-modal"]')
        .isVisible()
        .catch(() => false);
      const isMulliganB = await pageB
        .locator('[data-testid="opening-hand-modal"]')
        .isVisible()
        .catch(() => false);
      const isInitA = await pageA
        .locator('[data-testid="initiative-overlay"]')
        .isVisible()
        .catch(() => false);
      const isInitB = await pageB
        .locator('[data-testid="initiative-overlay"]')
        .isVisible()
        .catch(() => false);

      if (
        !isMulliganA &&
        !isMulliganB &&
        !isInitA &&
        !isInitB &&
        Date.now() - mulliganStartTime > 6000
      ) {
        break;
      }

      const keepA = pageA.locator('[data-testid="keep-btn"]:not([disabled])');
      if (await keepA.isVisible().catch(() => false)) {
        await keepA.click({ force: true });
        await pageA.waitForTimeout(1000);
      }
      const keepB = pageB.locator('[data-testid="keep-btn"]:not([disabled])');
      if (await keepB.isVisible().catch(() => false)) {
        await keepB.click({ force: true });
        await pageB.waitForTimeout(1000);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    await pageA.waitForTimeout(2000);
    console.log('En la mesa de juego.');

    // Clic derecho en espacio vacío de la propia celda
    const p1Id = await pageA.evaluate(() => {
      const state = window.__mtgcRoomState;
      const pEntries = Object.entries(state?.players || {});
      return pEntries.find(([_, p]) => p.name === 'Player1')?.[0] || window.__mtgcLocalPlayerId;
    });

    console.log(`Haciendo clic derecho en espacio vacío de [data-player-cell="${p1Id}"]...`);
    const myCell = pageA.locator(`[data-player-cell="${p1Id}"]`);

    // Clic derecho en el centro de la celda
    await myCell.click({ button: 'right', position: { x: 300, y: 200 } });
    await pageA.waitForTimeout(3000);

    const isModalVisible = await pageA
      .locator('[data-testid="create-token-modal"]')
      .isVisible()
      .catch(() => false);
    console.log(`¿Modal de fichas visible? ${isModalVisible}`);

    await pageA.screenshot({ path: 'repro-right-click.png', fullPage: true });

    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error general:', err);
  process.exit(1);
});
