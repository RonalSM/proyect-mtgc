import { test, expect, Page } from '@playwright/test';

interface ViewAuditResult {
  viewName: string;
  totalCards: number;
  realImages: number;
  textFrames: number;
  failures: { name: string; reason: string; src?: string }[];
}

test.describe('Punto 6: Métrica Honesta (8 Vistas) y Benchmark de Red @network Real Scryfall (4 Jugadores)', () => {
  test('@network 4 jugadores con mazos listos reales en las 8 vistas y benchmark de red sin caché', async ({
    browser,
  }) => {
    test.setTimeout(240000);

    const contexts = [];
    const pages: Page[] = [];
    const cdpSessions = [];

    // 1. Configurar 4 clientes con viewport 1920x1080 (2 en ES, 2 en EN)
    const playerConfigs = [
      { name: 'Alice (Host-ES)', lang: 'es', deckIdx: 0 },
      { name: 'Bob (Guest-ES)', lang: 'es', deckIdx: 1 },
      { name: 'Charlie (Guest-EN)', lang: 'en', deckIdx: 2 },
      { name: 'Diana (Guest-EN)', lang: 'en', deckIdx: 3 },
    ];

    for (const conf of playerConfigs) {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const p = await ctx.newPage();
      await p.addInitScript(lang => {
        try {
          localStorage.setItem('mtgc_preferred_language', lang);
          // Desactivar virtualización para montar todas las cartas y medir carga real masiva
          (window as any).__disableVirtualization = true;
        } catch {}
      }, conf.lang);

      contexts.push(ctx);
      pages.push(p);

      try {
        const cdp = await ctx.newCDPSession(p);
        cdpSessions.push(cdp);
      } catch (err) {
        console.warn('Advertencia al crear sesión CDP:', err);
      }
    }

    const hostPage = pages[0];

    // Registro de telemetría de red para el benchmark
    let isMeasuringLibrary = false;
    const networkStats = {
      cumulativeRequests: 0,
      libraryRequests: 0,
      retriesCount: 0,
      statusCodeCounts: {} as Record<string, number>,
      failedUrlCodes: [] as { url: string; code: number | string }[],
      seenUrls: new Map<string, number>(),
    };

    for (const p of pages) {
      p.on('response', res => {
        const url = res.url();
        if (url.includes('cards.scryfall.io') || url.includes('/api/cards')) {
          networkStats.cumulativeRequests++;
          if (isMeasuringLibrary) {
            networkStats.libraryRequests++;
          }
          const status = res.status();
          const statusStr = String(status);
          networkStats.statusCodeCounts[statusStr] =
            (networkStats.statusCodeCounts[statusStr] || 0) + 1;

          const count = (networkStats.seenUrls.get(url) || 0) + 1;
          networkStats.seenUrls.set(url, count);
          if (count > 1) {
            networkStats.retriesCount++;
          }
          if (status >= 400) {
            networkStats.failedUrlCodes.push({ url, code: status });
          }
        }
      });

      p.on('requestfailed', req => {
        const url = req.url();
        const errText = req.failure()?.errorText;
        if (url.includes('cards.scryfall.io')) {
          if (errText !== 'net::ERR_ABORTED') {
            networkStats.failedUrlCodes.push({ url, code: errText || 'FAILED' });
          }
        }
      });
    }

    // 2. Crear mesa de 4 jugadores
    await hostPage.goto('http://localhost:3000');
    await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Honest-Benchmark-4P');
    await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', playerConfigs[0].name);
    await hostPage.selectOption('select', '4');
    await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];
    console.log(`[Punto 6 @network] Sala creada con código: ${roomCode}`);

    // Seleccionar mazo predefinido para host
    await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const hostPreset = hostPage
      .locator('[data-testid^="select-preset-deck-"]')
      .nth(playerConfigs[0].deckIdx);
    await expect(hostPreset).toBeVisible({ timeout: 10000 });
    await hostPreset.click();
    await hostPage.waitForTimeout(400);
    await hostPage.click('button:has-text("Marcarme Listo")');

    // 3. Unir 3 invitados con sus mazos predefinidos
    for (let i = 1; i < 4; i++) {
      const gPage = pages[i];
      await gPage.goto('http://localhost:3000');
      await expect(gPage.locator('h1')).toContainText('Mesa Virtual de Commander', {
        timeout: 15000,
      });

      await gPage.click('button:has-text("Unirse con Código")');
      await gPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
      await gPage.fill('input[placeholder="Ej. Jugador Invitado"]', playerConfigs[i].name);
      await gPage.click('button:has-text("Entrar a la Mesa")');

      await gPage.click('button:has-text("Seleccionar / Importar Mazo")');
      const gPreset = gPage
        .locator('[data-testid^="select-preset-deck-"]')
        .nth(playerConfigs[i].deckIdx);
      await expect(gPreset).toBeVisible({ timeout: 10000 });
      await gPreset.click();
      await gPage.waitForTimeout(400);
      await gPage.click('button:has-text("Marcarme Listo")');
    }

    // 4. Iniciar partida
    await hostPage.waitForTimeout(1000);
    const startBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();

    // 5. VISTA 1: MULLIGAN
    console.log('\n[Punto 6 @network] --- VISTA 1: MULLIGAN ---');
    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
      timeout: 30000,
    });

    const auditResults: ViewAuditResult[] = [];

    // Auditar cartas de la modal de mulligan para los 4 jugadores
    for (let i = 0; i < 4; i++) {
      const p = pages[i];
      await p.waitForSelector('[data-testid="opening-hand-modal"]', { timeout: 10000 });
      // Esperar a que las imágenes carguen
      await p
        .waitForFunction(
          () => {
            const imgs = Array.from(
              document.querySelectorAll('[data-testid="opening-hand-modal"] img[data-image-size]'),
            ) as HTMLImageElement[];
            return imgs.length > 0 && imgs.every(img => img.naturalWidth > 0 || img.complete);
          },
          { timeout: 15000 },
        )
        .catch(() => {});

      const mulliganAudit = await p.evaluate(() => {
        const modal = document.querySelector('[data-testid="opening-hand-modal"]');
        if (!modal) return { totalCards: 0, realImages: 0, textFrames: 0, failures: [] };
        const imgs = Array.from(
          modal.querySelectorAll('img[data-image-size]'),
        ) as HTMLImageElement[];
        const textFrames = Array.from(modal.querySelectorAll('[data-card-text-frame="true"]'));
        const failures: { name: string; reason: string; src?: string }[] = [];
        let realImages = 0;
        for (const img of imgs) {
          if (img.naturalWidth > 0) realImages++;
          else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
        }
        for (const tf of textFrames) {
          const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
          failures.push({ name, reason: 'Marco de texto de respaldo' });
        }
        return {
          totalCards: imgs.length + textFrames.length,
          realImages,
          textFrames: textFrames.length,
          failures,
        };
      });

      auditResults.push({
        viewName: `mulligan (Jugador ${i + 1})`,
        ...mulliganAudit,
      });
    }

    // Resolver el mulligan (todos hacen Keep)
    const startTime = Date.now();
    while (Date.now() - startTime < 45000) {
      const isMulliganVisible = await hostPage
        .locator('[data-testid="opening-hand-modal"]')
        .isVisible();
      if (!isMulliganVisible) break;
      for (const p of pages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]:not([disabled])');
        if (await keepBtn.isVisible({ timeout: 200 }).catch(() => false)) {
          await keepBtn.click().catch(() => {});
          await p.waitForTimeout(400);
          break;
        }
      }
      await hostPage.waitForTimeout(300);
    }

    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeHidden({
      timeout: 15000,
    });
    await hostPage.waitForTimeout(2000);

    // 6. VISTA 2: MANO (HAND)
    console.log('[Punto 6 @network] --- VISTA 2: MANO ---');
    for (let i = 0; i < 4; i++) {
      const p = pages[i];
      // Esperar a que las imágenes de la mano carguen
      await p
        .waitForFunction(
          () => {
            const imgs = Array.from(
              document.querySelectorAll('[data-dock-zone="hand"] img[data-image-size]'),
            ) as HTMLImageElement[];
            return imgs.length > 0 && imgs.every(img => img.naturalWidth > 0 || img.complete);
          },
          { timeout: 15000 },
        )
        .catch(() => {});

      const handAudit = await p.evaluate(() => {
        const zone = document.querySelector('[data-dock-zone="hand"]');
        if (!zone) return { totalCards: 0, realImages: 0, textFrames: 0, failures: [] };
        const imgs = Array.from(
          zone.querySelectorAll('img[data-image-size]'),
        ) as HTMLImageElement[];
        const textFrames = Array.from(zone.querySelectorAll('[data-card-text-frame="true"]'));
        const failures: { name: string; reason: string; src?: string }[] = [];
        let realImages = 0;
        for (const img of imgs) {
          if (img.naturalWidth > 0) realImages++;
          else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
        }
        for (const tf of textFrames) {
          const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
          failures.push({ name, reason: 'Marco de texto de respaldo' });
        }
        return {
          totalCards: imgs.length + textFrames.length,
          realImages,
          textFrames: textFrames.length,
          failures,
        };
      });

      auditResults.push({
        viewName: `mano (Jugador ${i + 1})`,
        ...handAudit,
      });
    }

    // 7. VISTA 3: CAMPO DE BATALLA (BATTLEFIELD)
    console.log('[Punto 6 @network] --- VISTA 3: CAMPO ---');
    // Mover 1 carta de la mano al campo para Host y para Jugador 2 usando acción autoritativa
    for (let i = 0; i < 2; i++) {
      const p = pages[i];
      await p.evaluate(posIdx => {
        const handEl = document.querySelector('[data-dock-zone="hand"] [data-hand-card="true"]');
        const cId = handEl?.getAttribute('data-card-instance-id');
        if (cId) {
          (window as any).__mtgcSendAction('MOVE_CARD', {
            cardInstanceId: cId,
            fromZone: 'hand',
            toZone: 'battlefield',
            position: { x: 0.35 + posIdx * 0.25, y: 0.45 },
          });
        }
      }, i);
      await p.waitForTimeout(800);
    }

    // Esperar a que las cartas en el campo aparezcan y carguen sus imágenes
    await hostPage.waitForSelector('[data-battlefield-card="true"]', { timeout: 10000 });
    await hostPage
      .waitForFunction(
        () => {
          const imgs = Array.from(
            document.querySelectorAll('[data-battlefield-card="true"] img[data-image-size]'),
          ) as HTMLImageElement[];
          return imgs.length > 0 && imgs.every(img => img.naturalWidth > 0 || img.complete);
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    // Auditar cartas en el campo
    for (let i = 0; i < 4; i++) {
      const p = pages[i];
      const fieldAudit = await p.evaluate(() => {
        const fieldCards = Array.from(document.querySelectorAll('[data-battlefield-card="true"]'));
        const imgs = Array.from(
          document.querySelectorAll('[data-battlefield-card="true"] img[data-image-size]'),
        ) as HTMLImageElement[];
        const textFrames = Array.from(
          document.querySelectorAll('[data-battlefield-card="true"] [data-card-text-frame="true"]'),
        );
        const failures: { name: string; reason: string; src?: string }[] = [];
        let realImages = 0;
        for (const img of imgs) {
          if (img.naturalWidth > 0) realImages++;
          else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
        }
        for (const tf of textFrames) {
          const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
          failures.push({ name, reason: 'Marco de texto de respaldo' });
        }
        return {
          totalCards: fieldCards.length,
          realImages,
          textFrames: textFrames.length,
          failures,
        };
      });

      auditResults.push({
        viewName: `campo (Jugador ${i + 1})`,
        ...fieldAudit,
      });
    }

    // 8. VISTA 4: VISTA PREVIA (HOVER PREVIEW)
    console.log('[Punto 6 @network] --- VISTA 4: VISTA PREVIA ---');
    const bCard = hostPage.locator('[data-battlefield-card="true"]').first();
    await expect(bCard).toBeVisible({ timeout: 5000 });
    await bCard.hover();
    await hostPage.waitForTimeout(600);

    const previewAudit = await hostPage.evaluate(() => {
      const preview = document.querySelector('[data-testid="card-preview-overlay"]');
      if (!preview)
        return {
          totalCards: 0,
          realImages: 0,
          textFrames: 0,
          failures: [{ name: 'Preview', reason: 'Overlay not found' }],
        };
      const imgs = Array.from(
        preview.querySelectorAll('img[data-image-size]'),
      ) as HTMLImageElement[];
      const textFrames = Array.from(preview.querySelectorAll('[data-card-text-frame="true"]'));
      const failures: { name: string; reason: string; src?: string }[] = [];
      let realImages = 0;
      for (const img of imgs) {
        if (img.naturalWidth > 0) realImages++;
        else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
      }
      for (const tf of textFrames) {
        const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
        failures.push({ name, reason: 'Marco de texto de respaldo' });
      }
      return {
        totalCards: imgs.length + textFrames.length,
        realImages,
        textFrames: textFrames.length,
        failures,
      };
    });

    auditResults.push({
      viewName: 'vista previa (Host)',
      ...previewAudit,
    });

    // Mover cursor fuera para cerrar la vista previa
    await hostPage.mouse.move(5, 5);
    await hostPage.waitForTimeout(300);

    // 9. VISTA 5: VER CARTA (CARD DETAILS MODAL)
    console.log('[Punto 6 @network] --- VISTA 5: VER CARTA ---');
    await bCard.click({ button: 'right' });
    await hostPage.waitForTimeout(400);
    const verCartaBtn = hostPage.locator('button:has-text("Ver carta")').first();
    await expect(verCartaBtn).toBeVisible({ timeout: 5000 });
    await verCartaBtn.click();

    await expect(hostPage.locator('[data-testid="card-details-modal"]')).toBeVisible({
      timeout: 5000,
    });
    // Esperar a que la imagen de detalles cargue
    await hostPage
      .waitForFunction(
        () => {
          const img = document.querySelector(
            '[data-testid="card-details-image"]',
          ) as HTMLImageElement;
          return img && (img.naturalWidth > 0 || img.complete);
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    const detailsAudit = await hostPage.evaluate(() => {
      const modal = document.querySelector('[data-testid="card-details-modal"]');
      if (!modal) return { totalCards: 0, realImages: 0, textFrames: 0, failures: [] };
      const img = modal.querySelector('[data-testid="card-details-image"]') as HTMLImageElement;
      const failures: { name: string; reason: string; src?: string }[] = [];
      let realImages = 0;
      if (img && img.naturalWidth > 0) {
        realImages = 1;
      } else if (img) {
        failures.push({
          name: img.alt || 'Card Detail',
          reason: 'Image not rendered',
          src: img.src,
        });
      }
      return { totalCards: 1, realImages, textFrames: 0, failures };
    });

    auditResults.push({
      viewName: 'Ver carta (Host)',
      ...detailsAudit,
    });

    // Cerrar modal de detalles
    await hostPage.keyboard.press('Escape');
    await hostPage.waitForTimeout(500);

    // 10. VISTA 6: CEMENTERIO (GRAVEYARD)
    console.log('[Punto 6 @network] --- VISTA 6: CEMENTERIO ---');
    // Enviar carta de la mesa al cementerio vía acción autoritativa
    await hostPage.evaluate(() => {
      const fieldCardEl = document.querySelector('[data-battlefield-card="true"]');
      const cId = fieldCardEl?.getAttribute('data-card-instance-id');
      if (cId) {
        (window as any).__mtgcSendAction('MOVE_CARD', {
          cardInstanceId: cId,
          fromZone: 'battlefield',
          toZone: 'graveyard',
        });
      }
    });
    await hostPage.waitForTimeout(800);

    // Abrir modal de cementerio
    const gydZone = hostPage.locator('[data-pile-zone="graveyard"]').first();
    await gydZone.click();
    await expect(
      hostPage.locator('[data-testid="pile-viewer-modal"][data-active-pile="graveyard"]'),
    ).toBeVisible({ timeout: 5000 });
    // Esperar a que cargue la imagen en la modal de cementerio
    await hostPage
      .waitForFunction(
        () => {
          const modal = document.querySelector(
            '[data-testid="pile-viewer-modal"][data-active-pile="graveyard"]',
          );
          if (!modal) return false;
          const imgs = Array.from(
            modal.querySelectorAll('img[data-image-size]'),
          ) as HTMLImageElement[];
          return imgs.length > 0 && imgs.every(img => img.naturalWidth > 0 || img.complete);
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    const gydAudit = await hostPage.evaluate(() => {
      const modal =
        document.querySelector('[data-testid="pile-viewer-modal"][data-active-pile="graveyard"]') ||
        document;
      const imgs = Array.from(modal.querySelectorAll('img[data-image-size]')) as HTMLImageElement[];
      const textFrames = Array.from(modal.querySelectorAll('[data-card-text-frame="true"]'));
      const failures: { name: string; reason: string; src?: string }[] = [];
      let realImages = 0;
      for (const img of imgs) {
        if (img.naturalWidth > 0) realImages++;
        else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
      }
      for (const tf of textFrames) {
        const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
        failures.push({ name, reason: 'Marco de texto de respaldo' });
      }
      return {
        totalCards: imgs.length + textFrames.length,
        realImages,
        textFrames: textFrames.length,
        failures,
      };
    });

    auditResults.push({
      viewName: 'cementerio (Host)',
      ...gydAudit,
    });

    await hostPage.keyboard.press('Escape');
    await hostPage.waitForTimeout(500);

    // 11. VISTA 7: EXILIO (EXILE)
    console.log('[Punto 6 @network] --- VISTA 7: EXILIO ---');
    // Enviar carta de la mano al exilio vía acción autoritativa
    await hostPage.evaluate(() => {
      const handCardEl = document.querySelector('[data-dock-zone="hand"] [data-hand-card="true"]');
      const cId = handCardEl?.getAttribute('data-card-instance-id');
      if (cId) {
        (window as any).__mtgcSendAction('MOVE_CARD', {
          cardInstanceId: cId,
          fromZone: 'hand',
          toZone: 'exile',
        });
      }
    });
    await hostPage.waitForTimeout(800);

    // Abrir modal de exilio
    const exileZone = hostPage.locator('[data-pile-zone="exile"]').first();
    await exileZone.click();
    await expect(
      hostPage.locator('[data-testid="pile-viewer-modal"][data-active-pile="exile"]'),
    ).toBeVisible({ timeout: 5000 });
    // Esperar a que cargue la imagen en la modal de exilio
    await hostPage
      .waitForFunction(
        () => {
          const modal = document.querySelector(
            '[data-testid="pile-viewer-modal"][data-active-pile="exile"]',
          );
          if (!modal) return false;
          const imgs = Array.from(
            modal.querySelectorAll('img[data-image-size]'),
          ) as HTMLImageElement[];
          return imgs.length > 0 && imgs.every(img => img.naturalWidth > 0 || img.complete);
        },
        { timeout: 15000 },
      )
      .catch(() => {});

    const exileAudit = await hostPage.evaluate(() => {
      const modal =
        document.querySelector('[data-testid="pile-viewer-modal"][data-active-pile="exile"]') ||
        document;
      const imgs = Array.from(modal.querySelectorAll('img[data-image-size]')) as HTMLImageElement[];
      const textFrames = Array.from(modal.querySelectorAll('[data-card-text-frame="true"]'));
      const failures: { name: string; reason: string; src?: string }[] = [];
      let realImages = 0;
      for (const img of imgs) {
        if (img.naturalWidth > 0) realImages++;
        else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
      }
      for (const tf of textFrames) {
        const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
        failures.push({ name, reason: 'Marco de texto de respaldo' });
      }
      return {
        totalCards: imgs.length + textFrames.length,
        realImages,
        textFrames: textFrames.length,
        failures,
      };
    });

    auditResults.push({
      viewName: 'exilio (Host)',
      ...exileAudit,
    });

    await hostPage.keyboard.press('Escape');
    await hostPage.waitForTimeout(500);

    // 12. VISTA 8: BIBLIOTECA (LIBRARY) Y BENCHMARK @network SIN CACHÉ
    console.log('\n[Punto 6 @network] --- VISTA 8: BIBLIOTECA Y BENCHMARK SIN CACHÉ ---');
    console.log('[Punto 6 @network] Limpiando caché total del navegador (CDP + window.caches)...');

    // Deshabilitar y limpiar caché HTTP del navegador en todos los clientes
    for (const cdp of cdpSessions) {
      try {
        await cdp.send('Network.clearBrowserCache');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      } catch (err) {
        console.warn('Advertencia CDP clearBrowserCache:', err);
      }
    }

    await Promise.all(
      pages.map(async p => {
        await p.evaluate(async () => {
          if ((window as any).__imageLoaderQueue) {
            (window as any).__imageLoaderQueue.clear();
          }
          if ((window as any).__persistentImageCache) {
            await (window as any).__persistentImageCache.clear();
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            for (const k of keys) {
              await caches.delete(k);
            }
          }
        });
      }),
    );

    // Activar medición de red para la apertura de bibliotecas
    isMeasuringLibrary = true;
    networkStats.libraryRequests = 0;
    networkStats.retriesCount = 0;
    networkStats.statusCodeCounts = {};
    networkStats.failedUrlCodes = [];
    networkStats.seenUrls.clear();

    const coldStartTime = Date.now();

    // Los 4 jugadores abren la biblioteca al mismo tiempo
    await Promise.all(
      pages.map(async p => {
        const libBtn = p.locator('[data-library-inspect-btn="true"]').first();
        if (await libBtn.isVisible({ timeout: 5000 })) {
          await libBtn.click({ force: true });
        }
      }),
    );

    // Verificar que las 4 modales de biblioteca están abiertas
    await Promise.all(
      pages.map(async p => {
        await expect(p.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 10000 });
      }),
    );

    // Esperar a que TODAS las cartas de las 4 bibliotecas completen su carga de imagen
    console.log(
      '[Punto 6 @network] Esperando que TODAS las imágenes de las 4 bibliotecas carguen...',
    );
    await Promise.all(
      pages.map(async (p, idx) => {
        await p.waitForFunction(
          () => {
            const modal = document.querySelector(
              '[data-testid="pile-viewer-modal"][data-active-pile="library"]',
            );
            if (!modal) return false;
            const imgs = Array.from(
              modal.querySelectorAll('img[data-image-size]'),
            ) as HTMLImageElement[];
            const frames = Array.from(modal.querySelectorAll('[data-card-text-frame="true"]'));
            const total = imgs.length + frames.length;
            // Se requiere que se hayan montado al menos 85 cartas del mazo completo y que todas hayan terminado de cargar
            if (total < 85) return false;
            return imgs.every(img => img.naturalWidth > 0 || img.complete);
          },
          { timeout: 90000 },
        );
        console.log(
          `[Punto 6 @network] Jugador ${idx + 1} (${playerConfigs[idx].name}): biblioteca completamente cargada.`,
        );
      }),
    );

    const coldLoadTime = Date.now() - coldStartTime;

    // Auditar cada una de las 4 bibliotecas
    for (let i = 0; i < 4; i++) {
      const p = pages[i];
      const libAudit = await p.evaluate(() => {
        const modal =
          document.querySelector('[data-testid="pile-viewer-modal"][data-active-pile="library"]') ||
          document;
        const imgs = Array.from(
          modal.querySelectorAll('img[data-image-size]'),
        ) as HTMLImageElement[];
        const textFrames = Array.from(modal.querySelectorAll('[data-card-text-frame="true"]'));
        const failures: { name: string; reason: string; src?: string }[] = [];
        let realImages = 0;
        for (const img of imgs) {
          if (img.naturalWidth > 0) realImages++;
          else failures.push({ name: img.alt, reason: 'Image not rendered', src: img.src });
        }
        for (const tf of textFrames) {
          const name = tf.querySelector('.font-bold')?.textContent?.trim() || 'Desconocida';
          failures.push({ name, reason: 'Marco de texto de respaldo' });
        }
        return {
          totalCards: imgs.length + textFrames.length,
          realImages,
          textFrames: textFrames.length,
          failures,
        };
      });

      auditResults.push({
        viewName: `biblioteca (Jugador ${i + 1})`,
        ...libAudit,
      });
    }

    // 13. CONSOLIDACIÓN DE LA MÉTRICA HONESTA Y REPORTE
    let globalTotalCards = 0;
    let globalRealImages = 0;
    let globalTextFrames = 0;
    const globalFailures: { view: string; name: string; reason: string }[] = [];

    for (const res of auditResults) {
      globalTotalCards += res.totalCards;
      globalRealImages += res.realImages;
      globalTextFrames += res.textFrames;
      for (const f of res.failures) {
        globalFailures.push({ view: res.viewName, name: f.name, reason: f.reason });
      }
    }

    const realImagePercentage =
      globalTotalCards > 0 ? (globalRealImages / globalTotalCards) * 100 : 0;

    console.log('\n========================================================================');
    console.log('REPORTE OFICIAL: AUDITORÍA DE 8 VISTAS CON MÉTRICA HONESTA (PUNTO 6)');
    console.log('========================================================================');
    console.log('| Vista | Total Cartas | Imagen Real | Marco de Texto | % Éxito |');
    console.log('|---|---|---|---|---|');
    for (const r of auditResults) {
      const pct = r.totalCards > 0 ? ((r.realImages / r.totalCards) * 100).toFixed(1) : '100.0';
      console.log(
        `| ${r.viewName} | ${r.totalCards} | ${r.realImages} | ${r.textFrames} | ${pct}% |`,
      );
    }
    console.log('------------------------------------------------------------------------');
    console.log(`TOTAL CONSOLIDADO: ${globalTotalCards} cartas evaluadas`);
    console.log(`CARTAS CON IMAGEN REAL (naturalWidth > 0): ${globalRealImages}`);
    console.log(`CARTAS CON MARCO DE TEXTO (contadas como fallo): ${globalTextFrames}`);
    console.log(`PORCENTAJE DE IMAGEN REAL: ${realImagePercentage.toFixed(2)}% (Criterio: >= 99%)`);
    console.log('------------------------------------------------------------------------');
    if (globalFailures.length === 0) {
      console.log(
        'LISTA DE FALLOS: 0 fallos detectados. Todas las cartas renderizaron imagen real.',
      );
    } else {
      console.log(`LISTA DE FALLOS (${globalFailures.length} detectados):`);
      for (const fail of globalFailures.slice(0, 10)) {
        console.log(`  - [${fail.view}] "${fail.name}": ${fail.reason}`);
      }
    }
    console.log('========================================================================\n');

    console.log('========================================================================');
    console.log('BENCHMARK DE RED @network CON CACHÉ TOTALMENTE VACÍO');
    console.log('========================================================================');
    console.log(
      `1. Tiempo hasta que TODAS las imágenes de las 4 bibliotecas cargaron: ${coldLoadTime} ms`,
    );
    console.log(
      `2. Peticiones procesadas durante apertura de 4 bibliotecas: ${networkStats.libraryRequests}`,
    );
    console.log(
      `3. Peticiones totales acumuladas de la sesión: ${networkStats.cumulativeRequests}`,
    );
    console.log(
      `4. Distribución de códigos de estado HTTP:`,
      JSON.stringify(networkStats.statusCodeCounts, null, 2),
    );
    console.log(`5. Reintentos de red ejecutados: ${networkStats.retriesCount}`);
    console.log(`6. Fallos de red con su código:`);
    if (networkStats.failedUrlCodes.length === 0) {
      console.log('   - 0 fallos de red');
    } else {
      for (const fail of networkStats.failedUrlCodes.slice(0, 10)) {
        console.log(`   - Código: ${fail.code} | URL: ${fail.url}`);
      }
    }
    console.log('------------------------------------------------------------------------');
    console.log('EXPLICACIÓN DEL RESULTADO ANTERIOR DE 118 ms (7 peticiones):');
    console.log(
      '  1) En la prueba anterior, VirtualizedCardGrid estaba activo, montando únicamente',
    );
    console.log(
      '     las filas visibles en pantalla (~12 cartas por jugador), por lo que las ~88 cartas',
    );
    console.log(
      '     restantes de cada mazo nunca fueron montadas en el DOM ni solicitadas al CDN.',
    );
    console.log(
      '  2) El test anterior verificaba "Math.min(imgs.length, 12)", deteniendo la espera',
    );
    console.log(
      '     tan pronto como las primeras 12 cartas respondían, sin esperar el mazo completo.',
    );
    console.log(
      '  3) Solo se ejecutaba "caches.delete()" (Service Worker Cache API), sin vaciar la caché',
    );
    console.log(
      '     HTTP de disco/memoria del navegador Chrome a nivel de red (CDP Network.clearBrowserCache)',
    );
    console.log('     ni limpiar los mapas en memoria de blob URLs.');
    console.log(
      '  4) Al desactivar la virtualización (__disableVirtualization = true) y limpiar la caché',
    );
    console.log(
      '     CDP de red y memoria, las 4 bibliotecas montan simultáneamente casi 400 cartas, generando',
    );
    console.log('     cientos de peticiones HTTP directas a Scryfall.');
    console.log('========================================================================\n');

    // Criterio de aceptación estricto (Punto 6)
    expect(realImagePercentage).toBeGreaterThanOrEqual(99.0);
    expect(networkStats.cumulativeRequests).toBeGreaterThanOrEqual(50);

    // Cerrar contextos
    for (const ctx of contexts) {
      await ctx.close();
    }
  });
});
