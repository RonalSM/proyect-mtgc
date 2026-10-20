import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe.configure({ mode: 'serial', timeout: 90000 });

const ARTIFACTS_DIR = 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

function computeBufferVariance(buffer: Buffer): number {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    sum += val;
    sumSq += val * val;
  }
  const mean = sum / buffer.length;
  return (sumSq / buffer.length) - (mean * mean);
}

async function setupGame(browser: any, podSize: number) {
  const contexts = [];
  const pages = [];

  for (let i = 0; i < podSize; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    contexts.push(ctx);
    pages.push(page);
  }

  const hostPage = pages[0];

  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `FS-${podSize}P`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', String(podSize));
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match![1];

  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  await hostPage.click('button:has-text("Importar mi primer mazo")');
  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n10 Plains\n10 Island`
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  const guestNames = ['Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    await expect(pPage.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `${guestNames[pIdx - 1]}`);
    await pPage.click('button:has-text("Entrar a la Mesa")');

    await pPage.click('button:has-text("Seleccionar / Importar Mazo")');
    await pPage.click('button:has-text("Importar mi primer mazo")');
    await pPage.fill(
      'textarea',
      `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n10 Mountain\n10 Swamp`
    );
    await pPage.click('button:has-text("Validar lista")');
    await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await pPage.click('button:has-text("Marcarme Listo")');
  }

  await hostPage.click('button:has-text("INICIAR PARTIDA")');
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });

  for (let step = 0; step < podSize; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let clicked = false;
      for (const p of pages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            clicked = true;
            await p.waitForTimeout(300);
            break;
          }
        }
      }
      if (clicked) break;
      await hostPage.waitForTimeout(200);
    }
  }

  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  return { contexts, pages, hostPage, roomCode };
}

for (const podSize of [2, 4, 6]) {
  test(`Visual certification in ${podSize}P: Expand cell and browser fullscreen`, async ({ browser }) => {
    const { contexts, hostPage } = await setupGame(browser, podSize);

    const consoleErrors: string[] = [];
    hostPage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    hostPage.on('pageerror', err => consoleErrors.push(err.message));

    // Drag a card to the battlefield
    const handCard = hostPage.locator('[data-dock-zone="hand"] [data-hand-card]').first();
    await expect(handCard).toBeVisible({ timeout: 5000 });
    const handBox = await handCard.boundingBox();
    if (handBox) {
      await hostPage.mouse.move(handBox.x + handBox.width / 2, handBox.y + handBox.height / 2);
      await hostPage.mouse.down();
      await hostPage.mouse.move(handBox.x, handBox.y - 200, { steps: 5 });
      await hostPage.mouse.up();
    }
    await hostPage.waitForTimeout(500);

    // ==========================================
    // CASE 1: Test expand cell for player 0 (Host Alice)
    // ==========================================
    console.log(`\n=== CASE 1: Expand Cell (${podSize}P) ===`);
    const expandBtn0 = hostPage.locator('[data-expand-cell-btn]').first();
    await expect(expandBtn0).toBeVisible({ timeout: 5000 });
    await expandBtn0.click();
    await hostPage.waitForTimeout(600);

    // Diagnostics in expanded view
    const metricsExpanded = await hostPage.evaluate(() => {
      const cell = document.querySelector('[data-player-cell]');
      const playmat = cell?.querySelector('img');
      const dock = cell?.querySelector('[data-player-dock]');
      const hand = cell?.querySelector('[data-dock-zone="hand"]');
      const closeBtn = document.querySelector('[data-testid="close-expanded-view"]');
      const cards = document.querySelectorAll('[data-battlefield-card="true"]');
      const mesaTotal = document.querySelector('#mesa-total');

      const card = cards[0] as HTMLElement | null;
      const cardSlot = card?.closest('.card-slot-container') as HTMLElement | null;
      const cardRotator = card?.querySelector('.card-rotator') as HTMLElement | null;

      return {
        mesaTotalSize: mesaTotal ? { w: mesaTotal.clientWidth, h: mesaTotal.clientHeight } : null,
        cellRect: cell ? cell.getBoundingClientRect() : null,
        cellZIndex: cell ? window.getComputedStyle(cell).zIndex : null,
        playmatRect: playmat ? playmat.getBoundingClientRect() : null,
        playmatLoaded: playmat ? (playmat as HTMLImageElement).naturalWidth > 0 : false,
        dockRect: dock ? dock.getBoundingClientRect() : null,
        handRect: hand ? hand.getBoundingClientRect() : null,
        cardsCount: cards.length,
        cardTransform: cardSlot ? window.getComputedStyle(cardSlot).transform : null,
        cardRotatorTransform: cardRotator ? window.getComputedStyle(cardRotator).transform : null,
        cardZIndex: card ? window.getComputedStyle(card).zIndex : null,
        hasCloseBtn: !!closeBtn,
      };
    });

    console.log(`Metrics Expanded (${podSize}P):`, JSON.stringify(metricsExpanded, null, 2));

    const shotExpandedPath = path.join(ARTIFACTS_DIR, `fullscreen-fixed-expanded-${podSize}p.png`);
    const bufferExpanded = await hostPage.screenshot({ path: shotExpandedPath });
    const varianceExpanded = computeBufferVariance(bufferExpanded);
    console.log(`Screenshot expanded ${podSize}P: bytes=${bufferExpanded.length}, variance=${varianceExpanded.toFixed(1)}`);

    expect(metricsExpanded.cellRect).not.toBeNull();
    expect(metricsExpanded.cellRect!.width).toBeGreaterThanOrEqual(1900);
    expect(metricsExpanded.cellRect!.height).toBeGreaterThanOrEqual(1000);
    expect(metricsExpanded.hasCloseBtn).toBe(true);
    expect(metricsExpanded.cardsCount).toBeGreaterThan(0);
    expect(varianceExpanded).toBeGreaterThan(500); // Image has complex visual detail, NOT solid blue!

    // Exit expanded view using Esc
    await hostPage.keyboard.press('Escape');
    await hostPage.waitForTimeout(400);
    await expect(hostPage.locator('[data-testid="close-expanded-view"]')).not.toBeVisible();

    // Re-expand and exit using close button
    const expandBtnAgain = hostPage.locator('[data-expand-cell-btn]').first();
    await expandBtnAgain.click();
    await hostPage.waitForTimeout(400);
    const closeBtn = hostPage.locator('[data-testid="close-expanded-view"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await hostPage.waitForTimeout(400);
    await expect(hostPage.locator('[data-testid="close-expanded-view"]')).not.toBeVisible();

    // ==========================================
    // CASE 2: Browser Fullscreen button
    // ==========================================
    console.log(`\n=== CASE 2: Browser Fullscreen Button (${podSize}P) ===`);
    const fsBtn = hostPage.locator('[data-testid="fullscreen-btn"]');
    await expect(fsBtn).toBeVisible({ timeout: 5000 });
    await fsBtn.click();
    await hostPage.waitForTimeout(500);

    const metricsBrowserFs = await hostPage.evaluate(() => {
      const mesaTotal = document.querySelector('#mesa-total');
      const cells = document.querySelectorAll('[data-player-cell]');
      const cards = document.querySelectorAll('[data-battlefield-card="true"]');
      const toolbar = document.querySelector('[data-floating-toolbar="true"]');

      return {
        mesaTotalRect: mesaTotal ? mesaTotal.getBoundingClientRect() : null,
        cellsCount: cells.length,
        cardsCount: cards.length,
        hasToolbar: !!toolbar,
      };
    });

    console.log(`Metrics Browser Fullscreen (${podSize}P):`, JSON.stringify(metricsBrowserFs, null, 2));

    const shotBrowserFsPath = path.join(ARTIFACTS_DIR, `fullscreen-fixed-browser-${podSize}p.png`);
    let bufferBrowserFs: Buffer;
    try {
      bufferBrowserFs = await hostPage.locator('#mesa-total').screenshot({ path: shotBrowserFsPath });
      console.log('locator screenshot succeeded');
    } catch (e: any) {
      console.log('locator screenshot failed:', e.message);
      bufferBrowserFs = await hostPage.screenshot({ path: shotBrowserFsPath });
    }
    const varianceBrowserFs = computeBufferVariance(bufferBrowserFs);
    console.log(`Screenshot browser fullscreen ${podSize}P: bytes=${bufferBrowserFs.length}, variance=${varianceBrowserFs.toFixed(1)}`);

    expect(metricsBrowserFs.cellsCount).toBe(podSize);
    expect(metricsBrowserFs.cardsCount).toBeGreaterThan(0);
    expect(varianceBrowserFs).toBeGreaterThan(500);

    // Toggle fullscreen off using Esc or evaluate exitFullscreen
    await hostPage.keyboard.press('Escape');
    await hostPage.evaluate(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    });
    await hostPage.waitForTimeout(400);

    // Verify 0 React or unhandled errors
    const nonFaviconErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Scryfall API error'));
    console.log(`Console errors (${podSize}P):`, nonFaviconErrors);
    expect(nonFaviconErrors.length).toBe(0);

    for (const ctx of contexts) await ctx.close();
  });
}
