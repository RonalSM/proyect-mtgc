import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

async function setupTokenTestPod(browser: any) {
  const contexts: any[] = [];
  const pages: any[] = [];

  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    contexts.push(ctx);
    pages.push(page);
  }

  const hostPage = pages[0];
  await hostPage.goto('http://localhost:3000');
  const hostOnlineBadge = hostPage.locator('text=Servidor en línea');
  await expect(hostOnlineBadge).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'TokenPod 2p');
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Tokens)');
  await hostPage.selectOption('select', '2');
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';

  // Host mazo con Smothering Tithe, Grave Titan, Regal Caracal, Sol Ring
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await hostImportTab.isVisible()) {
    await hostImportTab.click();
  } else {
    await hostPage.click('button:has-text("Importar mi primer mazo")');
  }

  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Kenrith, the Returned King *CMDR*\n\n// Mazo\n1 Smothering Tithe\n1 Grave Titan\n1 Regal Caracal\n1 Sol Ring\n10 Plains\n10 Island\n10 Swamp\n10 Mountain\n10 Forest`,
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Jugador 2 (Bob)
  const pPage = pages[1];
  await pPage.goto('http://localhost:3000');
  const onlineBadge = pPage.locator('text=Servidor en línea');
  await expect(onlineBadge).toBeVisible({ timeout: 15000 });
  await pPage.click('button:has-text("Unirse con Código")');
  await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (P2)');
  await pPage.click('button:has-text("Entrar a la Mesa")');

  await pPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const pImportTab = pPage.locator('button:has-text("Importar Lista de Texto")');
  if (await pImportTab.isVisible()) {
    await pImportTab.click();
  } else {
    await pPage.click('button:has-text("Importar mi primer mazo")');
  }
  await pPage.fill(
    'textarea',
    `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n10 Mountain\n10 Swamp\n10 Plains`,
  );
  await pPage.click('button:has-text("Validar lista")');
  await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await pPage.click('button:has-text("Marcarme Listo")');

  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // Complete mulligan
  await expect(pages[0].locator('[data-testid="opening-hand-modal"]')).toBeVisible({
    timeout: 25000,
  });
  for (let step = 0; step < 2; step++) {
    for (let pIdx = 0; pIdx < 2; pIdx++) {
      const keepBtn = pages[pIdx].locator('[data-testid="keep-btn"]');
      if (await keepBtn.isVisible().catch(() => false)) {
        if (await keepBtn.isEnabled().catch(() => false)) {
          await keepBtn.click().catch(() => {});
          await pages[pIdx].waitForTimeout(600);
        }
      }
    }
  }

  for (const page of pages) {
    await expect(page.locator('[data-testid="opening-hand-modal"]')).not.toBeVisible({
      timeout: 15000,
    });
  }
  await expect(pages[0].locator('#mesa-total')).toBeVisible({ timeout: 10000 });

  return { contexts, pages, hostPage };
}

test.describe('Punto 4: Fichas asociadas a cartas, comunes y personalizadas', () => {
  test('Crear fichas desde menú de espacio vacío y verificar desaparición al salir', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const { contexts, pages, hostPage } = await setupTokenTestPod(browser);

    try {
      const page = hostPage;

      // 1. Clic derecho sobre espacio vacío de la propia división
      const playerCell = page.locator('[data-player-cell]').first();
      await expect(playerCell).toBeVisible();

      // Clic derecho en el área superior izquierda de la celda de Alice
      await playerCell.click({ button: 'right', position: { x: 300, y: 150 }, force: true });
      await page.waitForTimeout(500);

      const tokenModal = page.locator('[data-testid="create-token-modal"]');
      await expect(tokenModal).toBeVisible({ timeout: 5000 });

      // Verificar pestañas (a) Fichas de mi mazo, (b) Fichas comunes, (c) Ficha personalizada
      await expect(page.locator('[data-testid="tab-deck-tokens"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-common-tokens"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-custom-token"]')).toBeVisible();

      // Probar pestaña Fichas comunes
      await page.locator('[data-testid="tab-common-tokens"]').click();
      await page.waitForTimeout(300);

      // 5 fichas comunes visibles
      await expect(page.locator('[data-testid="common-token-item-treasure"]')).toBeVisible();
      await expect(page.locator('[data-testid="common-token-item-food"]')).toBeVisible();
      await expect(page.locator('[data-testid="common-token-item-clue"]')).toBeVisible();
      await expect(page.locator('[data-testid="common-token-item-blood"]')).toBeVisible();
      await expect(page.locator('[data-testid="common-token-item-map"]')).toBeVisible();

      // Crear Tesoro desde Fichas comunes
      await page.locator('[data-testid="create-common-token-treasure"]').click();
      await page.waitForTimeout(600);

      // Modal cerrado y ficha Tesoro en mesa
      await expect(tokenModal).not.toBeVisible();
      const treasureToken = page
        .locator('[data-battlefield-card][data-card-name="Treasure"]')
        .first();
      await expect(treasureToken).toBeVisible({ timeout: 5000 });

      // 2. Probar pestaña Ficha personalizada
      await playerCell.click({ button: 'right', position: { x: 350, y: 150 }, force: true });
      await expect(tokenModal).toBeVisible({ timeout: 5000 });

      await page.locator('[data-testid="tab-custom-token"]').click();
      await page.waitForTimeout(300);

      await page.fill('[data-testid="custom-token-name-input"]', 'Dragón');
      await page.fill('[data-testid="custom-token-power-input"]', '5');
      await page.fill('[data-testid="custom-token-toughness-input"]', '5');
      await page.click('[data-testid="create-custom-token-btn"]');
      await page.waitForTimeout(600);

      await expect(tokenModal).not.toBeVisible();
      const dragonToken = page.locator('[data-battlefield-card][data-card-name="Dragón"]').first();
      await expect(dragonToken).toBeVisible({ timeout: 5000 });

      // Captura de las fichas en la mesa
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-tokens-created-on-table.png'),
      });

      // 3. Verificar que al salir de la mesa la ficha Dragón desaparece
      await dragonToken.click({ button: 'right', force: true });
      const toGraveyardBtn = page.locator('[data-testid="context-to-graveyard"]');
      await expect(toGraveyardBtn).toBeVisible({ timeout: 5000 });
      await toGraveyardBtn.click();
      await page.waitForTimeout(600);

      // Comprobar que Dragón ya no está en la mesa
      await expect(page.locator('[data-battlefield-card][data-card-name="Dragón"]')).toHaveCount(0);

      // Abrir cementerio y verificar que NO está en el cementerio (desapareció)
      const graveyardSlot = page.locator('[data-pile-zone="graveyard"]').first();
      await graveyardSlot.click();
      await page.waitForTimeout(500);

      const graveyardItems = page.locator('[data-modal-card-item][data-card-name="Dragón"]');
      await expect(graveyardItems).toHaveCount(0);

      // Cerrar modal de cementerio
      const closeBtn = page.locator('[data-testid="close-pile-modal-btn"]');
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);

      // 4. Bitácora registra la creación y la desaparición
      const chatToggle = page.locator('button:has-text("Chat/Log")').first();
      if (await chatToggle.isVisible()) {
        await chatToggle.click();
      }
      await expect(page.locator('text=creó una ficha "Treasure"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=creó una ficha "Dragón"')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=desapareció al salir de la mesa')).toBeVisible({
        timeout: 5000,
      });

      // 5. Probar clic derecho sobre cartas en mano: Smothering Tithe (crea ficha) vs Sol Ring (no crea)
      const titheCard = page.locator('[data-from-zone="hand"][data-card-name="Smothering Tithe"]');
      if (await titheCard.isVisible().catch(() => false)) {
        await titheCard.click({ button: 'right', force: true });
        await page.waitForTimeout(400);
        await expect(page.locator('[data-testid="context-create-token-section"]')).toBeVisible({
          timeout: 5000,
        });
        await expect(page.locator('[data-testid="create-token-treasure"]')).toBeVisible();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      const solRingCard = page.locator('[data-from-zone="hand"][data-card-name="Sol Ring"]');
      if (await solRingCard.isVisible().catch(() => false)) {
        await solRingCard.click({ button: 'right', force: true });
        await page.waitForTimeout(400);
        await expect(
          page.locator('[data-testid="context-create-token-section"]'),
        ).not.toBeVisible();
        await page.keyboard.press('Escape');
      }

      // Captura final con la bitácora
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-tokens-disappearance-log.png'),
      });
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
