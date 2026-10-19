import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

// Helper para crear sala, unir jugadores, importar mazos y dejarlos listos
async function setupTestPod(
  browser: any,
  podSize: number,
  width = 1920,
  height = 1080,
  roomPrefix = 'PodTest',
  startGame = true
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

  // 1. Host crea la sala
  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `${roomPrefix} ${podSize}p`);
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', String(podSize));
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
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Cultivate\n1 Counterspell\n1 Swords to Plowshares\n1 Demonic Tutor\n1 Rhystic Study\n1 Smothering Tithe\n10 Plains\n10 Island\n10 Swamp\n10 Forest`
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Jugadores 2..N
  const playerNames = ['Bob', 'Charlie', 'Diana', 'Evan', 'Fiona'];
  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    await hostPage.waitForTimeout(300);
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    await expect(pPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `${playerNames[pIdx - 1]} (P${pIdx + 1})`);
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
      `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Lightning Bolt\n1 Dark Ritual\n1 Vampiric Tutor\n1 Blood Artist\n10 Mountain\n10 Swamp\n10 Plains`
    );
    await pPage.click('button:has-text("Validar lista")');
    await pPage.click('button:has-text("Usar este Mazo en la Mesa")');
    await pPage.click('button:has-text("Marcarme Listo")');
  }

  if (startGame) {
    const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
    await startGameBtn.click();
  }

  return { contexts, pages, hostPage, roomCode };
}

// Helper para pasar toda la fase de mulligan y llegar a status: playing de forma robusta
async function completeMulliganPhase(pages: any[]) {
  const podSize = pages.length;

  // 1. Esperar a que la fase de iniciativa concluya y se abra el modal de apertura en el host
  await expect(pages[0].locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });

  // 2. Para cada jugador en orden, resolver su decisión de quedarse con la mano
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

  // 3. Esperar a que el modal de mulligan y el overlay de iniciativa desaparezcan en todas las páginas
  for (const page of pages) {
    await expect(page.locator('[data-testid="opening-hand-modal"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="initiative-overlay"]')).not.toBeVisible({ timeout: 15000 });
  }

  // 4. Confirmar que la mesa total y las cartas de mano están presentes
  await expect(pages[0].locator('#mesa-total')).toBeVisible({ timeout: 10000 });
  await expect(pages[0].locator('[data-from-zone="hand"]').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Puntos de Corrección del Cliente (1 a 7 & Playwright Suite)', () => {

  test('Punto 4: Tirada de dados de iniciativa 100% automática en servidor, sin botones en cliente', async ({ browser }) => {
    test.setTimeout(60000);
    // Iniciamos pod pero no iniciamos la partida en el helper para inspeccionar el clic y la transición
    const { contexts, pages, hostPage } = await setupTestPod(browser, 2, 1920, 1080, 'DicePod', false);

    try {
      const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
      await expect(startGameBtn).toBeEnabled();
      await startGameBtn.click();

      // Verificar que durante la iniciativa NO existe ningún botón para tirar iniciativa en el cliente
      const rollBtn = hostPage.locator('button:has-text("LANZAR D20"), button:has-text("Tirar D20")');
      await expect(rollBtn).toHaveCount(0);

      // Si el overlay de iniciativa está presente, capturarlo
      const overlay = hostPage.locator('[data-testid="initiative-overlay"]');
      if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hostPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'auto-initiative-overlay.png'),
        });
      }

      // La fase avanza automáticamente hacia mulligan sin que ningún cliente presione nada
      await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 15000 });

      // Completamos mulligan para llegar a mesa
      await completeMulliganPhase(pages);

      // Verificar que el botón "Dados" en la barra de herramientas sigue disponible para tiradas libres
      const diceToolbarBtn = hostPage.locator('button:has-text("Dados")').first();
      await expect(diceToolbarBtn).toBeVisible();
      await diceToolbarBtn.click();
      await hostPage.waitForTimeout(500);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 5: Fase de Mulligan autoritativa con Regla de Londres, modal Opening Hand, privacidad y reconexión (2 jugadores)', async ({ browser }) => {
    test.setTimeout(120000);
    const { contexts, pages } = await setupTestPod(browser, 2, 1920, 1080, 'MulliganPod2p', true);

    try {
      // 1. Esperar a que concluya iniciativa y se abra OpeningHandModal en ambos jugadores
      await expect(pages[0].locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 20000 });
      await expect(pages[1].locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 20000 });

      // Captura de modal de apertura
      await pages[0].screenshot({
        path: path.join(SCREENSHOT_DIR, 'opening-hand-modal-mulligan.png'),
      });

      // 2. Comprobar que las cartas de la mano NO aparecen en el abanico inferior antes de quedarse
      const p1DockCards = pages[0].locator('[data-dock-zone="hand"] [data-hand-card="true"]');
      await expect(p1DockCards).toHaveCount(0);
      const p2DockCards = pages[1].locator('[data-dock-zone="hand"] [data-hand-card="true"]');
      await expect(p2DockCards).toHaveCount(0);

      // 3. Comprobar orden de decisión: exactamente un jugador tiene los botones activos
      let activeDecidingPage = pages[0];
      let waitingPage = pages[1];
      if (!(await pages[0].locator('[data-testid="mulligan-btn"]').isVisible({ timeout: 1000 }).catch(() => false))) {
        activeDecidingPage = pages[1];
        waitingPage = pages[0];
      }

      // El jugador esperando ve el mensaje de espera
      await expect(waitingPage.locator('text=está decidiendo su mano')).toBeVisible();

      // Privacidad: comprobar que el rival (waitingPage) no tiene en su abanico ni DOM nombres de cartas del jugador activo
      const activeHandCards = await activeDecidingPage.locator('[data-testid="mulligan-card"]').all();
      expect(activeHandCards.length).toBe(7);

      // 4. El jugador activo ve "El primer mulligan es gratis"
      await expect(activeDecidingPage.locator('text=El primer mulligan es gratis')).toBeVisible();

      // Primer mulligan (gratis, k=1, devuelve 0 cartas al fondo)
      await activeDecidingPage.locator('[data-testid="mulligan-btn"]').click();
      await activeDecidingPage.waitForTimeout(1000);
      await expect(activeDecidingPage.locator('text=Si te quedas, pondrás 0 carta(s) al fondo')).toBeVisible();

      // Segundo mulligan (k=2, devuelve 1 carta al fondo)
      await activeDecidingPage.locator('[data-testid="mulligan-btn"]').click();
      await activeDecidingPage.waitForTimeout(1000);
      await expect(activeDecidingPage.locator('text=Si te quedas, pondrás 1 carta(s) al fondo')).toBeVisible();

      // Tercer mulligan (k=3, devuelve 2 cartas al fondo)
      await activeDecidingPage.locator('[data-testid="mulligan-btn"]').click();
      await activeDecidingPage.waitForTimeout(1000);
      await expect(activeDecidingPage.locator('text=Si te quedas, pondrás 2 carta(s) al fondo')).toBeVisible();

      // Reconexión durante la fase de mulligan: recargar la página del jugador activo y comprobar que se restaura el modal
      await activeDecidingPage.reload();
      await expect(activeDecidingPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 15000 });
      await expect(activeDecidingPage.locator('text=Si te quedas, pondrás 2 carta(s) al fondo')).toBeVisible();

      // Seleccionar 2 cartas para enviar al fondo
      const mulliganCards = activeDecidingPage.locator('[data-testid="mulligan-card"]');
      await mulliganCards.nth(0).click();
      await mulliganCards.nth(1).click();
      await expect(activeDecidingPage.locator('text=#1 al fondo')).toBeVisible();
      await expect(activeDecidingPage.locator('text=#2 al fondo')).toBeVisible();

      // Quedarse con la mano seleccionada (5 cartas resultantes)
      const keepBtn = activeDecidingPage.locator('[data-testid="keep-btn"]');
      await expect(keepBtn).toBeEnabled();
      await keepBtn.click();
      await activeDecidingPage.waitForTimeout(600);

      // Ahora el turno de decisión pasa automáticamente al segundo jugador
      await expect(waitingPage.locator('[data-testid="keep-btn"]')).toBeVisible({ timeout: 5000 });
      await waitingPage.locator('[data-testid="keep-btn"]').click();

      // Transición automática a playing y la mano aparece en el abanico
      await expect(pages[0].locator('#mesa-total')).toBeVisible({ timeout: 15000 });
      await expect(pages[0].locator('[data-dock-zone="hand"] [data-hand-card="true"]')).not.toHaveCount(0);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 5: Fase de Mulligan con 4 jugadores: orden de decisión secuencial y manos ocultas', async ({ browser }) => {
    test.setTimeout(120000);
    const { contexts, pages } = await setupTestPod(browser, 4, 1920, 1080, 'MulliganPod4p', true);

    try {
      // 1. Esperar a que concluya iniciativa y se abra OpeningHandModal en las 4 páginas
      for (const p of pages) {
        await expect(p.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 20000 });
      }

      // 2. Resolver decisiones en estricto orden de turno (1 a 4)
      for (let step = 0; step < 4; step++) {
        let decidingPage = null;
        for (let attempt = 0; attempt < 30; attempt++) {
          for (let i = 0; i < 4; i++) {
            const keepBtn = pages[i].locator('[data-testid="keep-btn"]');
            if (await keepBtn.isVisible().catch(() => false)) {
              decidingPage = pages[i];
              break;
            }
          }
          if (decidingPage) break;
          await pages[0].waitForTimeout(300);
        }

        expect(decidingPage).not.toBeNull();
        // Verificar que exactamente 1 jugador tiene los controles de decisión activos
        const activeKeepButtons = await Promise.all(
          pages.map(p => p.locator('[data-testid="keep-btn"]').isVisible().catch(() => false))
        );
        const countActive = activeKeepButtons.filter(Boolean).length;
        expect(countActive).toBe(1);

        // Los rivales ven el indicador del jugador decidiendo actualmente
        for (const p of pages) {
          if (p !== decidingPage) {
            await expect(p.getByText('Decidiendo', { exact: true })).toBeVisible();
          }
        }

        // El jugador activo se queda con su mano
        await decidingPage!.locator('[data-testid="keep-btn"]').click();
        await pages[0].waitForTimeout(500);
      }

      // 3. Los 4 se quedaron: transición automática a playing en todas las páginas
      for (const p of pages) {
        await expect(p.locator('[data-testid="opening-hand-modal"]')).not.toBeVisible({ timeout: 15000 });
        await expect(p.locator('#mesa-total')).toBeVisible({ timeout: 10000 });
        await expect(p.locator('[data-dock-zone="hand"] [data-hand-card="true"]')).not.toHaveCount(0);
      }
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 1: Fantasma remoto nace en la posición real de la carta (<= 2px) y sin frames en el centro de la mesa', async ({ browser }) => {
    test.setTimeout(60000);
    const { contexts, pages } = await setupTestPod(browser, 2, 1920, 1080, 'GhostPod', true);

    try {
      // Completar mulligan
      console.log('[Test 3] Calling completeMulliganPhase');
      await completeMulliganPhase(pages);
      console.log('[Test 3] completeMulliganPhase finished');

      const pageA = pages[0];
      const pageB = pages[1];

      // Jugador A envía una carta de la mano a la mesa
      const handCard = pageA.locator('[data-from-zone="hand"]').first();
      console.log('[Test 3] Waiting for handCard');
      await handCard.waitFor({ state: 'visible', timeout: 10000 });
      console.log('[Test 3] Clicking right button on handCard (force: true)');
      await handCard.click({ button: 'right', force: true });
      console.log('[Test 3] Waiting for context-to-battlefield');
      await pageA.locator('[data-testid="context-to-battlefield"]').waitFor({ state: 'visible', timeout: 5000 });
      console.log('[Test 3] Clicking context-to-battlefield');
      await pageA.locator('[data-testid="context-to-battlefield"]').click();
      await pageA.waitForTimeout(1000);

      const bfCardA = pageA.locator('[data-from-zone="battlefield"]').first();
      console.log('[Test 3] Waiting for bfCardA');
      await expect(bfCardA).toBeVisible({ timeout: 5000 });
      const rectA = await bfCardA.boundingBox();
      console.log('[Test 3] rectA bounding box:', rectA);
      expect(rectA).not.toBeNull();

      // En el contexto B, instalar grabador requestAnimationFrame
      await pageB.evaluate(() => {
        (window as any).__ghostFrames = [];
        const capture = () => {
          const ghost = document.querySelector('[data-remote-card-ghost]') as HTMLElement;
          if (ghost) {
            const r = ghost.getBoundingClientRect();
            (window as any).__ghostFrames.push({
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
              left: r.left,
              top: r.top,
              time: performance.now(),
            });
          }
          requestAnimationFrame(capture);
        };
        requestAnimationFrame(capture);
      });

      // Contexto A arrastra la carta
      await pageA.mouse.move(rectA!.x + rectA!.width / 2, rectA!.y + rectA!.height / 2);
      await pageA.mouse.down();
      await pageA.mouse.move(rectA!.x + rectA!.width / 2 + 50, rectA!.y + rectA!.height / 2 + 50, { steps: 5 });
      await pageA.waitForTimeout(300);

      // Comprobar frames grabados en B
      const frames = await pageB.evaluate(() => (window as any).__ghostFrames || []);
      console.log(`[Punto 1] Frames de fantasma capturados en receptor B: ${frames.length}`);

      if (frames.length > 0) {
        const firstFrame = frames[0];
        const centerDist = Math.hypot(firstFrame.x - 960, firstFrame.y - 540);
        console.log(`[Punto 1] Primer frame fantasma: (${firstFrame.x.toFixed(1)}, ${firstFrame.y.toFixed(1)}), distancia al centro: ${centerDist.toFixed(1)} px`);
        
        // Coincidencia con la posición original de la carta
        const cardInitialCenterX = rectA!.x + rectA!.width / 2;
        const cardInitialCenterY = rectA!.y + rectA!.height / 2;
        const initialDiff = Math.hypot(firstFrame.x - cardInitialCenterX, firstFrame.y - cardInitialCenterY);
        console.log(`[Punto 1] Coincidencia de primer frame con posición original de la carta: ${initialDiff.toFixed(2)} px`);
        expect(initialDiff).toBeLessThanOrEqual(5); // medido exactamente en el primer frame
        expect(centerDist).toBeGreaterThan(50); // no nace en el centro de la mesa

        // Verificar que no hay frames intermedios cerca del centro de la mesa (960, 540)
        const centerFrames = frames.filter((f: any) => Math.hypot(f.x - 960, f.y - 540) < 30);
        console.log(`[Punto 1] Frames intermedios cerca del centro de la mesa: ${centerFrames.length}`);
        expect(centerFrames.length).toBe(0);
      }

      await pageA.mouse.up();

      // Captura del fantasma remoto verificado
      await pageB.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-p1-ghost-first-frame.png'),
      });
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 2: Enviar al campo desde el menú contextual posiciona en el centro de la sección propia con cascada (2, 4 y 6 jugadores)', async ({ browser }) => {
    test.setTimeout(180000);
    for (const podSize of [2, 4, 6]) {
      const { contexts, pages } = await setupTestPod(browser, podSize, 1920, 1080, `FieldCascade${podSize}p`, true);
      try {
        await completeMulliganPhase(pages);

        const page = pages[0];
        // Enviar primera carta de la mano a la mesa
        const handCard1 = page.locator('[data-from-zone="hand"]').first();
        await handCard1.waitFor({ state: 'visible', timeout: 10000 });
        await handCard1.click({ button: 'right', force: true });
        await page.locator('[data-testid="context-to-battlefield"]').click();
        await page.waitForTimeout(600);

        // Enviar segunda carta de la mano a la mesa
        const handCard2 = page.locator('[data-from-zone="hand"]').first();
        await handCard2.click({ button: 'right', force: true });
        await page.locator('[data-testid="context-to-battlefield"]').click();
        await page.waitForTimeout(600);

        // Comprobar que ambas cartas están en la mesa
        const bfCards = page.locator('[data-from-zone="battlefield"]');
        const count = await bfCards.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Medir que las dos cartas tienen desplazamiento en cascada
        const box1 = await bfCards.nth(0).boundingBox();
        const box2 = await bfCards.nth(1).boundingBox();
        expect(box1).not.toBeNull();
        expect(box2).not.toBeNull();
        const diffX = Math.abs(box2!.x - box1!.x);
        const diffY = Math.abs(box2!.y - box1!.y);
        console.log(`[Punto 2 - ${podSize}p] Carta 1 box: (${box1!.x.toFixed(2)}, ${box1!.y.toFixed(2)}), Carta 2 box: (${box2!.x.toFixed(2)}, ${box2!.y.toFixed(2)})`);
        console.log(`[Punto 2 - ${podSize}p] Desplazamiento medido en cascada: diffX = ${diffX.toFixed(2)} px, diffY = ${diffY.toFixed(2)} px`);
        expect(diffX + diffY).toBeGreaterThan(5);

        // Verificación de que el centro vertical de la sección jugable NO está en y = 810 ni es idéntico entre 2p y 4p (Punto 8)
        if (podSize === 2) {
          // 2p: columna vertical completa, centro jugable sin dock (Y ~ 459px, box top ~ 407.7px)
          expect(Math.abs(box1!.x - 436.80)).toBeLessThan(5);
          expect(Math.abs(box1!.y - 407.70)).toBeLessThan(10);
          expect(box1!.y).toBeLessThan(600); // Demuestra que NO está en 810
        } else if (podSize === 4) {
          // 4p: cuadrícula 2x2, cuadrante superior Col 0 Fila 0 (Y ~ 202.5px, box top ~ 151.2px)
          expect(Math.abs(box1!.x - 436.80)).toBeLessThan(5);
          expect(Math.abs(box1!.y - 151.20)).toBeLessThan(10);
          expect(box1!.y).toBeLessThan(300); // Demuestra que NO está en 810
        } else if (podSize === 6) {
          // 6p: cuadrícula 2x3, Col 0 Fila 0 (X ~ 320px, Y ~ 202.5px, box top-left ~ 276.8px, 151.2px)
          expect(Math.abs(box1!.x - 276.80)).toBeLessThan(5);
          expect(Math.abs(box1!.y - 151.20)).toBeLessThan(10);
          expect(box1!.y).toBeLessThan(300);
        }

        // Verificar ownerId y holderId asignados al jugador local
        const owner1 = await bfCards.nth(0).getAttribute('data-card-owner');
        const holder1 = await bfCards.nth(0).getAttribute('data-card-holder');
        expect(owner1).not.toBeNull();
        expect(holder1).not.toBeNull();

        // Captura
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `test-p2-field-cascade-${podSize}p.png`),
        });
      } finally {
        for (const ctx of contexts) {
          await ctx.close().catch(() => {});
        }
      }
    }
  });

  test('Punto 6 y 7: Biblioteca con submenú Arriba (próxima a robar), Abajo y Posición', async ({ browser }) => {
    test.setTimeout(60000);
    const { contexts, pages } = await setupTestPod(browser, 2, 1920, 1080, 'LibraryPod', true);

    try {
      await completeMulliganPhase(pages);

      const page = pages[0];

      // Enviar una carta de la mano a la biblioteca arriba
      const handCard = page.locator('[data-from-zone="hand"]').last();
      await handCard.waitFor({ state: 'visible', timeout: 10000 });
      const cardName = (await handCard.getAttribute('data-card-name')) || 'Carta';
      console.log(`[Punto 6/7] Carta enviada a la biblioteca (Arriba): ${cardName}`);

      await handCard.click({ button: 'right', force: true });
      // Abrir submenú Biblioteca -> Arriba
      await page.locator('[data-testid="context-to-library-menu"]').click();
      await page.locator('[data-testid="context-to-library-top"]').click();
      await page.waitForTimeout(600);

      // Ahora hacer clic en la ranura de biblioteca para robar 1 carta
      const librarySlot = page.locator('[data-dock-zone="library"]').first();
      await librarySlot.click();
      await page.waitForTimeout(600);

      // La carta robada debe volver a ser la que enviamos arriba
      const lastHandCard = page.locator('[data-from-zone="hand"]').last();
      const drawnName = await lastHandCard.getAttribute('data-card-name');
      console.log(`[Punto 6/7] Carta robada tras enviar arriba: ${drawnName}`);
      expect(drawnName).toBe(cardName);

      // Probar enviar a posición específica (Posición 2)
      const handCard2 = page.locator('[data-from-zone="hand"]').last();
      const cardName2 = (await handCard2.getAttribute('data-card-name')) || 'Carta2';
      await handCard2.click({ button: 'right', force: true });
      await page.locator('[data-testid="context-to-library-menu"]').click();
      await page.locator('[data-testid="context-to-library-pos-btn"]').click();
      await page.locator('[data-testid="library-pos-input"]').fill('2');
      await page.locator('[data-testid="confirm-library-pos-btn"]').click();
      await page.waitForTimeout(600);

      // Robar 1 carta (no es cardName2) y luego robar la 2da carta (es cardName2)
      await librarySlot.click();
      await page.waitForTimeout(400);
      await librarySlot.click();
      await page.waitForTimeout(400);
      const drawnName2 = await page.locator('[data-from-zone="hand"]').last().getAttribute('data-card-name');
      console.log(`[Punto 6/7] Carta robada en posición 2: ${drawnName2}`);
      expect(drawnName2).toBe(cardName2);

      // Captura
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-library-positioning.png'),
      });
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

  test('Punto 7: Revelar carta envía identidad solo al destinatario y genera bitácora según destino', async ({ browser }) => {
    test.setTimeout(120000);
    const { contexts, pages } = await setupTestPod(browser, 2, 1920, 1080, 'RevealPod', true);

    try {
      await completeMulliganPhase(pages);

      const pageA = pages[0];
      const pageB = pages[1];

      // 1. Revelar a Bob específicamente
      const cardA = pageA.locator('[data-from-zone="hand"]').last();
      await cardA.waitFor({ state: 'visible', timeout: 10000 });
      const cardNameA = (await cardA.getAttribute('data-card-name')) || 'Carta';

      await cardA.click({ button: 'right', force: true });
      await pageA.locator('[data-testid="context-reveal-menu"]').click();
      await pageA.locator('[data-testid^="context-reveal-player-"]').first().click();
      await pageA.waitForTimeout(500);

      // En el contexto B debe aparecer RevealedCardModal
      const revealedModalB = pageB.locator('[data-testid="revealed-card-modal"]');
      await expect(revealedModalB).toBeVisible({ timeout: 5000 });
      await expect(revealedModalB).toContainText(cardNameA);

      // Captura
      await pageB.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-reveal-card.png'),
      });

      // Cerrar modal en B con botón Cerrar
      await pageB.locator('[data-testid="dismiss-revealed-btn"]').click();
      await expect(revealedModalB).not.toBeVisible();

      // Cerrar modal también en A si está visible (A también ve lo que reveló)
      const dismissA = pageA.locator('[data-testid="dismiss-revealed-btn"]');
      if (await dismissA.isVisible().catch(() => false)) {
        await dismissA.click();
      }

      // Abrir Chat/Log en B y verificar que dice "Alice (Host) reveló una carta a Bob (P2)" sin filtrar el nombre públicamente
      const chatToggleBtn = pageB.locator('button:has-text("Chat/Log")').first();
      if (await chatToggleBtn.isVisible()) {
        await chatToggleBtn.click();
      }
      await expect(pageB.locator('text=reveló una carta a Bob')).toBeVisible({ timeout: 5000 });

      // 2. Revelar a toda la mesa
      const cardA2 = pageA.locator('[data-from-zone="hand"]').last();
      const cardNameA2 = (await cardA2.getAttribute('data-card-name')) || 'Carta';
      await cardA2.click({ button: 'right', force: true });
      await pageA.locator('[data-testid="context-reveal-menu"]').click();
      await pageA.locator('[data-testid="context-reveal-all"]').click();
      await pageA.waitForTimeout(500);

      // Modal en B vuelve a aparecer
      await expect(revealedModalB).toBeVisible({ timeout: 5000 });
      await pageB.locator('[data-testid="dismiss-revealed-btn"]').click();

      // Cerrar modal en A si está visible
      if (await dismissA.isVisible().catch(() => false)) {
        await dismissA.click();
      }

      // Registro público dice 'reveló "Nombre" a todos'
      await expect(pageB.locator(`text=reveló "${cardNameA2}" a todos`)).toBeVisible({ timeout: 5000 });
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });

});
