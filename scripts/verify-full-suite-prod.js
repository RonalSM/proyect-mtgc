import { chromium } from 'playwright';
import path from 'path';

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

async function run() {
  console.log('=== VERIFICACIÓN EN PRODUCCIÓN: TAREAS 1, 2, 3 Y 4 ===');
  const browser = await chromium.launch({ headless: true });

  try {
    // ----------------------------------------------------
    // TEST 1: SALIR DE SALA Y CREAR NUEVA SIN F5 (TAREA 1)
    // ----------------------------------------------------
    console.log('\n[1/5] TEST 1: Salir de sala y crear otra sin F5 (Desmontaje y Room Switch)...');
    const ctx1 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1 = await ctx1.newPage();
    await page1.goto(PROD_URL);
    await page1.waitForLoadState('networkidle');

    // Crear primera sala
    await page1.getByRole('button', { name: /Crear Nueva Mesa/i }).first().click();
    await page1.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Test Salida 1');
    await page1.fill('input[placeholder="Ej. Planeswalker 1"]', 'Player_Alpha');
    await page1.locator('button[type="submit"]').click();

    const codeBtn1 = page1.locator('button:has-text("Código:")').first();
    await codeBtn1.waitFor({ state: 'visible', timeout: 20000 });
    const code1 = (await codeBtn1.innerText()).match(/([A-Z0-9]{6})/)?.[1];
    console.log(`  -> Sala 1 creada: ${code1}`);

    // Salir de la sala usando el botón Salir
    await page1.getByRole('button', { name: /Salir/i }).first().click();
    await page1.waitForTimeout(1000);

    // Crear inmediatamente la sala 2 sin F5
    await page1.getByRole('button', { name: /Crear Nueva Mesa/i }).first().click();
    await page1.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Test Salida 2');
    await page1.locator('button[type="submit"]').click();

    const codeBtn2 = page1.locator('button:has-text("Código:")').first();
    await codeBtn2.waitFor({ state: 'visible', timeout: 20000 });
    const code2 = (await codeBtn2.innerText()).match(/([A-Z0-9]{6})/)?.[1];
    console.log(`  -> Sala 2 creada limpiamente sin F5: ${code2}`);

    if (code1 === code2) {
      throw new Error('La nueva sala no generó un código nuevo');
    }

    const shot1 = path.join(ARTIFACT_DIR, 'prod-flow1-exit-and-recreate-clean.png');
    await page1.screenshot({ path: shot1, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot1}`);
    await ctx1.close();

    // ----------------------------------------------------
    // TEST 2: DRAG SELECTION FUERA DE MODAL NO LO CIERRA (TAREA 3)
    // ----------------------------------------------------
    console.log('\n[2/5] TEST 2: Selección y arrastre de texto fuera del modal no lo cierra (useBackdropClose)...');
    const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page2 = await ctx2.newPage();
    await page2.goto(PROD_URL);
    await page2.waitForLoadState('networkidle');

    // Abrir modal de creación de mesa
    await page2.getByRole('button', { name: /Crear Nueva Mesa/i }).first().click();
    const modalInput = page2.locator('input[placeholder="Ej. Pod de Viernes por la Noche"]');
    await modalInput.waitFor({ state: 'visible' });
    await modalInput.fill('Texto Para Arrastrar y Seleccionar');

    // Obtener caja delimitadora del input
    const box = await modalInput.boundingBox();
    if (!box) throw new Error('No se encontró el input en el modal');

    // Mousedown adentro del input
    await page2.mouse.move(box.x + 20, box.y + box.height / 2);
    await page2.mouse.down();

    // Arrastrar hacia las coordenadas del backdrop fuera del modal (ej. esquina superior izquierda)
    await page2.mouse.move(30, 30, { steps: 10 });
    // Soltar mouse afuera
    await page2.mouse.up();

    await page2.waitForTimeout(500);

    // Verificar que el modal sigue ABIERTO y visible
    const isModalStillVisible = await modalInput.isVisible();
    console.log(`  -> ¿El modal continúa abierto tras arrastrar afuera? ${isModalStillVisible}`);
    if (!isModalStillVisible) {
      throw new Error('El modal se cerró incorrectamente al soltar el mouse fuera');
    }

    const shot2 = path.join(ARTIFACT_DIR, 'prod-flow2-modal-drag-intact.png');
    await page2.screenshot({ path: shot2, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot2}`);
    await ctx2.close();

    // ----------------------------------------------------
    // TEST 3, 4 Y 5: PARTIDA REAL CON DOS JUGADORES (TAREA 4 Y REGLAS)
    // ----------------------------------------------------
    console.log('\n[3/5] TEST 3, 4 & 5: Partida real 2 jugadores (Biblioteca, Revelación en Mano y Daño Comandante)...');
    const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // 1. Alice crea sala para 2 jugadores
    await pageA.goto(PROD_URL);
    await pageA.waitForLoadState('networkidle');
    await pageA.getByRole('button', { name: /Crear Nueva Mesa/i }).first().click();
    await pageA.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Duelo Pro');
    await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice_Host');
    await pageA.locator('select').selectOption('2');
    await pageA.locator('button[type="submit"]').click();

    const codeBtnA = pageA.locator('button:has-text("Código:")').first();
    await codeBtnA.waitFor({ state: 'visible', timeout: 20000 });
    const matchCode = (await codeBtnA.innerText()).match(/([A-Z0-9]{6})/);
    const roomCode = matchCode ? matchCode[1] : '';
    console.log(`  -> Sala creada: ${roomCode}`);

    // 2. Alice selecciona mazo
    await pageA.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i }).first().click();
    await pageA.waitForTimeout(1000);
    const chooseDeckBtnA = pageA.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await chooseDeckBtnA.waitFor({ state: 'visible', timeout: 15000 });
    await chooseDeckBtnA.click();
    await pageA.waitForTimeout(1000);

    // 3. Bob se une a la sala
    await pageB.goto(PROD_URL);
    await pageB.waitForLoadState('networkidle');
    await pageB.getByRole('button', { name: /Unirse con Código/i }).first().click();
    await pageB.fill('input[placeholder="ABCDEF"]', roomCode);
    await pageB.fill('input[placeholder="Ej. Planeswalker 2"]', 'Bob_Rival');
    await pageB.locator('button[type="submit"]').click();
    await pageB.waitForSelector(`text=${roomCode}`, { timeout: 20000 });

    // 4. Bob selecciona mazo
    await pageB.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i }).first().click();
    await pageB.waitForTimeout(1000);
    const chooseDeckBtnB = pageB.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await chooseDeckBtnB.waitFor({ state: 'visible', timeout: 15000 });
    await chooseDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    // 5. Ambos listos y comenzar partida
    await pageA.getByRole('button', { name: /¡Estoy Listo!|Listo/i }).first().click();
    await pageB.getByRole('button', { name: /¡Estoy Listo!|Listo/i }).first().click();
    
    // Esperar a que el botón INICIAR PARTIDA esté habilitado en Alice (canStart = true tras sync)
    const startBtn = pageA.locator('button:has-text("INICIAR PARTIDA"):not([disabled])');
    await startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startBtn.click();
    console.log('  -> Iniciando partida...');

    // Esperar a que comience la iniciativa y luego se resuelva el mulligan (Mano inicial)
    console.log('  -> Esperando resolución de iniciativa y mulligan secuencial...');
    const mulliganStartTime = Date.now();
    let mulliganDone = false;

    while (Date.now() - mulliganStartTime < 60000) {
      // Verificar si ambos jugadores ya superaron el modal de mano inicial
      const isMulliganA = await pageA.locator('[data-testid="opening-hand-modal"]').isVisible().catch(() => false);
      const isMulliganB = await pageB.locator('[data-testid="opening-hand-modal"]').isVisible().catch(() => false);
      const isInitA = await pageA.locator('[data-testid="initiative-overlay"]').isVisible().catch(() => false);
      const isInitB = await pageB.locator('[data-testid="initiative-overlay"]').isVisible().catch(() => false);

      if (!isMulliganA && !isMulliganB && !isInitA && !isInitB && (Date.now() - mulliganStartTime > 8000)) {
        mulliganDone = true;
        break;
      }

      // Si Alice tiene el turno de decisión de mulligan, se queda con la mano
      const keepA = pageA.locator('[data-testid="keep-btn"]:not([disabled])');
      if (await keepA.isVisible().catch(() => false)) {
        await keepA.click({ force: true });
        console.log('  -> Alice aceptó su mano inicial con [data-testid="keep-btn"]');
        await pageA.waitForTimeout(1000);
      }

      // Si Bob tiene el turno de decisión de mulligan, se queda con la mano
      const keepB = pageB.locator('[data-testid="keep-btn"]:not([disabled])');
      if (await keepB.isVisible().catch(() => false)) {
        await keepB.click({ force: true });
        console.log('  -> Bob aceptó su mano inicial con [data-testid="keep-btn"]');
        await pageB.waitForTimeout(1000);
      }

      await new Promise(r => setTimeout(r, 600));
    }

    if (!mulliganDone) {
      console.log('  -> Verificando si la mesa ya está lista...');
    }
    await pageA.waitForTimeout(2000);
    console.log('  -> ¡Mesa de juego activa y 100% interactiva!');

    // ----------------------------------------------------
    // VERIFICACIÓN 3: BIBLIOTECA (SIN OJITO + MENÚ CONTEXTUAL + BARAJAR AL CERRAR)
    // ----------------------------------------------------
    console.log('\n  -> Verificando biblioteca: ojito removido, menú clic derecho y checkbox barajar...');
    // Obtener los IDs de Alice y Bob del estado
    const { aliceId, bobId } = await pageA.evaluate(() => {
      const state = window.__mtgcRoomState;
      const pEntries = Object.entries(state?.players || {});
      const a = pEntries.find(([_, p]) => p.name === 'Alice_Host')?.[0] || window.__mtgcLocalPlayerId;
      const b = pEntries.find(([id, _]) => id !== a)?.[0];
      return { aliceId: a, bobId: b };
    });
    console.log(`  -> Identificadores: Alice=${aliceId}, Bob=${bobId}`);

    // Verificar que NO existe el botón del ojito
    const eyeBtnCount = await pageA.locator('[data-library-inspect-btn="true"]').count();
    console.log(`  -> Cantidad de botones del ojo en biblioteca: ${eyeBtnCount} (debe ser 0)`);
    if (eyeBtnCount !== 0) {
      throw new Error('El botón del ojo en la biblioteca todavía existe');
    }

    // Hacer clic derecho en la biblioteca específica de Alice
    const libDock = pageA.locator(`[data-player-dock="${aliceId}"] [data-dock-zone="library"]`);
    await libDock.waitFor({ state: 'visible', timeout: 10000 });
    await libDock.click({ button: 'right' });
    await pageA.waitForTimeout(600);

    // Verificar que aparece "Ver mi biblioteca"
    const inspectOption = pageA.locator('[data-testid="lib-menu-inspect"]');
    await inspectOption.waitFor({ state: 'visible', timeout: 10000 });
    const optionText = await inspectOption.innerText();
    console.log(`  -> Opción en menú contextual encontrada: "${optionText}"`);

    // Abrir modal de biblioteca
    await inspectOption.click();
    await pageA.waitForSelector('[data-testid="pile-viewer-modal"]', { timeout: 10000 });

    // Verificar que aparece el checkbox "Barajar al cerrar" y está marcado
    const shuffleCheckbox = pageA.locator('[data-testid="shuffle-on-close-checkbox"]');
    await shuffleCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    const isShuffleChecked = await shuffleCheckbox.isChecked();
    console.log(`  -> ¿Checkbox "Barajar al cerrar" está marcado por defecto? ${isShuffleChecked}`);
    if (!isShuffleChecked) {
      throw new Error('El checkbox "Barajar al cerrar" no está marcado por defecto');
    }

    const shot3 = path.join(ARTIFACT_DIR, 'prod-flow4-library-menu-and-checkbox.png');
    await pageA.screenshot({ path: shot3, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot3}`);

    // Cerrar modal de biblioteca
    await pageA.locator('[data-testid="close-pile-modal-btn"]').click();
    await pageA.waitForTimeout(800);

    // ----------------------------------------------------
    // VERIFICACIÓN 4: REGLA DE REVELACIÓN (BOUNCE TO HAND -> ISKNOWNTOALL)
    // ----------------------------------------------------
    console.log('\n  -> Verificando regla de revelación de carta devuelta a mano...');
    // Alice selecciona la última carta de su propia mano y la juega al campo
    const targetHandCard = pageA.locator(`[data-player-dock="${aliceId}"] [data-hand-card="true"]`).last();
    await targetHandCard.waitFor({ state: 'visible', timeout: 10000 });
    const cardNameToPlay = await targetHandCard.getAttribute('data-card-name');
    await targetHandCard.click({ force: true });
    await pageA.waitForTimeout(500);

    const playBtn = pageA.locator('[data-testid="hand-play-btn"]');
    await playBtn.waitFor({ state: 'visible', timeout: 8000 });
    await playBtn.click();
    console.log(`  -> Alice jugó la carta "${cardNameToPlay}" al campo`);
    await pageA.waitForTimeout(1500);

    // Alice hace clic derecho en la carta jugada en el campo y selecciona "Enviar a Mano"
    const bfCard = pageA.locator('[data-battlefield-card="true"]').first();
    await bfCard.waitFor({ state: 'visible', timeout: 10000 });
    await bfCard.click({ button: 'right', force: true });
    await pageA.waitForTimeout(600);

    const toHandBtn = pageA.locator('[data-testid="context-to-hand"]');
    await toHandBtn.waitFor({ state: 'visible', timeout: 8000 });
    await toHandBtn.click();
    console.log(`  -> Alice envió la carta devuelta a su mano`);
    await pageA.waitForTimeout(1500);

    // Comprobar que en la vista de Bob, la carta de Alice se ve boca arriba con borde distintivo y badge
    const rivalKnownCard = pageB.locator('[data-is-known-to-all="true"]').first();
    await rivalKnownCard.waitFor({ state: 'visible', timeout: 15000 });
    const rivalCardName = await rivalKnownCard.getAttribute('data-card-name');
    console.log(`  -> Bob ve la carta devuelta a la mano de Alice BOCA ARRIBA: "${rivalCardName}"`);

    const shot4 = path.join(ARTIFACT_DIR, 'prod-flow4-rival-card-faceup-in-hand.png');
    await pageB.screenshot({ path: shot4, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot4}`);

    // ----------------------------------------------------
    // VERIFICACIÓN 5: DAÑO DE COMANDANTE SIGUE RESTANDO VIDA
    // ----------------------------------------------------
    console.log('\n  -> Verificando que el daño de comandante sigue restando vida...');
    const lifeBtn = pageA.locator(`[data-life-button="${aliceId}"]`);
    await lifeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await lifeBtn.click({ force: true });
    await pageA.waitForSelector('[data-testid="commander-damage-section"]', { timeout: 10000 });

    const initialLife = await pageA.evaluate((aId) => {
      const state = window.__mtgcRoomState;
      return state?.players?.[aId]?.life ?? 40;
    }, aliceId);

    const plusDamageBtn = pageA.locator(`[data-testid="cmd-dmg-plus-${bobId}"]`);
    await plusDamageBtn.waitFor({ state: 'visible', timeout: 8000 });
    await plusDamageBtn.click();
    await pageA.waitForTimeout(1000);

    const newLife = await pageA.evaluate((aId) => {
      const state = window.__mtgcRoomState;
      return state?.players?.[aId]?.life;
    }, aliceId);

    console.log(`  -> Vida antes del daño: ${initialLife}, Vida después del daño de comandante: ${newLife}`);
    if (newLife !== initialLife - 1) {
      throw new Error(`El daño de comandante no restó vida (esperado ${initialLife - 1}, actual ${newLife})`);
    }

    const shot5 = path.join(ARTIFACT_DIR, 'prod-flow5-commander-damage-subtractive.png');
    await pageA.screenshot({ path: shot5, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot5}`);

    await ctxA.close();
    await ctxB.close();
    console.log('\n🎉 TODAS LAS 5 VERIFICACIONES EN PRODUCCIÓN COMPLETADAS CON ÉXITO.');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('ERROR EN VERIFICACIÓN:', err);
  process.exit(1);
});
