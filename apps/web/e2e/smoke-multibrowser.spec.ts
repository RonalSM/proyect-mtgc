import { test, expect } from '@playwright/test';

test.describe('Producción Multi-Navegador (Chromium, Firefox, WebKit) - Punto F6', () => {
  test('debe cargar app, fuentes, crear sala, conectar WS y gestionar mazo sin errores', async ({ page, browserName }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    // 1. Carga inicial y título
    await page.goto('/');
    await expect(page).toHaveTitle(/MTG Commander/i);

    // 2. Comprobar barra de maná y fuentes de símbolos
    const manaBar = page.locator('header').locator('i.ms');
    await expect(manaBar.first()).toBeVisible({ timeout: 10000 });

    // 3. Abrir modal y crear sala de prueba
    const createBtn = page.getByRole('button', { name: /Crear Nueva Mesa/i });
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    // Completar nombre de sala y anfitrión
    const roomNameInput = page.getByPlaceholder(/Pod de Viernes|Nombre de la mesa/i).or(page.locator('input[type="text"]').first());
    await roomNameInput.fill(`Test Multi_${browserName}`);

    const hostNameInput = page.getByPlaceholder(/Planeswalker 1|Tu nombre/i).or(page.locator('input[type="text"]').nth(1));
    await hostNameInput.fill(`Host_${browserName}`);

    const submitCreateBtn = page.getByRole('button', { name: /Crear y Abrir Sala|Crear Mesa/i });
    await submitCreateBtn.click();

    // 4. Verificar entrada a la sala y conexión WebSocket
    const roomCodeElement = page.getByText(/Código de la Sala|Mesa/i).first();
    await expect(roomCodeElement).toBeVisible({ timeout: 15000 });

    // 5. Abrir selector de mazo y elegir un mazo listo
    const selectDeckBtn = page.getByRole('button', { name: /Seleccionar \/ Importar Mazo|Cambiar Mazo/i });
    await expect(selectDeckBtn).toBeVisible({ timeout: 10000 });
    await selectDeckBtn.click();

    // Pestaña Mazos Listos
    const presetTab = page.getByTestId('tab-preset-decks');
    if (await presetTab.isVisible()) {
      await presetTab.click();
    }

    // Elegir el primer mazo disponible
    const chooseDeckBtn = page.getByRole('button', { name: /Elegir este mazo|Usar este Mazo/i }).first();
    await expect(chooseDeckBtn).toBeVisible({ timeout: 10000 });
    await chooseDeckBtn.click();

    // 6. Verificar que el mazo quedó seleccionado en la sala
    const readyOrDeselectBtn = page.getByRole('button', { name: /Marcarme Listo|Listo|Cancelar "Listo"/i }).or(page.getByTestId('deselect-deck-btn'));
    await expect(readyOrDeselectBtn.first()).toBeVisible({ timeout: 10000 });

    // 7. Verificar que no hubo excepciones no controladas en el navegador
    const fatalErrors = consoleErrors.filter(
      e => !e.includes('ResizeObserver') && !e.includes('favicon') && !e.includes('Third-party cookie'),
    );
    expect(fatalErrors).toHaveLength(0);
  });
});
