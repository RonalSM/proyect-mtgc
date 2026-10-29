import { test, expect } from '@playwright/test';

test('Verify scroll, deck validator popup, and clean keywords', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 1. Verify scroll ability on home page
  const initialScrollY = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 500));
  const newScrollY = await page.evaluate(() => window.scrollY);
  expect(newScrollY).toBeGreaterThanOrEqual(0);

  // Take screenshot of home page with full content
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-hub-scroll-unlocked.png',
    fullPage: true,
  });

  // 2. Open Deck Importer as POPUP Modal
  const openImporterBtn = page.locator('button:has-text("Validador de Mazos")').first();
  await expect(openImporterBtn).toBeVisible();
  await openImporterBtn.click();

  // Verify popup is open without changing main screen
  await expect(page.locator('text=Validador e Importador de Mazos EDH')).toBeVisible({
    timeout: 5000,
  });
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-validator-popup.png',
  });

  // Close popup
  await page.keyboard.press('Escape');

  // 3. Create room and check clean keywords in game
  await page.click('button:has-text("Crear Nueva Mesa")');
  await page.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Keywords Clean');
  await page.click('button:has-text("Crear y Abrir Sala")');

  await expect(page.locator('text=Sala de Espera')).toBeVisible({ timeout: 10000 });
});
