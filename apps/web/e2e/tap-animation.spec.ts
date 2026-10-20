import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

// Helper para crear sala, unir 2 jugadores, importar mazos y dejarlos listos
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

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'TapAnim Pod 2p');
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
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Cultivate\n1 Counterspell\n1 Swords to Plowshares\n1 Demonic Tutor\n10 Plains\n10 Island\n10 Swamp\n10 Forest`,
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
    `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n1 Dark Ritual\n1 Vampiric Tutor\n1 Blood Artist\n10 Mountain\n10 Swamp\n10 Plains`,
  );
  await guestPage.click('button:has-text("Validar lista")');
  await guestPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await guestPage.click('button:has-text("Marcarme Listo")');

  // Iniciar partida
  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // Completar fase de mulligan en ambos jugadores
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
    timeout: 25000,
  });

  for (let step = 0; step < 2; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let clicked = false;
      for (const p of pages) {
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

  // Esperar a que la mesa esté activa
  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(guestPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

  return { contexts, hostPage, guestPage };
}

test.describe('Punto 7: Animación de girar y enderezar sobre el centro invariante', () => {
  test('Giro y enderezado: centro fijo (<= 1 px), ángulo monótono (0 a 90), dimensiones intercambiadas y sincronía remota en B', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const { contexts, hostPage, guestPage } = await setupTwoPlayerGame(browser);

    try {
      // 1. Host envía una carta de la mano al campo de batalla
      const handCard = hostPage.locator('[data-from-zone="hand"]').first();
      await handCard.waitFor({ state: 'visible', timeout: 10000 });
      await handCard.click({ button: 'right', force: true });
      await hostPage
        .locator('[data-testid="context-to-battlefield"]')
        .waitFor({ state: 'visible', timeout: 5000 });
      await hostPage.locator('[data-testid="context-to-battlefield"]').click();
      await hostPage.waitForTimeout(1000);

      // 2. Verificar que la carta está presente en el campo de batalla en host y guest
      const cardSlotA = hostPage.locator('[data-battlefield-card="true"]').first();
      await expect(cardSlotA).toBeVisible({ timeout: 5000 });
      const cardSlotB = guestPage.locator('[data-battlefield-card="true"]').first();
      await expect(cardSlotB).toBeVisible({ timeout: 5000 });

      // Obtener holderId inicial antes del giro
      const initialHolderId = await cardSlotA.getAttribute('data-card-holder');

      // 3. Instalar muestreador con requestAnimationFrame en Host y Guest
      await hostPage.evaluate(() => {
        (window as any).__tapFrames = [];
        (window as any).__samplingActive = false;

        (window as any).__startSampling = () => {
          (window as any).__tapFrames = [];
          (window as any).__samplingActive = true;

          const sample = () => {
            const slot = document.querySelector('[data-battlefield-card="true"]') as HTMLElement;
            const rotator = document.querySelector('[data-card-rotator="true"]') as HTMLElement;
            if (slot && rotator) {
              const r = slot.getBoundingClientRect();
              const st = window.getComputedStyle(rotator);
              const tr = st.transform;
              let angle = 0;
              if (tr && tr !== 'none') {
                const parts = tr.split('(')[1]?.split(')')[0]?.split(',');
                if (parts && parts.length >= 4) {
                  const a = parseFloat(parts[0]);
                  const b = parseFloat(parts[1]);
                  angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                  if (angle < 0) angle += 360;
                }
              }

              (window as any).__tapFrames.push({
                time: performance.now(),
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
                width: r.width,
                height: r.height,
                angle,
              });
            }

            if ((window as any).__samplingActive) {
              requestAnimationFrame(sample);
            }
          };

          requestAnimationFrame(sample);
        };

        (window as any).__stopSampling = () => {
          (window as any).__samplingActive = false;
        };
      });

      // Mismo muestreador en Guest (Cliente Remoto B)
      await guestPage.evaluate(() => {
        (window as any).__tapFramesRemote = [];
        (window as any).__samplingActiveRemote = false;

        (window as any).__startSamplingRemote = () => {
          (window as any).__tapFramesRemote = [];
          (window as any).__samplingActiveRemote = true;

          const sample = () => {
            const slot = document.querySelector('[data-battlefield-card="true"]') as HTMLElement;
            const rotator = document.querySelector('[data-card-rotator="true"]') as HTMLElement;
            if (slot && rotator) {
              const r = slot.getBoundingClientRect();
              const st = window.getComputedStyle(rotator);
              const tr = st.transform;
              let angle = 0;
              if (tr && tr !== 'none') {
                const parts = tr.split('(')[1]?.split(')')[0]?.split(',');
                if (parts && parts.length >= 4) {
                  const a = parseFloat(parts[0]);
                  const b = parseFloat(parts[1]);
                  angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                  if (angle < 0) angle += 360;
                }
              }

              (window as any).__tapFramesRemote.push({
                time: performance.now(),
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
                width: r.width,
                height: r.height,
                angle,
              });
            }

            if ((window as any).__samplingActiveRemote) {
              requestAnimationFrame(sample);
            }
          };

          requestAnimationFrame(sample);
        };

        (window as any).__stopSamplingRemote = () => {
          (window as any).__samplingActiveRemote = false;
        };
      });

      // 4. Iniciar muestreo y capturar frames durante el GIRO (TAP)
      await hostPage.evaluate(() => (window as any).__startSampling());
      await guestPage.evaluate(() => (window as any).__startSamplingRemote());

      // Doble clic para girar
      await cardSlotA.dblclick({ force: true });

      // Capturar 3 frames intermedios durante la transición de 180ms
      await hostPage.waitForTimeout(30);
      await hostPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'tap-frame-1.png'),
      });

      await hostPage.waitForTimeout(60);
      await hostPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'tap-frame-2.png'),
      });

      await hostPage.waitForTimeout(110);
      await hostPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'tap-frame-3.png'),
      });

      // Detener muestreo tras completar el giro
      await hostPage.evaluate(() => (window as any).__stopSampling());
      await guestPage.evaluate(() => (window as any).__stopSamplingRemote());

      // 5. Analizar frames del giro en Host (Cliente A)
      const tapFrames = await hostPage.evaluate(() => (window as any).__tapFrames || []);
      console.log(`[Punto 7] Frames muestreados durante el giro (Host): ${tapFrames.length}`);
      expect(tapFrames.length).toBeGreaterThanOrEqual(5);

      const f0 = tapFrames[0];
      const fEnd = tapFrames[tapFrames.length - 1];

      // Verificación 1: Variación del centro <= 1.0 px en todos los frames
      let maxCxDiff = 0;
      let maxCyDiff = 0;
      for (const f of tapFrames) {
        const dx = Math.abs(f.cx - f0.cx);
        const dy = Math.abs(f.cy - f0.cy);
        if (dx > maxCxDiff) maxCxDiff = dx;
        if (dy > maxCyDiff) maxCyDiff = dy;
      }
      console.log(
        `[Punto 7] Máxima variación del centro en Host: Δx=${maxCxDiff.toFixed(2)}px, Δy=${maxCyDiff.toFixed(2)}px`,
      );
      expect(maxCxDiff).toBeLessThanOrEqual(1.0);
      expect(maxCyDiff).toBeLessThanOrEqual(1.0);

      // Verificación 2: El ángulo crece de forma monótona de 0 a 90 sin sobrepasarse
      console.log(`[Punto 7] Ángulo inicial: ${f0.angle}°, Ángulo final: ${fEnd.angle}°`);
      expect(f0.angle).toBe(0);
      expect(fEnd.angle).toBe(90);

      for (let i = 1; i < tapFrames.length; i++) {
        expect(tapFrames[i].angle).toBeGreaterThanOrEqual(tapFrames[i - 1].angle);
        expect(tapFrames[i].angle).toBeLessThanOrEqual(90);
      }

      // Verificación 3: Las dimensiones se intercambian (ancho y alto del slot)
      console.log(
        `[Punto 7] Dimensiones iniciales: ${f0.width.toFixed(1)} x ${f0.height.toFixed(1)}`,
      );
      console.log(
        `[Punto 7] Dimensiones finales: ${fEnd.width.toFixed(1)} x ${fEnd.height.toFixed(1)}`,
      );
      expect(Math.abs(fEnd.width - f0.height)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(fEnd.height - f0.width)).toBeLessThanOrEqual(1.5);

      // Verificación 4: holderId NO fue recalculado en ningún momento del giro
      const postTapHolderId = await cardSlotA.getAttribute('data-card-holder');
      expect(postTapHolderId).toBe(initialHolderId);

      // Verificación 5: Cliente Remoto B también ve la animación y estado apaisado
      const remoteFrames = await guestPage.evaluate(() => (window as any).__tapFramesRemote || []);
      console.log(`[Punto 7] Frames muestreados en Cliente Remoto B: ${remoteFrames.length}`);
      if (remoteFrames.length > 0) {
        const rf0 = remoteFrames[0];
        const rfEnd = remoteFrames[remoteFrames.length - 1];
        let maxRemoteCxDiff = 0;
        let maxRemoteCyDiff = 0;
        for (const f of remoteFrames) {
          const dx = Math.abs(f.cx - rf0.cx);
          const dy = Math.abs(f.cy - rf0.cy);
          if (dx > maxRemoteCxDiff) maxRemoteCxDiff = dx;
          if (dy > maxRemoteCyDiff) maxRemoteCyDiff = dy;
        }
        console.log(
          `[Punto 7] Máxima variación del centro en Remoto B: Δx=${maxRemoteCxDiff.toFixed(2)}px, Δy=${maxRemoteCyDiff.toFixed(2)}px`,
        );
        expect(maxRemoteCxDiff).toBeLessThanOrEqual(1.0);
        expect(maxRemoteCyDiff).toBeLessThanOrEqual(1.0);
        expect(Math.abs(rfEnd.width - rf0.height)).toBeLessThanOrEqual(2.0);
      }

      // 6. ENDEREZAR (UNTAP): verificar camino más corto (-90°, 90 a 0) y centro fijo
      await hostPage.evaluate(() => (window as any).__startSampling());

      // Doble clic para enderezar
      await cardSlotA.dblclick({ force: true });
      await hostPage.waitForTimeout(250);

      await hostPage.evaluate(() => (window as any).__stopSampling());

      const untapFrames = await hostPage.evaluate(() => (window as any).__tapFrames || []);
      console.log(
        `[Punto 7] Frames muestreados durante el enderezado (Untap): ${untapFrames.length}`,
      );
      expect(untapFrames.length).toBeGreaterThanOrEqual(5);

      const u0 = untapFrames[0];
      const uEnd = untapFrames[untapFrames.length - 1];

      // Verificación: Centro fijo en enderezado
      let maxUntapCxDiff = 0;
      let maxUntapCyDiff = 0;
      for (const f of untapFrames) {
        const dx = Math.abs(f.cx - u0.cx);
        const dy = Math.abs(f.cy - u0.cy);
        if (dx > maxUntapCxDiff) maxUntapCxDiff = dx;
        if (dy > maxUntapCyDiff) maxUntapCyDiff = dy;
      }
      console.log(
        `[Punto 7] Máxima variación del centro en Untap: Δx=${maxUntapCxDiff.toFixed(2)}px, Δy=${maxUntapCyDiff.toFixed(2)}px`,
      );
      expect(maxUntapCxDiff).toBeLessThanOrEqual(1.0);
      expect(maxUntapCyDiff).toBeLessThanOrEqual(1.0);

      // Verificación: Ángulo decrece monótonamente de 90 a 0 (camino más corto de -90°, nunca 270°)
      console.log(`[Punto 7] Untap ángulo inicial: ${u0.angle}°, final: ${uEnd.angle}°`);
      expect(u0.angle).toBe(90);
      expect(uEnd.angle).toBe(0);

      for (let i = 1; i < untapFrames.length; i++) {
        expect(untapFrames[i].angle).toBeLessThanOrEqual(untapFrames[i - 1].angle);
        expect(untapFrames[i].angle).toBeGreaterThanOrEqual(0);
      }

      // Dimensiones vuelven a vertical original
      expect(Math.abs(uEnd.width - f0.width)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(uEnd.height - f0.height)).toBeLessThanOrEqual(1.0);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
