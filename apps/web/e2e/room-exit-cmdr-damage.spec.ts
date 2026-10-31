import { test, expect } from '@playwright/test';

test.describe('Tareas 1, 2 y 3: Bugs de Sala, Estado y Daño de Comandante Restador', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  test('(a) Salir de una sala y crear otra nueva sin recargar la página limpia el estado correctamente', async ({
    page,
  }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // 1. Crear Sala 1
    const createBtn = page.getByRole('button', { name: /Crear Nueva Mesa/i });
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    const nameInput = page.locator('input[placeholder="Ej. Pod de Commander"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Sala Alfa');
    }
    const hostInput = page.locator('input[placeholder="Ej. Planeswalker 1"]');
    if (await hostInput.isVisible()) {
      await hostInput.fill('Alice_Host');
    }
    await page.getByRole('button', { name: /Crear Sala|Crear Mesa/i }).last().click();

    // Esperar a entrar a la sala 1
    const roomCodeButton = page.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const text1 = await roomCodeButton.innerText();
    const code1 = text1.match(/([A-Z0-9]{6})/)?.[1];
    expect(code1).toBeTruthy();

    // 2. Salir de la sala usando el botón "Salir"
    const leaveBtn = page.getByRole('button', { name: /Salir/i }).first();
    await expect(leaveBtn).toBeVisible();
    await leaveBtn.click();

    // 3. Verificar que regresó al lobby principal y que el storage está limpio
    await expect(page.getByRole('button', { name: /Crear Nueva Mesa/i })).toBeVisible({ timeout: 10000 });
    const storedSession = await page.evaluate(() => sessionStorage.getItem('mtgc_room_code'));
    const storedLocal = await page.evaluate(() => localStorage.getItem('mtgc_room_code'));
    expect(storedSession).toBeNull();
    expect(storedLocal).toBeNull();

    // 4. Crear Sala 2 SIN recargar la página (sin F5)
    await page.getByRole('button', { name: /Crear Nueva Mesa/i }).click();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Sala Beta');
    }
    await page.getByRole('button', { name: /Crear Sala|Crear Mesa/i }).last().click();

    // 5. Verificar que la Sala 2 se crea limpiamente con un código nuevo
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const text2 = await roomCodeButton.innerText();
    const code2 = text2.match(/([A-Z0-9]{6})/)?.[1];
    expect(code2).toBeTruthy();
    expect(code2).not.toBe(code1);
  });

  test('(b) Entrar a una mesa sin mazo preseleccionado, a menos que se entre desde "Jugar con este mazo"', async ({
    page,
  }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Flujo normal: Crear sala desde "Crear Nueva Mesa" -> debe entrar SIN mazo
    const createBtn = page.getByRole('button', { name: /Crear Nueva Mesa/i });
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    const hostInput = page.locator('input[placeholder="Ej. Planeswalker 1"]');
    if (await hostInput.isVisible()) {
      await hostInput.fill('Jugador_Sin_Mazo');
    }
    await page.getByRole('button', { name: /Crear Sala|Crear Mesa/i }).last().click();

    // Esperar al lobby
    await expect(page.locator('button:has-text("Código:")').first()).toBeVisible({ timeout: 15000 });

    // Verificar que el slot del jugador muestra "Sin mazo seleccionado" y botón "Seleccionar / Importar Mazo"
    const deckPlaceholder = page.locator('text=Sin mazo seleccionado').first();
    await expect(deckPlaceholder).toBeVisible();

    // Salir de la sala
    await page.getByRole('button', { name: /Salir/i }).first().click();
    await expect(page.getByRole('button', { name: /Crear Nueva Mesa/i })).toBeVisible({ timeout: 10000 });

    // Flujo explícito: Clic en "Jugar con este Mazo" desde el launcher
    const playWithDeckBtn = page.locator('button:has-text("Jugar con este Mazo")').first();
    await expect(playWithDeckBtn).toBeVisible();
    await playWithDeckBtn.click();

    // Enviar el modal de creación
    await page.getByRole('button', { name: /Crear Sala|Crear Mesa/i }).last().click();

    // Esperar al lobby: ahora SÍ debe tener mazo seleccionado
    await expect(page.locator('button:has-text("Código:")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Sin mazo seleccionado')).not.toBeVisible();
    await expect(page.locator('button:has-text("Cambiar")')).toBeVisible();
  });

  test('(c) Al pulsar "+" en daño de comandante, la vida baja y el acumulado sube; al pulsar "−", se revierte', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Host A crea sala para 2 jugadores con mazos listos
    await pageA.goto(BASE_URL);
    await pageA.locator('button:has-text("Jugar con este Mazo")').first().click();
    const seatsSelect = pageA.locator('select');
    if (await seatsSelect.isVisible()) {
      await seatsSelect.selectOption('2');
    }
    await pageA.getByRole('button', { name: /Crear Sala|Crear Mesa/i }).last().click();

    const roomCodeButton = pageA.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/([A-Z0-9]{6})/);
    const roomCode = match![1];

    // Jugador B se une a la sala
    await pageB.goto(BASE_URL);
    await pageB.getByRole('button', { name: /Unirse con Código/i }).click();
    await pageB.locator('input[placeholder="Ej. ABCD12"]').fill(roomCode);
    await pageB.locator('input[placeholder="Ej. Planeswalker"]').fill('Jugador_Bob');
    await pageB.getByRole('button', { name: 'Entrar a la Sala' }).click();

    // B selecciona mazo
    await expect(pageB.locator('button:has-text("Código:")').first()).toBeVisible({ timeout: 15000 });
    await pageB.locator('button:has-text("Seleccionar / Importar Mazo")').click();
    await pageB.locator('[data-testid^="select-preset-deck-"]').first().click();

    // Ambos listos
    await pageB.locator('button:has-text("Listo para Jugar")').click();
    await pageA.locator('button:has-text("Listo para Jugar")').click();

    // Iniciar partida
    const startBtn = pageA.locator('button:has-text("Iniciar Partida")');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();

    // Saltar iniciativa / mulligan si aparecen
    const keepBtnA = pageA.locator('button:has-text("Quedarse Mano")');
    if (await keepBtnA.isVisible({ timeout: 8000 }).catch(() => false)) {
      await keepBtnA.click();
    }
    const keepBtnB = pageB.locator('button:has-text("Quedarse Mano")');
    if (await keepBtnB.isVisible({ timeout: 8000 }).catch(() => false)) {
      await keepBtnB.click();
    }

    // Esperar a que la mesa esté activa
    await pageA.waitForTimeout(2000);

    // Abrir menú de vida en A
    const lifeBtnA = pageA.locator('[data-life-button]').first();
    await expect(lifeBtnA).toBeVisible({ timeout: 15000 });
    const initialLifeText = (await lifeBtnA.innerText()).trim();
    const initialLife = parseInt(initialLifeText, 10);
    expect(initialLife).toBeGreaterThan(0);

    await lifeBtnA.click();

    // Sección de daño de comandante
    const cmdSection = pageA.locator('[data-testid="commander-damage-section"]');
    await expect(cmdSection).toBeVisible({ timeout: 5000 });

    const plusBtn = pageA.locator('[data-testid^="cmd-dmg-plus-"]').first();
    const minusBtn = pageA.locator('[data-testid^="cmd-dmg-minus-"]').first();
    const dmgInput = pageA.locator('[data-testid^="cmd-dmg-input-"]').first();

    await expect(plusBtn).toBeVisible();
    await expect(dmgInput).toHaveValue('0');

    // Pulsar '+' -> vida baja en 1, cmdrDamage sube a 1
    await plusBtn.click();
    await expect(dmgInput).toHaveValue('1');
    await expect(lifeBtnA).toContainText(String(initialLife - 1));

    // Pulsar '+' otra vez -> vida baja en 2, cmdrDamage sube a 2
    await plusBtn.click();
    await expect(dmgInput).toHaveValue('2');
    await expect(lifeBtnA).toContainText(String(initialLife - 2));

    // Pulsar '−' -> vida sube en 1, cmdrDamage baja a 1 (se revierte)
    await minusBtn.click();
    await expect(dmgInput).toHaveValue('1');
    await expect(lifeBtnA).toContainText(String(initialLife - 1));

    // Pulsar '−' otra vez -> vida vuelve a initialLife, cmdrDamage vuelve a 0
    await minusBtn.click();
    await expect(dmgInput).toHaveValue('0');
    await expect(lifeBtnA).toContainText(String(initialLife));

    await contextA.close();
    await contextB.close();
  });
});
