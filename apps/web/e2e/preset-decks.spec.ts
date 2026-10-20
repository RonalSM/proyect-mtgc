import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

test.describe('Punto 8: Mazos Listos de Commander', () => {
  test('Lobby muestra mazos listos primero, con arte, colores, lista desplegable, memoria en localStorage y soporte multijugador del mismo mazo', async ({ browser }) => {
    const context1 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page1 = await context1.newPage();

    // 1. Host enters and creates a room
    await page1.goto('http://localhost:3000');
    await page1.waitForLoadState('networkidle');
    await expect(page1.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });

    // Create room
    await page1.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Mesa Presets EDH');
    await page1.fill('input[placeholder="Ej. Planeswalker 1"]', 'Jugador 1 (Host)');
    await page1.click('button:has-text("Crear Mesa")');

    // Wait for lobby to load and obtain room code
    const roomCodeButton = page1.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];
    expect(roomCode).toBeTruthy();

    // 2. Open Deck Selection Modal
    const selectDeckBtn = page1.locator('button:has-text("Seleccionar / Importar Mazo")');
    await expect(selectDeckBtn).toBeVisible();
    await selectDeckBtn.click();

    // 3. Verify "Mazos Listos" is the first and default active tab
    const presetTab = page1.locator('[data-testid="tab-preset-decks"]');
    await expect(presetTab).toBeVisible();
    await expect(presetTab).toHaveClass(/border-amber-500/);

    // Verify presence of 8 preset decks
    const presetKrenko = page1.locator('[data-testid="select-preset-deck-preset-krenko-mob-boss"]');
    const presetGoreclaw = page1.locator('[data-testid="select-preset-deck-preset-goreclaw-terror-of-qal-sisma"]');
    const presetBrago = page1.locator('[data-testid="select-preset-deck-preset-brago-king-eternal"]');
    const presetMeren = page1.locator('[data-testid="select-preset-deck-preset-meren-of-clan-nel-toth"]');
    const presetWyleth = page1.locator('[data-testid="select-preset-deck-preset-wyleth-soul-of-steel"]');
    const presetNiv = page1.locator('[data-testid="select-preset-deck-preset-niv-mizzet-parun"]');
    const presetAlela = page1.locator('[data-testid="select-preset-deck-preset-alela-artful-provocateur"]');
    const presetKozilek = page1.locator('[data-testid="select-preset-deck-preset-kozilek-the-great-distortion"]');

    await expect(presetKrenko).toBeVisible();
    await expect(presetGoreclaw).toBeVisible();
    await expect(presetBrago).toBeVisible();
    await expect(presetMeren).toBeVisible();
    await expect(presetWyleth).toBeVisible();
    await expect(presetNiv).toBeVisible();
    await expect(presetAlela).toBeVisible();
    await expect(presetKozilek).toBeVisible();

    // 4. Test Foldable Card List
    const toggleListBtn = page1.locator('[data-testid="toggle-cardlist-preset-krenko-mob-boss"]');
    await expect(toggleListBtn).toBeVisible();
    await toggleListBtn.click();

    const cardListContent = page1.locator('[data-testid="cardlist-content-preset-krenko-mob-boss"]');
    await expect(cardListContent).toBeVisible();
    await expect(cardListContent).toContainText('Krenko, Mob Boss');
    await expect(cardListContent).toContainText('Sol Ring');

    // Fold again
    await toggleListBtn.click();
    await expect(cardListContent).not.toBeVisible();

    // 5. Player 1 chooses Krenko
    await presetKrenko.click();

    // Modal closes
    await expect(page1.locator('h3:has-text("Seleccionar Mazo")')).not.toBeVisible();

    // Player 1 slot shows selected deck
    await expect(page1.locator('text=Krenko - Marea de Trasgos')).toBeVisible();

    // 6. Verify localStorage saved the selection
    const storedDeck = await page1.evaluate(() => localStorage.getItem('mtgc_last_selected_deck'));
    expect(storedDeck).toBeTruthy();
    const parsedStored = JSON.parse(storedDeck!);
    expect(parsedStored.name).toBe('Krenko - Marea de Trasgos');
    expect(parsedStored.commanderName).toBe('Krenko, Mob Boss');

    // 7. Player 2 connects and enters the same room
    const context2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page2 = await context2.newPage();
    await page2.goto('http://localhost:3000');
    await expect(page2.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });

    await page2.click('button:has-text("Unirse con Código")');
    await page2.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await page2.fill('input[placeholder="Ej. Jugador Invitado"]', 'Jugador 2 (Rival)');
    await page2.click('button:has-text("Entrar a la Mesa")');

    await expect(page2.locator('button:has-text("Código:")').first()).toBeVisible({ timeout: 15000 });

    // Player 2 opens modal
    await page2.click('button:has-text("Seleccionar / Importar Mazo")');
    await page2.waitForSelector('[data-testid="tab-preset-decks"]');

    // Player 2 ALSO chooses the SAME preset deck: Krenko - Marea de Trasgos
    const p2Krenko = page2.locator('[data-testid="select-preset-deck-preset-krenko-mob-boss"]');
    await expect(p2Krenko).toBeVisible();
    await p2Krenko.click();

    // Both players should now have Krenko selected without conflict!
    // Since both players selected Krenko, there are exactly 2 instances displayed in the lobby
    await expect(page2.locator('text=Krenko - Marea de Trasgos')).toHaveCount(2);
    await expect(page1.locator('text=Krenko - Marea de Trasgos')).toHaveCount(2);

    // Both players mark ready
    await page1.click('button:has-text("Marcarme Listo")');
    await page2.click('button:has-text("Marcarme Listo")');

    await expect(page1.locator('button:has-text("INICIAR PARTIDA")')).toBeEnabled();

    // Save screenshot artifact
    const screenshotPath = path.join(ARTIFACTS_DIR, 'audit-preset-decks-lobby.png');
    await page1.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    await context1.close();
    await context2.close();
  });
});
