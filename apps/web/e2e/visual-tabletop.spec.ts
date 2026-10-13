import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Verificación Visual - Mesa Virtual de Commander (REQ-9, REQ-22)', () => {
  const resolutions = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768' },
  ];

  for (const res of resolutions) {
    test(`Partida a ${res.name} (100% zoom): mano visible en abanico, imágenes cargadas y sin scroll`, async ({
      browser,
    }) => {
      // 1. Host context with target resolution
      const hostContext = await browser.newContext({
        viewport: { width: res.width, height: res.height },
        deviceScaleFactor: 1, // 100% zoom
      });
      const hostPage = await hostContext.newPage();
      await hostPage.goto('http://localhost:3000');

      // Ensure server is online
      await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });

      // Create room
      await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander');
      await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', `Mesa Visual ${res.name}`);
      await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Nero (Host)');
      await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

      // Wait for lobby and extract 6-character room code from the "Código: XXXXXX" button
      const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
      await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
      const roomCodeText = await roomCodeButton.innerText();
      const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
      const roomCode = match ? match[1] : '';
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

      // Host selects deck
      await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
      const importTabBtn = hostPage.locator('button:has-text("Importar Lista de Texto")');
      if (await importTabBtn.isVisible()) {
        await importTabBtn.click();
      } else {
        await hostPage.click('button:has-text("Importar mi primer mazo")');
      }

      await hostPage.fill(
        'textarea',
        `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Command Tower\n1 Cultivate\n1 Counterspell\n1 Swords to Plowshares\n1 Demonic Tutor`,
      );
      await hostPage.click('button:has-text("Validar lista")');
      await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
      await hostPage.click('button:has-text("Marcarme Listo")');

      // 2. Player 2 joins
      const p2Context = await browser.newContext({
        viewport: { width: res.width, height: res.height },
        deviceScaleFactor: 1,
      });
      const p2Page = await p2Context.newPage();
      await p2Page.goto('http://localhost:3000');
      await expect(p2Page.locator('text=Servidor en línea')).toBeVisible({ timeout: 10000 });
      await p2Page.click('button:has-text("Unirse con Código")');
      await p2Page.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
      await p2Page.fill('input[placeholder="Ej. Jugador Invitado"]', 'Oponente');
      await p2Page.click('button:has-text("Entrar a la Mesa")');

      // P2 selects deck
      await p2Page.click('button:has-text("Seleccionar / Importar Mazo")');
      const p2ImportTabBtn = p2Page.locator('button:has-text("Importar Lista de Texto")');
      if (await p2ImportTabBtn.isVisible()) {
        await p2ImportTabBtn.click();
      } else {
        await p2Page.click('button:has-text("Importar mi primer mazo")');
      }
      await p2Page.fill(
        'textarea',
        `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Arcane Signet\n1 Blood Artist\n1 Vampire Nighthawk`,
      );
      await p2Page.click('button:has-text("Validar lista")');
      await p2Page.click('button:has-text("Usar este Mazo en la Mesa")');
      await p2Page.click('button:has-text("Marcarme Listo")');

      // 3. Host starts game
      const startGameBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
      await expect(startGameBtn).toBeEnabled({ timeout: 10000 });
      await startGameBtn.click();

      // 4. In initiative phase, both players roll D20 ("LANZAR D20")
      const hostRollBtn = hostPage.locator('button:has-text("LANZAR D20")');
      await hostRollBtn.waitFor({ state: 'visible', timeout: 10000 });
      await hostRollBtn.click();

      const p2RollBtn = p2Page.locator('button:has-text("LANZAR D20")');
      await p2RollBtn.waitFor({ state: 'visible', timeout: 10000 });
      await p2RollBtn.click();

      // Handle any potential tie re-roll if another roll button appears
      for (let attempt = 0; attempt < 3; attempt++) {
        await hostPage.waitForTimeout(1000);
        if (await hostRollBtn.isVisible()) {
          await hostRollBtn.click();
        }
        if (await p2RollBtn.isVisible()) {
          await p2RollBtn.click();
        }
      }

      // Wait for initiative overlay to dismiss and table to transition to active playing state
      await expect(hostPage.locator('text=Tirada de Iniciativa')).not.toBeVisible({ timeout: 15000 });
      await hostPage.waitForTimeout(2000);

      // 5. Verification: Hand is visible in abanico
      const handCountBadge = hostPage.locator('text=en mano').first();
      await expect(handCountBadge).toBeVisible({ timeout: 10000 });

      // Verification: Card images loaded with naturalWidth > 0 (or fallback styled card frames)
      const imagesLoadedCount = await hostPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => img.complete && img.naturalWidth > 0).length;
      });
      console.log(`[Visual ${res.name}] Imágenes cargadas con naturalWidth > 0: ${imagesLoadedCount}`);
      expect(imagesLoadedCount).toBeGreaterThanOrEqual(1);

      // Verification: Zero scroll in window and document (REQ-22.1, REQ-22.2)
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

      console.log(`[Visual ${res.name}] Estado de scroll:`, scrollState);
      expect(scrollState.scrollY).toBe(0);
      expect(scrollState.scrollX).toBe(0);
      expect(scrollState.scrollHeight).toBeLessThanOrEqual(scrollState.innerHeight + 2); // At most 1-2px subpixel tolerance
      expect(scrollState.scrollWidth).toBeLessThanOrEqual(scrollState.innerWidth + 2);

      // 6. Capture Screenshots
      const screenshotDir = path.resolve('C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa');
      const screenshotPath = path.join(screenshotDir, `screenshot-${res.name}.png`);
      await hostPage.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[Visual ${res.name}] Captura guardada en: ${screenshotPath}`);

      await hostContext.close();
      await p2Context.close();
    });
  }
});
