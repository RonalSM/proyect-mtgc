import { chromium } from 'playwright';
import path from 'path';

const PROD_URL = 'https://proyect-mtgc.netlify.app';
const ARTIFACT_DIR = 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

async function main() {
  console.log('--- INICIANDO VERIFICACIÓN EN PRODUCCIÓN: TAREAS 1, 2 Y 3 ---');
  const browser = await chromium.launch({ headless: true });

  try {
    // ==========================================
    // PARTE 1: PRUEBA A - SALIR Y CREAR OTRA SIN F5
    // ==========================================
    console.log('\n[1/3] Verificando Salida de sala y creación de nueva sala sin F5...');
    const context1 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page1 = await context1.newPage();

    await page1.goto(PROD_URL);
    await page1.waitForLoadState('networkidle');

    // Crear Sala 1
    const createBtn1 = page1.getByRole('button', { name: /Crear Nueva Mesa/i }).first();
    await createBtn1.click();
    await page1.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Alfa 1');
    await page1.fill('input[placeholder="Ej. Planeswalker 1"]', 'Jugador_Alfa');
    await page1.locator('button[type="submit"]').click();

    const codeBtn1 = page1.locator('button:has-text("Código:")').first();
    await codeBtn1.waitFor({ state: 'visible', timeout: 20000 });
    const code1Text = (await codeBtn1.innerText()).match(/([A-Z0-9]{6})/)?.[1];
    console.log(`  -> Sala 1 creada exitosamente con código: ${code1Text}`);

    // Salir de Sala 1
    const leaveBtn1 = page1.getByRole('button', { name: /Salir/i }).first();
    await leaveBtn1.click();
    await page1.waitForTimeout(1000);

    // Verificar limpieza de storage
    const sessionRoom = await page1.evaluate(() => sessionStorage.getItem('mtgc_room_code'));
    const localRoom = await page1.evaluate(() => localStorage.getItem('mtgc_room_code'));
    console.log(`  -> Storage tras salir: sessionStorage=${sessionRoom}, localStorage=${localRoom}`);
    if (sessionRoom !== null || localRoom !== null) {
      throw new Error('El código de sala no fue limpiado de storage al salir');
    }

    // Crear Sala 2 SIN recargar la página (sin F5)
    console.log('  -> Creando Sala 2 inmediatamente sin recargar la página (sin F5)...');
    const createBtn2 = page1.getByRole('button', { name: /Crear Nueva Mesa/i }).first();
    await createBtn2.click();
    await page1.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Beta 2');
    await page1.locator('button[type="submit"]').click();

    const codeBtn2 = page1.locator('button:has-text("Código:")').first();
    await codeBtn2.waitFor({ state: 'visible', timeout: 20000 });
    const code2Text = (await codeBtn2.innerText()).match(/([A-Z0-9]{6})/)?.[1];
    console.log(`  -> Sala 2 creada exitosamente con nuevo código: ${code2Text}`);

    if (code1Text === code2Text) {
      throw new Error('La sala 2 tiene el mismo código que la sala 1');
    }

    const shot1Path = path.join(ARTIFACT_DIR, 'prod-room-exit-recreate.png');
    await page1.screenshot({ path: shot1Path, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot1Path}`);
    await context1.close();

    // ==========================================
    // PARTE 2: PRUEBA B - ENTRADA SIN MAZO PRESELECCIONADO
    // ==========================================
    console.log('\n[2/3] Verificando Entrada a sala sin mazo preseleccionado...');
    const context2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page2 = await context2.newPage();

    await page2.goto(PROD_URL);
    await page2.waitForLoadState('networkidle');

    // Crear mesa normal desde launcher
    await page2.getByRole('button', { name: /Crear Nueva Mesa/i }).first().click();
    await page2.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Mazo Vacío');
    await page2.fill('input[placeholder="Ej. Planeswalker 1"]', 'Jugador_Sin_Mazo');
    await page2.locator('button[type="submit"]').click();

    await page2.locator('button:has-text("Código:")').first().waitFor({ state: 'visible', timeout: 20000 });

    // Verificar que el jugador entra SIN mazo seleccionado
    const noDeckMsg = page2.locator('text=Sin mazo seleccionado').first();
    await noDeckMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log('  -> Confirmado: El anfitrión entró a la sala con slot de mazo VACÍO.');

    const shot2Path = path.join(ARTIFACT_DIR, 'prod-empty-deck-entry.png');
    await page2.screenshot({ path: shot2Path, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot2Path}`);
    await context2.close();

    // ==========================================
    // PARTE 3: PRUEBA C - DAÑO DE COMANDANTE RESTADOR EN PARTIDA REAL
    // ==========================================
    console.log('\n[3/3] Verificando Daño de comandante restador en producción...');
    const contextA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const contextB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Alice crea sala para 2 jugadores usando "Jugar con este Mazo"
    await pageA.goto(PROD_URL);
    await pageA.waitForLoadState('networkidle');

    const playWithDeckBtn = pageA.locator('button:has-text("Jugar con este Mazo")').first();
    await playWithDeckBtn.waitFor({ state: 'visible', timeout: 15000 });
    await playWithDeckBtn.click();

    // Configurar 2 jugadores y 40 vidas
    const seatsSelect = pageA.locator('select');
    if (await seatsSelect.isVisible()) {
      await seatsSelect.selectOption('2');
    }
    await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice_Host');
    await pageA.locator('button[type="submit"]').click();

    const codeBtnA = pageA.locator('button:has-text("Código:")').first();
    await codeBtnA.waitFor({ state: 'visible', timeout: 20000 });
    const gameCode = (await codeBtnA.innerText()).match(/([A-Z0-9]{6})/)?.[1];
    console.log(`  -> Mesa para partida real creada: ${gameCode}`);

    // Bob se une a la sala
    await pageB.goto(PROD_URL);
    await pageB.waitForLoadState('networkidle');
    await pageB.getByRole('button', { name: /Unirse con Código/i }).click();
    await pageB.locator('input[placeholder="ABCDEF"]').fill(gameCode);
    await pageB.locator('input[placeholder="Ej. Planeswalker 2"]').fill('Bob_Rival');
    await pageB.getByRole('button', { name: 'Entrar a la Sala' }).click();

    await pageB.locator('button:has-text("Código:")').first().waitFor({ state: 'visible', timeout: 20000 });

    // Bob selecciona mazo
    const selectDeckB = pageB.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i });
    await selectDeckB.waitFor({ state: 'visible', timeout: 15000 });
    await selectDeckB.click();
    await pageB.waitForTimeout(1000);

    const presetTabB = pageB.getByTestId('tab-preset-decks');
    if (await presetTabB.isVisible({ timeout: 2000 }).catch(() => false)) {
      await presetTabB.click();
    }

    const chooseDeckBtnB = pageB.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await chooseDeckBtnB.waitFor({ state: 'visible', timeout: 10000 });
    await chooseDeckBtnB.click();
    await pageB.waitForTimeout(1000);

    // Ambos listos
    const readyBtnB = pageB.getByRole('button', { name: /¡Estoy Listo!|Marcarme Listo|Listo/i }).first();
    await readyBtnB.click();

    const readyBtnA = pageA.getByRole('button', { name: /¡Estoy Listo!|Marcarme Listo|Listo/i }).first();
    await readyBtnA.click();

    // Alice inicia la partida
    await pageA.waitForTimeout(1500);
    const startBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startBtn.click();

    // Esperar a que comience la partida y resolver iniciativa + mulligan
    console.log('  -> Esperando a que termine iniciativa y se resuelva mulligan...');
    // Esperar a que la sala pase a playing
    for (let sec = 0; sec < 35; sec++) {
      const statusA = await pageA.evaluate(() => window.__mtgcRoomState?.status);
      if (statusA === 'playing') {
        console.log('  -> Estado "playing" alcanzado.');
        break;
      }
      if (statusA === 'mulligan') {
        // Enviar MULLIGAN_KEEP si estamos en mulligan
        await pageA.evaluate(() => {
          if (window.__mtgcRoomState?.status === 'mulligan') {
            window.__mtgcSendAction?.('MULLIGAN_KEEP', { bottomCardIds: [] });
          }
        }).catch(() => {});
        await pageB.evaluate(() => {
          if (window.__mtgcRoomState?.status === 'mulligan') {
            window.__mtgcSendAction?.('MULLIGAN_KEEP', { bottomCardIds: [] });
          }
        }).catch(() => {});
      }
      await pageA.waitForTimeout(1000);
    }

    // Asegurar que el estado es playing y no hay overlays
    await pageA.waitForFunction(() => window.__mtgcRoomState?.status === 'playing', { timeout: 30000 });
    await pageA.waitForTimeout(2000);

    // Abrir menú de vida en Alice
    const lifeBtnA = pageA.locator('[data-life-button]').first();
    await lifeBtnA.waitFor({ state: 'visible', timeout: 15000 });
    let lifeText = (await lifeBtnA.innerText()).trim();
    console.log(`  -> Vidas iniciales de Alice: ${lifeText}`);
    await lifeBtnA.click();

    // Localizar sección de daño de comandante
    const cmdSection = pageA.locator('[data-testid="commander-damage-section"]');
    await cmdSection.waitFor({ state: 'visible', timeout: 8000 });

    const plusBtn = pageA.locator('[data-testid^="cmd-dmg-plus-"]').first();
    const minusBtn = pageA.locator('[data-testid^="cmd-dmg-minus-"]').first();
    const dmgInput = pageA.locator('[data-testid^="cmd-dmg-input-"]').first();

    await dmgInput.waitFor({ state: 'visible', timeout: 5000 });
    let dmgVal = await dmgInput.inputValue();
    console.log(`  -> Daño inicial de comandante: ${dmgVal}`);

    // 1. Clic en '+' -> Daño sube a 1, Vida baja a 39
    console.log('  -> Pulsando "+" en daño de comandante...');
    await plusBtn.click();
    await pageA.waitForTimeout(600);
    dmgVal = await dmgInput.inputValue();
    lifeText = (await lifeBtnA.innerText()).trim();
    console.log(`  -> Tras "+": Daño acumulado = ${dmgVal}, Vidas = ${lifeText}`);
    if (dmgVal !== '1' || !lifeText.includes('39')) {
      throw new Error(`Esperado Daño 1 y Vidas 39, obtenido Daño ${dmgVal} y Vidas ${lifeText}`);
    }

    // 2. Clic en '+' 4 veces más -> Daño sube a 5, Vida baja a 35
    console.log('  -> Pulsando "+" 4 veces más (hasta 5 de daño de comandante)...');
    for (let i = 0; i < 4; i++) {
      await plusBtn.click();
      await pageA.waitForTimeout(200);
    }
    await pageA.waitForTimeout(600);
    dmgVal = await dmgInput.inputValue();
    lifeText = (await lifeBtnA.innerText()).trim();
    console.log(`  -> Tras 5 de daño: Daño acumulado = ${dmgVal}, Vidas = ${lifeText}`);
    if (dmgVal !== '5' || !lifeText.includes('35')) {
      throw new Error(`Esperado Daño 5 y Vidas 35, obtenido Daño ${dmgVal} y Vidas ${lifeText}`);
    }

    // 3. Clic en '−' -> Se revierte: Daño baja a 4, Vida sube a 36
    console.log('  -> Pulsando "−" para revertir 1 punto...');
    await minusBtn.click();
    await pageA.waitForTimeout(600);
    dmgVal = await dmgInput.inputValue();
    lifeText = (await lifeBtnA.innerText()).trim();
    console.log(`  -> Tras "−": Daño acumulado = ${dmgVal}, Vidas = ${lifeText}`);
    if (dmgVal !== '4' || !lifeText.includes('36')) {
      throw new Error(`Esperado Daño 4 y Vidas 36, obtenido Daño ${dmgVal} y Vidas ${lifeText}`);
    }

    // 4. Acumular hasta 21 para verificar alerta visual '21+ CMDR'
    console.log('  -> Pulsando "+" hasta 21 para verificar alerta visual de riesgo...');
    for (let i = 0; i < 17; i++) {
      await plusBtn.click();
      await pageA.waitForTimeout(150);
    }
    await pageA.waitForTimeout(800);
    dmgVal = await dmgInput.inputValue();
    lifeText = (await lifeBtnA.innerText()).trim();
    console.log(`  -> Tras 21 de daño: Daño acumulado = ${dmgVal}, Vidas = ${lifeText}`);

    // Verificar pastilla de riesgo '21+ CMDR'
    const alertPill = pageA.locator('[data-testid^="commander-damage-alert-pill-"]').first();
    await alertPill.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Confirmado: Pastilla de alerta visual "21+ CMDR" visible y activa.');

    const shot3Path = path.join(ARTIFACT_DIR, 'prod-commander-damage-subtractive.png');
    await pageA.screenshot({ path: shot3Path, fullPage: true });
    console.log(`  ✅ Captura guardada: ${shot3Path}`);

    await contextA.close();
    await contextB.close();

    console.log('\n========================================');
    console.log('TODAS LAS PRUEBAS EN PRODUCCIÓN PASARON SATISFACTORIAMENTE');
    console.log('========================================');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('\n❌ ERROR EN VERIFICACIÓN:', err);
  process.exit(1);
});
