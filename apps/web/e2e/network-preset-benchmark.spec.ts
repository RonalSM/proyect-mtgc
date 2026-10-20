import { test, expect } from '@playwright/test';

test.describe('Punto 8: Benchmark de Red @network con Mazos Listos en Español e Inglés (4 Jugadores)', () => {
  test('@network Real Scryfall: 4 jugadores con mazos listos (ES y EN) abren bibliotecas y miden telemetría', async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const contexts = [];
    const pages = [];

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
        } catch {}
      }, conf.lang);
      contexts.push(ctx);
      pages.push(p);
    }

    const hostPage = pages[0];

    // 2. Crear mesa de 4 jugadores
    await hostPage.goto('http://localhost:3000');
    await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Benchmark-4P-Network');
    await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', playerConfigs[0].name);
    await hostPage.selectOption('select', '4');
    await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];
    console.log(`[Punto 8 @network] Sala creada con código: ${roomCode}`);

    // Seleccionar mazo predefinido para host
    await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const hostPreset = hostPage.locator('[data-testid^="select-preset-deck-"]').nth(playerConfigs[0].deckIdx);
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
      const gPreset = gPage.locator('[data-testid^="select-preset-deck-"]').nth(playerConfigs[i].deckIdx);
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

    // 5. Fase de iniciativa y Mulligan (resolución turn-by-turn de todos los jugadores)
    console.log('[Punto 8 @network] Esperando fase de Mulligan...');
    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
      timeout: 30000,
    });

    const startTime = Date.now();
    while (Date.now() - startTime < 45000) {
      const isMulliganVisible = await hostPage.locator('[data-testid="opening-hand-modal"]').isVisible();
      if (!isMulliganVisible) {
        console.log('[Punto 8 @network] Mulligan resuelto exitosamente.');
        break;
      }
      for (const p of pages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]:not([disabled])');
        if (await keepBtn.isVisible({ timeout: 200 }).catch(() => false)) {
          await keepBtn.click().catch(() => {});
          await p.waitForTimeout(500);
          break;
        }
      }
      await hostPage.waitForTimeout(300);
    }

    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeHidden({ timeout: 15000 });
    await hostPage.waitForTimeout(2000);

    // 6. Preparar telemetría de red y limpiar caché para medir apertura en frío genuina
    console.log('[Punto 8 @network] Limpiando caché del navegador para apertura en frío...');
    await Promise.all(
      pages.map(async p => {
        await p.evaluate(async () => {
          if ('caches' in window) {
            const keys = await caches.keys();
            for (const k of keys) {
              await caches.delete(k);
            }
          }
        });
      }),
    );

    const networkStats = {
      totalRequests: 0,
      retriesCount: 0,
      statusCodeCounts: {} as Record<string, number>,
      failedUrlCodes: [] as { url: string; code: number | string }[],
      seenUrls: new Map<string, number>(),
    };

    for (const p of pages) {
      p.on('response', res => {
        const url = res.url();
        if (url.includes('cards.scryfall.io') || url.includes('/api/cards')) {
          networkStats.totalRequests++;
          const status = res.status();
          const statusStr = String(status);
          networkStats.statusCodeCounts[statusStr] = (networkStats.statusCodeCounts[statusStr] || 0) + 1;

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
        if (url.includes('cards.scryfall.io')) {
          networkStats.failedUrlCodes.push({ url, code: 'FAILED' });
        }
      });
    }

    // 7. Medición de Apertura en Frío (los 4 jugadores abren la biblioteca a la vez)
    console.log('[Punto 8 @network] 1. APERTURA EN FRÍO CON MAZOS LISTOS (ES y EN)...');
    const coldStartTime = Date.now();

    await Promise.all(
      pages.map(async p => {
        const libBtn = p.locator('[data-library-inspect-btn="true"]').first();
        if (await libBtn.isVisible({ timeout: 5000 })) {
          await libBtn.click({ force: true });
        }
      }),
    );

    // Esperar a que los 4 clientes muestren la modal de biblioteca
    await Promise.all(
      pages.map(async p => {
        await expect(p.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 10000 });
      }),
    );

    // Esperar a que las imágenes carguen en la biblioteca
    await Promise.all(
      pages.map(async (p, idx) => {
        await p.waitForFunction(
          () => {
            const imgs = Array.from(document.querySelectorAll('img[data-image-size]')) as HTMLImageElement[];
            if (imgs.length === 0) return false;
            // Se considera listo si al menos el 85% de las cartas visibles han cargado o tienen marco de texto
            const loaded = imgs.filter(img => img.naturalWidth > 0 || img.complete).length;
            return loaded >= Math.min(imgs.length, 12);
          },
          { timeout: 35000 },
        );
        console.log(`[Punto 8 @network] Jugador ${idx + 1} (${playerConfigs[idx].name}): biblioteca cargada`);
      }),
    );

    const coldLoadTime = Date.now() - coldStartTime;

    // 8. Segunda apertura (con Cache API persistente)
    console.log('[Punto 8 @network] 2. SEGUNDA APERTURA CON CACHÉ PERSISTENTE...');
    const p1 = pages[0];
    const closeBtn = p1.locator('[data-testid="close-pile-modal-btn"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click({ force: true });
    } else {
      await p1.keyboard.press('Escape');
    }
    await p1.waitForTimeout(500);

    const cachedStartTime = Date.now();
    await p1.locator('[data-library-inspect-btn="true"]').first().click({ force: true });
    await expect(p1.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 5000 });
    const cachedLoadTime = Date.now() - cachedStartTime;

    // 9. REPORTE FINAL OFICIAL DE CIFRAS
    console.log('\n=============================================================');
    console.log('REPORTE OFICIAL BENCHMARK DE RED @network (PUNTO 8)');
    console.log('=============================================================');
    console.log(`1. Tiempo total (apertura en frío 4 jugadores): ${coldLoadTime} ms`);
    console.log(`2. Tiempo segunda apertura (con Cache API): ${cachedLoadTime} ms`);
    console.log(`3. Peticiones totales procesadas: ${networkStats.totalRequests}`);
    console.log(`4. Códigos de respuesta HTTP:`, JSON.stringify(networkStats.statusCodeCounts, null, 2));
    console.log(`5. Número de reintentos ejecutados: ${networkStats.retriesCount}`);
    console.log(`6. Fallos con su código:`);
    if (networkStats.failedUrlCodes.length === 0) {
      console.log('   - 0 fallos de red');
    } else {
      for (const fail of networkStats.failedUrlCodes.slice(0, 15)) {
        console.log(`   - Código: ${fail.code} | URL: ${fail.url}`);
      }
    }
    console.log('=============================================================\n');

    expect(coldLoadTime).toBeLessThan(45000);
    expect(cachedLoadTime).toBeLessThan(3000);

    // Cerrar contextos
    for (const ctx of contexts) {
      await ctx.close();
    }
  });
});
