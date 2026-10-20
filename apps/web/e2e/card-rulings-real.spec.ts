import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

test.describe('Punto 6: Dictámenes Oficiales y Sincronización Automática al Arrancar (D.6)', () => {
  test('Abre Ver carta en Sol Ring con dictámenes reales y prueba carta sin dictámenes con estado vacío', async ({
    browser,
  }) => {
    test.setTimeout(120000);

    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await ctx.newPage();

    // 1. Crear sala 2p
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

    await page.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Rulings Pod');
    await page.fill('input[placeholder="Ej. Planeswalker 1"]', 'Host Rulings');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Crear Mesa y Obtener Código")');

    const codeBtn = page.locator('button:has-text("Código:")').first();
    await expect(codeBtn).toBeVisible({ timeout: 15000 });
    const codeMatch = (await codeBtn.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = codeMatch ? codeMatch[1] : '';

    // Importar mazo con Sol Ring y Plains (Llanura)
    await page.click('button:has-text("Seleccionar / Importar Mazo")');
    const importTab = page.locator('button:has-text("Importar Lista de Texto")');
    if (await importTab.isVisible()) {
      await importTab.click();
    } else {
      await page.click('button:has-text("Importar mi primer mazo")');
    }
    await page.fill(
      'textarea',
      `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n99 Plains`,
    );
    await page.click('button:has-text("Validar lista")');
    await page.click('button:has-text("Usar este Mazo en la Mesa")');
    await page.click('button:has-text("Marcarme Listo")');

    // Jugador 2
    const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:3000');
    await expect(page2.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await page2.click('button:has-text("Unirse con Código")');
    await page2.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await page2.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob');
    await page2.click('button:has-text("Entrar a la Mesa")');

    await page2.click('button:has-text("Seleccionar / Importar Mazo")');
    const p2Import = page2.locator('button:has-text("Importar Lista de Texto")');
    if (await p2Import.isVisible()) {
      await p2Import.click();
    } else {
      await page2.click('button:has-text("Importar mi primer mazo")');
    }
    await page2.fill('textarea', `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n100 Mountain`);
    await page2.click('button:has-text("Validar lista")');
    await page2.click('button:has-text("Usar este Mazo en la Mesa")');
    await page2.click('button:has-text("Marcarme Listo")');

    // Iniciar partida
    const startGameBtn = page.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
    await startGameBtn.click();

    // Completar fase de mulligan (ambos jugadores se quedan su mano en orden de turno)
    const pages = [page, page2];
    await expect(page.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
      timeout: 25000,
    });
    for (let step = 0; step < 2; step++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        let acted = false;
        for (let p = 0; p < 2; p++) {
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
        await page.waitForTimeout(500);
      }
    }

    // Esperar a que la mesa esté activa
    await expect(page.locator('[data-testid="opening-hand-modal"]')).toHaveCount(0, {
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    // =========================================================================
    // 1. SOL RING: Abrir "Ver carta" y verificar al menos 2 dictámenes reales
    // =========================================================================
    console.log('--- 1. Verificando dictámenes en Sol Ring ---');
    const solRingInHand = page
      .locator('[data-from-zone="hand"][data-card-name*="Sol Ring"]')
      .first();
    if ((await solRingInHand.count()) > 0) {
      await solRingInHand.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
      await page.click('[data-testid="context-view-card"]');
    } else {
      // Buscar en biblioteca
      const libBtn = page.locator('[data-library-inspect-btn="true"]').first();
      await libBtn.click();
      const search = page.locator('[data-testid="library-search-input"]');
      await expect(search).toBeVisible();
      await search.fill('Sol Ring');
      await page.waitForTimeout(300);

      const solItem = page.locator('[data-modal-card-item][data-card-name*="Sol Ring"]').first();
      await expect(solItem).toBeVisible();
      await solItem.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
      await page.click('[data-testid="context-view-card"]');
    }

    const modal = page.locator('[data-testid="card-details-modal"]');
    await expect(modal).toBeVisible();

    const rulingItems = page.locator('[data-testid="card-ruling-item"]');
    await expect(rulingItems).toHaveCount(2);

    const firstRuling = rulingItems.first();
    await expect(firstRuling.locator('[data-testid="ruling-date"]')).toContainText('2023-09-01');
    await expect(firstRuling.locator('[data-testid="ruling-source"]')).toContainText(/wotc/i);
    await expect(firstRuling.locator('[data-testid="ruling-comment"]')).toContainText(
      'Mana abilities do not use the stack',
    );

    const secondRuling = rulingItems.nth(1);
    await expect(secondRuling.locator('[data-testid="ruling-date"]')).toContainText('2021-02-05');
    await expect(secondRuling.locator('[data-testid="ruling-source"]')).toContainText(/wotc/i);
    await expect(secondRuling.locator('[data-testid="ruling-comment"]')).toContainText(
      'Sol Ring is legal in Commander',
    );

    // Captura de pantalla de Sol Ring con dictámenes reales
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'audit-card-rulings-real.png'),
    });

    // Cerrar modal
    await page.locator('[data-testid="close-card-details-modal"]').click();
    await expect(modal).toHaveCount(0);

    // Cerrar modal de biblioteca si quedó abierto
    const closeLibBtn1 = page.locator('[data-testid="close-pile-modal-btn"]');
    if (await closeLibBtn1.isVisible().catch(() => false)) {
      await closeLibBtn1.click();
    }

    // =========================================================================
    // 2. CARTA SIN DICTÁMENES: Llanura / Plains muestra estado vacío sin romper
    // =========================================================================
    console.log('--- 2. Verificando carta sin dictámenes (Plains/Llanura) ---');
    const plainsInHand = page
      .locator(
        '[data-from-zone="hand"][data-card-name*="Plains"], [data-from-zone="hand"][data-card-name*="Llanura"]',
      )
      .first();
    if ((await plainsInHand.count()) > 0) {
      await plainsInHand.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
      await page.click('[data-testid="context-view-card"]');
    } else {
      const libBtn = page.locator('[data-library-inspect-btn="true"]').first();
      await libBtn.click();
      const search = page.locator('[data-testid="library-search-input"]');
      await expect(search).toBeVisible();
      await search.fill('Plains');
      await page.waitForTimeout(300);

      const item = page.locator('[data-modal-card-item]').first();
      await expect(item).toBeVisible();
      await item.dispatchEvent('contextmenu', { clientX: 400, clientY: 500 });
      await page.click('[data-testid="context-view-card"]');
    }

    await expect(modal).toBeVisible();
    const emptyRulings = page.locator('[data-testid="card-details-rulings-empty"]');
    await expect(emptyRulings).toBeVisible();
    await expect(emptyRulings).toContainText('Sin dictámenes');

    // Cerrar modal
    await page.locator('[data-testid="close-card-details-modal"]').click();
    await expect(modal).toHaveCount(0);

    await ctx.close();
    await ctx2.close();
  });
});
