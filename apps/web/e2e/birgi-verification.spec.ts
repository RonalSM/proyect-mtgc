import { test, expect } from '@playwright/test';

test('Birgi, God of Storytelling resolves to real card with full frame, PT 3/3, and modal DFC details', async ({ page }) => {
  // Clear persistent caches and local storage
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Verify /api/cards/search returns Kaldheim modal DFC
  const searchRes = await page.request.get('http://localhost:3001/api/cards/search?name=Birgi,%20God%20of%20Storytelling');
  expect(searchRes.ok()).toBeTruthy();
  const cardData = await searchRes.json();
  expect(cardData.name).toBe('Birgi, God of Storytelling // Harnfel, Horn of Bounty');
  expect(cardData.scryfallId).toBe('44657ab1-0a6a-4a5f-9688-86f239083821');
  expect(cardData.imageUrlNormal).toContain('/normal/front/4/4/44657ab1-0a6a-4a5f-9688-86f239083821.jpg');
  expect(cardData.power).toBe('3');
  expect(cardData.toughness).toBe('3');
  expect(cardData.isTwoFaced).toBe(true);

  // Navigate to app, create room, and enter lobby
  await page.goto('http://localhost:3000');
  await expect(page.locator('h2')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });

  await page.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Mesa Birgi Audit');
  await page.fill('input[placeholder="Ej. Planeswalker 1"]', 'Nero');
  await page.click('button:has-text("Crear Mesa de Juego")');

  await expect(page.locator('text=Sala de Espera')).toBeVisible({ timeout: 10000 });

  // Open modal with the resolved Birgi card through the initialized CardPreviewContext
  await page.evaluate((card) => {
    const ctx = (window as any).__mtgc_preview_context;
    if (ctx?.openCardDetails) {
      ctx.openCardDetails(card);
    } else if ((window as any).__mtgc_open_details) {
      (window as any).__mtgc_open_details(card);
    }
  }, cardData);

  // Assert modal is open
  const modal = page.locator('[data-testid="card-details-modal"]');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Assert card name
  const nameEl = page.locator('[data-testid="card-details-name"]');
  await expect(nameEl).toContainText('Birgi, God of Storytelling');

  // Assert P/T
  const ptEl = page.locator('[data-testid="card-details-pt"]');
  await expect(ptEl).toContainText('3/3');

  // Assert Oracle text (symbols are rendered via font icons, so innerText has "add .")
  const oracleEl = page.locator('[data-testid="card-details-oracle"]');
  await expect(oracleEl).toContainText("Whenever you cast a spell, add");
  await expect(oracleEl).toContainText("Creatures you control can boast twice");

  // Assert image is NOT art_crop and contains the front normal frame
  const imgEl = page.locator('[data-testid="card-details-image"]');
  const src = await imgEl.getAttribute('src');
  expect(src).not.toContain('/art_crop/');
  expect(src).toContain('44657ab1-0a6a-4a5f-9688-86f239083821');

  // Assert DFC face switcher exists and toggles to back face
  const faceSwitcher = page.locator('[data-testid="card-details-face-switcher"]');
  await expect(faceSwitcher).toBeVisible();

  // Take screenshot of front face
  await page.screenshot({
    path: 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa/audit-birgi-fixed.png',
  });

  // Switch face
  await faceSwitcher.click();

  // Face 2: Harnfel, Horn of Bounty
  await expect(nameEl).toContainText('Harnfel, Horn of Bounty');
  await expect(imgEl).toHaveAttribute('src', /\/back\//);
  const backSrc = await imgEl.getAttribute('src');
  expect(backSrc).not.toContain('/art_crop/');
});
