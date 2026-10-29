import { test, expect } from '@playwright/test';

test('Game Hub / Launcher page audit screenshots', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Verify hub title and clean sans font header
  await expect(page.locator('text=Centro de Operaciones y Mesas Virtuales')).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator('text=Mazos de Commander Listos para la Mesa')).toBeVisible({
    timeout: 10000,
  });

  // Screenshot 1: Hub home view
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-game-hub-home.png',
    fullPage: true,
  });

  // Open Create Room modal
  await page.click('button:has-text("Crear Nueva Mesa")');
  await expect(page.locator('text=Crear Mesa de Commander')).toBeVisible({ timeout: 5000 });

  // Screenshot 2: Create room modal (clean dark modal, zero cheap blur)
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-game-hub-modal-create.png',
  });

  // Create room and enter waiting room
  await page.fill('input[placeholder="Ej. Pod de Viernes por la Noche"]', 'Mesa Commander Hub');
  await page.click('button:has-text("Crear y Abrir Sala")');

  // Wait for waiting room
  await expect(page.locator('text=Sala de Espera')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Screenshot 3: Lobby Waiting room reworked
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-waiting-room-hub.png',
    fullPage: true,
  });
});
