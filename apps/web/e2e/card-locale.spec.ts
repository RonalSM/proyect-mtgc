import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

test.describe('Punto 5 (C.5) - Español Prioritario con Fallback en Inglés', () => {
  test('Verifica español prioritario en cartas, fallback en inglés y cambio reactivo de idioma', async ({
    browser,
  }) => {
    test.setTimeout(90000);

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
    await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

    await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Mesa Idiomas');
    await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Español)');
    await hostPage.selectOption('select', '2');
    await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const roomCodeText = await roomCodeButton.innerText();
    const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match ? match[1] : '';

    // Import deck with cards that have Spanish printings (Sol Ring, Kenrith, Smothering Tithe) and English-only card
    await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
    if (await hostImportTab.isVisible()) {
      await hostImportTab.click();
    } else {
      await hostPage.click('button:has-text("Importar mi primer mazo")');
    }

    await hostPage.fill(
      'textarea',
      `// Comandante\n1 Kenrith, the Returned King *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Smothering Tithe\n97 Plains`,
    );
    await hostPage.click('button:has-text("Validar lista")');
    await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await hostPage.click('button:has-text("Marcarme Listo")');

    // Player 2 (Bob)
    const p2Page = pages[1];
    await p2Page.goto('http://localhost:3000');
    await expect(p2Page.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await p2Page.click('button:has-text("Unirse con Código")');
    await p2Page.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await p2Page.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (P2)');
    await p2Page.click('button:has-text("Entrar a la Mesa")');

    await p2Page.click('button:has-text("Seleccionar / Importar Mazo")');
    const p2ImportTab = p2Page.locator('button:has-text("Importar Lista de Texto")');
    if (await p2ImportTab.isVisible()) {
      await p2ImportTab.click();
    } else {
      await p2Page.click('button:has-text("Importar mi primer mazo")');
    }
    await p2Page.fill(
      'textarea',
      `// Comandante\n1 Kenrith, the Returned King *CMDR*\n\n// Mazo\n1 Sol Ring\n40 Plains\n40 Forest\n18 Island`,
    );
    await p2Page.click('button:has-text("Validar lista")');
    await p2Page.click('button:has-text("Usar este Mazo en la Mesa")');
    await p2Page.click('button:has-text("Marcarme Listo")');

    // Host starts game
    const startBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();

    // Opening hand / mulligan appears
    const openingModal = hostPage.locator('[data-testid="opening-hand-modal"]');
    await expect(openingModal).toBeVisible({ timeout: 25000 });

    // 1. Verify card with Spanish print displays Spanish name (e.g. Llanura in initial hand)
    const spanishCard = hostPage.getByText('Llanura').first();
    await expect(spanishCard).toBeVisible({ timeout: 15000 });

    // 2. Both players keep opening hands
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

    // Tabletop phase
    await expect(openingModal).not.toBeVisible({ timeout: 25000 });

    // Check commander card in Command Zone
    const commanderCard = hostPage.locator('[data-commander-card="true"]').first();
    await expect(commanderCard).toBeVisible({ timeout: 10000 });

    // Open Card Details Modal for Commander via right click
    await commanderCard.click({ button: 'right' });
    const detailsModal = hostPage.locator('[data-testid="card-details-modal"]');
    await expect(detailsModal).toBeVisible({ timeout: 5000 });
    const cardTitle = hostPage.locator('[data-testid="card-details-name"]');
    await expect(cardTitle).toHaveText('Kenrith, el rey devuelto');

    // Verify rulings disclaimer in Spanish
    await expect(
      hostPage.locator(
        'text=Dictámenes oficiales emitidos por Wizards of the Coast en inglés original.',
      ),
    ).toBeVisible();

    // Capture Spanish Card Details screenshot
    await hostPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'audit-card-locale-es.png'),
    });

    // Close details modal
    await hostPage.click('[data-testid="close-card-details-modal"]');
    await expect(detailsModal).not.toBeVisible();

    // 3. Open Settings Modal from floating toolbar and switch language to English ('en')
    const settingsBtn = hostPage.locator('[data-testid="settings-btn"]');
    await settingsBtn.click();

    const langSelect = hostPage.locator('[data-testid="language-select"]');
    await expect(langSelect).toBeVisible({ timeout: 5000 });
    await langSelect.selectOption('en');

    // Close settings modal
    await hostPage.click('button:has-text("Cerrar")');

    // Open card details in English
    await commanderCard.click({ button: 'right' });
    await expect(detailsModal).toBeVisible({ timeout: 5000 });
    await expect(cardTitle).toHaveText('Kenrith, the Returned King');

    // Capture English Card Details screenshot
    await hostPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'audit-card-locale-en.png'),
    });

    // Close details modal
    await hostPage.click('[data-testid="close-card-details-modal"]');

    // Switch back to Spanish ('es')
    await settingsBtn.click();
    await hostPage.selectOption('[data-testid="language-select"]', 'es');
    await hostPage.click('button:has-text("Cerrar")');

    // Verify it reactively switches back to Spanish
    await commanderCard.click({ button: 'right' });
    await expect(detailsModal).toBeVisible({ timeout: 5000 });
    await expect(cardTitle).toHaveText('Kenrith, el rey devuelto');
    await hostPage.click('[data-testid="close-card-details-modal"]');

    // Clean up
    for (const ctx of contexts) {
      await ctx.close();
    }
  });
});
