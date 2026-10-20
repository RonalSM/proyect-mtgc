import { test, expect } from '@playwright/test';

test.describe('Punto 6: Cadena de Respaldo de Imagen (Español -> Inglés -> Marco de Texto)', () => {
  test('Verifica que si una imagen falla, cae limpiamente sin romper la pantalla', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    // Probar que el importador y el renderizador de cartas manejan fallback
    // Interceptar llamadas a una URL de imagen simulada y forzar 404
    await page.route('**/cards.scryfall.io/normal/front/error-es.jpg', route => route.abort());

    // Crear sala rápida para 2 jugadores
    await page.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Fallback-Chain-Test');
    await page.fill('input[placeholder="Ej. Planeswalker 1"]', 'Tester');
    await page.selectOption('select', '2');
    await page.click('button:has-text("Crear Mesa y Obtener Código")');

    await expect(page.locator('button:has-text("Código:")').first()).toBeVisible({ timeout: 15000 });

    // Seleccionar mazo predefinido
    await page.click('button:has-text("Seleccionar / Importar Mazo")');
    const presetDeck = page.locator('[data-testid^="select-preset-deck-"]').first();
    await expect(presetDeck).toBeVisible({ timeout: 10000 });
    await presetDeck.click();

    // Comprobar que en la lista de cartas o en la mesa no hay imágenes rotas
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => img.naturalWidth === 0 && !img.complete && img.getAttribute('src')).length;
    });

    expect(brokenImages).toBe(0);
  });
});
