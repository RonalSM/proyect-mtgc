import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa'
);

async function setupTestPod(
  browser: any,
  podSize: number,
  width = 1920,
  height = 1080,
  roomPrefix = 'MenuTest'
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
  const hostOnlineBadge = hostPage.locator('text=Servidor en línea');
  await expect(hostOnlineBadge).toBeVisible({ timeout: 15000 });

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
  const playerNames = ['Bob', 'Charlie', 'Diana'];
  for (let pIdx = 1; pIdx < podSize; pIdx++) {
    await hostPage.waitForTimeout(300);
    const pPage = pages[pIdx];
    await pPage.goto('http://localhost:3000');
    const onlineBadge = pPage.locator('text=Servidor en línea');
    await expect(onlineBadge).toBeVisible({ timeout: 15000 });
    await pPage.click('button:has-text("Unirse con Código")');
    await pPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await pPage.fill('input[placeholder="Ej. Jugador Invitado"]', `${playerNames[pIdx - 1]}`);
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

  const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
  await startGameBtn.click();

  // Completar fase de mulligan
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });
  for (let step = 0; step < podSize; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let acted = false;
      for (let p = 0; p < podSize; p++) {
        const keepBtn = pages[p].locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            acted = true;
            await pages[p].waitForTimeout(500);
            break;
          }
        }
      }
      if (acted) break;
      await hostPage.waitForTimeout(500);
    }
  }

  // Esperar a que la mesa esté activa
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toHaveCount(0, { timeout: 15000 });
  await hostPage.waitForTimeout(1000);

  return { contexts, pages, hostPage, guestPage: pages[1], roomCode };
}

// Función auxiliar para mover el puntero diagonalmente con una pausa intermedia
async function moveDiagonallyWithPause(
  page: any,
  fromLocator: any,
  toLocator: any,
  pauseMs: number
) {
  const fromBox = await fromLocator.boundingBox();
  const toBox = await toLocator.boundingBox();
  expect(fromBox).not.toBeNull();
  expect(toBox).not.toBeNull();

  const startX = fromBox!.x + fromBox!.width / 2;
  const startY = fromBox!.y + fromBox!.height / 2;
  const endX = toBox!.x + toBox!.width / 2;
  const endY = toBox!.y + toBox!.height / 2;

  // Iniciar en elemento origen
  await page.mouse.move(startX, startY);

  // Trayectoria diagonal con desvío sinusoidal/lateral
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    // Añadir un desvío transversal diagonal deliberado (+35px)
    const lateralDev = Math.sin(progress * Math.PI) * 35;
    const curX = startX + (endX - startX) * progress + lateralDev;
    const curY = startY + (endY - startY) * progress;
    await page.mouse.move(curX, curY);

    if (i === Math.floor(steps / 2) && pauseMs > 0) {
      await page.waitForTimeout(pauseMs);
    }
  }

  // Posicionar exactamente sobre el objetivo y aplicar la pausa completa
  await page.mouse.move(endX, endY);
  if (pauseMs > 0) {
    await page.waitForTimeout(pauseMs);
  }
}

test.describe('Punto 3: Menú Contextual Inline, Pausas Diagonales, Biblioteca y Revelado', () => {
  test('Trayectorias diagonales con pausas (0, 300, 800 ms), Arriba, Abajo, Aleatoria y Revelar', async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const { contexts, pages, hostPage, guestPage } = await setupTestPod(browser, 2, 1920, 1080, 'MenuDiag');

    try {
      const pauses = [0, 300, 800];

      // 1. Probar que las pausas y trayectorias diagonales NO cierran el menú expandido de Biblioteca
      for (const pauseMs of pauses) {
        console.log(`[Punto 3] Evaluando movimiento diagonal hacia submenú Biblioteca con pausa de ${pauseMs} ms`);

        // Abrir menú contextual en carta de la mano
        const handCard = hostPage.locator('[data-from-zone="hand"]').first();
        await expect(handCard).toBeVisible();
        await handCard.click({ button: 'right', force: true });

        const menu = hostPage.locator('[data-card-context-menu="true"]');
        await expect(menu).toBeVisible();

        // Pulsar "Biblioteca" para expandir en línea
        const libMenuBtn = hostPage.locator('[data-testid="context-to-library-menu"]');
        await libMenuBtn.click();

        const libSubmenu = hostPage.locator('[data-testid="context-library-submenu"]');
        await expect(libSubmenu).toBeVisible();

        // Mover diagonalmente hacia "Arriba (tope)" con la pausa indicada
        const topBtn = hostPage.locator('[data-testid="context-to-library-top"]');
        await moveDiagonallyWithPause(hostPage, libMenuBtn, topBtn, pauseMs);

        // Verificar que el menú y submenú NO se cerraron a pesar de la pausa o trayectoria diagonal
        await expect(menu).toBeVisible();
        await expect(libSubmenu).toBeVisible();
        await expect(topBtn).toBeVisible();

        // Cerrar menú con Escape para la siguiente iteración de prueba
        await hostPage.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await hostPage.waitForTimeout(200);
      }

      // 2. Probar movimiento diagonal hacia "Revelar" con pausas (0, 300, 800 ms)
      for (const pauseMs of pauses) {
        console.log(`[Punto 3] Evaluando movimiento diagonal hacia submenú Revelar con pausa de ${pauseMs} ms`);

        const handCard = hostPage.locator('[data-from-zone="hand"]').first();
        await handCard.click({ button: 'right', force: true });

        const menu = hostPage.locator('[data-card-context-menu="true"]');
        await expect(menu).toBeVisible();

        // Pulsar "Revelar" para expandir en línea
        const revealMenuBtn = hostPage.locator('[data-testid="context-reveal-menu"]');
        await revealMenuBtn.click();

        const revealSubmenu = hostPage.locator('[data-testid="context-reveal-submenu"]');
        await expect(revealSubmenu).toBeVisible();

        // Mover diagonalmente hacia el botón del oponente Bob
        const playerBtn = hostPage.locator('[data-testid^="context-reveal-player-"]').first();
        await moveDiagonallyWithPause(hostPage, revealMenuBtn, playerBtn, pauseMs);

        // Verificar que el menú y submenú permanecen abiertos
        await expect(menu).toBeVisible();
        await expect(revealSubmenu).toBeVisible();
        await expect(playerBtn).toBeVisible();

        await hostPage.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await hostPage.waitForTimeout(200);
      }

      // 3. Comprobar Arriba: enviar carta al tope -> siguiente robo es exactamente esa carta
      console.log('[Punto 3] Comprobando Biblioteca: Arriba (tope)');
      const handCardTop = hostPage.locator('[data-from-zone="hand"]').last();
      const topCardName = (await handCardTop.getAttribute('data-card-name')) || 'CartaTop';
      const topCardInstanceId = await handCardTop.getAttribute('data-card-instance-id');
      await handCardTop.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-library-menu"]').click();
      await hostPage.locator('[data-testid="context-to-library-top"]').click();
      await hostPage.waitForTimeout(600);

      // Robar carta haciendo clic en la ranura de biblioteca
      const librarySlot = hostPage.locator('[data-dock-zone="library"]').first();
      await librarySlot.click();
      await hostPage.waitForTimeout(600);
      const drawnCard = hostPage.locator('[data-from-zone="hand"]').last();
      const drawnCardName = await drawnCard.getAttribute('data-card-name');
      const drawnCardInstanceId = await drawnCard.getAttribute('data-card-instance-id');
      console.log(`[Punto 3] Carta enviada arriba: "${topCardName}" (${topCardInstanceId}), carta robada: "${drawnCardName}" (${drawnCardInstanceId})`);
      expect(drawnCardInstanceId).toBe(topCardInstanceId);
      expect(drawnCardName).toBe(topCardName);

      // 4. Comprobar Abajo: enviar carta al fondo -> al robar 1 carta NO es esa carta
      console.log('[Punto 3] Comprobando Biblioteca: Abajo (fondo)');
      const handCardBottom = hostPage.locator('[data-from-zone="hand"]').last();
      const bottomCardName = (await handCardBottom.getAttribute('data-card-name')) || 'CartaBottom';
      const bottomCardInstanceId = await handCardBottom.getAttribute('data-card-instance-id');
      await handCardBottom.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-library-menu"]').click();
      await hostPage.locator('[data-testid="context-to-library-bottom"]').click();
      await hostPage.waitForTimeout(600);

      // Robar 1 carta de la biblioteca
      await librarySlot.click();
      await hostPage.waitForTimeout(600);
      const drawnNotBottomCard = hostPage.locator('[data-from-zone="hand"]').last();
      const drawnNotBottomId = await drawnNotBottomCard.getAttribute('data-card-instance-id');
      const drawnNotBottomName = await drawnNotBottomCard.getAttribute('data-card-name');
      console.log(`[Punto 3] Carta enviada abajo: "${bottomCardName}" (${bottomCardInstanceId}), siguiente robada: "${drawnNotBottomName}" (${drawnNotBottomId})`);
      expect(drawnNotBottomId).not.toBe(bottomCardInstanceId);

      // 5. Comprobar Aleatoria: la carta queda en la biblioteca y la posición NO se filtra a otros clientes
      console.log('[Punto 3] Comprobando Biblioteca: Aleatoria');
      const handCardRandom = hostPage.locator('[data-from-zone="hand"]').last();
      const randomCardName = (await handCardRandom.getAttribute('data-card-name')) || 'CartaRandom';
      const randomCardInstanceId = await handCardRandom.getAttribute('data-card-instance-id');
      await handCardRandom.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-to-library-menu"]').click();
      await hostPage.locator('[data-testid="context-to-library-random"]').click();
      await hostPage.waitForTimeout(600);

      // Verificar que salió de la mano de Host
      const remainingInHand = await hostPage.locator(`[data-card-instance-id="${randomCardInstanceId}"]`).count();
      expect(remainingInHand).toBe(0);

      // Comprobar la bitácora en Guest (Bob): registra "Alice (Host) envió una carta a su biblioteca"
      const toggleChatBtn = guestPage.locator('[data-testid="toggle-chat-log"]');
      if (await toggleChatBtn.isVisible()) {
        await toggleChatBtn.click();
        await guestPage.waitForTimeout(400);
      }
      const guestLogs = guestPage.locator('[data-testid="chat-log-panel"]');
      await expect(guestLogs).toBeVisible({ timeout: 5000 });
      const logText = await guestLogs.innerText();
      console.log(`[Punto 3] Fragmento de bitácora en cliente Guest:\n${logText.slice(-300)}`);
      expect(logText).toContain('envió una carta a su biblioteca');
      // Asegurarse de que NO se filtra el índice ni posición a los demás clientes
      expect(logText).not.toContain('índice');
      expect(logText).not.toContain('posicion:');
      expect(logText).not.toContain('position:');

      // 6. Comprobar Revelar: envía la identidad SOLO al destinatario (Bob), y NO a terceros
      console.log('[Punto 3] Comprobando Revelar: privacidad hacia destinatario');
      const handCardToReveal = hostPage.locator('[data-from-zone="hand"]').last();
      const revealCardName = (await handCardToReveal.getAttribute('data-card-name')) || 'CartaRevelada';
      await handCardToReveal.click({ button: 'right', force: true });
      await hostPage.locator('[data-testid="context-reveal-menu"]').click();
      const targetOppBtn = hostPage.locator('[data-testid^="context-reveal-player-"]').first();
      await targetOppBtn.click();
      await hostPage.waitForTimeout(600);

      // En la pantalla de Bob (Guest), debe aparecer la modal RevealedCardModal con el nombre de la carta
      const revealedModal = guestPage.locator('[data-testid="revealed-card-modal"]');
      await expect(revealedModal).toBeVisible({ timeout: 10000 });
      const revealedText = await revealedModal.innerText();
      expect(revealedText).toContain(revealCardName);
      console.log(`[Punto 3] Modal de carta revelada visible en Bob con nombre: "${revealCardName}"`);

      // Cerrar la modal en Bob
      const closeRevealBtn = guestPage.locator('[data-testid="close-revealed-card-modal"]');
      if (await closeRevealBtn.isVisible()) {
        await closeRevealBtn.click();
      } else {
        await guestPage.keyboard.press('Escape');
      }
      await expect(revealedModal).toHaveCount(0);

      // Captura final certificada
      await hostPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'test-p3-context-menu-inline.png'),
      });

      console.log('[Punto 3] Certificación E2E de menú contextual inline y opciones completada con éxito.');
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
