import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';
const PROD_URL = 'https://proyect-mtgc.netlify.app';

async function verifyProdFlow() {
  console.log('🚀 [PROD VERIFICATION] Iniciando prueba de principio a fin en PRODUCCIÓN...');
  console.log(`URL de Producción: ${PROD_URL}`);

  const browser = await chromium.launch({ headless: true });

  // 1. Contexto para Jugador 1 (Anfitrión)
  const ctxHost = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MTGC-Tester/1.0',
  });
  const pageHost = await ctxHost.newPage();

  pageHost.on('console', msg => console.log(`[Host Console] ${msg.type()}: ${msg.text()}`));
  pageHost.on('pageerror', err => console.error(`[Host PageError] ${err.message}`));

  console.log('\n--- PASO 1.5(a): Crear mesa desde la interfaz de Netlify con 4 jugadores ---');
  await pageHost.goto(PROD_URL, { waitUntil: 'networkidle' });

  // Abrir modal de crear mesa
  const createTableBtn = pageHost.locator('button:has-text("Crear Mesa"), button:has-text("Crear Nueva Mesa")').first();
  await createTableBtn.click();
  await pageHost.waitForSelector('text=Crear Mesa de Commander');

  // Llenar formulario
  const roomNameInput = pageHost.locator('input[placeholder*="Pod de Viernes"], input[placeholder*="Ej."]').first();
  await roomNameInput.fill('Pod Produccion EDH');

  const hostNameInput = pageHost.locator('input[placeholder*="Planeswalker 1"], input[placeholder*="Jugador"]').first();
  await hostNameInput.fill('Neroz2');

  // Seleccionar 4 jugadores
  const selectSeats = pageHost.locator('select');
  await selectSeats.selectOption('4');

  // Clic en "Crear y Abrir Sala"
  const submitCreate = pageHost.locator('button:has-text("Crear y Abrir Sala")');
  await submitCreate.click();

  // Esperar a que entre a la Sala de Espera
  await pageHost.waitForSelector('text=Sala de Espera', { timeout: 15000 });
  console.log('✅ Anfitrión ingresó a la Sala de Espera con éxito!');

  // Extraer el código de la sala
  const codeElement = pageHost.locator('button:has-text("Código:")');
  const codeText = await codeElement.textContent();
  const roomCode = codeText?.replace(/[^A-Z0-9]/gi, '').replace('Cdigo', '').trim() || '';
  console.log(`🔑 Código de sala obtenido en producción: "${roomCode}"`);

  // Captura Paso 1.5(a)
  const step1Path = path.join(ARTIFACTS_DIR, 'prod-step1-lobby-created.png');
  await pageHost.screenshot({ path: step1Path, fullPage: true });
  console.log(`📸 Captura 1.5(a) guardada en: ${step1Path}`);

  // Anfitrión selecciona mazo
  console.log('🃏 Anfitrión seleccionando mazo listo...');
  const deckBtnHost = pageHost.locator('button:has-text("Seleccionar / Importar Mazo"), button:has-text("Cambiar Mazo")');
  await deckBtnHost.click();
  await pageHost.waitForSelector('[data-testid^="select-preset-deck-"]', { timeout: 15000 });
  await pageHost.locator('[data-testid^="select-preset-deck-"]').first().click();
  await pageHost.waitForTimeout(1500);

  // Anfitrión marca "Listo"
  const readyBtnHost = pageHost.locator('button:has-text("Marcarme Listo")');
  await readyBtnHost.waitFor({ state: 'visible', timeout: 5000 });
  await pageHost.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Marcarme Listo'));
    return btn && !btn.disabled;
  }, undefined, { timeout: 10000 });
  await readyBtnHost.click();
  await pageHost.waitForSelector('button:has-text("Cancelar \\"Listo\\"")', { timeout: 10000 });
  console.log('✅ Anfitrión marcado como Listo!');

  console.log('\n--- PASO 1.5(b): Unirse a la mesa con segundo navegador usando el código ---');
  const ctxPlayer2 = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MTGC-Tester/2.0',
  });
  const pagePlayer2 = await ctxPlayer2.newPage();
  pagePlayer2.on('console', msg => console.log(`[P2 Console] ${msg.type()}: ${msg.text()}`));

  await pagePlayer2.goto(`${PROD_URL}/?join=${roomCode}`, { waitUntil: 'networkidle' });

  // Si modal de unirse no está abierto, abrirlo
  const joinModalTitle = pagePlayer2.locator('text=Unirse a una Mesa');
  if (!(await joinModalTitle.isVisible())) {
    const joinBtn = pagePlayer2.locator('button:has-text("Unirse con Código"), button:has-text("Unirse a Mesa")').first();
    await joinBtn.click();
    await pagePlayer2.waitForSelector('text=Unirse a una Mesa');
  }

  // Llenar código y nombre de jugador 2
  const joinCodeInput = pagePlayer2.locator('input[placeholder="ABCDEF"]');
  await joinCodeInput.fill(roomCode);

  const p2NameInput = pagePlayer2.locator('input[placeholder*="Planeswalker 2"]');
  await p2NameInput.fill('Jugador2');

  const submitJoin = pagePlayer2.locator('button[type="submit"]:has-text("Entrar a la Sala"), button:has-text("Entrar")');
  await submitJoin.click();

  // Esperar a que Jugador 2 entre a la Sala de Espera
  await pagePlayer2.waitForSelector('text=Sala de Espera', { timeout: 15000 });
  console.log('✅ Jugador 2 ingresó a la Sala de Espera con éxito!');

  // Esperar a que el anfitrión vea a Jugador 2 en su pantalla
  await pageHost.waitForSelector('text=Jugador2', { timeout: 10000 });

  // Captura Paso 1.5(b)
  const step2Path = path.join(ARTIFACTS_DIR, 'prod-step2-second-player-joined.png');
  await pageHost.screenshot({ path: step2Path, fullPage: true });
  console.log(`📸 Captura 1.5(b) guardada en: ${step2Path}`);

  // Jugador 2 selecciona mazo y marca "Listo"
  console.log('🃏 Jugador 2 seleccionando mazo...');
  const deckBtnP2 = pagePlayer2.locator('button:has-text("Seleccionar / Importar Mazo"), button:has-text("Cambiar Mazo")');
  await deckBtnP2.click();
  await pagePlayer2.waitForSelector('[data-testid^="select-preset-deck-"]', { timeout: 15000 });
  const presetDecks = pagePlayer2.locator('[data-testid^="select-preset-deck-"]');
  const count = await presetDecks.count();
  if (count > 1) {
    await presetDecks.nth(1).click();
  } else {
    await presetDecks.first().click();
  }
  await pagePlayer2.waitForTimeout(1500);

  const readyBtnP2 = pagePlayer2.locator('button:has-text("Marcarme Listo")');
  await readyBtnP2.waitFor({ state: 'visible', timeout: 5000 });
  await pagePlayer2.waitForFunction(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Marcarme Listo'));
    return btn && !btn.disabled;
  }, undefined, { timeout: 10000 });
  await readyBtnP2.click();
  await pagePlayer2.waitForSelector('button:has-text("Cancelar \\"Listo\\"")', { timeout: 10000 });
  console.log('✅ Jugador 2 marcado como Listo!');

  console.log('\n--- PASO 1.5(c): Iniciar partida con al menos 2 jugadores ---');
  await pageHost.waitForTimeout(2000);
  const hostHtml = await pageHost.evaluate(() => {
    return {
      buttons: Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, disabled: b.disabled })),
      bodySnippet: document.body.innerText.substring(0, 800)
    };
  });
  console.log('Host View State:', JSON.stringify(hostHtml, null, 2));

  // Anfitrión verifica que botón "Iniciar Partida" esté habilitado
  const startGameBtn = pageHost.locator('button:has-text("Iniciar Partida"), button:has-text("INICIAR PARTIDA")');
  await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
  await pageHost.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.toLowerCase().includes('iniciar partida'));
    return btn && !btn.disabled;
  }, undefined, { timeout: 20000 });

  console.log('🚀 Anfitrión iniciando partida...');
  await startGameBtn.click();

  // Esperar a que ambos clientes salgan de la sala de espera y pasen por iniciativa / mesa
  console.log('⏳ Esperando transición de inicio y renderizado de la mesa de juego...');
  await pageHost.waitForFunction(() => {
    return !document.body.innerText.includes('SALA DE ESPERA');
  }, undefined, { timeout: 25000 });

  await pageHost.waitForTimeout(6000);

  // Captura Paso 1.5(c)
  const step3Path = path.join(ARTIFACTS_DIR, 'prod-step3-game-started-playing.png');
  await pageHost.screenshot({ path: step3Path, fullPage: true });
  console.log(`📸 Captura 1.5(c) guardada en: ${step3Path}`);

  console.log('\n======================================================');
  console.log('🎉 FLUJO DE PRODUCCIÓN COMPLETADO Y VERIFICADO AL 100%');
  console.log('======================================================');

  await browser.close();
}

verifyProdFlow().catch(err => {
  console.error('❌ Error en verificación de producción:', err);
  process.exit(1);
});
