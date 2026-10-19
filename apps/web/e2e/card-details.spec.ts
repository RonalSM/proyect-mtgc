import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

async function setupTestPod(
  browser: any,
  podSize: number = 2,
  width = 1920,
  height = 1080,
  roomPrefix = 'CardDetails'
) {
  const contexts: any[] = [];
  const pages: any[] = [];

  for (let i = 0; i < podSize; i++) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    contexts.push(ctx);
    pages.push(page);
  }

  const hostPage = pages[0];

  // 1. Host crea la sala
  await hostPage.goto('http://localhost:3000');
  const hostOnlineBadge = hostPage.locator('text=Servidor en línea');
  await expect(hostOnlineBadge).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `${roomPrefix} ${podSize}p`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', String(podSize));
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

  // Host mazo: contiene Comandante, Sol Ring (con dictámenes), Delver (DFC), Cultivate (sin dictámenes)
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await hostImportTab.isVisible()) {
    await hostImportTab.click();
  } else {
    await hostPage.click('button:has-text("Importar mi primer mazo")');
  }
  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Delver of Secrets // Insectile Aberration\n1 Cultivate\n97 Plains`
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Jugador 2 (Bob)
  const bobPage = pages[1];
  await bobPage.goto('http://localhost:3000');
  const onlineBadge = bobPage.locator('text=Servidor en línea');
  await expect(onlineBadge).toBeVisible({ timeout: 15000 });
  await bobPage.click('button:has-text("Unirse con Código")');
  await bobPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await bobPage.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (Rival)');
  await bobPage.click('button:has-text("Entrar a la Mesa")');

  await bobPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const pImportTab = bobPage.locator('button:has-text("Importar Lista de Texto")');
  if (await pImportTab.isVisible()) {
    await pImportTab.click();
  } else {
    await bobPage.click('button:has-text("Importar mi primer mazo")');
  }
  await bobPage.fill(
    'textarea',
    `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n100 Mountain`
  );
  await bobPage.click('button:has-text("Validar lista")');
  await bobPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await bobPage.click('button:has-text("Marcarme Listo")');

  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // Completar fase de mulligan (ambos jugadores se quedan su mano)
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });
  for (let step = 0; step < podSize; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let acted = false;
      for (let p = 0; p < podSize; p++) {
        const keepBtn = pages[p].locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            acted = true;
            await pages[p].waitForTimeout(500);
            break;
          }
        }
      }
      if (acted) break;
      await hostPage.waitForTimeout(500);
    }
  }

  // Esperar a que la mesa esté activa
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toHaveCount(0, { timeout: 15000 });
  await hostPage.waitForTimeout(1000);

  return { contexts, pages, hostPage, bobPage, roomCode };
}

test.describe('Punto 8: Suite E2E Ver Carta, Dictámenes, DFC, Privacidad y Atribución Playmat', () => {
  test.beforeAll(async () => {
    // Sembrar dictámenes oficiales para Sol Ring en el servidor local
    try {
      await fetch('http://localhost:3001/api/cards/seed-test-rulings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oracleId: '6ad8011d-3471-4369-9d68-b264cc027487',
          rulings: [
            {
              publishedAt: '2023-09-01',
              source: 'wotc',
              comment: '{T}: Add {C}{C}. Mana abilities do not use the stack and cannot be responded to.',
            },
            {
              publishedAt: '2021-02-05',
              source: 'wotc',
              comment: 'Sol Ring is legal in Commander, Vintage, and Oathbreaker.',
            },
          ],
        }),
      });
    } catch {
      // Ignorar si el endpoint ya está activo
    }
  });

  test('Certificar Ver Carta con dictámenes, DFC, carta sin dictámenes, privacidad y playmat', async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const { contexts, pages, hostPage, bobPage } = await setupTestPod(browser, 2, 1920, 1080, 'CardDet');

    try {
      // =========================================================================
      // 1. CARTA CON DICTÁMENES: Sol Ring muestra todos sus campos, artista, copyright y dictámenes
      // =========================================================================
      console.log('--- [Punto 8] 1. Verificando carta con dictámenes (Sol Ring) ---');

      // Si Sol Ring está en la mano, abrir menú contextual; si no, buscarlo en la biblioteca
      const solRingHand = hostPage.locator('[data-from-zone="hand"][data-card-name="Sol Ring"]').first();
      if ((await solRingHand.count()) > 0) {
        await solRingHand.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
        const viewCardBtn = hostPage.locator('[data-testid="context-view-card"]');
        await expect(viewCardBtn).toBeVisible();
        await viewCardBtn.click();
      } else {
        const libInspectBtn = hostPage.locator('[data-library-inspect-btn="true"]').first();
        await libInspectBtn.click();
        const searchInput = hostPage.locator('[data-testid="library-search-input"]');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('Sol Ring');
        await hostPage.waitForTimeout(300);

        const solRingItem = hostPage.locator('[data-modal-card-item][data-card-name*="Sol Ring"]').first();
        await expect(solRingItem).toBeVisible();
        await solRingItem.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });

        const viewCardBtn = hostPage.locator('[data-testid="context-view-card"]');
        await expect(viewCardBtn).toBeVisible();
        await viewCardBtn.click();
      }

      // Verificar modal "Ver carta"
      const modal = hostPage.locator('[data-testid="card-details-modal"]');
      await expect(modal).toBeVisible();

      // 1.1 Nombre y coste de maná
      const cardName = hostPage.locator('[data-testid="card-details-name"]');
      await expect(cardName).toContainText('Sol Ring');
      const manaContainer = hostPage.locator('[data-testid="card-details-mana"]');
      await expect(manaContainer).toBeVisible();
      await expect(manaContainer).toContainText('1');

      // 1.2 Tipo de carta
      const cardType = hostPage.locator('[data-testid="card-details-type"]');
      await expect(cardType).toContainText('Artifact');

      // 1.3 Texto Oracle con símbolos
      const cardOracle = hostPage.locator('[data-testid="card-details-oracle"]');
      await expect(cardOracle).toContainText('Add CC.');

      // 1.4 Artista y copyright oficial
      const artist = hostPage.locator('[data-testid="card-details-artist"]');
      await expect(artist).toContainText('Titus Lunter');
      const copyright = hostPage.locator('[data-testid="card-details-copyright"]');
      await expect(copyright).toContainText('Wizards of the Coast');

      // 1.5 Legalidad en Commander
      const legality = hostPage.locator('[data-testid="card-details-legality"]');
      await expect(legality).toContainText('Legal');

      // 1.6 Dictámenes oficiales (Rulings)
      const rulingItems = hostPage.locator('[data-testid="card-ruling-item"]');
      await expect(rulingItems).toHaveCount(2);
      await expect(rulingItems.first()).toContainText('2023-09-01');
      await expect(rulingItems.first()).toContainText('wotc');
      await expect(rulingItems.first()).toContainText('Mana abilities do not use the stack');

      // Captura ampliada del panel para carta de una cara
      await hostPage.waitForTimeout(300);
      await modal.screenshot({
        path: path.join(SCREENSHOT_DIR, 'card-details-single-faced.png'),
      });
      console.log('📸 Captura guardada: card-details-single-faced.png');

      // Cerrar modal
      await hostPage.locator('[data-testid="close-card-details-modal"]').click();
      await expect(modal).toHaveCount(0);

      // Cerrar modal de biblioteca si quedó abierto
      const closeLibBtn1 = hostPage.locator('[data-testid="close-pile-modal-btn"]');
      if (await closeLibBtn1.isVisible().catch(() => false)) {
        await closeLibBtn1.click();
      }

      // =========================================================================
      // 2. CARTA DE DOBLE CARA (DFC): Delver of Secrets cambia de cara y actualiza datos
      // =========================================================================
      console.log('--- [Punto 8] 2. Verificando carta de doble cara (Delver of Secrets) ---');

      // Localizar Delver of Secrets (en mano o en biblioteca)
      const delverHand = hostPage.locator('[data-from-zone="hand"][data-card-name*="Delver"]').first();
      if ((await delverHand.count()) > 0) {
        await delverHand.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
        const viewDelverBtn = hostPage.locator('[data-testid="context-view-card"]');
        await expect(viewDelverBtn).toBeVisible();
        await viewDelverBtn.click();
      } else {
        const libInspectBtn = hostPage.locator('[data-library-inspect-btn="true"]').first();
        await libInspectBtn.click();
        const searchInput = hostPage.locator('[data-testid="library-search-input"]');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('Delver');
        await hostPage.waitForTimeout(300);

        const delverItem = hostPage.locator('[data-modal-card-item][data-card-name*="Delver"]').first();
        await expect(delverItem).toBeVisible();
        await delverItem.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });

        const viewDelverBtn = hostPage.locator('[data-testid="context-view-card"]');
        await expect(viewDelverBtn).toBeVisible();
        await viewDelverBtn.click();
      }

      await expect(modal).toBeVisible();

      // Cara 1: Delver of Secrets (1/1 Human Wizard)
      await expect(cardName).toContainText('Delver of Secrets');
      await expect(cardType).toContainText('Creature — Human Wizard');
      const ptBox = hostPage.locator('[data-testid="card-details-pt"]');
      await expect(ptBox).toContainText('1/1');

      // Selector de cara visible
      const faceSwitcher = hostPage.locator('[data-testid="card-details-face-switcher"]');
      await expect(faceSwitcher).toBeVisible();
      await expect(faceSwitcher).toContainText('Cara Posterior ↷');

      // Cambiar a Cara 2
      await faceSwitcher.click();
      await hostPage.waitForTimeout(200);

      // Cara 2: Insectile Aberration (3/2 Human Insect con Flying)
      await expect(cardName).toContainText('Insectile Aberration');
      await expect(cardType).toContainText('Creature — Human Insect');
      await expect(ptBox).toContainText('3/2');
      await expect(cardOracle).toContainText('Flying');
      await expect(faceSwitcher).toContainText('Cara Frontal ↶');

      // Captura ampliada del panel para carta de doble cara
      await hostPage.waitForTimeout(300);
      await modal.screenshot({
        path: path.join(SCREENSHOT_DIR, 'card-details-double-faced.png'),
      });
      console.log('📸 Captura guardada: card-details-double-faced.png');

      // Volver a la Cara 1
      await faceSwitcher.click();
      await hostPage.waitForTimeout(200);
      await expect(cardName).toContainText('Delver of Secrets');
      await expect(ptBox).toContainText('1/1');

      // =========================================================================
      // 3. CARTA SIN DICTÁMENES: Muestra "Sin dictámenes"
      // =========================================================================
      console.log('--- [Punto 8] 3. Verificando carta sin dictámenes (Delver / Cultivate) ---');
      const emptyRulings = hostPage.locator('[data-testid="card-details-rulings-empty"]');
      await expect(emptyRulings).toBeVisible();
      await expect(emptyRulings).toContainText('Sin dictámenes');

      // Cerrar modal
      await hostPage.locator('[data-testid="close-card-details-modal"]').click();
      await expect(modal).toHaveCount(0);

      // Cerrar modal de biblioteca si quedó abierto
      const closeLibBtn2 = hostPage.locator('[data-testid="close-pile-modal-btn"]');
      if (await closeLibBtn2.isVisible().catch(() => false)) {
        await closeLibBtn2.click();
      }

      // =========================================================================
      // 4. PRIVACIDAD: Carta boca abajo ajena o mano ajena no ofrece "Ver carta"
      // =========================================================================
      console.log('--- [Punto 8] 4. Verificando privacidad contra cartas boca abajo / ajenas ---');

      // Enviar una carta de la mano de Alice al campo de batalla
      const cardOnField = hostPage.locator('[data-battlefield-card="true"]').first();
      if ((await cardOnField.count()) === 0) {
        const handCard = hostPage.locator('[data-dock-zone="hand"] [data-hand-card="true"]').first();
        await handCard.dispatchEvent('contextmenu', { clientX: 500, clientY: 500 });
        await hostPage.locator('[data-testid="context-to-battlefield"]').click();
        await hostPage.waitForTimeout(500);
      }

      const anyFieldCard = hostPage.locator('[data-battlefield-card="true"]').first();
      await expect(anyFieldCard).toBeVisible();

      // Alice pone la carta boca abajo
      await anyFieldCard.dispatchEvent('contextmenu', { clientX: 500, clientY: 500 });
      const flipBtn = hostPage.locator('[data-testid="context-flip-btn"]');
      await expect(flipBtn).toBeVisible();
      await flipBtn.click();
      await hostPage.waitForTimeout(400);

      // Bob (Rival) intenta hacer clic derecho en la carta boca abajo
      const bobTargetCard = bobPage.locator('[data-battlefield-card="true"]').first();
      await expect(bobTargetCard).toBeVisible();
      await bobTargetCard.dispatchEvent('contextmenu', { clientX: 500, clientY: 500 });

      // Verificar que el menú muestra "Carta boca abajo" y NO ofrece "Ver carta"
      const bobMenu = bobPage.locator('[data-card-context-menu="true"]');
      await expect(bobMenu).toBeVisible();
      await expect(bobMenu).toContainText('Carta boca abajo');
      const bobViewBtn = bobPage.locator('[data-testid="context-view-card"]');
      await expect(bobViewBtn).toHaveCount(0);

      // Cerrar menú de Bob pulsando Escape
      await bobPage.keyboard.press('Escape');
      await expect(bobMenu).toHaveCount(0);

      // Alice devuelve la carta a boca arriba
      await anyFieldCard.dispatchEvent('contextmenu', { clientX: 500, clientY: 500 });
      const flipBack = hostPage.locator('[data-testid="context-flip-btn"]');
      if (await flipBack.isVisible()) {
        await flipBack.click();
        await hostPage.waitForTimeout(300);
      }

      // =========================================================================
      // 5. SINCRONIZACIÓN DE DICTÁMENES: Se salta la descarga si la fecha no cambió
      // =========================================================================
      console.log('--- [Punto 8] 5. Verificando comprobación de fecha en syncRulings ---');
      const syncCheckRes = await hostPage.evaluate(async () => {
        const res = await fetch('/api/cards/sync-rulings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': 'mtgc_admin_secret_key',
          },
          body: JSON.stringify({ limit: 5 }),
        });
        return res.json();
      });

      console.log('[Punto 8] Resultado syncRulings check:', syncCheckRes);
      expect(syncCheckRes.skipped).toBe(true);
      expect(syncCheckRes.reason).toBe('not_modified');
      expect(syncCheckRes.syncedCount).toBe(0);

      // =========================================================================
      // 6. ATRIBUCIÓN EN SELECTOR DE PLAYMAT: Muestra artista, copyright y enlace a Ver Carta
      // =========================================================================
      console.log('--- [Punto 8] 6. Verificando selector de playmat con atribución ---');
      const playmatBtn = hostPage.locator('[data-testid="playmat-custom-btn"]').first();
      await expect(playmatBtn).toBeVisible();
      await playmatBtn.dispatchEvent('click');

      const playmatModal = hostPage.locator('[data-testid="playmat-modal-overlay"]');
      await expect(playmatModal).toBeVisible();

      // Bloque de atribución visible
      const attributionBox = hostPage.locator('[data-testid="playmat-attribution-box"]');
      await expect(attributionBox).toBeVisible();

      // Artista y copyright
      const playmatArtist = hostPage.locator('[data-testid="playmat-artist"]');
      await expect(playmatArtist).toBeVisible();
      await expect(playmatArtist).toContainText('Ilustrado por');

      const playmatCopyright = hostPage.locator('[data-testid="playmat-copyright"]');
      await expect(playmatCopyright).toBeVisible();
      await expect(playmatCopyright).toContainText('Wizards of the Coast');

      // Botón "Ver carta" abre el panel
      const playmatViewCardBtn = hostPage.locator('[data-testid="playmat-view-card-btn"]');
      await expect(playmatViewCardBtn).toBeVisible();
      await playmatViewCardBtn.dispatchEvent('click');

      // Comprobar que el modal de Ver carta se abre sobre el selector
      await expect(modal).toBeVisible();
      await expect(cardName).toBeVisible();

      // Cerrar modal de detalles y modal de playmat
      await hostPage.locator('[data-testid="close-card-details-modal"]').click();
      await expect(modal).toHaveCount(0);

      await hostPage.locator('[data-testid="close-playmat-modal-btn"]').dispatchEvent('click');
      await expect(playmatModal).toHaveCount(0);

      console.log('✅ [Punto 8] Suite E2E de Ver Carta y Atribución Playmat completada con éxito al 100%');
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
