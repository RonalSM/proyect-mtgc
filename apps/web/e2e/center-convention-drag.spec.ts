import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

// Helper para crear sala e iniciar partida con N jugadores en resolución dada
async function setupGame(
  browser: any,
  podSize: number,
  viewport: { width: number; height: number },
) {
  const contexts = [];
  const pages = [];

  for (let i = 0; i < podSize; i++) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    contexts.push(ctx);
    pages.push(page);
  }

  const hostPage = pages[0];
  const guestPage = pages[1];

  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  // Host crea sala
  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `CenterTest-${podSize}P`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
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
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n10 Plains\n10 Island\n10 Swamp\n10 Forest`,
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
    await pPage.fill(
      'input[placeholder="Ej. Jugador Invitado"]',
      `${guestNames[pIdx - 1]} (P${pIdx + 1})`,
    );
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
      `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n10 Mountain\n10 Swamp\n10 Plains`,
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
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
    timeout: 25000,
  });
  for (let step = 0; step < podSize; step++) {
    let clicked = false;
    for (let attempt = 0; attempt < 30; attempt++) {
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

  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(guestPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

  return { contexts, pages, hostPage, guestPage };
}

// Ejecuta la suite de verificación de arrastre con convención de centro
async function runDragVerificationSuite(
  hostPage: any,
  guestPage: any,
  testCaseName: string,
  isTapped: boolean,
  targetOffset: { dx: number; dy: number },
  isExpanded: boolean = false,
) {
  // Localizadores de la carta
  const cardSlotA = hostPage.locator('[data-battlefield-card="true"]').first();
  const cardSlotB = guestPage.locator('[data-battlefield-card="true"]').first();

  await expect(cardSlotA).toBeVisible({ timeout: 10000 });
  await expect(cardSlotB).toBeVisible({ timeout: 10000 });

  // 1. Obtener coordenadas iniciales antes de agarrar
  const beforeGrabA = await cardSlotA.evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2,
    };
  });

  const beforeGrabB = await cardSlotB.evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2,
    };
  });

  // 2. Instalar observador de los primeros 5 frames del fantasma en Guest B
  await guestPage.evaluate(() => {
    (window as any).__ghostFrames = [];
    const captureGhost = () => {
      const ghost = document.querySelector('[data-remote-card-ghost="true"]');
      if (ghost) {
        const r = ghost.getBoundingClientRect();
        (window as any).__ghostFrames.push({
          frame: (window as any).__ghostFrames.length + 1,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        });
      }
      if ((window as any).__ghostFrames.length < 5) {
        requestAnimationFrame(captureGhost);
      }
    };
    requestAnimationFrame(captureGhost);
  });

  // 3. Instalar muestreador rAF en Host A para el drop y los 500 ms posteriores
  await hostPage.evaluate(() => {
    (window as any).__dropSamples = [];

    (window as any).__startDropSampler = () => {
      const startTime = performance.now();

      const sample = () => {
        const now = performance.now();
        const overlay = document.querySelector('[data-drag-overlay="true"]');
        const card = document.querySelector('[data-battlefield-card="true"]');
        const el = overlay || card;

        if (el) {
          const r = el.getBoundingClientRect();
          (window as any).__dropSamples.push({
            time: now - startTime,
            isOverlay: !!overlay,
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
            centerX: r.left + r.width / 2,
            centerY: r.top + r.height / 2,
          });
        }

        if (now - startTime < 550) {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    };
  });

  // 4. Posicionar el ratón sobre el centro de la carta
  await hostPage.mouse.move(beforeGrabA.centerX, beforeGrabA.centerY);
  await hostPage.mouse.down();
  await hostPage.waitForTimeout(50);

  // Mover justo superando el umbral de 8px (9px en X) para activar dragStart
  await hostPage.mouse.move(beforeGrabA.centerX + 9, beforeGrabA.centerY);
  // Esperar 120 ms para que Guest B capture sus primeros 5 frames
  await hostPage.waitForTimeout(120);

  // 5. Arrastrar a la posición objetivo dentro de la trayectoria
  const finalX = beforeGrabA.centerX + targetOffset.dx;
  const finalY = beforeGrabA.centerY + targetOffset.dy;

  // Iniciar muestreo continuo antes de mover al destino final y soltar
  await hostPage.evaluate(() => (window as any).__startDropSampler());
  await hostPage.mouse.move(finalX, finalY, { steps: 5 });
  await hostPage.waitForTimeout(50);

  // Soltar la carta
  await hostPage.mouse.up();
  // Esperar 500 ms para completar el muestreo post-drop
  await hostPage.waitForTimeout(550);

  // 6. Recoger datos de Guest B (primeros 5 frames del fantasma)
  const ghostFramesB = await guestPage.evaluate(() => (window as any).__ghostFrames || []);

  // 7. Recoger datos de Host A (muestreo drop rAF)
  const dropSamplesA = await hostPage.evaluate(() => (window as any).__dropSamples || []);

  // 8. Validación Punto 5(b) - Remoto B:
  expect(ghostFramesB.length).toBeGreaterThanOrEqual(1);
  const firstGhostFrame = ghostFramesB[0];

  // Centro igual al de la carta original (1 px o menos)
  const ghostCenterDiffX = Math.abs(firstGhostFrame.centerX - beforeGrabB.centerX);
  const ghostCenterDiffY = Math.abs(firstGhostFrame.centerY - beforeGrabB.centerY);
  const ghostWidthDiff = Math.abs(firstGhostFrame.width - beforeGrabB.width);
  const ghostHeightDiff = Math.abs(firstGhostFrame.height - beforeGrabB.height);

  console.log(`\n--- [${testCaseName}] Verificación Remoto B (Primeros frames del fantasma) ---`);
  console.log(
    `Carta antes: Center=(${beforeGrabB.centerX.toFixed(2)}, ${beforeGrabB.centerY.toFixed(2)}), Dims=${beforeGrabB.width}x${beforeGrabB.height}`,
  );
  console.log(
    `Fantasma Frame 1: Center=(${firstGhostFrame.centerX.toFixed(2)}, ${firstGhostFrame.centerY.toFixed(2)}), Dims=${firstGhostFrame.width}x${firstGhostFrame.height}`,
  );
  console.log(
    `Diff Centro: dx=${ghostCenterDiffX.toFixed(2)}px, dy=${ghostCenterDiffY.toFixed(2)}px (<= 1.0px)`,
  );
  console.log(
    `Diff Dims: dw=${ghostWidthDiff.toFixed(2)}px, dh=${ghostHeightDiff.toFixed(2)}px (0px)`,
  );

  expect(ghostCenterDiffX).toBeLessThanOrEqual(1.0);
  expect(ghostCenterDiffY).toBeLessThanOrEqual(1.0);
  expect(ghostWidthDiff).toBeLessThanOrEqual(1.0);
  expect(ghostHeightDiff).toBeLessThanOrEqual(1.0);

  // 9. Validación Punto 5(a) - Local A:
  const overlayFrames = dropSamplesA.filter((s: any) => s.isOverlay);
  const droppedFrames = dropSamplesA.filter((s: any) => !s.isOverlay);

  expect(overlayFrames.length).toBeGreaterThan(0);
  expect(droppedFrames.length).toBeGreaterThan(0);

  const lastOverlay = overlayFrames[overlayFrames.length - 1];
  const firstDropped = droppedFrames[0];

  const dropDiffCenterX = Math.abs(firstDropped.centerX - lastOverlay.centerX);
  const dropDiffCenterY = Math.abs(firstDropped.centerY - lastOverlay.centerY);

  console.log(`--- [${testCaseName}] Verificación Local A (Overlay vs Landed Card al soltar) ---`);
  console.log(
    `Último Overlay: Center=(${lastOverlay.centerX.toFixed(2)}, ${lastOverlay.centerY.toFixed(2)}), Dims=${lastOverlay.width}x${lastOverlay.height}`,
  );
  console.log(
    `Primer Landed:  Center=(${firstDropped.centerX.toFixed(2)}, ${firstDropped.centerY.toFixed(2)}), Dims=${firstDropped.width}x${firstDropped.height}`,
  );
  console.log(
    `Diff al soltar: dx=${dropDiffCenterX.toFixed(2)}px, dy=${dropDiffCenterY.toFixed(2)}px (<= 1.0px)`,
  );

  expect(dropDiffCenterX).toBeLessThanOrEqual(1.0);
  expect(dropDiffCenterY).toBeLessThanOrEqual(1.0);

  // Comprobar que no hay saltos del centro entre frames consecutivos al soltar
  let maxConsecutiveJumpX = 0;
  let maxConsecutiveJumpY = 0;

  for (let i = 0; i < droppedFrames.length - 1; i++) {
    const f1 = droppedFrames[i];
    const f2 = droppedFrames[i + 1];
    const jx = Math.abs(f2.centerX - f1.centerX);
    const jy = Math.abs(f2.centerY - f1.centerY);
    if (jx > maxConsecutiveJumpX) maxConsecutiveJumpX = jx;
    if (jy > maxConsecutiveJumpY) maxConsecutiveJumpY = jy;
    expect(jx).toBeLessThanOrEqual(1.0);
    expect(jy).toBeLessThanOrEqual(1.0);
  }

  console.log(
    `Máximo salto consecutivo en 500ms post-drop: dx=${maxConsecutiveJumpX.toFixed(2)}px, dy=${maxConsecutiveJumpY.toFixed(2)}px (<= 1.0px PASS)`,
  );

  return {
    ghostCenterDiffX,
    ghostCenterDiffY,
    dropDiffCenterX,
    dropDiffCenterY,
    maxConsecutiveJumpX,
    maxConsecutiveJumpY,
  };
}

const configs = [
  { podSize: 2, viewport: { width: 1920, height: 1080 }, label: '2P-1080p' },
  { podSize: 4, viewport: { width: 1920, height: 1080 }, label: '4P-1080p' },
  { podSize: 2, viewport: { width: 1366, height: 768 }, label: '2P-768p' },
  { podSize: 4, viewport: { width: 1366, height: 768 }, label: '4P-768p' },
];

for (const cfg of configs) {
  test(`Punto 5: Suite Playwright de arrastre y soltado sin saltos - ${cfg.label}`, async ({
    browser,
  }) => {
    test.setTimeout(120000);

    console.log(`\n======================================================`);
    console.log(
      `INICIANDO SUITE PUNTO 5: ${cfg.label} (${cfg.podSize} jugadores, ${cfg.viewport.width}x${cfg.viewport.height})`,
    );
    console.log(`======================================================`);

    const { contexts, pages, hostPage, guestPage } = await setupGame(
      browser,
      cfg.podSize,
      cfg.viewport,
    );

    try {
      // 1. Enviar una carta de la mano de Alice al campo de batalla
      const handCard = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard.waitFor({ state: 'visible', timeout: 10000 });
      await handCard.click({ button: 'right', force: true });
      await hostPage
        .locator('[data-testid="context-to-battlefield"]')
        .waitFor({ state: 'visible', timeout: 5000 });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(600);

      const cardSlotA = hostPage.locator('[data-battlefield-card="true"]').first();
      await expect(cardSlotA).toBeVisible({ timeout: 5000 });
      const cardSlotB = guestPage.locator('[data-battlefield-card="true"]').first();
      await expect(cardSlotB).toBeVisible({ timeout: 5000 });

      // CASO 1: Carta Enderezada - Reposicionar en la mesa
      await runDragVerificationSuite(hostPage, guestPage, `${cfg.label} - Mesa Enderezada`, false, {
        dx: 45,
        dy: 35,
      });

      // CASO 2: Girar carta (Tap) -> Arrastre y soltado de carta girada
      await cardSlotA.dblclick({ force: true });
      await expect(cardSlotA).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await expect(cardSlotB).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(300);

      await runDragVerificationSuite(
        hostPage,
        guestPage,
        `${cfg.label} - Mesa Girada (Tapped)`,
        true,
        { dx: 50, dy: -30 },
      );

      // CASO 3: Enderezar y volver a girar (Untap -> Tap)
      await cardSlotA.dblclick({ force: true });
      await expect(cardSlotA).toHaveAttribute('data-tapped', 'false', { timeout: 3000 });
      await expect(cardSlotB).toHaveAttribute('data-tapped', 'false', { timeout: 3000 });
      await hostPage.waitForTimeout(250);

      await cardSlotA.dblclick({ force: true });
      await expect(cardSlotA).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await expect(cardSlotB).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
      await hostPage.waitForTimeout(250);

      await runDragVerificationSuite(
        hostPage,
        guestPage,
        `${cfg.label} - Re-girada (Re-tapped)`,
        true,
        { dx: -35, dy: 25 },
      );

      // CASO 4: Cerca de bordes de pantalla y del dock
      const targetNearRight = { dx: 80, dy: -25 };
      await runDragVerificationSuite(
        hostPage,
        guestPage,
        `${cfg.label} - Bordes de Pantalla y Dock`,
        true,
        targetNearRight,
      );

      // CASO 5: Desde mesa expandida
      const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
      if (await expandBtn.isVisible()) {
        await expandBtn.click({ force: true });
        await hostPage.waitForTimeout(400);

        await runDragVerificationSuite(
          hostPage,
          guestPage,
          `${cfg.label} - Mesa Expandida`,
          true,
          { dx: 30, dy: 20 },
          true,
        );

        // Cerrar vista expandida con Escape
        await hostPage.keyboard.press('Escape');
        await hostPage.waitForTimeout(300);
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
}
