import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Punto 4: Fuentes Mana y Keyrune auto-alojadas y glifos renderizados', () => {
  test('La fuente Mana y Keyrune cargan con document.fonts.check y todos los glifos tienen ancho > 0', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/?test=font-glyphs');

    const container = page.locator('[data-testid="font-glyphs-audit-container"]');
    await expect(container).toBeVisible({ timeout: 10000 });

    // 1. Verificar carga de fuentes mediante FontFaceSet API (document.fonts.check)
    await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 10000 });

    const manaFontStatus = await page.evaluate(() => document.fonts.check('14px Mana'));
    const keyruneFontStatus = await page.evaluate(() => document.fonts.check('14px Keyrune'));

    console.log(`[Punto 4 Test] document.fonts.check('14px Mana'): ${manaFontStatus}`);
    console.log(`[Punto 4 Test] document.fonts.check('14px Keyrune'): ${keyruneFontStatus}`);

    expect(manaFontStatus).toBe(true);
    expect(keyruneFontStatus).toBe(true);

    await expect(page.locator('[data-testid="status-mana-font"]')).toContainText('✓ CARGADA');
    await expect(page.locator('[data-testid="status-keyrune-font"]')).toContainText('✓ CARGADA');

    // 2. Verificar que cada palabra clave oficial muestra un glifo con ancho > 0
    const keywords = [
      'deathtouch',
      'defender',
      'double_strike',
      'fear',
      'first_strike',
      'flying',
      'haste',
      'hexproof',
      'indestructible',
      'lifelink',
      'menace',
      'reach',
      'trample',
      'vigilance',
    ];

    for (const kw of keywords) {
      const glyphLocator = page.locator(`[data-testid="glyph-kw-${kw}"]`);
      await expect(glyphLocator).toBeVisible();

      const box = await glyphLocator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);

      const offsetWidth = await glyphLocator.evaluate(el => (el as HTMLElement).offsetWidth);
      expect(offsetWidth).toBeGreaterThan(0);
    }

    // 3. Verificar que cada contador oficial muestra un glifo o vector con ancho > 0
    const counters = [
      '+1/+1',
      '−1/−1',
      'loyalty',
      'charge',
      'lore',
      'shield',
      'stun',
      'time',
      'finality',
      'generic',
      'custom',
    ];

    for (const c of counters) {
      const glyphLocator = page.locator(`[data-testid="glyph-counter-${c}"]`);
      await expect(glyphLocator).toBeVisible();

      const box = await glyphLocator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);

      const offsetWidth = await glyphLocator.evaluate(el => (el as HTMLElement).offsetWidth);
      expect(offsetWidth).toBeGreaterThan(0);
    }

    // 4. Capturar pantalla completa de la galería de glifos para el reporte y artefacto
    const artifactPath =
      'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-p4-font-glyphs-list.png';
    await page.screenshot({ path: artifactPath, fullPage: true });

    const localScreenshotPath = path.resolve('apps/web/e2e/screenshots/audit-p4-font-glyphs-list.png');
    await page.screenshot({ path: localScreenshotPath, fullPage: true });

    console.log(`[Punto 4 Test] Captura guardada en: ${artifactPath}`);
  });
});
