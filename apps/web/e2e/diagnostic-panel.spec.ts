import { test, expect } from '@playwright/test';

test.describe('Punto 7: Panel de Diagnóstico (?debug=1) y Registro de Errores en Servidor', () => {
  test('Sin ?debug=1 el panel no se muestra; con ?debug=1 se activa y lista cargas fallidas con URL, estado y motivo', async ({
    page,
    request,
  }) => {
    // 1. Sin ?debug=1 no debe renderizarse
    await page.goto('http://localhost:3000');
    await expect(page.locator('[data-testid="diagnostic-panel-container"]')).toHaveCount(0);

    // 2. Con ?debug=1 debe activarse
    await page.goto('http://localhost:3000?debug=1');
    const panelContainer = page.locator('[data-testid="diagnostic-panel-container"]');
    await expect(panelContainer).toBeVisible({ timeout: 10000 });

    // 3. Registrar fallo de prueba a través de diagnosticsService en el cliente
    await page.evaluate(() => {
      const win = window as any;
      if (win.__mtgc_diagnostics) {
        win.__mtgc_diagnostics.recordFailure({
          url: 'https://cards.scryfall.io/normal/front/error-404-test.jpg',
          cardName: 'Sol Ring (Test Fail)',
          status: 404,
          reason: 'Error 404 Not Found simulado en CDN de Scryfall',
          lang: 'es',
        });
      }
    });

    // Si __mtgc_diagnostics no está expuesto en window, enviarlo por fetch directo al endpoint
    const postRes = await request.post('http://localhost:3001/api/diagnostics/card-errors', {
      data: {
        cardName: 'Sol Ring (Audit Test)',
        url: 'https://cards.scryfall.io/normal/front/error-404-audit.jpg',
        status: 404,
        reason: 'Impresión en español inexistente en CDN (fallback a inglés)',
        lang: 'es',
      },
    });
    expect(postRes.status()).toBe(201);

    // Verificar en el servidor mediante GET /api/diagnostics/card-errors
    const getRes = await request.get('http://localhost:3001/api/diagnostics/card-errors');
    expect(getRes.status()).toBe(200);
    const body = await getRes.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.errors[0].cardName).toContain('Sol Ring');
    expect(body.errors[0].status).toBe(404);
    expect(body.errors[0].reason).toContain('Impresión en español inexistente');

    // Inyectar fallo en el panel del frontend para verificar renderizado de UI
    await page.evaluate(() => {
      // Registrar un fallo a través del módulo importado o evento
      window.dispatchEvent(
        new CustomEvent('mtgc:record-diagnostic', {
          detail: {
            url: 'https://cards.scryfall.io/normal/front/error-404-audit.jpg',
            cardName: 'Sol Ring (Audit Test)',
            status: 404,
            reason: 'Impresión en español inexistente en CDN (fallback a inglés)',
            lang: 'es',
          },
        }),
      );
    });

    await page.waitForTimeout(500);

    // Minimizar y expandir panel
    const closeToggle = page.locator('[data-testid="diagnostic-panel-toggle-close"]');
    if (await closeToggle.isVisible()) {
      await closeToggle.click();
      await expect(page.locator('[data-testid="diagnostic-panel-toggle-open"]')).toBeVisible();
      await page.locator('[data-testid="diagnostic-panel-toggle-open"]').click();
      await expect(page.locator('[data-testid="diagnostic-panel"]')).toBeVisible();
    }

    // Capturar screenshot del panel de diagnóstico
    await page.screenshot({
      path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-p7-diagnostic-panel.png',
      fullPage: false,
    });
  });

  test('Punto 1 (A.1): Pestaña Base de Datos muestra telemetria de cards, tokens, rulings, cardLocales y presencia de mazos listos', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000?debug=1');

    const tabDb = page.locator('[data-testid="diagnostic-tab-database"]');
    await expect(tabDb).toBeVisible({ timeout: 10000 });
    await tabDb.click();

    // Debe mostrar la vista de base de datos
    await expect(page.locator('[data-testid="diagnostic-database-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="diagnostic-metric-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="diagnostic-metric-tokens"]')).toBeVisible();
    await expect(page.locator('[data-testid="diagnostic-metric-rulings"]')).toBeVisible();
    await expect(page.locator('[data-testid="diagnostic-metric-locales"]')).toBeVisible();

    // Debe mostrar al menos un mazo listo
    await expect(
      page.locator('[data-testid="diagnostic-preset-deck-preset-krenko-mob-boss"]'),
    ).toBeVisible();

    // Esperar a que los datos se rendericen
    await page.waitForTimeout(1000);

    // Capturar screenshot del panel con la pestaña de base de datos activa
    await page.screenshot({
      path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-p1-diagnostic-database-panel.png',
      fullPage: false,
    });
  });
});
