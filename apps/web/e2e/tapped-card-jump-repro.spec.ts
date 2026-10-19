import { test, expect } from '@playwright/test';
import path from 'path';

// Helper para crear sala con 2 jugadores
async function setupTwoPlayerGame(browser: any) {
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

  const [hostPage, guestPage] = pages;

  // 1. Host crea la sala
  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'JumpRepro Pod 2p');
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', '2');
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

  // Host mazo
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await hostImportTab.isVisible()) {
    await hostImportTab.click();
  } else {
    await hostPage.click('button:has-text("Importar mi primer mazo")');
  }
  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Cultivate\n1 Counterspell\n1 Swords to Plowshares\n1 Demonic Tutor\n10 Plains\n10 Island\n10 Swamp\n10 Forest`
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Guest se une
  await guestPage.goto('http://localhost:3000');
  await expect(guestPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
  await guestPage.click('button:has-text("Unirse con Código")');
  await guestPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await guestPage.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (Guest)');
  await guestPage.click('button:has-text("Entrar a la Mesa")');

  await guestPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const guestImportTab = guestPage.locator('button:has-text("Importar Lista de Texto")');
  if (await guestImportTab.isVisible()) {
    await guestImportTab.click();
  } else {
    await guestPage.click('button:has-text("Importar mi primer mazo")');
  }
  await guestPage.fill(
    'textarea',
    `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n1 Dark Ritual\n10 Mountain\n10 Swamp\n10 Plains`
  );
  await guestPage.click('button:has-text("Validar lista")');
  await guestPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await guestPage.click('button:has-text("Marcarme Listo")');

  // Iniciar partida
  const startBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startBtn).toBeEnabled({ timeout: 10000 });
  await startBtn.click();

  // Completar mulligan
  const pagesArr = [hostPage, guestPage];
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });
  for (let step = 0; step < 2; step++) {
    let clicked = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      for (const p of pagesArr) {
        const keepBtn = p.locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            clicked = true;
            await p.waitForTimeout(500);
            break;
          }
        }
      }
      if (clicked) break;
      await hostPage.waitForTimeout(300);
    }
  }

  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(guestPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

  return { contexts, hostPage, guestPage };
}

test('Punto 1: Reproduce y mide el salto de la carta girada', async ({ browser }) => {
  test.setTimeout(90000);
  const { contexts, hostPage, guestPage } = await setupTwoPlayerGame(browser);

  try {
    // 1. Host envía una carta de la mano al campo de batalla
    const handCard = hostPage.locator('[data-from-zone="hand"]').first();
    await handCard.waitFor({ state: 'visible', timeout: 10000 });
    await handCard.click({ button: 'right', force: true });
    await hostPage.locator('[data-testid="context-to-battlefield"]').waitFor({ state: 'visible', timeout: 5000 });
    await hostPage.locator('[data-testid="context-to-battlefield"]').click();
    await hostPage.waitForTimeout(1000);

    const cardSlotA = hostPage.locator('[data-battlefield-card="true"]').first();
    await expect(cardSlotA).toBeVisible({ timeout: 5000 });
    const cardSlotB = guestPage.locator('[data-battlefield-card="true"]').first();
    await expect(cardSlotB).toBeVisible({ timeout: 5000 });

    // 2. Girar la carta (tap) mediante doble clic
    await cardSlotA.dblclick({ force: true });
    await expect(cardSlotA).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
    await expect(cardSlotB).toHaveAttribute('data-tapped', 'true', { timeout: 3000 });
    // Esperar a que la transición de giro termine
    await hostPage.waitForTimeout(400);

    // 3. MEDICIÓN 1: Antes de agarrar
    const beforeGrabA = await cardSlotA.evaluate((el) => {
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

    const beforeGrabB = await cardSlotB.evaluate((el) => {
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

    console.log('\n================ MEDICIÓN 1: ANTES DE AGARRAR ================');
    console.log('Host A (antes):', JSON.stringify(beforeGrabA, null, 2));
    console.log('Guest B (antes):', JSON.stringify(beforeGrabB, null, 2));

    // 4. Instalar observador de frames del fantasma en Guest B
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
        if ((window as any).__ghostFrames.length < 20) {
          requestAnimationFrame(captureGhost);
        }
      };
      requestAnimationFrame(captureGhost);
    });

    // 5. Iniciar arrastre en Host A
    // Situar el ratón en el centro de la carta girada
    await hostPage.mouse.move(beforeGrabA.centerX, beforeGrabA.centerY);
    await hostPage.mouse.down();
    await hostPage.waitForTimeout(50);

    // Mover 60px a la derecha y 40px hacia abajo (superando el umbral de 8px)
    const targetMouseX = beforeGrabA.centerX + 60;
    const targetMouseY = beforeGrabA.centerY + 40;
    await hostPage.mouse.move(targetMouseX, targetMouseY, { steps: 5 });
    await hostPage.waitForTimeout(100);

    // 6. MEDICIÓN 2: Durante el arrastre (overlay en Host A)
    const overlayLoc = hostPage.locator('[data-drag-overlay="true"] .card-slot-container, .card-slot-container.fixed, div[style*="pointer-events: none"] > .card-slot-container').first();
    const duringDragA = await hostPage.evaluate(() => {
      // Buscar el overlay activo
      const overlayEl = document.querySelector('[data-card-rotator="true"]')?.closest('.card-slot-container') ||
                        document.querySelector('[data-battlefield-card="true"]');
      // Mejor buscar el elemento con z-index más alto o el clon en body
      const overlays = Array.from(document.querySelectorAll('body > div .card-slot-container'));
      const activeOverlay = overlays[overlays.length - 1];
      if (activeOverlay) {
        const r = activeOverlay.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        };
      }
      return null;
    });

    console.log('\n================ MEDICIÓN 2: DURANTE EL ARRASTRE (OVERLAY) ================');
    console.log('Host A (durante overlay):', JSON.stringify(duringDragA, null, 2));

    // Esperar a que se capturen frames en Guest B
    await guestPage.waitForTimeout(200);

    // 7. MEDICIÓN 3: Soltar la carta en Host A
    await hostPage.mouse.up();
    // Esperar a que la posición optimista y el DOM se sincronicen
    await hostPage.waitForTimeout(200);

    const justAfterDropA = await cardSlotA.evaluate((el) => {
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

    console.log('\n================ MEDICIÓN 3: JUSTO DESPUÉS DE SOLTAR (MESA) ================');
    console.log('Host A (después de soltar):', JSON.stringify(justAfterDropA, null, 2));

    // 8. MEDICIÓN 4: Primeros 5 frames del fantasma en Guest B
    const ghostFramesB = await guestPage.evaluate(() => (window as any).__ghostFrames.slice(0, 5));
    console.log('\n================ MEDICIÓN 4: PRIMEROS 5 FRAMES DEL FANTASMA EN GUEST B ================');
    console.log('Guest B (primeros 5 frames):', JSON.stringify(ghostFramesB, null, 2));

    // 9. CÁLCULO DE DIFERENCIAS Y VERIFICACIÓN DE HIPÓTESIS: (h - w) / 2
    const w = beforeGrabA.height < beforeGrabA.width ? beforeGrabA.height : beforeGrabA.width; // 96
    const h = beforeGrabA.height > beforeGrabA.width ? beforeGrabA.height : beforeGrabA.width; // 134
    const halfDiff = (h - w) / 2; // (134 - 96) / 2 = 19 px

    console.log('\n================ ANÁLISIS DE DIFERENCIAS ================');
    console.log(`Dimensiones de carta: vertical = ${w}x${h}, apaisada = ${h}x${w}`);
    console.log(`Desplazamiento teórico por eje (h - w) / 2 = (${h} - ${w}) / 2 = ${halfDiff} px`);

    if (duringDragA && justAfterDropA) {
      const overlayCenterDiffX = justAfterDropA.centerX - duringDragA.centerX;
      const overlayCenterDiffY = justAfterDropA.centerY - duringDragA.centerY;
      const overlayLeftDiff = justAfterDropA.left - duringDragA.left;
      const overlayTopDiff = justAfterDropA.top - duringDragA.top;

      console.log(`\n[Host Local A al soltar]:`);
      console.log(`  Overlay Center: (${duringDragA.centerX.toFixed(2)}, ${duringDragA.centerY.toFixed(2)})`);
      console.log(`  Dropped Card Center: (${justAfterDropA.centerX.toFixed(2)}, ${justAfterDropA.centerY.toFixed(2)})`);
      console.log(`  Diferencia Centro: dx = ${overlayCenterDiffX.toFixed(2)} px, dy = ${overlayCenterDiffY.toFixed(2)} px`);
      console.log(`  Diferencia Esquina Superior Izquierda: dLeft = ${overlayLeftDiff.toFixed(2)} px, dTop = ${overlayTopDiff.toFixed(2)} px`);
    }

    if (ghostFramesB && ghostFramesB.length > 0) {
      console.log(`\n[Guest Remoto B al iniciar arrastre]:`);
      console.log(`  Carta original antes de mover: Center = (${beforeGrabB.centerX.toFixed(2)}, ${beforeGrabB.centerY.toFixed(2)}), TopLeft = (${beforeGrabB.left.toFixed(2)}, ${beforeGrabB.top.toFixed(2)})`);
      ghostFramesB.forEach((gf: any, idx: number) => {
        const dCenterX = gf.centerX - beforeGrabB.centerX;
        const dCenterY = gf.centerY - beforeGrabB.centerY;
        const dLeft = gf.left - beforeGrabB.left;
        const dTop = gf.top - beforeGrabB.top;
        console.log(`  Frame ${gf.frame}: Center = (${gf.centerX.toFixed(2)}, ${gf.centerY.toFixed(2)}) [dx=${dCenterX.toFixed(2)}, dy=${dCenterY.toFixed(2)}], TopLeft = (${gf.left.toFixed(2)}, ${gf.top.toFixed(2)}) [dLeft=${dLeft.toFixed(2)}, dTop=${dTop.toFixed(2)}]`);
      });
    }

  } finally {
    for (const ctx of contexts) {
      await ctx.close();
    }
  }
});
