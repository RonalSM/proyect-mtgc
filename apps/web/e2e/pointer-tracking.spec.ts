import { test, expect } from '@playwright/test';

// Helper para crear sala con N jugadores a la resolución dada
async function setupPodForPointerTest(
  browser: any,
  podSize: number,
  width: number,
  height: number,
  roomPrefix: string
) {
  const contexts: any[] = [];
  const pages: any[] = [];

  for (let i = 0; i < podSize; i++) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    contexts.push(ctx);
    pages.push(await ctx.newPage());
  }

  const hostPage = pages[0];
  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `${roomPrefix} ${podSize}p ${width}x${height}`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Player 1 (Host)');
  await hostPage.selectOption('select', String(podSize));
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';

  // Host mazo
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const importTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await importTab.isVisible()) {
    await importTab.click();
  } else {
    await hostPage.click('button:has-text("Importar mi primer mazo")');
  }
  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Sol Ring *CMDR*\n\n// Mazo\n1 Arcane Signet\n1 Command Tower\n10 Plains\n10 Island\n10 Swamp\n10 Forest\n10 Mountain`
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Jugadores invitados
  const guestNames = ['Bob', 'Charlie', 'Diana'];
  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    await hostPage.waitForTimeout(200);
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    await expect(pPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `${guestNames[pIdx - 1]} (P${pIdx + 1})`);
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
      `// Comandante\n1 Sol Ring *CMDR*\n\n// Mazo\n1 Arcane Signet\n1 Command Tower\n10 Plains\n10 Island\n10 Swamp\n10 Forest\n10 Mountain`
    );
    await pPage.click('button:has-text("Validar lista")');
    await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await pPage.click('button:has-text("Marcarme Listo")');
  }

  // Iniciar partida
  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // Completar mulligan para todos
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
            await p.waitForTimeout(400);
            break;
          }
        }
      }
      if (clicked) break;
      await hostPage.waitForTimeout(200);
    }
  }

  for (const page of pages) {
    await expect(page.locator('[data-testid="opening-hand-modal"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="initiative-overlay"]')).not.toBeVisible({ timeout: 15000 });
  }

  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 10000 });
  return { contexts, pages, hostPage };
}

// Medidor estricto del punto agarrado: en cada punto de movimiento, |pointer - overlayCorner - initialOffset| <= 1px
async function measurePointerTracking(
  page: any,
  cardLocator: any,
  testCaseName: string
): Promise<{ maxDiffX: number; maxDiffY: number; thresholdDiffX: number; thresholdDiffY: number }> {
  await cardLocator.waitFor({ state: 'visible', timeout: 10000 });
  const preBox = await cardLocator.boundingBox();
  expect(preBox).not.toBeNull();

  const isHand = testCaseName.includes('Mano');
  // Punto objetivo sobre la carta: para la última carta de la mano, porción derecha libre; para mesa, el centro
  const grabX = isHand
    ? Math.round(preBox.x + preBox.width * 0.75)
    : Math.round(preBox.x + preBox.width * 0.5);
  const grabY = isHand
    ? Math.round(preBox.y + preBox.height * 0.4)
    : Math.round(preBox.y + preBox.height * 0.5);

  // Posicionar el puntero sobre la carta y esperar que estabilice el hover
  await page.mouse.move(grabX, grabY);
  await page.waitForTimeout(250);

  // Medir la caja visual real de la carta exactamente antes de presionar
  const startBox = await cardLocator.boundingBox();
  expect(startBox).not.toBeNull();

  const initialGrabOffset = {
    x: grabX - startBox.x,
    y: grabY - startBox.y,
  };

  // Presionar ratón para iniciar el arrastre
  await page.mouse.down();

  // 1. Desplazamiento inferior al umbral de 8px (3px en X y Y: distancia ~4.24px)
  await page.mouse.move(grabX + 3, grabY + 3);
  const subThresholdOverlay = await page.locator('[data-drag-overlay="true"]').isVisible().catch(() => false);
  expect(subThresholdOverlay).toBeFalsy();

  // 2. Comprobación del frame justo al superar el umbral de 8px (7px en X y Y: distancia ~9.9px > 8px)
  const threshX = grabX + 7;
  const threshY = grabY + 7;
  await page.mouse.move(threshX, threshY);
  const overlayLocator = page.locator('[data-drag-overlay="true"]');
  await expect(overlayLocator).toBeVisible({ timeout: 3000 });
  const threshBox = await overlayLocator.boundingBox();
  expect(threshBox).not.toBeNull();

  const thresholdGrabbed = {
    x: threshX - threshBox.x,
    y: threshY - threshBox.y,
  };
  const thresholdDiffX = Math.abs(thresholdGrabbed.x - initialGrabOffset.x);
  const thresholdDiffY = Math.abs(thresholdGrabbed.y - initialGrabOffset.y);

  expect(thresholdDiffX).toBeLessThanOrEqual(1.0);
  expect(thresholdDiffY).toBeLessThanOrEqual(1.0);

  // 3. Trayectoria de movimiento continuo en múltiples direcciones (dentro del espacio útil del viewport)
  const waypoints = isHand
    ? [
        { dx: 16, dy: -20 },
        { dx: 32, dy: -50 },
        { dx: 54, dy: -90 },
        { dx: 82, dy: -140 },
        { dx: 110, dy: -200 },
        { dx: 85, dy: -160 },
        { dx: 45, dy: -110 },
        { dx: 20, dy: -60 },
      ]
    : [
        { dx: 25, dy: 20 },
        { dx: 50, dy: 45 },
        { dx: 80, dy: 70 },
        { dx: 110, dy: 50 },
        { dx: 80, dy: 20 },
        { dx: 40, dy: -20 },
        { dx: -20, dy: -40 },
      ];

  let maxDiffX = thresholdDiffX;
  let maxDiffY = thresholdDiffY;

  for (const wp of waypoints) {
    const curX = grabX + wp.dx;
    const curY = grabY + wp.dy;
    await page.mouse.move(curX, curY);

    const box = await overlayLocator.boundingBox();
    expect(box).not.toBeNull();

    const curGrabbed = {
      x: curX - box.x,
      y: curY - box.y,
    };
    const diffX = Math.abs(curGrabbed.x - initialGrabOffset.x);
    const diffY = Math.abs(curGrabbed.y - initialGrabOffset.y);

    if (diffX > maxDiffX) maxDiffX = diffX;
    if (diffY > maxDiffY) maxDiffY = diffY;

    expect(diffX).toBeLessThanOrEqual(1.0);
    expect(diffY).toBeLessThanOrEqual(1.0);
  }

  // Soltar la carta
  await page.mouse.up();
  await page.waitForTimeout(300);

  console.log(
    `[Punto 3 - ${testCaseName}] Umbral 8px: dx=${thresholdDiffX.toFixed(2)}px, dy=${thresholdDiffY.toFixed(2)}px | Trayectoria max: dx=${maxDiffX.toFixed(2)}px, dy=${maxDiffY.toFixed(2)}px (<= 1.0px PASS)`
  );

  return { maxDiffX, maxDiffY, thresholdDiffX, thresholdDiffY };
}

test.describe('Punto 3: Seguimiento estricto del puntero durante el arrastre (<= 1px)', () => {
  test('2 Jugadores @ 1920x1080: Mano, Mesa (enderezada y girada) y Mesa Expandida', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, hostPage } = await setupPodForPointerTest(browser, 2, 1920, 1080, 'Ptr2p1080');

    try {
      // 1. Desde la mano (enderezada, última carta de la mano sin solape)
      const handCard = hostPage.locator('[data-from-zone="hand"]').last();
      await measurePointerTracking(hostPage, handCard, '2p-1080p-Mano');

      // 2. Colocar una carta en la mesa mediante menú contextual para tener carta en campo
      const handCard2 = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard2.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(500);

      // 3. Desde la mesa (enderezada)
      const bfCard = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCard, '2p-1080p-Mesa-Enderezada');

      // 4. Desde la mesa (girada)
      await bfCard.dblclick();
      await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(300);
      await measurePointerTracking(hostPage, bfCard, '2p-1080p-Mesa-Girada');

      // 5. Desde la mesa expandida
      const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
      await expandBtn.click({ force: true });
      await hostPage.waitForTimeout(400);

      const bfCardExp = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCardExp, '2p-1080p-Mesa-Expandida');

      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(300);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('4 Jugadores @ 1920x1080: Mano, Mesa (enderezada y girada) y Mesa Expandida', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, hostPage } = await setupPodForPointerTest(browser, 4, 1920, 1080, 'Ptr4p1080');

    try {
      // 1. Desde la mano
      const handCard = hostPage.locator('[data-from-zone="hand"]').last();
      await measurePointerTracking(hostPage, handCard, '4p-1080p-Mano');

      // 2. Enviar a mesa
      const handCard2 = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard2.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(500);

      // 3. Desde la mesa (enderezada)
      const bfCard = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCard, '4p-1080p-Mesa-Enderezada');

      // 4. Desde la mesa (girada)
      await bfCard.dblclick();
      await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(300);
      await measurePointerTracking(hostPage, bfCard, '4p-1080p-Mesa-Girada');

      // 5. Desde la mesa expandida
      const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
      await expandBtn.click({ force: true });
      await hostPage.waitForTimeout(400);

      const bfCardExp = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCardExp, '4p-1080p-Mesa-Expandida');

      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(300);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('2 Jugadores @ 1366x768: Mano, Mesa (enderezada y girada) y Mesa Expandida', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, hostPage } = await setupPodForPointerTest(browser, 2, 1366, 768, 'Ptr2p768');

    try {
      // 1. Desde la mano
      const handCard = hostPage.locator('[data-from-zone="hand"]').last();
      await measurePointerTracking(hostPage, handCard, '2p-768p-Mano');

      // 2. Enviar a mesa
      const handCard2 = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard2.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(500);

      // 3. Desde la mesa (enderezada)
      const bfCard = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCard, '2p-768p-Mesa-Enderezada');

      // 4. Desde la mesa (girada)
      await bfCard.dblclick();
      await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(300);
      await measurePointerTracking(hostPage, bfCard, '2p-768p-Mesa-Girada');

      // 5. Desde la mesa expandida
      const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
      await expandBtn.click({ force: true });
      await hostPage.waitForTimeout(400);

      const bfCardExp = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCardExp, '2p-768p-Mesa-Expandida');

      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(300);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('4 Jugadores @ 1366x768: Mano, Mesa (enderezada y girada) y Mesa Expandida', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, hostPage } = await setupPodForPointerTest(browser, 4, 1366, 768, 'Ptr4p768');

    try {
      // 1. Desde la mano
      const handCard = hostPage.locator('[data-from-zone="hand"]').last();
      await measurePointerTracking(hostPage, handCard, '4p-768p-Mano');

      // 2. Enviar a mesa
      const handCard2 = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard2.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(500);

      // 3. Desde la mesa (enderezada)
      const bfCard = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCard, '4p-768p-Mesa-Enderezada');

      // 4. Desde la mesa (girada)
      await bfCard.dblclick();
      await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(300);
      await measurePointerTracking(hostPage, bfCard, '4p-768p-Mesa-Girada');

      // 5. Desde la mesa expandida
      const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
      await expandBtn.click({ force: true });
      await hostPage.waitForTimeout(400);

      const bfCardExp = hostPage.locator('[data-from-zone="battlefield"]').first();
      await measurePointerTracking(hostPage, bfCardExp, '4p-768p-Mesa-Expandida');

      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(300);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
