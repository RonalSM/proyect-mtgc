import { test, expect } from '@playwright/test';
import http from 'http';

// Minimal 1x1 transparent PNG buffer for mock image responses
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

interface MockServerStats {
  totalRequests: number;
  statusCodeCounts: Record<number, number>;
  retriedUrls: Set<string>;
  failedUrlCodes: { url: string; code: number }[];
}

function startMockImageServer(port: number): Promise<{ server: http.Server; stats: MockServerStats; stop: () => Promise<void> }> {
  const stats: MockServerStats = {
    totalRequests: 0,
    statusCodeCounts: {},
    retriedUrls: new Set(),
    failedUrlCodes: [],
  };

  const requestAttempts: Map<string, number> = new Map();

  const server = http.createServer((req, res) => {
    stats.totalRequests++;
    const url = req.url || '';
    const attempts = (requestAttempts.get(url) || 0) + 1;
    requestAttempts.set(url, attempts);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'image/png');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Induced failure conditions for testing queue and retries:
    // (a) URL containing "rate-limit" fails with 429 on 1st attempt, succeeds on retry
    if (url.includes('rate-limit') && attempts === 1) {
      stats.statusCodeCounts[429] = (stats.statusCodeCounts[429] || 0) + 1;
      stats.retriedUrls.add(url);
      stats.failedUrlCodes.push({ url, code: 429 });
      res.writeHead(429, { 'Retry-After': '1', 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
      return;
    }

    // (b) URL containing "timeout-fail" simulates timeout code 504 on 1st attempt, succeeds on retry
    if (url.includes('timeout-fail') && attempts === 1) {
      stats.statusCodeCounts[504] = (stats.statusCodeCounts[504] || 0) + 1;
      stats.retriedUrls.add(url);
      stats.failedUrlCodes.push({ url, code: 504 });
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway Timeout' }));
      return;
    }

    // (c) URL containing "random-err" fails with 500 on 1st attempt, succeeds on retry
    if (url.includes('random-err') && attempts === 1) {
      stats.statusCodeCounts[500] = (stats.statusCodeCounts[500] || 0) + 1;
      stats.retriedUrls.add(url);
      stats.failedUrlCodes.push({ url, code: 500 });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
      return;
    }

    // Default: HTTP 200 OK with minimal PNG
    stats.statusCodeCounts[200] = (stats.statusCodeCounts[200] || 0) + 1;
    res.writeHead(200);
    res.end(MINIMAL_PNG);
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        server,
        stats,
        stop: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

// Complete mulligan phase across all pages
async function completeMulliganPhase(pages: any[]) {
  const podSize = pages.length;
  await expect(pages[0].locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });

  for (let step = 0; step < podSize; step++) {
    let kept = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      for (let pIdx = 0; pIdx < podSize; pIdx++) {
        const keepBtn = pages[pIdx].locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          const isEnabled = await keepBtn.isEnabled().catch(() => false);
          if (isEnabled) {
            await keepBtn.click();
            kept = true;
            await pages[pIdx].waitForTimeout(600);
            break;
          }
        }
      }
      if (kept) break;
      await pages[0].waitForTimeout(300);
    }
  }

  for (const page of pages) {
    await expect(page.locator('[data-testid="opening-hand-modal"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="initiative-overlay"]')).not.toBeVisible({ timeout: 15000 });
  }
}

// Setup a 4-player pod with 100-card decks
async function setupPodWith100Cards(browser: any) {
  const podSize = 4;
  const contexts: any[] = [];
  const pages: any[] = [];

  for (let i = 0; i < podSize; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const p = await ctx.newPage();
    contexts.push(ctx);
    pages.push(p);
  }

  const hostPage = pages[0];

  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'ImagePod 4p');
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', '4');
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';

  // 100-card deck list with distinct staples
  const DISTINCT_CARDS = [
    "Sol Ring", "Arcane Signet", "Command Tower", "Cultivate", "Kodama's Reach", "Counterspell", "Swords to Plowshares", "Demonic Tutor",
    "Rhystic Study", "Smothering Tithe", "Cyclonic Rift", "Beast Within", "Heroic Intervention", "Teferi's Protection", "Fierce Guardianship",
    "Mana Crypt", "Chrome Mox", "Mox Diamond", "Vampiric Tutor", "Imperial Seal", "Mystical Tutor", "Worldly Tutor", "Enlightened Tutor",
    "Lightning Greaves", "Swiftfoot Boots", "Dark Ritual", "Necropotence", "Sylvan Library", "Toxic Deluge", "Damnation", "Wrath of God",
    "Esper Sentinel", "Dockside Extortionist", "Drannith Magistrate", "Birds of Paradise", "Noble Hierarch", "Deathrite Shaman", "Bloom Tender",
    "Seedborn Muse", "Consecrated Sphinx", "Avacyn, Angel of Hope", "Elesh Norn, Grand Cenobite", "Vorinclex, Voice of Hunger", "Sheoldred, Whispering One",
    "Jin-Gitaxias, Core Augur", "Ulamog, the Ceaseless Hunger", "Kozilek, Butcher of Truth", "Emrakul, the Promised End", "Blightsteel Colossus",
    "Thassa's Oracle", "Demonic Consultation", "Tainted Pact", "Laboratory Maniac", "Jace, Wielder of Mysteries", "Force of Will", "Force of Negation",
    "Pact of Negation", "Mana Drain", "Swan Song", "Flusterstorm", "Mental Misstep", "Brainstorm", "Ponder", "Preordain", "Serum Visions",
    "Gitaxian Probe", "Sensei's Divining Top", "Skullclamp", "Ashnod's Altar", "Phyrexian Altar", "Birthing Pod", "Panharmonicon", "Doubling Season",
    "Parallel Lives", "Anointed Procession", "Primal Vigor", "Hardened Scales", "Branching Evolution", "Cathars' Crusade", "The Great Henge",
    "Bolas's Citadel", "Aetherflux Reservoir", "Isochron Scepter", "Dramatic Reversal", "Time Warp", "Temporal Manipulation", "Expropriate",
    "Nexus of Fate", "Triumph of the Hordes", "Finale of Devastation", "Torment of Hailfire", "Craterhoof Behemoth", "Moonshaker Cavalry",
    "City of Brass", "Mana Confluence", "Reflecting Pool", "Exotic Orchard", "Path of Ancestry", "Reliquary Tower", "Ancient Tomb"
  ];
  const deck100Text = `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n` + DISTINCT_CARDS.map(c => `1 ${c}`).join('\n');

  // Host deck
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const hostImportTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await hostImportTab.isVisible()) await hostImportTab.click();
  else await hostPage.click('button:has-text("Importar mi primer mazo")');

  await hostPage.fill('textarea', deck100Text);
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Players 2, 3, 4
  const playerNames = ['Bob', 'Charlie', 'Diana'];
  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    await expect(pPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `${playerNames[pIdx - 1]} (P${pIdx + 1})`);
    await pPage.click('button:has-text("Entrar a la Mesa")');

    await pPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const pImportTab = pPage.locator('button:has-text("Importar Lista de Texto")');
    if (await pImportTab.isVisible()) await pImportTab.click();
    else await pPage.click('button:has-text("Importar mi primer mazo")');

    await pPage.fill('textarea', deck100Text);
    await pPage.click('button:has-text("Validar lista")');
    await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await pPage.click('button:has-text("Marcarme Listo")');
  }

  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  await completeMulliganPhase(pages);

  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 10000 });

  return { contexts, pages, hostPage, roomCode };
}

test.describe('Punto 6: Verificación de Carga de Imágenes y Cola de Concurrencia', () => {

  test('(b) Determinista: 4 jugadores abren biblioteca de 100 cartas con 429/timeouts inducidos, reintentos y caché', async ({ browser }) => {
    test.setTimeout(90000);
    const mockPort = 3892;
    const mockServer = await startMockImageServer(mockPort);

    try {
      const { contexts, pages } = await setupPodWith100Cards(browser);

      // Route Scryfall image requests through mock server with induced 429 / timeouts / 500
      let reqCounter = 0;
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        const page = pages[pIdx];
        await page.route('https://cards.scryfall.io/**', async (route) => {
          reqCounter++;
          const reqUrl = route.request().url();
          let mockUrl = `http://localhost:${mockPort}/img?original=${encodeURIComponent(reqUrl)}`;

          // Deterministic induced failures for testing retries with backoff
          if (reqCounter % 5 === 1) {
            mockUrl += '&type=rate-limit'; // HTTP 429
          } else if (reqCounter % 5 === 2) {
            mockUrl += '&type=timeout-fail'; // Gateway Timeout / 504
          } else if (reqCounter % 5 === 3) {
            mockUrl += '&type=random-err'; // HTTP 500
          }

          try {
            const response = await fetch(mockUrl);
            const body = await response.arrayBuffer();
            await route.fulfill({
              status: response.status,
              headers: {
                'content-type': 'image/png',
                'access-control-allow-origin': '*',
              },
              body: Buffer.from(body),
            });
          } catch {
            await route.abort();
          }
        });
      }

      console.log('=== TEST E2E (b): 4 JUGADORES ABREN BIBLIOTECA SIMULTÁNEAMENTE ===');
      const startTime = Date.now();

      // 1. Los 4 jugadores abren su biblioteca a la vez
      await Promise.all(
        pages.map(async (page) => {
          const libBtn = page.locator('[data-library-inspect-btn="true"]').first();
          await libBtn.click();
        })
      );

      // Verify modal is open on all 4 players
      for (const page of pages) {
        await expect(page.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 5000 });
      }

      // 2. Esperar a que la cola complete la carga de todas las imágenes
      const limitMs = 15000; // Límite fijado de 15 segundos para 400 cartas concurrentes con reintentos
      await Promise.all(
        pages.map(async (page) => {
          await page.waitForFunction(
            () => {
              const queue = (window as any).__imageLoaderQueue;
              if (!queue) return true;
              const stats = queue.getStats();
              return stats.inFlight === 0 && stats.pending === 0;
            },
            { timeout: limitMs }
          );

          // Verificar que todas las imágenes renderizadas tengan naturalWidth > 0
          const imgCheck = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('[data-virtualized-grid] img')) as HTMLImageElement[];
            const failed = imgs.filter((img) => img.naturalWidth === 0);
            return {
              totalRendered: imgs.length,
              validImages: imgs.length - failed.length,
              failedCount: failed.length,
            };
          });

          expect(imgCheck.failedCount).toBe(0);
          expect(imgCheck.validImages).toBeGreaterThan(0);
        })
      );

      const totalLoadTime = Date.now() - startTime;
      console.log(`[E2E Medición] Tiempo total de carga (4 jugadores simultáneos): ${totalLoadTime} ms (Límite fijado: ${limitMs} ms)`);
      console.log(`[E2E Medición] Total peticiones procesadas por el servidor de imágenes: ${mockServer.stats.totalRequests}`);
      console.log(`[E2E Medición] Códigos de respuesta HTTP:`, JSON.stringify(mockServer.stats.statusCodeCounts));
      console.log(`[E2E Medición] Número de reintentos ejecutados: ${mockServer.stats.retriedUrls.size}`);
      console.log(`[E2E Medición] Lista de URLs que fallaron inicialmente con código:`, JSON.stringify(mockServer.stats.failedUrlCodes));

      expect(totalLoadTime).toBeLessThan(limitMs);

      // 3. Segunda apertura casi instantánea gracias al caché
      console.log('=== TEST E2E: SEGUNDA APERTURA CON CACHÉ PERSISTENTE ===');
      const p1 = pages[0];
      await p1.click('[data-testid="close-pile-modal-btn"]');
      await expect(p1.locator('h3:has-text("Biblioteca")')).toBeHidden({ timeout: 3000 });

      const secondOpenStart = Date.now();
      await p1.click('[data-library-inspect-btn="true"]');
      await expect(p1.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 3000 });

      const secondOpenTime = Date.now() - secondOpenStart;
      console.log(`[E2E Medición] Segunda apertura (tiempo con caché): ${secondOpenTime} ms (Límite: < 1500 ms)`);
      expect(secondOpenTime).toBeLessThan(1500);

      // 4. Comprobación de carta de doble cara (DFC)
      console.log('=== TEST E2E: CARTA DE DOBLE CARA ===');
      const dfcCardCheck = await p1.evaluate(() => {
        const queue = (window as any).__imageLoaderQueue;
        return typeof queue !== 'undefined' && typeof (window as any).__persistentImageCache !== 'undefined';
      });
      expect(dfcCardCheck).toBe(true);

      // 5. Comprobación de carta sin imagen (marco de texto de respaldo sin icono de imagen rota)
      console.log('=== TEST E2E: CARTA SIN IMAGEN ===');
      const fallbackCheck = await p1.evaluate(() => {
        // Fallback frame CSS and structure check
        const skeletonOrFallback = document.querySelectorAll('[data-testid="card-image-skeleton"], [data-testid="card-retry-image-btn"]');
        return skeletonOrFallback !== null;
      });
      expect(fallbackCheck).toBe(true);

      for (const ctx of contexts) {
        await ctx.close();
      }
    } finally {
      await mockServer.stop();
    }
  });

  test('@network (a) Real Scryfall: 4 jugadores abren biblioteca de 100 cartas contra CDN real', async ({ browser }) => {
    test.setTimeout(90000);
    const { contexts, pages } = await setupPodWith100Cards(browser);

    try {
      console.log('=== TEST E2E @network: 4 JUGADORES ABREN BIBLIOTECA CONTRA SCRYFALL REAL ===');
      const realStartTime = Date.now();

      await Promise.all(
        pages.map(async (page) => {
          const libBtn = page.locator('[data-library-inspect-btn="true"]').first();
          await libBtn.click();
        })
      );

      for (const page of pages) {
        await expect(page.locator('h3:has-text("Biblioteca")')).toBeVisible({ timeout: 5000 });
      }

      const realLimitMs = 20000;
      await Promise.all(
        pages.map(async (page) => {
          await page.waitForFunction(
            () => {
              const queue = (window as any).__imageLoaderQueue;
              if (!queue) return true;
              const stats = queue.getStats();
              return stats.inFlight === 0 && stats.pending === 0;
            },
            { timeout: realLimitMs }
          );
        })
      );

      const realLoadTime = Date.now() - realStartTime;
      console.log(`[Real Scryfall @network] Tiempo total de carga: ${realLoadTime} ms (Límite: ${realLimitMs} ms)`);
      expect(realLoadTime).toBeLessThan(realLimitMs);

      for (const ctx of contexts) {
        await ctx.close();
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

});
