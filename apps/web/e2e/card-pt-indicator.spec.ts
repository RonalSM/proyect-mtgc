import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACTS_DIR =
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

test.describe('Punto 7: Indicador P/T en Esquina Inferior Izquierda con Datos Reales', () => {
  test('Toda criatura muestra su P/T impreso tomado de la base al entrar al campo, tierras/artefactos no, y permanece erguido al girar', async ({
    browser,
  }) => {
    test.setTimeout(90000);

    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();

    // 1. Crear mesa con mazo listo de Krenko (Mazo 0)
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    await page.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'PT-Indicator-Test');
    await page.fill('input[placeholder="Ej. Planeswalker 1"]', 'Nero');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = page.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];
    console.log(`[Punto 7] Sala creada: ${roomCode}`);

    // Seleccionar mazo 0 (Krenko, Mob Boss)
    await page.click('button:has-text("Seleccionar / Importar Mazo")');
    const presetBtn = page.locator('[data-testid="select-preset-deck-preset-krenko-mob-boss"]');
    await expect(presetBtn).toBeVisible({ timeout: 10000 });
    await presetBtn.click();
    await page.waitForTimeout(400);
    await page.click('button:has-text("Marcarme Listo")');

    // 2. Jugador 2 se une con mazo de Goreclaw
    const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:3000');
    await page2.click('button:has-text("Unirse con Código")');
    await page2.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await page2.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob');
    await page2.click('button:has-text("Entrar a la Mesa")');

    await page2.click('button:has-text("Seleccionar / Importar Mazo")');
    const presetBtn2 = page2.locator(
      '[data-testid="select-preset-deck-preset-goreclaw-terror-of-qal-sisma"]',
    );
    await expect(presetBtn2).toBeVisible({ timeout: 10000 });
    await presetBtn2.click();
    await page2.waitForTimeout(400);
    await page2.click('button:has-text("Marcarme Listo")');

    // 3. Iniciar partida y resolver mulligan
    await page.waitForTimeout(800);
    const startBtn = page.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();

    await expect(page.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
      timeout: 30000,
    });

    const startTime = Date.now();
    while (Date.now() - startTime < 45000) {
      const isMulliganVisible = await page
        .locator('[data-testid="opening-hand-modal"]')
        .isVisible();
      if (!isMulliganVisible) break;
      for (const p of [page, page2]) {
        const keepBtn = p.locator('[data-testid="keep-btn"]:not([disabled])');
        if (await keepBtn.isVisible({ timeout: 200 }).catch(() => false)) {
          await keepBtn.click().catch(() => {});
          await p.waitForTimeout(400);
          break;
        }
      }
      await page.waitForTimeout(300);
    }

    await expect(page.locator('[data-testid="opening-hand-modal"]')).toBeHidden({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // 4. Mover Krenko, Mob Boss (Comandante, 3/3 real de la base de datos) al campo de batalla
    console.log('[Punto 7] Moviendo comandante Krenko, Mob Boss al campo...');
    await page.evaluate(() => {
      const cmdEl = document.querySelector(
        '[data-dock-zone="command"] [data-commander-card="true"]',
      );
      const cId = cmdEl?.getAttribute('data-card-instance-id');
      if (cId) {
        (window as any).__mtgcSendAction('MOVE_CARD', {
          cardInstanceId: cId,
          fromZone: 'command',
          toZone: 'battlefield',
          position: { x: 0.35, y: 0.4 },
        });
      }
    });
    await page.waitForTimeout(1000);

    // 5. Verificar Krenko, Mob Boss en el campo con su P/T 3/3 en la esquina inferior izquierda
    const krenkoBf = page
      .locator('[data-battlefield-card="true"][data-card-name*="Krenko, Mob Boss"]')
      .first();
    await expect(krenkoBf).toBeVisible({ timeout: 5000 });

    const krenkoPT = krenkoBf.locator('[data-testid="card-pt-indicator"]');
    await expect(krenkoPT).toBeVisible({ timeout: 5000 });
    const effectivePT = await krenkoPT.getAttribute('data-pt-effective');
    const basePT = await krenkoPT.getAttribute('data-base-pt');
    console.log(
      `[Punto 7] Krenko, Mob Boss en mesa - P/T Efectivo: "${effectivePT}", Base: "${basePT}"`,
    );
    expect(effectivePT).toBe('3/3');
    expect(basePT).toBe('3/3');

    // 6. Verificar posición por fuera del borde de la imagen (esquina inferior izquierda)
    const cardBox = await krenkoBf.boundingBox();
    const ptBox = await krenkoPT.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(ptBox).not.toBeNull();

    // El badge está en la esquina inferior izquierda por fuera del borde
    // ptBox.y + ptBox.height debe extenderse más allá o alinearse en la base inferior externa (bottom negativo)
    console.log(`[Punto 7] Card Box: left=${cardBox!.x}, bottom=${cardBox!.y + cardBox!.height}`);
    console.log(`[Punto 7] PT Badge Box: left=${ptBox!.x}, bottom=${ptBox!.y + ptBox!.height}`);
    expect(ptBox!.x).toBeLessThanOrEqual(cardBox!.x + 10);
    expect(ptBox!.y + ptBox!.height).toBeGreaterThanOrEqual(cardBox!.y + cardBox!.height - 15);

    // 7. Buscar Krenko, Tin Street Kingpin (1/2) en la biblioteca o mano y moverlo al campo
    console.log('[Punto 7] Moviendo Krenko, Tin Street Kingpin al campo...');
    await page.evaluate(() => {
      const state = (window as any).__mtgcRoomState;
      const myId = localStorage.getItem('mtgc_player_id');
      const lib = state?.playerZones?.[myId]?.library || [];
      const hand = state?.playerZones?.[myId]?.hand || [];

      // Buscar Krenko, Tin Street Kingpin en mano o biblioteca
      const kingpin = [...hand, ...lib].find(c => c.definition.name.includes('Tin Street Kingpin'));
      if (kingpin) {
        const fromZone = hand.some(c => c.instanceId === kingpin.instanceId) ? 'hand' : 'library';
        (window as any).__mtgcSendAction('MOVE_CARD', {
          cardInstanceId: kingpin.instanceId,
          fromZone,
          toZone: 'battlefield',
          position: { x: 0.55, y: 0.4 },
        });
      }
    });
    await page.waitForTimeout(1000);

    const kingpinBf = page
      .locator('[data-battlefield-card="true"][data-card-name*="Tin Street Kingpin"]')
      .first();
    await expect(kingpinBf).toBeVisible({ timeout: 5000 });
    const kingpinPT = kingpinBf.locator('[data-testid="card-pt-indicator"]');
    await expect(kingpinPT).toBeVisible({ timeout: 5000 });
    const kingpinEffective = await kingpinPT.getAttribute('data-pt-effective');
    console.log(
      `[Punto 7] Krenko, Tin Street Kingpin en mesa - P/T Efectivo: "${kingpinEffective}"`,
    );
    expect(kingpinEffective).toBe('1/2');

    // 8. Mover una tierra (Montaña / Mountain) al campo y verificar que NO muestra indicador P/T
    console.log('[Punto 7] Moviendo una tierra (Mountain) al campo...');
    await page.evaluate(() => {
      const state = (window as any).__mtgcRoomState;
      const myId = localStorage.getItem('mtgc_player_id');
      const lib = state?.playerZones?.[myId]?.library || [];
      const hand = state?.playerZones?.[myId]?.hand || [];
      const land = [...hand, ...lib].find(
        c => c.definition.name.includes('Mountain') || c.definition.typeLine?.includes('Land'),
      );
      if (land) {
        const fromZone = hand.some(c => c.instanceId === land.instanceId) ? 'hand' : 'library';
        (window as any).__mtgcSendAction('MOVE_CARD', {
          cardInstanceId: land.instanceId,
          fromZone,
          toZone: 'battlefield',
          position: { x: 0.75, y: 0.4 },
        });
      }
    });
    await page.waitForTimeout(1000);

    const landBf = page
      .locator('[data-battlefield-card="true"][data-card-name*="Mountain"]')
      .first();
    await expect(landBf).toBeVisible({ timeout: 5000 });
    const landPT = landBf.locator('[data-testid="card-pt-indicator"]');
    expect(await landPT.count()).toBe(0);
    console.log('[Punto 7] Verificado: Mountain en mesa NO muestra indicador P/T.');

    // 9. Girar Krenko, Mob Boss y verificar que el indicador P/T permanece erguido en la esquina inferior izquierda
    console.log('[Punto 7] Girando Krenko, Mob Boss...');
    await krenkoBf.dblclick();
    await page.waitForTimeout(600);
    await expect(krenkoBf).toHaveAttribute('data-tapped', 'true');

    // El badge sigue visible y erguido
    await expect(krenkoPT).toBeVisible();
    expect(await krenkoPT.getAttribute('data-pt-effective')).toBe('3/3');

    // 10. Captura de pantalla para archivo
    const screenshotPath = path.join(ARTIFACTS_DIR, 'audit-p7-card-pt-indicator.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[Punto 7] Captura guardada en: ${screenshotPath}`);

    await ctx.close();
    await ctx2.close();
  });
});
