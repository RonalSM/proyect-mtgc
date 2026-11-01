import { chromium } from 'playwright';
import path from 'path';

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR =
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

async function run() {
  console.log('=== VERIFICACIÓN VISUAL TAREA 2: CREACIÓN DE FICHAS EN PRODUCCIÓN ===');
  const browser = await chromium.launch({ headless: true });

  try {
    const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('pageerror', err => {
      console.error('💥 [PAGE ERROR pageA]:', err);
    });

    // 1. Entrar a la app y crear mesa
    console.log('[1/4] Creando mesa de Commander en producción...');
    await pageA.goto(PROD_URL);
    await pageA.waitForLoadState('networkidle');
    await pageA
      .getByRole('button', { name: /Crear Nueva Mesa/i })
      .first()
      .click();
    await pageA.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Fichas Test');
    await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'TokenMaster_Alice');
    await pageA.locator('select').selectOption('2');
    await pageA.locator('button[type="submit"]').click();

    const codeBtnA = pageA.locator('button:has-text("Código:")').first();
    await codeBtnA.waitFor({ state: 'visible', timeout: 15000 });
    const matchCode = (await codeBtnA.innerText()).match(/([A-Z0-9]{6})/);
    const roomCode = matchCode ? matchCode[1] : '';
    console.log(`  -> Sala creada: ${roomCode}`);

    // Alice selecciona mazo
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

    // Bob se une
    await pageB.goto(PROD_URL);
    await pageB.waitForLoadState('networkidle');
    await pageB
      .getByRole('button', { name: /Unirse con Código/i })
      .first()
      .click();
    await pageB.fill('input[placeholder="ABCDEF"]', roomCode);
    await pageB.fill('input[placeholder="Ej. Planeswalker 2"]', 'TokenRival_Bob');
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

    // Ambos listos e iniciar partida
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
    console.log('  -> Iniciando partida...');

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
    console.log('  -> Mesa de juego activa.');

    // 2. Clic derecho en espacio vacío de la división del jugador local
    console.log('[2/4] Haciendo clic derecho en espacio vacío del campo de batalla...');
    const aliceId = await pageA.evaluate(() => {
      const state = window.__mtgcRoomState;
      const pEntries = Object.entries(state?.players || {});
      return (
        pEntries.find(([_, p]) => p.name === 'TokenMaster_Alice')?.[0] || window.__mtgcLocalPlayerId
      );
    });

    const myCell = pageA.locator(`[data-player-cell="${aliceId}"]`);
    await myCell.click({ button: 'right', position: { x: 350, y: 180 } });
    await pageA.waitForTimeout(800);

    // 3. Verificar visualmente que aparece el modal "Crear Ficha" sin pantalla negra
    console.log('[3/4] Verificando modal de Crear Ficha...');
    const tokenModal = pageA.locator('[data-testid="create-token-modal"]');
    await tokenModal.waitFor({ state: 'visible', timeout: 10000 });
    console.log('  -> Modal "Crear Ficha en la Mesa" desplegado exitosamente sin crasheo.');

    const shot1 = path.join(ARTIFACT_DIR, 'browser-token-modal-open.png');
    await pageA.screenshot({ path: shot1, fullPage: true });
    console.log(`  ✅ Captura 1 guardada: ${shot1}`);

    // 4. Crear ficha de Tesoro (Treasure)
    console.log('[4/4] Creando ficha de Tesoro (Treasure)...');
    // Ir a pestaña de fichas comunes
    await pageA.locator('[data-testid="tab-common-tokens"]').click();
    await pageA.waitForTimeout(500);

    const createTreasureBtn = pageA.locator('[data-testid="create-common-token-treasure"]');
    await createTreasureBtn.waitFor({ state: 'visible', timeout: 8000 });
    await createTreasureBtn.click();
    await pageA.waitForTimeout(1500);

    // Verificar que el token de Tesoro aparece en el campo de batalla
    const treasureCard = pageA
      .locator('[data-battlefield-card="true"][data-card-name="Treasure"]')
      .first();
    await treasureCard.waitFor({ state: 'visible', timeout: 15000 });
    console.log('  -> Ficha de Tesoro creada y visible en el campo de batalla.');

    const shot2 = path.join(ARTIFACT_DIR, 'browser-token-treasure-battlefield.png');
    await pageA.screenshot({ path: shot2, fullPage: true });
    console.log(`  ✅ Captura 2 guardada: ${shot2}`);

    await ctxA.close();
    await ctxB.close();
    console.log('\n🎉 VERIFICACIÓN VISUAL DE CREACIÓN DE FICHAS COMPLETADA CON ÉXITO.');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('ERROR EN VERIFICACIÓN:', err);
  process.exit(1);
});
