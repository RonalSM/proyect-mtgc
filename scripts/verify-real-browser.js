import { chromium } from 'playwright';
import path from 'path';

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR =
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

async function run() {
  console.log('=== VERIFICACIÓN VISUAL EN PRODUCCIÓN: TAREA 2 ===');
  const browser = await chromium.launch({ headless: true });

  try {
    const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // 1. Entrar a https://proyect-mtgc.netlify.app
    console.log('[1/5] Navegando a la página principal...');
    await pageA.goto(PROD_URL);
    await pageA.waitForLoadState('networkidle');

    // Comprobar que NO está atascado en "Conectando..." y que muestra el Lobby
    const lobbyTitle = pageA.locator('h1, h2, button:has-text("Crear Nueva Mesa")').first();
    await lobbyTitle.waitFor({ state: 'visible', timeout: 15000 });
    console.log('  -> Lobby cargado limpiamente sin spinner infinito.');

    const shot1 = path.join(ARTIFACT_DIR, 'browser-prod-lobby-clean.png');
    await pageA.screenshot({ path: shot1, fullPage: true });
    console.log(`  ✅ Captura 1 guardada: ${shot1}`);

    // 2. Crear una mesa nueva
    console.log('\n[2/5] Creando nueva mesa de Commander...');
    await pageA
      .getByRole('button', { name: /Crear Nueva Mesa/i })
      .first()
      .click();
    await pageA.fill(
      'input[placeholder="Ej. Pod de Viernes por la Noche"]',
      'Pod de Prueba Browser',
    );
    await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Neroz_Host');
    await pageA.locator('select').selectOption('2');
    await pageA.locator('button[type="submit"]').click();

    // 3. Verificar visualmente que entra a la sala de espera (Lobby) sin quedarse en "Conectando..."
    console.log('\n[3/5] Verificando entrada inmediata a sala de espera (LobbyWaitingRoom)...');
    const codeBtnA = pageA.locator('button:has-text("Código:")').first();
    await codeBtnA.waitFor({ state: 'visible', timeout: 15000 });
    const matchCode = (await codeBtnA.innerText()).match(/([A-Z0-9]{6})/);
    const roomCode = matchCode ? matchCode[1] : '';
    console.log(`  -> Sala creada y lista: ${roomCode}`);

    const shot2 = path.join(ARTIFACT_DIR, 'browser-prod-waiting-room.png');
    await pageA.screenshot({ path: shot2, fullPage: true });
    console.log(`  ✅ Captura 2 guardada: ${shot2}`);

    // 4. Seleccionar mazos y alistar ambos jugadores
    console.log('\n[4/5] Seleccionando mazos y comenzando partida...');
    // Alice selecciona mazo
    await pageA
      .getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i })
      .first()
      .click();
    await pageA.waitForTimeout(1000);
    const chooseDeckBtnA = pageA
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnA.waitFor({ state: 'visible', timeout: 15000 });
    await chooseDeckBtnA.click();
    await pageA.waitForTimeout(1000);

    // Bob se une a la sala
    await pageB.goto(PROD_URL);
    await pageB.waitForLoadState('networkidle');
    await pageB
      .getByRole('button', { name: /Unirse con Código/i })
      .first()
      .click();
    await pageB.fill('input[placeholder="ABCDEF"]', roomCode);
    await pageB.fill('input[placeholder="Ej. Planeswalker 2"]', 'Bob_Rival');
    await pageB.locator('button[type="submit"]').click();
    await pageB.waitForSelector(`text=${roomCode}`, { timeout: 20000 });

    // Bob selecciona mazo
    await pageB
      .getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i })
      .first()
      .click();
    await pageB.waitForTimeout(1000);
    const chooseDeckBtnB = pageB
      .getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i })
      .first();
    await chooseDeckBtnB.waitFor({ state: 'visible', timeout: 15000 });
    await chooseDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    // Ambos listos
    await pageA
      .getByRole('button', { name: /¡Estoy Listo!|Listo/i })
      .first()
      .click();
    await pageB
      .getByRole('button', { name: /¡Estoy Listo!|Listo/i })
      .first()
      .click();

    // Alice inicia partida
    const startBtn = pageA.locator('button:has-text("INICIAR PARTIDA"):not([disabled])');
    await startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startBtn.click();
    console.log('  -> Partida iniciada. Resolviendo iniciativa y mano inicial...');

    // Resolver mulligan
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
        console.log('  -> Alice aceptó mano inicial');
        await pageA.waitForTimeout(1000);
      }

      const keepB = pageB.locator('[data-testid="keep-btn"]:not([disabled])');
      if (await keepB.isVisible().catch(() => false)) {
        await keepB.click({ force: true });
        console.log('  -> Bob aceptó mano inicial');
        await pageB.waitForTimeout(1000);
      }

      await new Promise(r => setTimeout(r, 600));
    }

    await pageA.waitForTimeout(2000);
    console.log('  -> ¡En el campo de batalla!');

    // 5. Entrar a jugar, verificar el daño de comandante
    console.log('\n[5/5] Verificando daño de comandante en vivo...');
    const aliceId = await pageA.evaluate(() => {
      const state = window.__mtgcRoomState;
      const pEntries = Object.entries(state?.players || {});
      return pEntries.find(([_, p]) => p.name === 'Neroz_Host')?.[0] || window.__mtgcLocalPlayerId;
    });
    const bobId = await pageA.evaluate(aId => {
      const state = window.__mtgcRoomState;
      return Object.keys(state?.players || {}).find(id => id !== aId);
    }, aliceId);

    // Abrir popover de vida de Alice
    const lifeBtn = pageA.locator(`[data-life-button="${aliceId}"]`);
    await lifeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await lifeBtn.click({ force: true });
    await pageA.waitForSelector('[data-testid="commander-damage-section"]', { timeout: 10000 });

    const initialLife = await pageA.evaluate(aId => {
      return window.__mtgcRoomState?.players?.[aId]?.life ?? 40;
    }, aliceId);

    // Pulsar + en daño de comandante de Bob
    const plusDmgBtn = pageA.locator(`[data-testid="cmd-dmg-plus-${bobId}"]`);
    await plusDmgBtn.waitFor({ state: 'visible', timeout: 8000 });
    await plusDmgBtn.click();
    await pageA.waitForTimeout(1000);

    const newLife = await pageA.evaluate(aId => {
      return window.__mtgcRoomState?.players?.[aId]?.life;
    }, aliceId);

    console.log(
      `  -> Vida antes: ${initialLife}, Vida después de 1 daño de comandante: ${newLife}`,
    );
    if (newLife !== initialLife - 1) {
      throw new Error(
        `El daño de comandante no restó vida. Esperado ${initialLife - 1}, actual ${newLife}`,
      );
    }

    const shot3 = path.join(ARTIFACT_DIR, 'browser-prod-cmdr-damage.png');
    await pageA.screenshot({ path: shot3, fullPage: true });
    console.log(`  ✅ Captura 3 guardada: ${shot3}`);

    // Cerrar popover de vida haciendo clic afuera
    await pageA.locator('[data-life-backdrop="true"]').click({ force: true });
    await pageA.waitForTimeout(600);

    // 6. Volver a salir al lobby principal limpiamente
    console.log('\n[6/6] Saliendo de la partida hacia el lobby principal...');
    const leaveBtn = pageA
      .locator('button[title="Salir de la mesa"], button:has-text("Salir")')
      .first();
    await leaveBtn.waitFor({ state: 'visible', timeout: 8000 });
    await leaveBtn.click();
    await pageA.waitForTimeout(1500);

    // Comprobar que regresó al lobby principal
    await pageA
      .locator('button:has-text("Crear Nueva Mesa")')
      .waitFor({ state: 'visible', timeout: 15000 });
    console.log('  -> Regreso exitoso al Lobby principal.');

    const shot4 = path.join(ARTIFACT_DIR, 'browser-prod-exit-clean.png');
    await pageA.screenshot({ path: shot4, fullPage: true });
    console.log(`  ✅ Captura 4 guardada: ${shot4}`);

    await ctxA.close();
    await ctxB.close();
    console.log('\n🎉 FLUJO COMPLETO EN PRODUCCIÓN VERIFICADO CON ÉXITO.');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('ERROR EN VERIFICACIÓN:', err);
  process.exit(1);
});
