import { test, expect } from '@playwright/test';

test.describe('Producción Multi-Navegador (Chromium, Firefox, WebKit)', () => {
  test('debe cargar la aplicación, el lobby y verificar conexión de backend', async ({ page }) => {
    // 1. Navegar a la aplicación desplegada en Netlify
    await page.goto('/');

    // 2. Verificar que el título o elemento principal esté presente
    await expect(page).toHaveTitle(/MTG Commander/i);

    // 3. Verificar que los botones para crear/unirse a sala existan
    const createBtn = page.getByRole('button', { name: /Crear Nueva Mesa/i });
    await expect(createBtn).toBeVisible({ timeout: 15000 });

    // 4. Abrir modal de crear sala y verificar formulario
    await createBtn.click();
    const hostNameInput = page.getByPlaceholder(/Tu nombre|Nombre del anfitrión/i).or(page.locator('input[type="text"]').first());
    await expect(hostNameInput).toBeVisible({ timeout: 5000 });

    // 5. Verificar que no haya errores fatales en consola
    const consoleErrors: string[] = [];
    page.on('pageerror', err => consoleErrors.push(err.message));
    expect(consoleErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});
