import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR =
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

async function completeMulliganPhase(pages: any[]) {
  const podSize = pages.length;
  for (let step = 0; step < podSize; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let acted = false;
      for (let p = 0; p < podSize; p++) {
        const keepBtn = pages[p].locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click().catch(() => {});
            acted = true;
            await pages[p].waitForTimeout(400);
            break;
          }
        }
      }
      if (acted) break;
      await pages[0].waitForTimeout(300);
    }
  }

  for (let p = 0; p < podSize; p++) {
    await expect(pages[p].locator('[data-testid="opening-hand-modal"]')).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(pages[p].locator('[data-testid="initiative-overlay"]')).toHaveCount(0, {
      timeout: 15000,
    });
  }
  await pages[0].waitForTimeout(500);
}

test.describe('Punto 3: Menú contextual siempre visible y compacto', () => {
  test('Menú contextual a 1920x1080, 1366x768 y 1280x720 en 4 bordes y 4 esquinas con todas las secciones expandidas', async ({
    browser,
  }) => {
    test.setTimeout(120000);

    // 1. Crear contexto inicial a 1920x1080
    const ctx1 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page1 = await ctx1.newPage();
    await page1.goto('http://localhost:3000');
    await expect(page1.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    await page1.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Menu Viewport Pod');
    await page1.fill('input[placeholder="Ej. Planeswalker 1"]', 'Player 1 (Host)');
    await page1.selectOption('select', '2');
    await page1.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = page1.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];

    await page1.click('button:has-text("Seleccionar / Importar Mazo")');
    await page1.waitForSelector('[data-testid="tab-preset-decks"]');
    await page1.click('[data-testid="select-preset-deck-preset-krenko-mob-boss"]');
    await page1.click('button:has-text("Marcarme Listo")');

    // 2. Jugador 2 se une
    const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:3000');
    await page2.click('button:has-text("Unirse con Código")');
    await page2.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await page2.fill('input[placeholder="Ej. Jugador Invitado"]', 'Player 2');
    await page2.click('button:has-text("Entrar a la Mesa")');
    await page2.click('button:has-text("Seleccionar / Importar Mazo")');
    await page2.waitForSelector('[data-testid="tab-preset-decks"]');
    await page2.click('[data-testid="select-preset-deck-preset-goreclaw-terror-of-qal-sisma"]');
    await page2.click('button:has-text("Marcarme Listo")');

    // 3. Iniciar partida
    await page1.click('button:has-text("INICIAR PARTIDA")');
    await completeMulliganPhase([page1, page2]);

    await expect(page1.locator('#mesa-total')).toBeVisible({ timeout: 15000 });

    // Crear una ficha en el campo de batalla mediante clic derecho en espacio vacío
    const playerCell = page1.locator('[data-player-cell]').first();
    await expect(playerCell).toBeVisible({ timeout: 10000 });
    await playerCell.click({ button: 'right', position: { x: 300, y: 150 }, force: true });
    const tokenModal = page1.locator('[data-testid="create-token-modal"]');
    await expect(tokenModal).toBeVisible({ timeout: 5000 });
    await page1.locator('[data-testid="tab-common-tokens"]').click();
    await page1.locator('[data-testid="create-common-token-treasure"]').click();

    const cardOnField = page1.locator('[data-battlefield-card="true"]').first();
    await expect(cardOnField).toBeVisible({ timeout: 10000 });

    const resolutions = [
      { width: 1920, height: 1080, name: '1920x1080' },
      { width: 1366, height: 768, name: '1366x768' },
      { width: 1280, height: 720, name: '1280x720' },
    ];

    const margin = 8;

    for (const res of resolutions) {
      console.log(`\n========================================`);
      console.log(`EVALUANDO RESOLUCIÓN: ${res.name} (${res.width}x${res.height})`);
      console.log(`========================================`);

      await page1.setViewportSize({ width: res.width, height: res.height });
      await page1.waitForTimeout(300);

      // 4 bordes y 4 esquinas
      const testPoints = [
        { label: 'borde-superior', x: Math.round(res.width / 2), y: margin + 4 },
        { label: 'borde-inferior', x: Math.round(res.width / 2), y: res.height - margin - 4 },
        { label: 'borde-izquierdo', x: margin + 4, y: Math.round(res.height / 2) },
        { label: 'borde-derecho', x: res.width - margin - 4, y: Math.round(res.height / 2) },
        { label: 'esquina-sup-izq', x: margin + 4, y: margin + 4 },
        { label: 'esquina-sup-der', x: res.width - margin - 4, y: margin + 4 },
        { label: 'esquina-inf-izq', x: margin + 4, y: res.height - margin - 4 },
        { label: 'esquina-inf-der', x: res.width - margin - 4, y: res.height - margin - 4 },
      ];

      for (const pt of testPoints) {
        console.log(`[${res.name}] Clic derecho en ${pt.label} (clientX=${pt.x}, clientY=${pt.y})`);

        await cardOnField.evaluate((el: any, coords: any) => {
          const evt = new MouseEvent('contextmenu', {
            clientX: coords.x,
            clientY: coords.y,
            bubbles: true,
            cancelable: true,
          });
          el.dispatchEvent(evt);
        }, { x: pt.x, y: pt.y });

        const menu = page1.locator('[data-card-context-menu="true"]');
        await expect(menu).toBeVisible({ timeout: 5000 });

        // Expandir todas las secciones disponibles
        const countersToggle = page1.locator('[data-testid="context-counters-toggle"]');
        if (await countersToggle.isVisible().catch(() => false)) {
          const isCountersOpen = await page1
            .locator('[data-testid="context-counters-section"]')
            .isVisible()
            .catch(() => false);
          if (!isCountersOpen) await countersToggle.click();
        }

        const keywordsToggle = page1.locator('[data-testid="context-keywords-toggle"]');
        if (await keywordsToggle.isVisible().catch(() => false)) {
          const isKwOpen = await page1
            .locator('[data-testid="context-keywords-section"]')
            .isVisible()
            .catch(() => false);
          if (!isKwOpen) await keywordsToggle.click();
        }

        const libToggle = page1.locator('[data-testid="context-to-library-menu"]');
        if (await libToggle.isVisible().catch(() => false)) {
          const isLibOpen = await page1
            .locator('[data-testid="context-library-submenu"]')
            .isVisible()
            .catch(() => false);
          if (!isLibOpen) await libToggle.click();
        }

        const revealToggle = page1.locator('[data-testid="context-reveal-menu"]');
        if (await revealToggle.isVisible().catch(() => false)) {
          const isRevOpen = await page1
            .locator('[data-testid="context-reveal-submenu"]')
            .isVisible()
            .catch(() => false);
          if (!isRevOpen) await revealToggle.click();
        }

        await page1.waitForTimeout(100);

        // Medir dimensiones del menú en pantalla
        const box = await menu.boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;

        console.log(
          `  -> Posición: left=${box.x.toFixed(1)}px, top=${box.y.toFixed(1)}px, width=${box.width.toFixed(1)}px, height=${box.height.toFixed(1)}px`,
        );

        // Aserciones de Punto 3:
        // 1. Ancho máximo <= 240 px
        expect(box.width).toBeLessThanOrEqual(240);

        // 2. Queda dentro del viewport con márgenes de 8 px
        expect(box.x).toBeGreaterThanOrEqual(margin - 1);
        expect(box.y).toBeGreaterThanOrEqual(margin - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(res.width - margin + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(res.height - margin + 1);

        // 3. Altura máxima igual a la ventana menos 16 px
        expect(box.height).toBeLessThanOrEqual(res.height - 16 + 1);

        // 4. Scroll interno operativo
        const scrollMetrics = await menu.evaluate((el: HTMLElement) => {
          el.scrollTop = el.scrollHeight;
          return {
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollTop: el.scrollTop,
          };
        });

        if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight) {
          expect(scrollMetrics.scrollTop).toBeGreaterThan(0);
        }

        // Captura representativa en borde inferior y esquina inferior derecha
        if (pt.label === 'borde-inferior' || pt.label === 'esquina-inf-der') {
          const shotName = `audit-p3-menu-viewport-${res.name}-${pt.label}.png`;
          const shotPath = path.join(ARTIFACTS_DIR, shotName);
          await page1.screenshot({ path: shotPath });
          console.log(`  -> Captura archivada: ${shotName}`);
        }

        // Cerrar menú con Escape (o clic en backdrop como fallback)
        await page1.keyboard.press('Escape');
        if (await menu.isVisible().catch(() => false)) {
          await page1.locator('[data-testid="context-menu-backdrop"]').click({ force: true, position: { x: 5, y: 5 } }).catch(() => {});
        }
        await expect(menu).toHaveCount(0);
        await page1.waitForTimeout(100);
      }
    }

    await ctx1.close();
    await ctx2.close();
  });
});
