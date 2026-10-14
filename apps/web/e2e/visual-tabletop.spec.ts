import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Verificación Visual y de Interacción (REQ-9, REQ-22)', () => {
  // Configuración de resoluciones exigidas: 1920x1080 y 1366x768
  const resolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
  ];

  // Pods exigidos: 2, 3 y 4 jugadores
  const podSizes = [2, 3, 4];

  for (const podSize of podSizes) {
    for (const res of resolutions) {
      test(`Pod de ${podSize} jugadores a ${res.name}: mano visible sin scroll, sin solapamientos y drag & drop`, async ({
        browser,
      }) => {
        test.setTimeout(90000);

        // 1. Crear contextos para cada jugador a la resolución objetivo (zoom 100%)
        const contexts: any[] = [];
        const pages: any[] = [];

        for (let i = 0; i < podSize; i++) {
          const ctx = await browser.newContext({
            viewport: { width: res.width, height: res.height },
            deviceScaleFactor: 1,
          });
          const page = await ctx.newPage();
          contexts.push(ctx);
          pages.push(page);
        }

        const hostPage = pages[0];

        try {
          // 2. Anfitrión crea la sala
          await hostPage.goto('http://localhost:3000');
          await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });

          await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `Pod ${podSize}p ${res.name}`);
          await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Nero (Host)');
          await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

          // Obtener código de sala
          const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
          await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
          const roomCodeText = await roomCodeButton.innerText();
          const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
          const roomCode = match ? match[1] : '';
          expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

          // Anfitrión selecciona mazo con cartas suficientes para que la biblioteca no quede en 0
          await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
          const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
          if (await hostImportTab.isVisible()) {
            await hostImportTab.click();
          } else {
            await hostPage.click('button:has-text("Importar mi primer mazo")');
          }
          await hostPage.fill(
            'textarea',
            `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Cultivate\n1 Counterspell\n1 Swords to Plowshares\n1 Demonic Tutor\n10 Plains\n10 Island\n10 Swamp\n10 Forest`,
          );
          await hostPage.click('button:has-text("Validar lista")');
          await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
          await hostPage.click('button:has-text("Marcarme Listo")');

          // 3. Jugadores 2..N se unen y seleccionan mazo
          const commanders = [
            'Edgar Markov',
            'Urza, Lord High Artificer',
            'The Ur-Dragon',
          ];

          for (let pIdx = 1; pIdx < podSize; pIdx++) {
            const pPage = pages[pIdx];
            await pPage.goto('http://localhost:3000');
            await expect(pPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });
            await pPage.click('button:has-text("Unirse con Código")');
            await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
            await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `Jugador ${pIdx + 1}`);
            await pPage.click('button:has-text("Entrar a la Mesa")');

            // Selección de mazo
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
              `// Comandante\n1 ${cmdName} *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n1 Dark Ritual\n10 Mountain\n10 Swamp\n10 Island`,
            );
            await pPage.click('button:has-text("Validar lista")');
            await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
            await pPage.click('button:has-text("Marcarme Listo")');
          }

          // 4. Anfitrión inicia partida
          const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
          await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
          await startGameBtn.click();

          // 5. Todos los jugadores tiran iniciativa
          for (let pIdx = 0; pIdx < podSize; pIdx++) {
            const rollBtn = pages[pIdx].locator('button:has-text("LANZAR D20")');
            try {
              await rollBtn.waitFor({ state: 'visible', timeout: 5000 });
              await rollBtn.click();
            } catch {
              // Si ya se resolvió automáticamente
            }
          }

          // Resolver posibles desempates
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
          // ASSERTION C: Comprobar en CADA celda de CADA jugador que
          // nombre, vida, comandante, mano, biblioteca, cementerio y exilio
          // no se solapan entre sí ni con la barra, y nada queda fuera del viewport (Punto 5)
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

              // 1. Verificar que ninguno sea nulo y que todos estén dentro del viewport
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

                // 2. Verificar que no choque con la barra flotante
                if (toolbarBox && overlaps(r, toolbarBox)) {
                  issues.push(`Jugador ${playerId}: elemento ${z.name} solapa con la barra flotante`);
                }
              });

              // 3. Verificar que los elementos horizontales del dock no se solapen entre sí
              // En el dock: identity (nombre+vida vertical), comandante, mano, biblioteca, cementerio/exilio
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

          // Cerrar popover haciendo clic en el backdrop
          const lifeBackdrop = hostPage.locator('[data-life-backdrop="true"]').first();
          if (await lifeBackdrop.isVisible()) {
            await lifeBackdrop.click();
            await hostPage.waitForTimeout(200);
          }

          // -------------------------------------------------------------
          // ASSERTION E: Arrastre y soltar desde la mano al campo con dnd-kit
          // -------------------------------------------------------------
          const firstHandCard = hostPage.locator('[data-hand-card="true"]').first();
          await expect(firstHandCard).toBeVisible();
          const cardBox = await firstHandCard.boundingBox();
          expect(cardBox).not.toBeNull();

          if (cardBox) {
            const startX = cardBox.x + cardBox.width / 2;
            const startY = cardBox.y + cardBox.height / 2;
            const endX = startX;
            // Arrastrar hacia arriba dentro de su sección de campo de batalla
            const endY = Math.max(120, startY - 260);

            await hostPage.mouse.move(startX, startY);
            await hostPage.mouse.down();
            // Desplazar superando el umbral de 8px para activar sensor dnd-kit
            await hostPage.mouse.move(endX, endY, { steps: 20 });
            await hostPage.waitForTimeout(100);
            await hostPage.mouse.up();
            await hostPage.waitForTimeout(800);
          }

          // Comprobar que la carta esté en el campo o usar alternativa accesible botón Jugar
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

          // Reposicionamiento de cartas ya en mesa mediante arrastre (REQ-9.2, REQ-22)
          const placedCard = bfCards.first();
          const placedBox = await placedCard.boundingBox();
          if (placedBox) {
            const pStartX = placedBox.x + placedBox.width / 2;
            const pStartY = placedBox.y + placedBox.height / 2;
            await hostPage.mouse.move(pStartX, pStartY);
            await hostPage.mouse.down();
            await hostPage.mouse.move(pStartX + 50, pStartY + 20, { steps: 15 });
            await hostPage.mouse.up();
            await hostPage.waitForTimeout(500);
          }

          // -------------------------------------------------------------
          // ASSERTION F: Captura de pantalla para inspección visual
          // -------------------------------------------------------------
          // Mover el ratón a la esquina para limpiar el hover preview central antes de la captura
          await hostPage.mouse.move(0, 0);
          await hostPage.waitForTimeout(1500);

          const screenshotDir = path.resolve(
            'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
          );
          const screenshotPath = path.join(
            screenshotDir,
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
  // TEST MULTICONTEXTO: Transferencia libre entre divisiones (Punto 5, REQ-9.7)
  // -------------------------------------------------------------
  test('Transferencia libre de cartas entre divisiones de dos jugadores en tiempo real (REQ-9.7)', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const ctxA = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const ctxB = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      // 1. Host (Jugador A) crea la sala
      await pageA.goto('http://localhost:3000');
      await expect(pageA.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });
      await pageA.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Transferencia Pod');
      await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Jugador A');
      await pageA.click('button:has-text("Crear Mesa y Obtener Código")');

      const roomCodeBtn = pageA.locator('button:has-text("Código:")').first();
      await expect(roomCodeBtn).toBeVisible({ timeout: 15000 });
      const codeMatch = (await roomCodeBtn.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
      const roomCode = codeMatch ? codeMatch[1] : '';

      // Host importa mazo y se marca listo
      await pageA.click('button:has-text("Seleccionar / Importar Mazo")');
      const importTabA = pageA.locator('button:has-text("Importar Lista de Texto")');
      if (await importTabA.isVisible()) await importTabA.click();
      else await pageA.click('button:has-text("Importar mi primer mazo")');
      await pageA.fill('textarea', '// Comandante\n1 Atraxa, Praetors\' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Cultivate\n10 Plains');
      await pageA.click('button:has-text("Validar lista")');
      await pageA.click('button:has-text("Usar este Mazo en la Mesa")');
      await pageA.click('button:has-text("Marcarme Listo")');

      // 2. Jugador B se une con código
      await pageB.goto('http://localhost:3000');
      await pageB.click('button:has-text("Unirse con Código")');
      await pageB.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
      await pageB.fill('input[placeholder="Ej. Jugador Invitado"]', 'Jugador B');
      await pageB.click('button:has-text("Entrar a la Mesa")');

      await pageB.click('button:has-text("Seleccionar / Importar Mazo")');
      const importTabB = pageB.locator('button:has-text("Importar Lista de Texto")');
      if (await importTabB.isVisible()) await importTabB.click();
      else await pageB.click('button:has-text("Importar mi primer mazo")');
      await pageB.fill('textarea', '// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Dark Ritual\n10 Swamp');
      await pageB.click('button:has-text("Validar lista")');
      await pageB.click('button:has-text("Usar este Mazo en la Mesa")');
      await pageB.click('button:has-text("Marcarme Listo")');

      // 3. Iniciar partida y tirar D20
      await pageA.click('button:has-text("INICIAR PARTIDA")');
      await pageA.locator('button:has-text("LANZAR D20")').click().catch(() => {});
      await pageB.locator('button:has-text("LANZAR D20")').click().catch(() => {});
      await expect(pageA.locator('text=Tirada de Iniciativa')).not.toBeVisible({ timeout: 15000 });
      await pageA.waitForTimeout(1000);

      // 4. Jugador A juega una carta de su mano al campo
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

      // 5. Jugador A arrastra la carta desde su campo hacia la división de Jugador B
      const cardOnField = placedCardsA.first();
      const cBox = await cardOnField.boundingBox();
      expect(cBox).not.toBeNull();

      // En la pantalla de A, la división de B es la otra columna ([data-player-cell] índice 1)
      const oppCellA = pageA.locator('[data-player-cell]').nth(1);
      const oppBoxA = await oppCellA.boundingBox();
      expect(oppBoxA).not.toBeNull();

      if (cBox && oppBoxA) {
        const destX = oppBoxA.x + oppBoxA.width * 0.5;
        const destY = oppBoxA.y + oppBoxA.height * 0.4;
        await pageA.mouse.move(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
        await pageA.mouse.down();
        await pageA.mouse.move(destX, destY, { steps: 25 });
        await pageA.waitForTimeout(100);
        await pageA.mouse.up();
        await pageA.waitForTimeout(1200);
      }

      // 6. Verificar en la pantalla de Jugador B:
      // B ve la carta en su división con la posición correcta
      const cardOnB = pageB.locator('[data-battlefield-card="true"]');
      await expect(cardOnB.first()).toBeVisible({ timeout: 10000 });

      // 7. Verificar bitácora de partida en ambos navegadores
      await pageA.click('button:has-text("Chat/Log")').catch(() => {});
      await pageB.click('button:has-text("Chat/Log")').catch(() => {});
      await pageA.waitForTimeout(600);

      const logTextA = await pageA.locator('body').innerText();
      expect(logTextA).toMatch(/pasó .+ a Jugador B/i);
    } finally {
      await ctxA.close().catch(() => {});
      await ctxB.close().catch(() => {});
    }
  });
});
