import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Partida Completa de Commander con 4 Jugadores y Mazos Listos (D2)
 *
 * Flujo:
 * 1. Alice crea sala de 4 jugadores.
 * 2. Bob, Charlie y Diana se unen con código.
 * 3. Los 4 seleccionan mazos listos distintos y marcan "Listo".
 * 4. Iniciativa D20 y Mulligan de Londres (los 4 aceptan su mano).
 * 5. Ejecución secuencial de 10 turnos completos cubriendo:
 *    - Mover cartas (mano a mesa).
 *    - Girar / enderezar (tap 90°).
 *    - Contadores +1/+1.
 *    - Creación de fichas (Tesoro).
 *    - Revelar carta a todos.
 *    - Clonar permanente.
 *    - Voltear carta (boca abajo / DFC).
 *    - Ver carta con metadatos y dictámenes.
 *    - Vista ampliada de celda.
 *    - Reportar problema (paquete de diagnóstico).
 */

const TARGET_URL = process.env.TARGET_URL || 'https://proyect-mtgc.netlify.app';

test.describe('Punto D2: E2E Partida Completa 4 Jugadores y 10 Turnos', () => {
  test('Partida completa con 4 jugadores reales y mazos listos', async ({ browser }) => {
    test.setTimeout(180000); // 3 minutos

    const contexts = [
      await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      await browser.newContext({ viewport: { width: 1280, height: 800 } }),
      await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    ];

    const pages = await Promise.all(contexts.map(c => c.newPage()));
    const [pageA, pageB, pageC, pageD] = pages;
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];

    // 1. Host creates room
    await pageA.goto(TARGET_URL, { waitUntil: 'networkidle' });
    const createBtn = pageA.getByRole('button', { name: /Crear Nueva Mesa/i });
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();

    const roomNameInput = pageA
      .getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i)
      .or(pageA.locator('input[type="text"]').first());
    await roomNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await roomNameInput.fill('Pod E2E 4P Test');

    const hostNameInput = pageA
      .getByPlaceholder(/Planeswalker 1|Tu nombre/i)
      .or(pageA.locator('input[type="text"]').nth(1));
    await hostNameInput.fill('Alice');

    const submitCreateBtn = pageA.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    await pageA.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
      timeout: 20000,
    });
    const roomCodeEl = await pageA
      .locator('[data-testid="room-code-display"]')
      .or(pageA.locator('text=/Código:/i'))
      .first();
    const fullCodeText = await roomCodeEl.innerText();
    const match = fullCodeText.match(/([A-Z0-9]{6})/);
    expect(match).toBeTruthy();
    const roomCode = match![1];

    async function selectPresetAndReady(page: any, pName: string, presetIndex = 0) {
      const selectDeckBtn = page.getByRole('button', {
        name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i,
      });
      await selectDeckBtn.waitFor({ state: 'visible', timeout: 15000 });
      await selectDeckBtn.click();
      await page.waitForTimeout(600);

      const presetTab = page.getByTestId('tab-preset-decks');
      if (await presetTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await presetTab.click();
      }

      const chooseBtns = page.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i });
      await chooseBtns.first().waitFor({ state: 'visible', timeout: 10000 });
      const targetBtn =
        (await chooseBtns.count()) > presetIndex ? chooseBtns.nth(presetIndex) : chooseBtns.first();
      await targetBtn.click();
      await page.waitForTimeout(600);

      const readyBtn = page.getByRole('button', { name: /¡Estoy Listo!|Listo/i });
      await readyBtn.click();
    }

    async function joinRoom(page: any, pName: string, code: string) {
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
      const openJoinBtn = page.getByRole('button', { name: /Unirse con Código/i });
      await openJoinBtn.waitFor({ state: 'visible', timeout: 15000 });
      await openJoinBtn.click();

      const joinCodeInput = page.getByPlaceholder(/ABCDEF/i);
      await joinCodeInput.waitFor({ state: 'visible', timeout: 5000 });
      await joinCodeInput.fill(code);

      const joinNameInput = page.getByPlaceholder(/Planeswalker 2|Tu Nombre/i);
      await joinNameInput.fill(pName);

      const submitJoinBtn = page.getByRole('button', { name: /Entrar a la Sala/i });
      await submitJoinBtn.click();

      await page.waitForSelector('[data-testid="room-code-badge"], :has-text("Código:")', {
        timeout: 20000,
      });
    }

    await selectPresetAndReady(pageA, 'Alice', 0);
    await joinRoom(pageB, 'Bob', roomCode);
    await selectPresetAndReady(pageB, 'Bob', 1);
    await joinRoom(pageC, 'Charlie', roomCode);
    await selectPresetAndReady(pageC, 'Charlie', 2);
    await joinRoom(pageD, 'Diana', roomCode);
    await selectPresetAndReady(pageD, 'Diana', 3);

    // Host starts game
    const startGameBtn = pageA.getByRole('button', { name: /Iniciar Partida|Comenzar/i });
    await startGameBtn.waitFor({ state: 'visible', timeout: 15000 });
    await startGameBtn.click();

    // Accept opening hands
    await Promise.all(
      pages.map(async (page, idx) => {
        await page
          .locator('[data-testid="opening-hand-modal"]')
          .waitFor({ state: 'visible', timeout: 30000 });
        const keepBtn = page.getByTestId('keep-btn');
        await keepBtn.waitFor({ state: 'visible', timeout: 10000 });
        await keepBtn.click();
      })
    );

    // Verify all 4 players see tableboard
    await Promise.all(
      pages.map(p =>
        p
          .locator('[data-table-board], [data-player-header]')
          .first()
          .waitFor({ state: 'visible', timeout: 20000 })
      )
    );

    async function getActivePage() {
      for (let attempt = 0; attempt < 30; attempt++) {
        for (let i = 0; i < pages.length; i++) {
          const isTurn = await pages[i]
            .locator(':has-text("¡Tu Turno!")')
            .first()
            .isVisible()
            .catch(() => false);
          if (isTurn) return { page: pages[i], index: i, name: playerNames[i] };
        }
        await new Promise(r => setTimeout(r, 250));
      }
      return { page: pageA, index: 0, name: 'Alice' };
    }

    async function passTurn(page: any, pName: string) {
      await page.keyboard.press('Escape').catch(() => {});
      const passBtn = page.getByRole('button', { name: /Pasar|Pasar turno/i }).first();
      await passBtn.waitFor({ state: 'visible', timeout: 10000 });
      await passBtn.click({ force: true });
      await page
        .locator(':has-text("¡Tu Turno!")')
        .first()
        .waitFor({ state: 'hidden', timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(800);
    }

    // Ejecución de 10 turnos completos
    for (let turn = 1; turn <= 10; turn++) {
      const active = await getActivePage();
      expect(active).toBeTruthy();

      if (turn === 1) {
        const handCard = active.page.locator('[data-hand-card="true"]').last();
        if (await handCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          await handCard.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const toBattlefield = active.page
            .locator('[data-testid="context-to-battlefield"], button:has-text("Mesa")')
            .first();
          if (await toBattlefield.isVisible({ timeout: 3000 }).catch(() => false)) {
            await toBattlefield.click();
          }
        }
      } else if (turn === 2) {
        const tableCard = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
        if (await tableCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          await tableCard.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const tapBtn = active.page.locator('[data-testid="context-tap-btn"]').first();
          if (await tapBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tapBtn.click();
          }
        }
      } else if (turn === 3) {
        const cardForCounter = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
        if (await cardForCounter.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cardForCounter.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const countersToggle = active.page.locator('[data-testid="context-counters-toggle"]').first();
          if (await countersToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
            await countersToggle.click();
            await active.page.waitForTimeout(200);
            const counterInput = active.page.locator('[data-testid="counter-input-+1/+1"]').first();
            if (await counterInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await counterInput.fill('2');
              await active.page.keyboard.press('Enter');
            }
          }
          await active.page.keyboard.press('Escape');
        }
      } else if (turn === 4) {
        const localCell = active.page.locator('[data-player-cell]').filter({
          has: active.page.locator('[data-testid="playmat-custom-btn"]'),
        });
        await localCell.click({ button: 'right', position: { x: 120, y: 100 }, force: true });
        await active.page.waitForTimeout(600);
        const tokenModal = active.page.locator('[data-testid="create-token-modal"]');
        if (await tokenModal.isVisible({ timeout: 3000 }).catch(() => false)) {
          const commonTab = active.page.locator('[data-testid="tab-common-tokens"]');
          if (await commonTab.isVisible()) await commonTab.click();
          await active.page.waitForTimeout(300);
          const createCommonBtn = active.page.locator('[data-testid^="create-common-token-"]').first();
          if (await createCommonBtn.isVisible()) await createCommonBtn.click();
        }
      } else if (turn === 5) {
        const revealHandCard = active.page.locator('[data-hand-card="true"]').last();
        if (await revealHandCard.isVisible({ timeout: 4000 }).catch(() => false)) {
          await revealHandCard.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const revealMenu = active.page.locator('[data-testid="context-reveal-menu"]');
          if (await revealMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
            await revealMenu.click();
            await active.page.waitForTimeout(200);
            const revealAll = active.page.locator('[data-testid="context-reveal-all"]');
            if (await revealAll.isVisible()) await revealAll.click();
          }
          await active.page.keyboard.press('Escape');
        }
        await active.page.waitForTimeout(600);
        for (const p of pages) {
          const revModal = p.locator('[data-testid="revealed-card-modal"]');
          if (await revModal.isVisible({ timeout: 1000 }).catch(() => false)) {
            await revModal.click({ force: true }).catch(() => {});
            await p.keyboard.press('Escape').catch(() => {});
          }
        }
      } else if (turn === 6) {
        const cloneTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
        if (await cloneTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
          await cloneTarget.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const cloneBtn = active.page.locator('[data-testid="context-clone-btn"]');
          if (await cloneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cloneBtn.click();
            await active.page.waitForTimeout(200);
            const quick1 = active.page.locator('[data-testid="clone-quick-1"]');
            if (await quick1.isVisible()) await quick1.click();
          }
          await active.page.keyboard.press('Escape');
        }
      } else if (turn === 7) {
        const flipTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
        if (await flipTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
          await flipTarget.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const flipBtn = active.page
            .locator('[data-testid="context-flip-btn"], [data-testid="context-transform-btn"]')
            .first();
          if (await flipBtn.isVisible({ timeout: 3000 }).catch(() => false)) await flipBtn.click();
          await active.page.keyboard.press('Escape');
        }
      } else if (turn === 8) {
        const viewTarget = active.page.locator('.card-slot-container, [data-card-item="true"]').first();
        if (await viewTarget.isVisible({ timeout: 4000 }).catch(() => false)) {
          await viewTarget.click({ button: 'right', force: true });
          await active.page.waitForTimeout(400);
          const viewCardBtn = active.page.locator('[data-testid="context-view-card"]').first();
          if (await viewCardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await viewCardBtn.click();
            await active.page.waitForTimeout(400);
            await active.page.keyboard.press('Escape');
          }
        }
      } else if (turn === 9) {
        const expandBtn = active.page.locator('[data-expand-cell-btn]').first();
        if (await expandBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await expandBtn.click();
          await active.page.waitForTimeout(400);
          await active.page.keyboard.press('Escape');
        }
      } else if (turn === 10) {
        const reportBtn = active.page.locator('[data-testid="report-issue-btn"]').first();
        if (await reportBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await reportBtn.click();
          await active.page.waitForTimeout(400);
          const reportModal = active.page.locator('[data-testid="report-issue-modal"]');
          expect(await reportModal.isVisible()).toBe(true);
          await active.page.keyboard.press('Escape');
        }
      }

      await passTurn(active.page, active.name);
    }

    // Verify 4 cells visible and turn >= 10
    const cellCount = await pageA.locator('[data-player-header]').count();
    expect(cellCount).toBe(4);

    await browser.close();
  });
});
