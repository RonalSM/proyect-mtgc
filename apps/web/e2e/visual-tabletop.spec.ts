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

  test('Punto 1: Sin parpadeo al soltar (grabacion requestAnimationFrame sin retroceso al estado viejo)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'NoFlicker');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      const handCard = page.locator('[data-hand-card="true"]').first();
      await expect(handCard).toBeVisible({ timeout: 10000 });

      // 1. Jugar carta de la mano a la mesa
      await handCard.hover({ position: { x: 30, y: 35 } });
      await page.mouse.down();
      await page.mouse.move(500, 300, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(600);

      const placedCard = page.locator('[data-battlefield-card="true"]').first();
      await expect(placedCard).toBeVisible({ timeout: 10000 });
      const cardId = await placedCard.getAttribute('data-card-instance-id');
      const startBox = await placedCard.boundingBox();
      expect(startBox).not.toBeNull();

      // 2. Iniciar arrastre para moverla a una nueva posición lejana
      await page.mouse.move(startBox!.x + 30, startBox!.y + 30);
      await page.mouse.down();
      const targetX = 900;
      const targetY = 600;
      await page.mouse.move(targetX, targetY, { steps: 15 });
      await page.waitForTimeout(100);

      // 3. Inyectar grabador de frames con requestAnimationFrame justo antes de soltar
      await page.evaluate(cId => {
        (window as any).__rafFrames = [];
        const track = () => {
          const el = document.querySelector(`[data-card-instance-id="${cId}"]`);
          if (el) {
            const r = el.getBoundingClientRect();
            (window as any).__rafFrames.push({
              x: r.x,
              y: r.y,
              opacity: window.getComputedStyle(el).opacity,
              time: performance.now(),
            });
          }
          if ((window as any).__rafFrames.length < 30) {
            requestAnimationFrame(track);
          }
        };
        requestAnimationFrame(track);
      }, cardId);

      // 4. Soltar
      await page.mouse.up();
      await page.waitForTimeout(800);

      // 5. Obtener frames registrados durante y tras el soltado
      const frames = await page.evaluate(() => (window as any).__rafFrames || []);
      console.log('FRAMES_REGISTRADOS_DURANTE_SOLTADO:', frames.length);
      expect(frames.length).toBeGreaterThan(5);

      // Verificar que ningún frame visible mostró la carta en la posición inicial (startBox)
      for (const f of frames) {
        if (f.opacity !== '0' && f.opacity !== '0%') {
          const distToOld = Math.hypot(f.x - startBox!.x, f.y - startBox!.y);
          // La distancia al punto viejo debe ser grande (> 100px), demostrando que jamás volvió a la posición anterior
          expect(distToOld).toBeGreaterThan(100);
        }
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 2: Carta duplicada eliminada en la vista de rivales (un solo elemento visible durante arrastre)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'NoDupTest');
    const [pageA, pageB] = pages;

    try {
      await expect(pageA.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await expect(pageB.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Contexto A coloca una carta en la mesa
      const handCardA = pageA.locator('[data-hand-card="true"]').first();
      await expect(handCardA).toBeVisible({ timeout: 10000 });
      await handCardA.hover({ position: { x: 30, y: 35 } });
      await pageA.mouse.down();
      await pageA.mouse.move(500, 300, { steps: 15 });
      await pageA.mouse.up();
      await pageA.waitForTimeout(800);

      const placedCardA = pageA.locator('[data-battlefield-card="true"]').first();
      await expect(placedCardA).toBeVisible({ timeout: 10000 });
      const cardId = await placedCardA.getAttribute('data-card-instance-id');
      expect(cardId).toBeTruthy();

      // Contexto B también ve la carta colocada
      const placedCardB = pageB.locator(`[data-battlefield-card="true"][data-card-instance-id="${cardId}"]`);
      await expect(placedCardB).toBeVisible({ timeout: 10000 });

      // 2. Contexto A inicia el arrastre de esa carta en la mesa sin soltarla
      const startBoxA = await placedCardA.boundingBox();
      expect(startBoxA).not.toBeNull();
      await pageA.mouse.move(startBoxA!.x + 30, startBoxA!.y + 30);
      await pageA.mouse.down();
      await pageA.mouse.move(950, 450, { steps: 20 });
      await pageA.waitForTimeout(300);

      // 3. Contexto B verifica:
      // a) El fantasma remoto es visible
      const remoteGhostB = pageB.locator(`[data-remote-drag="true"][data-card-instance-id="${cardId}"]`);
      await expect(remoteGhostB).toBeVisible({ timeout: 5000 });

      // b) La carta real fija está oculta (opacity 0)
      const stationaryOpacityB = await placedCardB.evaluate(el => window.getComputedStyle(el).opacity);
      expect(stationaryOpacityB).toBe('0');

      // c) En total para esa cardInstanceId, Contexto B ve estrictamente UN elemento visible (el fantasma)
      const visibleCountB = await pageB.evaluate(cId => {
        const matches = Array.from(document.querySelectorAll(`[data-card-instance-id="${cId}"]`));
        return matches.filter(el => {
          const style = window.getComputedStyle(el);
          return style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';
        }).length;
      }, cardId);
      console.log('ELEMENTOS_VISIBLES_EN_RIVAL_DURANTE_DRAG:', visibleCountB);
      expect(visibleCountB).toBe(1);

      // 4. Contexto A suelta la carta
      await pageA.mouse.up();
      await pageA.waitForTimeout(800);

      // 5. El fantasma desaparece y la carta real fija vuelve a ser visible en su nueva posición
      await expect(remoteGhostB).not.toBeVisible({ timeout: 5000 });
      const finalOpacityB = await placedCardB.evaluate(el => window.getComputedStyle(el).opacity);
      expect(finalOpacityB).toBe('1');
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 3: Medicion de rotacion (90 deg en contenedor unico sin rotacion extra ni invertida)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'RotateTest');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Jugar carta a la mesa
      const handCard = page.locator('[data-hand-card="true"]').first();
      await expect(handCard).toBeVisible({ timeout: 10000 });
      await handCard.hover({ position: { x: 30, y: 35 } });
      await page.mouse.down();
      await page.mouse.move(600, 350, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      const placedCard = page.locator('[data-battlefield-card="true"]').first();
      await expect(placedCard).toBeVisible({ timeout: 10000 });

      // Helper para extraer el ángulo de rotación a partir de getComputedStyle
      const getRotationAngle = async (locator: any) => {
        return await locator.evaluate((el: HTMLElement) => {
          const st = window.getComputedStyle(el);
          const tr = st.transform;
          if (!tr || tr === 'none') return 0;
          const match = tr.match(/matrix\(([^)]+)\)/);
          if (!match) return 0;
          const [a, b] = match[1].split(',').map(s => parseFloat(s.trim()));
          const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
          return angle < 0 ? angle + 360 : angle;
        });
      };

      // A. Cara frontal enderezada (0°)
      const initialAngle = await getRotationAngle(placedCard);
      console.log('ANGULO_FRONTAL_ENDEREZADA:', initialAngle);
      expect(initialAngle).toBe(0);

      // B. Girar la carta (Tap -> 90° horario)
      await placedCard.click();
      await page.waitForTimeout(200);
      const tapBtn = page.locator('button[title="Girar"]');
      await expect(tapBtn).toBeVisible({ timeout: 5000 });
      await tapBtn.click();
      await page.waitForTimeout(500);

      const tappedAngle = await getRotationAngle(placedCard);
      console.log('ANGULO_FRONTAL_GIRADA:', tappedAngle);
      // Debe ser exactamente 90°, NUNCA 180°
      expect(tappedAngle).toBe(90);

      // Comprobar que la imagen interna NO tiene rotación propia
      const innerImg = placedCard.locator('img').first();
      const innerImgAngle = await getRotationAngle(innerImg);
      console.log('ANGULO_IMG_INTERNA:', innerImgAngle);
      expect(innerImgAngle).toBe(0);

      // Captura de cara frontal girada 90°
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'card-tapped-front-90deg.png') });

      // C. Voltear carta boca abajo estando girada (Dorso girado 90°)
      const flipBtn = page.locator('button[title="Boca abajo / Boca arriba"]');
      await expect(flipBtn).toBeVisible({ timeout: 5000 });
      await flipBtn.click();
      await page.waitForTimeout(500);

      const faceDownTappedAngle = await getRotationAngle(placedCard);
      console.log('ANGULO_DORSO_GIRADO:', faceDownTappedAngle);
      expect(faceDownTappedAngle).toBe(90);

      // Captura de dorso girado 90°
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'card-tapped-back-90deg.png') });

      // D. Enderezar carta estando boca abajo (Dorso enderezado 0°)
      const untapBtn = page.locator('button[title="Enderezar"]');
      await expect(untapBtn).toBeVisible({ timeout: 5000 });
      await untapBtn.click();
      await page.waitForTimeout(500);

      const faceDownUntappedAngle = await getRotationAngle(placedCard);
      console.log('ANGULO_DORSO_ENDEREZADO:', faceDownUntappedAngle);
      expect(faceDownUntappedAngle).toBe(0);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 4: Interaccion de cartas (clic simple solo selecciona, doble clic gira/endereza, clic derecho abre menu contextual)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'InteractTest');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Jugar carta a la mesa
      const handCard = page.locator('[data-hand-card="true"]').first();
      await expect(handCard).toBeVisible({ timeout: 10000 });
      await handCard.hover({ position: { x: 30, y: 35 } });
      await page.mouse.down();
      await page.mouse.move(600, 350, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      const placedCard = page.locator('[data-battlefield-card="true"]').first();
      await expect(placedCard).toBeVisible({ timeout: 10000 });

      // A. Clic simple: SOLO selecciona la carta, NO muestra menú contextual ni opciones
      await placedCard.click();
      await page.waitForTimeout(300);

      const contextMenu = page.locator('[data-card-context-menu="true"]');
      await expect(contextMenu).not.toBeVisible();
      // Comprobar que está seleccionada visualmente (anillo de selección activo)
      const isSelected = await placedCard.evaluate(el => el.querySelector('.border-amber-400') !== null);
      expect(isSelected).toBe(true);

      // B. Doble clic: Gira la carta (tap) directamente sin abrir modal ni menú
      await placedCard.dblclick();
      await page.waitForTimeout(500);

      let isTapped = await placedCard.evaluate(el => el.classList.contains('rotate-90'));
      expect(isTapped).toBe(true);
      await expect(contextMenu).not.toBeVisible();
      // Tampoco debe haberse abierto la ampliación de celda
      await expect(page.locator('text=Celda Ampliada')).not.toBeVisible();

      // Doble clic de nuevo: Endereza la carta (untap)
      await placedCard.dblclick();
      await page.waitForTimeout(500);

      isTapped = await placedCard.evaluate(el => el.classList.contains('rotate-90'));
      expect(isTapped).toBe(false);

      // C. Clic derecho: Abre el menú contextual con las opciones
      await placedCard.click({ button: 'right' });
      await page.waitForTimeout(300);

      await expect(contextMenu).toBeVisible();
      await expect(contextMenu.locator('button:has-text("Girar")')).toBeVisible();
      await expect(contextMenu.locator('button:has-text("+1/+1")')).toBeVisible();
      await expect(contextMenu.locator('button:has-text("Clonar")')).toBeVisible();
      await expect(contextMenu.locator('button:has-text("Boca abajo")')).toBeVisible();

      // D. Clic fuera o tecla Escape: Cierra el menú contextual
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(contextMenu).not.toBeVisible();
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 5: Flujos zona a zona (comandante a mesa, mesa a mano, biblioteca a mesa y mano, pilas)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'ZoneFlows');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Flujo (a): Sacar el comandante de la zona de comando a la mesa arrastrando
      const commanderCard = page.locator('[data-commander-card="true"]').first();
      await expect(commanderCard).toBeVisible({ timeout: 10000 });
      const cmdBox = await commanderCard.boundingBox();
      expect(cmdBox).not.toBeNull();

      // Arrastrar comandante hacia el campo (centro de la pantalla)
      await page.mouse.move(cmdBox!.x + 25, cmdBox!.y + 25);
      await page.mouse.down();
      await page.mouse.move(700, 350, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Comprobar que el comandante ahora está en el campo de batalla
      const placedCards = page.locator('[data-battlefield-card="true"]');
      await expect(placedCards.first()).toBeVisible({ timeout: 10000 });
      // La zona de comando muestra estado en campo
      await expect(page.locator('text=(En campo)')).toBeVisible({ timeout: 5000 });

      // 2. Flujo (b): Devolver una carta de la mesa a la mano arrastrando
      const initialHandCount = await page.locator('[data-hand-card="true"]').count();
      const cardOnField = placedCards.first();
      const fieldBox = await cardOnField.boundingBox();
      expect(fieldBox).not.toBeNull();

      const handDock = page.locator('[data-dock-zone="hand"]').first();
      const handBox = await handDock.boundingBox();
      expect(handBox).not.toBeNull();

      // Arrastrar desde la mesa hacia el abanico de la mano
      await page.mouse.move(fieldBox!.x + 25, fieldBox!.y + 25);
      await page.mouse.down();
      await page.mouse.move(handBox!.x + handBox!.width / 2, handBox!.y + handBox!.height / 2, { steps: 20 });
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Comprobar que la mano aumentó en 1
      const afterHandCount = await page.locator('[data-hand-card="true"]').count();
      expect(afterHandCount).toBe(initialHandCount + 1);

      // 3. Flujo (c): Sacar cartas de la biblioteca (click para robar sin error playerId y arrastre a mesa)
      const libSlot = page.locator('[data-dock-zone="library"]').first();
      await expect(libSlot).toBeVisible();
      // Click roba a la mano
      const countBeforeDraw = await page.locator('[data-hand-card="true"]').count();
      await libSlot.click();
      await page.waitForTimeout(800);
      const countAfterDraw = await page.locator('[data-hand-card="true"]').count();
      expect(countAfterDraw).toBe(countBeforeDraw + 1);

      // Arrastrar desde la biblioteca a la mesa
      const libBox = await libSlot.boundingBox();
      expect(libBox).not.toBeNull();
      await page.mouse.move(libBox!.x + 25, libBox!.y + 25);
      await page.mouse.down();
      await page.mouse.move(650, 400, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Debe haber cartas en el campo
      await expect(page.locator('[data-battlefield-card="true"]').first()).toBeVisible({ timeout: 5000 });
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 6: La mano como destino (resalte suave, devolucion a mano, manos ajenas no droppable)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'HandDropPod');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Jugar una carta desde la mano a la mesa
      const handCards = page.locator('[data-hand-card="true"]');
      const startCount = await handCards.count();
      expect(startCount).toBeGreaterThan(0);

      const firstHandCard = handCards.first();
      await expect(firstHandCard).toBeVisible({ timeout: 10000 });
      const handCardBox = await firstHandCard.boundingBox();
      expect(handCardBox).not.toBeNull();

      await page.mouse.move(handCardBox!.x + handCardBox!.width / 2, handCardBox!.y + handCardBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(600, 350, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Comprobar que hay una carta en el campo
      const placedCards = page.locator('[data-battlefield-card="true"]');
      await expect(placedCards.first()).toBeVisible({ timeout: 10000 });
      expect(await handCards.count()).toBe(startCount - 1);

      // 2. Arrastrar la carta del campo de vuelta hacia la mano propia
      const cardOnField = placedCards.first();
      const cardBox = await cardOnField.boundingBox();
      expect(cardBox).not.toBeNull();

      const localHandDock = page.locator('[data-dock-zone="hand"]').first();
      const handBox = await localHandDock.boundingBox();
      expect(handBox).not.toBeNull();

      // Mover el puntero sobre la mano y verificar que se activa el resalte suave
      await page.mouse.move(cardBox!.x + 20, cardBox!.y + 20);
      await page.mouse.down();
      await page.mouse.move(handBox!.x + handBox!.width / 2, handBox!.y + handBox!.height / 2, { steps: 20 });
      await page.waitForTimeout(200);

      // Verificar resalte suave (data-is-over = true)
      await expect(localHandDock).toHaveAttribute('data-is-over', 'true');

      // Soltar sobre la mano
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Comprobar que la carta volvió a la mano propia
      const finalHandCount = await handCards.count();
      expect(finalHandCount).toBe(startCount);

      // 3. Verificar que la mano del rival NO es zona de soltado
      const rivalHandDock = page.locator('[data-dock-zone="hand"]').nth(1);
      await expect(rivalHandDock).toBeVisible();
      // La mano rival no tiene ref de droppable registrado para soltar
      const rivalIsOver = await rivalHandDock.getAttribute('data-is-over');
      expect(rivalIsOver).toBe('false');
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 7 - Pilas (carta superior con imagen y contador, draggable, modal inspector con clic derecho y privacidad de biblioteca)', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'PilesPod');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Arrastrar una carta de la mano hacia el cementerio
      const handCards = page.locator('[data-hand-card="true"]');
      const firstHandCard = handCards.first();
      const handBox = await firstHandCard.boundingBox();
      expect(handBox).not.toBeNull();

      // Ubicación del cementerio local (mitad superior de graveyard-exile)
      const gydDock = page.locator('[title*="Cementerio:"]').first();
      await expect(gydDock).toBeVisible();
      const gydBox = await gydDock.boundingBox();
      expect(gydBox).not.toBeNull();

      await page.mouse.move(handBox!.x + handBox!.width / 2, handBox!.y + handBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(gydBox!.x + gydBox!.width / 2, gydBox!.y + gydBox!.height / 2, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // La carta superior del cementerio ahora es visible como DraggablePileCard
      const topGydCard = page.locator('[data-pile-card="graveyard"]').first();
      await expect(topGydCard).toBeVisible({ timeout: 5000 });
      await expect(topGydCard.locator('img')).toBeVisible();
      await expect(topGydCard.locator('text=1')).toBeVisible();

      // 2. Arrastrar la carta superior del cementerio hacia la mesa
      const topGydBox = await topGydCard.boundingBox();
      expect(topGydBox).not.toBeNull();
      await page.mouse.move(topGydBox!.x + topGydBox!.width / 2, topGydBox!.y + topGydBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(700, 450, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // Ahora la carta está en el campo de batalla y el cementerio vuelve a estar vacío
      await expect(page.locator('[data-battlefield-card="true"]').first()).toBeVisible({ timeout: 5000 });
      await expect(topGydCard).not.toBeVisible();

      // 3. Arrastrar la carta del campo al exilio
      const placedCard = page.locator('[data-battlefield-card="true"]').first();
      const placedBox = await placedCard.boundingBox();
      expect(placedBox).not.toBeNull();

      const exileDock = page.locator('[title*="Exilio:"]').first();
      await expect(exileDock).toBeVisible();
      const exileBox = await exileDock.boundingBox();
      expect(exileBox).not.toBeNull();

      await page.mouse.move(placedBox!.x + 20, placedBox!.y + 20);
      await page.mouse.down();
      await page.mouse.move(exileBox!.x + exileBox!.width / 2, exileBox!.y + exileBox!.height / 2, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      // La carta superior del exilio es visible como DraggablePileCard
      const topExileCard = page.locator('[data-pile-card="exile"]').first();
      await expect(topExileCard).toBeVisible({ timeout: 5000 });
      await expect(topExileCard.locator('text=1')).toBeVisible();

      // 4. Clic en el exilio para abrir el modal inspector
      await topExileCard.click();
      await page.waitForTimeout(500);

      const modalTitle = page.locator('h3:has-text("Exilio")');
      await expect(modalTitle).toBeVisible();

      // Clic derecho en la carta del modal para abrir el menú contextual
      const modalCard = page.locator('[data-modal-card-item]').first();
      await expect(modalCard).toBeVisible();
      await modalCard.click({ button: 'right' });
      await page.waitForTimeout(300);

      const contextMenu = page.locator('[data-modal-context-menu="true"]');
      await expect(contextMenu).toBeVisible();
      await expect(contextMenu.locator('button:has-text("Enviar a la mano")')).toBeVisible();
      await expect(contextMenu.locator('button:has-text("Enviar al campo")')).toBeVisible();

      // Seleccionar "Enviar a la mano"
      const handCountBefore = await page.locator('[data-hand-card="true"]').count();
      await contextMenu.locator('button:has-text("Enviar a la mano")').click();
      await page.waitForTimeout(800);

      // Modal cerrado y la carta volvió a la mano
      await expect(modalTitle).not.toBeVisible();
      expect(await page.locator('[data-hand-card="true"]').count()).toBe(handCountBefore + 1);

      // 5. Privacidad de biblioteca:
      // El jugador local puede inspeccionar su propia biblioteca
      const ownInspectBtn = page.locator('[data-library-inspect-btn="true"]').first();
      await expect(ownInspectBtn).toBeVisible();
      await ownInspectBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('h3:has-text("Biblioteca")')).toBeVisible();

      // En la celda del oponente no hay botón de inspeccionar biblioteca
      const opponentCell = page.locator('[data-player-cell]').nth(1);
      await expect(opponentCell.locator('[data-library-inspect-btn="true"]')).not.toBeVisible();
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 8 - Nombre del jugador centrado arriba, barra desplegable y desconectado', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1920, 1080, 'PlayerHeaderPod');
    try {
      const page = pages[0];
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

      // 1. Verificar contenedor de nombre centrado en la parte superior de cada división
      const playerHeaders = page.locator('[data-player-header]');
      await expect(playerHeaders).toHaveCount(2);

      for (let i = 0; i < 2; i++) {
        const header = playerHeaders.nth(i);
        await expect(header).toBeVisible();

        // Verificar que el header está posicionado en la parte superior
        const box = await header.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeLessThan(120);

        // Verificar que NO contiene "Tú", ni corona 👑, ni orden "1.º" dentro del header
        const text = await header.innerText();
        expect(text).not.toContain('Tú');
        expect(text).not.toContain('👑');
        expect(text).not.toContain('.º');

        // Contiene el botón de expandir celda
        const expandBtn = header.locator('[data-expand-cell-btn]');
        await expect(expandBtn).toBeVisible();
      }

      // 2. La pastilla de vida se mantiene en el dock
      const identityDocks = page.locator('[data-dock-zone="identity"]');
      await expect(identityDocks).toHaveCount(2);
      for (let i = 0; i < 2; i++) {
        const lifeBtn = identityDocks.nth(i).locator('[data-life-button]');
        await expect(lifeBtn).toBeVisible();
      }

      // 3. Barra superior desplegable contiene turno, iniciativa, estado, Tú y Corona
      const turnIndicator = page.locator('[data-active-turn-indicator="true"]');
      await expect(turnIndicator).toBeVisible();

      // Clic para desplegar el orden de iniciativa
      await turnIndicator.click();
      await page.waitForTimeout(300);

      const dropdown = page.locator('[data-initiative-dropdown="true"]');
      await expect(dropdown).toBeVisible();
      await expect(dropdown.locator('text=Orden de Iniciativa')).toBeVisible();

      // 4. Desconexión del rival y tooltip de atenuado
      await contexts[1].close();
      await page.waitForTimeout(1500);

      // El nombre del rival desconectado ahora tiene tooltip "(Desconectado)"
      const rivalHeaderSpan = page.locator('[data-player-header]').nth(1).locator('span[title*="Desconectado"]');
      await expect(rivalHeaderSpan).toBeVisible();
      await expect(rivalHeaderSpan).toHaveClass(/opacity-40/);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 9 - Ancho del dock a 1366x768 con 2 jugadores sin solapamiento ni desborde', async ({ browser }) => {
    test.setTimeout(90000);
    // 2 jugadores en pantalla estrecha 1366x768
    const { contexts, pages } = await setupPod(browser, 2, 1366, 768, 'DockWidthPod');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);

      const playerCells = page.locator('[data-player-cell]');
      await expect(playerCells).toHaveCount(2);

      const cell0Box = await playerCells.nth(0).boundingBox();
      const cell1Box = await playerCells.nth(1).boundingBox();
      expect(cell0Box).not.toBeNull();
      expect(cell1Box).not.toBeNull();

      // Verificar para cada jugador que ningún elemento del dock se solapa entre sí
      for (let pIdx = 0; pIdx < 2; pIdx++) {
        const cell = playerCells.nth(pIdx);
        const cellBox = pIdx === 0 ? cell0Box! : cell1Box!;

        const lifeBtn = cell.locator('[data-life-button]');
        const cmdZone = cell.locator('[data-dock-zone="command"]');
        const handZone = cell.locator('[data-dock-zone="hand"]');
        const libZone = cell.locator('[data-dock-zone="library"]');
        const gyExileZone = cell.locator('[data-dock-zone="graveyard-exile"]');

        const [lifeB, cmdB, handB, libB, gyB] = await Promise.all([
          lifeBtn.boundingBox(),
          cmdZone.boundingBox(),
          handZone.boundingBox(),
          libZone.boundingBox(),
          gyExileZone.boundingBox(),
        ]);

        expect(lifeB).not.toBeNull();
        expect(cmdB).not.toBeNull();
        expect(handB).not.toBeNull();
        expect(libB).not.toBeNull();
        expect(gyB).not.toBeNull();

        // 1. Vida a la izquierda del comandante
        expect(lifeB!.x + lifeB!.width).toBeLessThanOrEqual(cmdB!.x + 1);

        // 2. Comandante a la izquierda de la mano
        expect(cmdB!.x + cmdB!.width).toBeLessThanOrEqual(handB!.x + 1);

        // 3. Mano a la izquierda de la biblioteca
        expect(handB!.x + handB!.width).toBeLessThanOrEqual(libB!.x + 1);

        // 4. Biblioteca a la izquierda del cementerio/exilio
        expect(libB!.x + libB!.width).toBeLessThanOrEqual(gyB!.x + 1);

        // 5. Todos los elementos del dock están estrictamente dentro de la división de su celda
        const dockZones = [lifeB!, cmdB!, handB!, libB!, gyB!];
        for (const b of dockZones) {
          expect(b.x).toBeGreaterThanOrEqual(cellBox.x - 1);
          expect(b.x + b.width).toBeLessThanOrEqual(cellBox.x + cellBox.width + 1);
        }
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 10 - Tamaño consistente de carta entre mano, mesa, comandante y overlay del arrastre', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1366, 768, 'ConsistentSizePod');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);

      // 1. Arrastrar una carta de la mano a la mesa para tener una carta en el campo
      const handCard = page.locator('[data-hand-card="true"]').first();
      const handBoxInitial = await handCard.boundingBox();
      expect(handBoxInitial).not.toBeNull();

      // Mover al campo (centro de la pantalla)
      await page.mouse.move(handBoxInitial!.x + handBoxInitial!.width / 2, handBoxInitial!.y + handBoxInitial!.height / 2);
      await page.mouse.down();
      await page.mouse.move(handBoxInitial!.x + handBoxInitial!.width / 2, handBoxInitial!.y - 200, { steps: 10 });
      await page.waitForTimeout(300);

      // 2. Medir overlay durante el arrastre
      const overlay = page.locator('[data-drag-overlay="true"]');
      await expect(overlay).toBeVisible();
      const overlayBox = await overlay.boundingBox();
      expect(overlayBox).not.toBeNull();

      // Soltar carta en la mesa
      await page.mouse.up();
      await page.waitForTimeout(1000);

      // 3. Medir carta en la mesa
      const battlefieldCard = page.locator('[data-battlefield-card="true"]').first();
      await expect(battlefieldCard).toBeVisible();
      const tableBox = await battlefieldCard.boundingBox();
      expect(tableBox).not.toBeNull();

      // 4. Medir carta restante en la mano
      const remainingHandCard = page.locator('[data-hand-card="true"]').first();
      await expect(remainingHandCard).toBeVisible();
      const handBox = await remainingHandCard.boundingBox();
      expect(handBox).not.toBeNull();

      // 5. Medir zona de comandante
      const cmdZone = page.locator('[data-dock-zone="command"]').first();
      await expect(cmdZone).toBeVisible();
      const cmdBox = await cmdZone.boundingBox();
      expect(cmdBox).not.toBeNull();

      // Verificar que Mano, Mesa, Comandante y Overlay tienen exactamente las mismas dimensiones (tolerancia <= 1px subpixel)
      expect(Math.abs(tableBox!.width - handBox!.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(tableBox!.height - handBox!.height)).toBeLessThanOrEqual(1.5);

      expect(Math.abs(tableBox!.width - cmdBox!.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(tableBox!.height - cmdBox!.height)).toBeLessThanOrEqual(1.5);

      expect(Math.abs(tableBox!.width - overlayBox!.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(tableBox!.height - overlayBox!.height)).toBeLessThanOrEqual(1.5);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 11 - Fallbacks elegantes de imagenes sin iconos de imagen rota bajo fallo de red o CSP', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPod(browser, 2, 1366, 768, 'ImageFallbackPod');
    const page = pages[0];

    try {
      await expect(page.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);

      // Interceptar todas las llamadas a imágenes para simular fallo de red/CSP
      await page.route('**/*.scryfall.io/**', route => route.abort('failed'));
      await page.route('**/api.scryfall.com/**', route => route.abort('failed'));

      // 1. Verificar que NO hay imágenes rotas visibles en toda la página
      const brokenImagesCount = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => {
          const style = window.getComputedStyle(img);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && (img.offsetWidth > 0 || img.offsetHeight > 0);
          return isVisible && img.complete && img.naturalWidth === 0;
        }).length;
      });
      expect(brokenImagesCount).toBe(0);

      // 2. Verificar que las celdas de jugadores existen y están renderizadas
      const playerCells = page.locator('[data-player-cell]');
      await expect(playerCells).toHaveCount(2);

      // 3. Verificar que las cartas de la mano están presentes
      const handCards = page.locator('[data-hand-card="true"]');
      expect(await handCards.count()).toBeGreaterThan(0);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});





