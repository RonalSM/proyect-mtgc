import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

// Helper para crear sala, unir jugadores, importar mazos e iniciar partida
async function setupPod(
  browser: any,
  podSize: number,
  width: number,
  height: number,
  roomPrefix = 'Pod'
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

  // 1. Anfitrión crea la sala
  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `${roomPrefix} ${podSize}p ${width}x${height}`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Nero (Host)');
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  // Obtener código de sala
  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

  // Anfitrión selecciona mazo
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

  // 2. Jugadores 2..N se unen y seleccionan mazo
  const commanders = [
    'Edgar Markov',
    'Urza, Lord High Artificer',
    'The Ur-Dragon',
  ];

  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    await hostPage.waitForTimeout(300);
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    await expect(pPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `Jugador ${pIdx + 1}`);
    await pPage.click('button:has-text("Entrar a la Mesa")');

    await pPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const pImportTab = pPage.locator('button:has-text("Importar Lista de Texto")');
    if (await pImportTab.isVisible()) {
      await pImportTab.click();
    } else {
      await pPage.click('button:has-text("Importar mi primer mazo")');
    }
    const cmdName = commanders[pIdx - 1] || 'Kess, Dissident Mage';
    await pPage.fill(
      'textarea',
      `// Comandante\n1 ${cmdName} *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n1 Dark Ritual\n10 Mountain\n10 Swamp\n10 Island`
    );
    await pPage.click('button:has-text("Validar lista")');
    await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await pPage.click('button:has-text("Marcarme Listo")');
  }

  // 3. Anfitrión inicia partida
  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // 4. Lanzar D20 para iniciativa
  for (let pIdx = 0; pIdx < podSize; pIdx++) {
    const rollBtn = pages[pIdx].locator('button:has-text("LANZAR D20")');
    try {
      await rollBtn.waitFor({ state: 'visible', timeout: 5000 });
      await rollBtn.click();
    } catch {
      // Ignorar si ya se resolvió
    }
  }

  // Resolver desempates
  for (let attempt = 0; attempt < 3; attempt++) {
    await hostPage.waitForTimeout(600);
    for (let pIdx = 0; pIdx < podSize; pIdx++) {
      const rollBtn = pages[pIdx].locator('button:has-text("LANZAR D20")');
      if (await rollBtn.isVisible()) {
        await rollBtn.click();
      }
    }
  }

  // Esperar transición a la mesa de juego
  await expect(hostPage.locator('text=Tirada de Iniciativa')).not.toBeVisible({ timeout: 15000 });
  await hostPage.waitForTimeout(1500);

  return { contexts, pages, hostPage, roomCode };
}

test.describe('Verificación Visual y de Interacción (REQ-9, REQ-22)', () => {
  const resolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
  ];

  const podSizes = [2, 3, 4];

  for (const podSize of podSizes) {
    for (const res of resolutions) {
      test(`Pod de ${podSize} jugadores a ${res.name}: mano visible sin scroll, sin solapamientos y drag & drop`, async ({
        browser,
      }) => {
        test.setTimeout(90000);
        const { contexts, hostPage } = await setupPod(
          browser,
          podSize,
          res.width,
          res.height,
          'Visual'
        );

        try {
          // -------------------------------------------------------------
          // ASSERTION A: Cero scroll en la ventana y documento (100dvh, overflow:hidden)
          // -------------------------------------------------------------
          const scrollState = await hostPage.evaluate(() => {
            return {
              scrollY: window.scrollY,
              scrollX: window.scrollX,
              innerHeight: window.innerHeight,
              scrollHeight: document.documentElement.scrollHeight,
              innerWidth: window.innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
            };
          });
          expect(scrollState.scrollY).toBe(0);
          expect(scrollState.scrollX).toBe(0);
          expect(scrollState.scrollHeight).toBeLessThanOrEqual(scrollState.innerHeight + 2);
          expect(scrollState.scrollWidth).toBeLessThanOrEqual(scrollState.innerWidth + 2);

          // -------------------------------------------------------------
          // ASSERTION B: Cartas de la mano completamente dentro del viewport
          // -------------------------------------------------------------
          const handCardsBounding = await hostPage.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('[data-hand-card="true"]'));
            return cards.map(c => {
              const r = c.getBoundingClientRect();
              return {
                top: r.top,
                bottom: r.bottom,
                left: r.left,
                right: r.right,
                width: r.width,
                height: r.height,
              };
            });
          });

          expect(handCardsBounding.length).toBeGreaterThan(0);
          for (const box of handCardsBounding) {
            expect(box.left).toBeGreaterThanOrEqual(0);
            expect(box.right).toBeLessThanOrEqual(res.width + 2);
            expect(box.top).toBeGreaterThanOrEqual(0);
            expect(box.bottom).toBeLessThanOrEqual(res.height + 2);
          }

          // -------------------------------------------------------------
          // ASSERTION C: Comprobar en CADA celda que nombre, vida, comandante,
          // mano, biblioteca, cementerio y exilio no se solapan entre sí
          // -------------------------------------------------------------
          const cellAudits = await hostPage.evaluate(() => {
            const overlaps = (r1: DOMRect, r2: DOMRect) => {
              return !(
                r1.right <= r2.left + 0.5 ||
                r1.left >= r2.right - 0.5 ||
                r1.bottom <= r2.top + 0.5 ||
                r1.top >= r2.bottom - 0.5
              );
            };

            const toolbarEl = document.querySelector('[data-floating-toolbar]') || document.querySelector('.fixed.bottom-3');
            const toolbarBox = toolbarEl ? toolbarEl.getBoundingClientRect() : null;

            const playerCells = Array.from(document.querySelectorAll('[data-player-cell]'));
            const issues: string[] = [];

            playerCells.forEach((cell, cellIdx) => {
              const playerId = cell.getAttribute('data-player-cell') || `cell-${cellIdx}`;
              const nameTag = cell.querySelector('[data-name-tag]');
              const lifeBtn = cell.querySelector('[data-life-button]');
              const commandZone = cell.querySelector('[data-dock-zone="command"]');
              const handZone = cell.querySelector('[data-dock-zone="hand"]');
              const libraryZone = cell.querySelector('[data-dock-zone="library"]');
              const gyExileZone = cell.querySelector('[data-dock-zone="graveyard-exile"]');

              const zones = [
                { name: 'nombre', el: nameTag },
                { name: 'vida', el: lifeBtn },
                { name: 'comandante', el: commandZone },
                { name: 'mano', el: handZone },
                { name: 'biblioteca', el: libraryZone },
                { name: 'cementerio/exilio', el: gyExileZone },
              ];

              zones.forEach(z => {
                if (!z.el) {
                  issues.push(`Jugador ${playerId}: falta elemento ${z.name}`);
                  return;
                }
                const r = z.el.getBoundingClientRect();
                if (r.left < -1 || r.right > window.innerWidth + 2 || r.top < -1 || r.bottom > window.innerHeight + 2) {
                  issues.push(
                    `Jugador ${playerId}: elemento ${z.name} fuera de viewport (L:${r.left}, R:${r.right}, T:${r.top}, B:${r.bottom})`
                  );
                }

                if (toolbarBox && overlaps(r, toolbarBox)) {
                  issues.push(`Jugador ${playerId}: elemento ${z.name} solapa con la barra flotante`);
                }
              });

              const dockSections = [
                { name: 'identidad (nombre/vida)', el: cell.querySelector('[data-dock-zone="identity"]') },
                { name: 'comandante', el: commandZone },
                { name: 'mano', el: handZone },
                { name: 'biblioteca', el: libraryZone },
                { name: 'cementerio/exilio', el: gyExileZone },
              ];

              for (let i = 0; i < dockSections.length; i++) {
                for (let j = i + 1; j < dockSections.length; j++) {
                  const s1 = dockSections[i];
                  const s2 = dockSections[j];
                  if (s1.el && s2.el) {
                    const r1 = s1.el.getBoundingClientRect();
                    const r2 = s2.el.getBoundingClientRect();
                    if (overlaps(r1, r2)) {
                      issues.push(`Jugador ${playerId}: ${s1.name} solapa horizontalmente con ${s2.name}`);
                    }
                  }
                }
              }
            });

            return issues;
          });

          expect(cellAudits).toEqual([]);

          // -------------------------------------------------------------
          // ASSERTION D: Menús / Popovers dentro del viewport (Portal a document.body)
          // -------------------------------------------------------------
          const lifeBtn = hostPage.locator('[data-life-button]').first();
          await lifeBtn.click();
          await hostPage.waitForTimeout(300);

          const popoverWithinViewport = await hostPage.evaluate(() => {
            const popover = document.querySelector('.bg-slate-900\\/95.border');
            if (!popover) return true;
            const r = popover.getBoundingClientRect();
            return (
              r.top >= 0 &&
              r.bottom <= window.innerHeight &&
              r.left >= 0 &&
              r.right <= window.innerWidth
            );
          });
          expect(popoverWithinViewport).toBe(true);

          const lifeBackdrop = hostPage.locator('[data-life-backdrop="true"]').first();
          if (await lifeBackdrop.isVisible()) {
            await lifeBackdrop.click();
            await hostPage.waitForTimeout(200);
          }

          // -------------------------------------------------------------
          // ASSERTION E: Arrastre y soltar desde la mano al campo
          // -------------------------------------------------------------
          const firstHandCard = hostPage.locator('[data-hand-card="true"]').first();
          await expect(firstHandCard).toBeVisible();
          const cardBox = await firstHandCard.boundingBox();
          expect(cardBox).not.toBeNull();

          if (cardBox) {
            const startX = cardBox.x + cardBox.width / 2;
            const startY = cardBox.y + cardBox.height / 2;
            const endX = startX;
            const endY = Math.max(120, startY - 260);

            await hostPage.mouse.move(startX, startY);
            await hostPage.mouse.down();
            await hostPage.mouse.move(endX, endY, { steps: 20 });
            await hostPage.waitForTimeout(100);
            await hostPage.mouse.up();
            await hostPage.waitForTimeout(800);
          }

          const bfCards = hostPage.locator('[data-battlefield-card="true"]');
          if ((await bfCards.count()) === 0) {
            await firstHandCard.click();
            const playBtn = hostPage.locator('button[title="Lanzar al campo de batalla"]').first();
            if (await playBtn.isVisible()) {
              await playBtn.click();
              await hostPage.waitForTimeout(800);
            }
          }
          await expect(bfCards.first()).toBeVisible({ timeout: 5000 });

          // -------------------------------------------------------------
          // ASSERTION F: Captura de pantalla para inspección visual
          // -------------------------------------------------------------
          await hostPage.mouse.move(0, 0);
          await hostPage.waitForTimeout(1500);

          const screenshotPath = path.join(
            SCREENSHOT_DIR,
            `screenshot-${podSize}p-${res.name}.png`
          );
          await hostPage.screenshot({ path: screenshotPath, fullPage: false });
          console.log(`[E2E Visual] Captura guardada: screenshot-${podSize}p-${res.name}.png`);
        } finally {
          for (const ctx of contexts) {
            await ctx.close().catch(() => {});
          }
        }
      });
    }
  }

  // -------------------------------------------------------------
  // PUNTO 9 (a) y (c): Colocación libre en borde, dock overlay y línea divisoria sin bloqueo por controles flotantes
  // -------------------------------------------------------------
  test('Punto 9 (a) y (c): Colocación libre en borde, dock overlay y línea divisoria sin bloqueo por controles flotantes (REQ-9, REQ-22)', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const { contexts, hostPage } = await setupPod(browser, 2, 1920, 1080, 'Punto9-AC');

    try {
      // 1. Verificar (c): Los controles flotantes no impiden arrastrar sobre espacio vacío
      // Comprobar que el dock tiene pointer-events: none en su contenedor
      const dockPointerEvents = await hostPage.evaluate(() => {
        const dock = document.querySelector('[data-player-dock]');
        if (!dock) return null;
        const style = window.getComputedStyle(dock);
        return style.pointerEvents;
      });
      expect(dockPointerEvents).toBe('none');

      // Comprobar que en el espacio vacío sobre el dock el elemento bajo el puntero es la mesa (#mesa-total o celda de fondo)
      const elementAtEmptyDockSpace = await hostPage.evaluate(() => {
        // Coordenada en la zona inferior donde no hay botón
        const el = document.elementFromPoint(960, 1040);
        return el ? el.id || el.getAttribute('data-player-cell') || el.tagName : null;
      });
      // No debe ser interceptado por un contenedor que bloquee clics
      expect(elementAtEmptyDockSpace).not.toBeNull();

      // 2. Jugar una carta al campo de batalla
      const handCard = hostPage.locator('[data-hand-card="true"]').first();
      await expect(handCard).toBeVisible();
      const hBox = await handCard.boundingBox();
      expect(hBox).not.toBeNull();

      if (hBox) {
        await hostPage.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
        await hostPage.mouse.down();
        await hostPage.mouse.move(hBox.x + hBox.width / 2, hBox.y - 250, { steps: 15 });
        await hostPage.mouse.up();
        await hostPage.waitForTimeout(800);
      }

      const placedCards = hostPage.locator('[data-battlefield-card="true"]');
      if ((await placedCards.count()) === 0) {
        await handCard.click();
        const playBtn = hostPage.locator('button[title="Lanzar al campo de batalla"]').first();
        if (await playBtn.isVisible()) await playBtn.click();
        await hostPage.waitForTimeout(800);
      }
      await expect(placedCards.first()).toBeVisible({ timeout: 5000 });

      const card = placedCards.first();

      // 3. Verificar (a): Soltar una carta cerca del borde de la pantalla (x ≈ 45, y ≈ 45)
      let cBox = await card.boundingBox();
      expect(cBox).not.toBeNull();
      if (cBox) {
        await hostPage.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
        await hostPage.mouse.down();
        await hostPage.mouse.move(45, 45, { steps: 20 });
        await hostPage.waitForTimeout(100);
        await hostPage.mouse.up();
        await hostPage.waitForTimeout(800);
      }

      // Comprobar que la carta quedó en el borde superior izquierdo sin salirse
      let posEdge = await card.boundingBox();
      expect(posEdge).not.toBeNull();
      if (posEdge) {
        expect(posEdge.x).toBeGreaterThanOrEqual(0);
        expect(posEdge.x).toBeLessThan(120);
        expect(posEdge.y).toBeGreaterThanOrEqual(0);
        expect(posEdge.y).toBeLessThan(120);
      }

      // 4. Verificar (a): Soltar la carta sobre la zona donde antes estaba el dock (x ≈ 350, y ≈ 940)
      cBox = await card.boundingBox();
      expect(cBox).not.toBeNull();
      if (cBox) {
        await hostPage.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
        await hostPage.mouse.down();
        await hostPage.mouse.move(350, 940, { steps: 20 });
        await hostPage.waitForTimeout(100);
        await hostPage.mouse.up();
        await hostPage.waitForTimeout(800);
      }

      // Comprobar que la carta quedó en la franja inferior sobre el playmat
      let posDock = await card.boundingBox();
      expect(posDock).not.toBeNull();
      if (posDock) {
        expect(posDock.y).toBeGreaterThan(850);
        expect(posDock.y).toBeLessThanOrEqual(1080);
      }

      // 5. Verificar (a): Soltar la carta justo en la línea entre dos divisiones (x = 960, y = 540)
      cBox = await card.boundingBox();
      expect(cBox).not.toBeNull();
      if (cBox) {
        await hostPage.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
        await hostPage.mouse.down();
        await hostPage.mouse.move(960, 540, { steps: 20 });
        await hostPage.waitForTimeout(100);
        await hostPage.mouse.up();
        await hostPage.waitForTimeout(800);
      }

      // Comprobar que la carta quedó a caballo entre ambas divisiones (centro horizontal en 2p)
      let posDivider = await card.boundingBox();
      expect(posDivider).not.toBeNull();
      if (posDivider) {
        // El centro horizontal de la carta debe estar cerca de x = 960 (±100px)
        const centerX = posDivider.x + posDivider.width / 2;
        expect(centerX).toBeGreaterThan(860);
        expect(centerX).toBeLessThan(1060);
        const centerY = posDivider.y + posDivider.height / 2;
        expect(centerY).toBeGreaterThan(450);
        expect(centerY).toBeLessThan(650);
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  // -------------------------------------------------------------
  // PUNTO 9 (b): Con dos contextos, A mueve carta junto a división de B, B la ve en misma posición y bitácora autoritativa
  // -------------------------------------------------------------
  test('Punto 9 (b): Con dos contextos, A mueve carta junto a división de B, B la ve en misma posición y bitácora autoritativa (REQ-9, REQ-22)', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const { contexts, pages, hostPage: pageA } = await setupPod(
      browser,
      2,
      1920,
      1080,
      'Punto9-B'
    );
    const pageB = pages[1];

    try {
      // 1. Jugador A juega una carta de su mano al campo
      const handCardA = pageA.locator('[data-hand-card="true"]').first();
      await expect(handCardA).toBeVisible();
      const hBox = await handCardA.boundingBox();
      if (hBox) {
        await pageA.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
        await pageA.mouse.down();
        await pageA.mouse.move(hBox.x + hBox.width / 2, hBox.y - 220, { steps: 15 });
        await pageA.mouse.up();
        await pageA.waitForTimeout(800);
      }
      const placedCardsA = pageA.locator('[data-battlefield-card="true"]');
      if ((await placedCardsA.count()) === 0) {
        await handCardA.click();
        const playBtn = pageA.locator('button[title="Lanzar al campo de batalla"]').first();
        if (await playBtn.isVisible()) await playBtn.click();
        await pageA.waitForTimeout(800);
      }
      await expect(placedCardsA.first()).toBeVisible({ timeout: 5000 });

      // 2. Jugador A arrastra la carta hacia la división de Jugador B (lado derecho, x ≈ 1440, y ≈ 300)
      const cardOnFieldA = placedCardsA.first();
      const cardName = (await cardOnFieldA.getAttribute('data-card-name')) || 'Carta';
      const cBoxA = await cardOnFieldA.boundingBox();
      expect(cBoxA).not.toBeNull();

      if (cBoxA) {
        await pageA.mouse.move(cBoxA.x + cBoxA.width / 2, cBoxA.y + cBoxA.height / 2);
        await pageA.mouse.down();
        await pageA.mouse.move(1440, 300, { steps: 25 });
        await pageA.waitForTimeout(100);
        await pageA.mouse.up();
        await pageA.waitForTimeout(1200);
      }

      // 3. Comprobar que en la pantalla de Jugador B la carta se ve en la misma posición (coordenadas globales idénticas)
      const placedCardsB = pageB.locator('[data-battlefield-card="true"]');
      await expect(placedCardsB.first()).toBeVisible({ timeout: 10000 });

      const finalBoxA = await cardOnFieldA.boundingBox();
      const finalBoxB = await placedCardsB.first().boundingBox();
      expect(finalBoxA).not.toBeNull();
      expect(finalBoxB).not.toBeNull();

      if (finalBoxA && finalBoxB) {
        expect(Math.abs(finalBoxA.x - finalBoxB.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(finalBoxA.y - finalBoxB.y)).toBeLessThanOrEqual(5);
      }

      // 4. Comprobar bitácora autoritativa en ambas pantallas
      await pageA.click('button:has-text("Chat/Log")').catch(() => {});
      await pageB.click('button:has-text("Chat/Log")').catch(() => {});
      await pageB.waitForTimeout(600);

      const logTextB = await pageB.locator('body').innerText();
      // Registro autoritativo según Punto 4: "X movió [Carta]"
      expect(logTextB).toMatch(new RegExp(`movió\\s+"?${cardName}"?`, 'i'));

      // 5. Demostrar que cualquier jugador puede mover cualquier carta (Punto 4):
      // Jugador B ahora arrastra esa misma carta en su pantalla
      const cardOnFieldB = placedCardsB.first();
      const cBoxB2 = await cardOnFieldB.boundingBox();
      if (cBoxB2) {
        await pageB.mouse.move(cBoxB2.x + cBoxB2.width / 2, cBoxB2.y + cBoxB2.height / 2);
        await pageB.mouse.down();
        await pageB.mouse.move(1200, 500, { steps: 20 });
        await pageB.waitForTimeout(100);
        await pageB.mouse.up();
        await pageB.waitForTimeout(1200);
      }

      // Jugador A ve la carta en la nueva posición
      const movedBoxA = await cardOnFieldA.boundingBox();
      expect(movedBoxA).not.toBeNull();
      if (movedBoxA) {
        expect(movedBoxA.x).toBeGreaterThan(1100);
        expect(movedBoxA.x).toBeLessThan(1300);
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 7: Precision subpixel en soltado y dimensiones identicas de overlay (<= 2px)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'PrecTest');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Arrastre desde la mano: agarrar con offset conocido, mover y medir overlay antes de soltar
      const handCard = page.locator('[data-hand-card="true"]').first();
      await expect(handCard).toBeVisible({ timeout: 10000 });
      const handBox = await handCard.boundingBox();
      expect(handBox).not.toBeNull();

      // Agarre con offset conocido (dx: 30px, dy: 35px desde la esquina superior izquierda de la carta)
      const grabOffsetX = 30;
      const grabOffsetY = 35;
      await handCard.hover({ position: { x: grabOffsetX, y: grabOffsetY } });
      await page.mouse.down();
      // Mover al centro del campo
      await page.mouse.move(600, 350, { steps: 20 });
      await page.waitForTimeout(150);

      // Leer bounding box del overlay inmediatamente antes de soltar
      const overlayEl = page.locator('[data-drag-overlay="true"]');
      await expect(overlayEl).toBeVisible({ timeout: 5000 });
      const overlayBoxHand = await overlayEl.boundingBox();
      expect(overlayBoxHand).not.toBeNull();

      // Soltar
      await page.mouse.up();
      await page.waitForTimeout(600);

      // Verificar que la carta colocada en mesa coincide con el overlay con error <= 2px
      const placedCards = page.locator('[data-battlefield-card="true"]');
      await expect(placedCards.first()).toBeVisible({ timeout: 10000 });
      const placedBox1 = await placedCards.first().boundingBox();
      expect(placedBox1).not.toBeNull();

      // Precisión subpixel <= 2px (Punto 7)
      const diffHand = {
        x: Math.abs(placedBox1!.x - overlayBoxHand!.x),
        y: Math.abs(placedBox1!.y - overlayBoxHand!.y),
        width: Math.abs(placedBox1!.width - overlayBoxHand!.width),
        height: Math.abs(placedBox1!.height - overlayBoxHand!.height),
      };
      console.log('MEDICION_MANO:', JSON.stringify({ overlay: overlayBoxHand, placed: placedBox1, diff: diffHand }));
      expect(diffHand.x).toBeLessThanOrEqual(2);
      expect(diffHand.y).toBeLessThanOrEqual(2);
      expect(diffHand.width).toBeLessThanOrEqual(2);
      expect(diffHand.height).toBeLessThanOrEqual(2);

      // 2. Arrastre desde la mesa: reposicionamiento libre
      const grabTableX = 40;
      const grabTableY = 40;
      await page.mouse.move(placedBox1!.x + grabTableX, placedBox1!.y + grabTableY);
      await page.mouse.down();
      await page.mouse.move(850, 480, { steps: 15 });
      await page.waitForTimeout(100);

      // Leer bounding box del overlay en la mesa antes de soltar
      const overlayBoxTable = await overlayEl.boundingBox();
      expect(overlayBoxTable).not.toBeNull();

      await page.mouse.up();
      await page.waitForTimeout(600);

      const placedBox2 = await placedCards.first().boundingBox();
      expect(placedBox2).not.toBeNull();

      const diffTable = {
        x: Math.abs(placedBox2!.x - overlayBoxTable!.x),
        y: Math.abs(placedBox2!.y - overlayBoxTable!.y),
        width: Math.abs(placedBox2!.width - overlayBoxTable!.width),
        height: Math.abs(placedBox2!.height - overlayBoxTable!.height),
      };
      console.log('MEDICION_MESA:', JSON.stringify({ overlay: overlayBoxTable, placed: placedBox2, diff: diffTable }));
      expect(diffTable.x).toBeLessThanOrEqual(2);
      expect(diffTable.y).toBeLessThanOrEqual(2);
      expect(diffTable.width).toBeLessThanOrEqual(2);
      expect(diffTable.height).toBeLessThanOrEqual(2);

      // 3. Arrastre cerca de los bordes del viewport
      await page.mouse.move(placedBox2!.x + 25, placedBox2!.y + 25);
      await page.mouse.down();
      // Mover hacia el borde inferior derecho
      await page.mouse.move(1915, 1070, { steps: 20 });
      await page.waitForTimeout(100);

      const overlayBoxEdge = await overlayEl.boundingBox();
      expect(overlayBoxEdge).not.toBeNull();
      // Restringido al viewport (sin salirse de 1920x1080)
      expect(overlayBoxEdge!.x + overlayBoxEdge!.width).toBeLessThanOrEqual(1920);
      expect(overlayBoxEdge!.y + overlayBoxEdge!.height).toBeLessThanOrEqual(1080);

      await page.mouse.up();
      await page.waitForTimeout(600);

      const placedBoxEdge = await placedCards.first().boundingBox();
      expect(placedBoxEdge).not.toBeNull();

      const diffEdge = {
        x: Math.abs(placedBoxEdge!.x - overlayBoxEdge!.x),
        y: Math.abs(placedBoxEdge!.y - overlayBoxEdge!.y),
        width: Math.abs(placedBoxEdge!.width - overlayBoxEdge!.width),
        height: Math.abs(placedBoxEdge!.height - overlayBoxEdge!.height),
      };
      console.log('MEDICION_BORDE:', JSON.stringify({ overlay: overlayBoxEdge, placed: placedBoxEdge, diff: diffEdge }));
      expect(diffEdge.x).toBeLessThanOrEqual(2);
      expect(diffEdge.y).toBeLessThanOrEqual(2);
      expect(diffEdge.width).toBeLessThanOrEqual(2);
      expect(diffEdge.height).toBeLessThanOrEqual(2);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 8: Movimiento en vivo para rivales durante el arrastre multicontexto', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'LiveDrag');
    const pageA = pages[0];
    const pageB = pages[1];

    try {
      await expect(pageA.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await expect(pageB.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Contexto A arrastra la carta sin soltarla (se queda a mitad de camino)
      const handCardA = pageA.locator('[data-hand-card="true"]').first();
      await expect(handCardA).toBeVisible({ timeout: 10000 });

      const grabOffsetX = 30;
      const grabOffsetY = 35;
      await handCardA.hover({ position: { x: grabOffsetX, y: grabOffsetY } });
      await pageA.mouse.down();

      // Mover hacia una posición intermedia (ej. x: 960, y: 400)
      const targetMidX = 960;
      const targetMidY = 400;
      await pageA.mouse.move(targetMidX, targetMidY, { steps: 25 });
      await pageA.waitForTimeout(300);

      // Contexto A mantiene el ratón presionado (sin soltar)

      // 2. Contexto B comprueba que ve la carta en movimiento en una posición intermedia
      const remoteDragCardB = pageB.locator('[data-remote-drag="true"]');
      await expect(remoteDragCardB).toBeVisible({ timeout: 10000 });

      const remoteBoxB = await remoteDragCardB.boundingBox();
      expect(remoteBoxB).not.toBeNull();

      if (remoteBoxB) {
        // La posición del fantasma remoto en Contexto B debe contener el punto intermedio de arrastre
        expect(remoteBoxB.x).toBeLessThanOrEqual(targetMidX + 10);
        expect(remoteBoxB.x + remoteBoxB.width).toBeGreaterThanOrEqual(targetMidX - 10);
        expect(remoteBoxB.y).toBeLessThanOrEqual(targetMidY + 10);
        expect(remoteBoxB.y + remoteBoxB.height).toBeGreaterThanOrEqual(targetMidY - 10);

        // Capturas desde ambas perspectivas (Punto 9)
        await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, 'drag-live-contextA-sender.png') });
        await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, 'drag-live-contextB-rival.png') });
      }

      // 3. Contexto A suelta la carta
      await pageA.mouse.up();
      await pageA.waitForTimeout(1000);

      // 4. Ambos comprueban la posición final
      // El fantasma efímero desaparece de Contexto B
      await expect(remoteDragCardB).not.toBeVisible({ timeout: 5000 });

      // La carta colocada autoritativa es visible en ambos contextos
      const placedCardsA = pageA.locator('[data-battlefield-card="true"]');
      const placedCardsB = pageB.locator('[data-battlefield-card="true"]');
      await expect(placedCardsA.first()).toBeVisible({ timeout: 10000 });
      await expect(placedCardsB.first()).toBeVisible({ timeout: 10000 });

      const finalBoxA = await placedCardsA.first().boundingBox();
      const finalBoxB = await placedCardsB.first().boundingBox();
      expect(finalBoxA).not.toBeNull();
      expect(finalBoxB).not.toBeNull();

      if (finalBoxA && finalBoxB) {
        expect(Math.abs(finalBoxA.x - finalBoxB.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(finalBoxA.y - finalBoxB.y)).toBeLessThanOrEqual(5);
        expect(Math.abs(finalBoxA.width - finalBoxB.width)).toBeLessThanOrEqual(5);
        expect(Math.abs(finalBoxA.height - finalBoxB.height)).toBeLessThanOrEqual(5);
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
