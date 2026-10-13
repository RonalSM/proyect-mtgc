import { test, expect } from '@playwright/test';

test.describe('E2E Tabletop - 4 Players Live Pod', () => {
  test('Host creates table, 3 players join, life and game actions sync in real-time', async ({
    browser,
  }) => {
    // 1. Host creates room
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await hostPage.goto('http://localhost:3000');

    // Confirm lobby loaded
    await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander');
    await expect(hostPage.locator('text=Crear Nueva Mesa')).toBeVisible();

    // Fill Host form
    await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Pod E2E 4 Jugadores');
    await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
    await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

    // Wait for room to load and extract 6-character room code from the header copy button
    const roomCodeButton = hostPage.locator('button[title="Copiar código de la mesa"]').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 10000 });
    const roomCode = (await roomCodeButton.innerText()).trim();
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    console.log(`[E2E] Created Room with code: ${roomCode}`);

    // Verify Host sees 40 starting life
    await expect(hostPage.locator('text=40').first()).toBeVisible();

    // 2. Player 2 joins
    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    await p2Page.goto('http://localhost:3000');
    await p2Page.click('button:has-text("Unirse con Código")');
    await p2Page.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await p2Page.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (Player 2)');
    await p2Page.click('button:has-text("Entrar a la Mesa")');
    await expect(p2Page.locator('button[title="Copiar código de la mesa"]')).toBeVisible({
      timeout: 10000,
    });

    // 3. Player 3 joins
    const p3Context = await browser.newContext();
    const p3Page = await p3Context.newPage();
    await p3Page.goto('http://localhost:3000');
    await p3Page.click('button:has-text("Unirse con Código")');
    await p3Page.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await p3Page.fill('input[placeholder="Ej. Jugador Invitado"]', 'Charlie (Player 3)');
    await p3Page.click('button:has-text("Entrar a la Mesa")');
    await expect(p3Page.locator('button[title="Copiar código de la mesa"]')).toBeVisible({
      timeout: 10000,
    });

    // 4. Player 4 joins
    const p4Context = await browser.newContext();
    const p4Page = await p4Context.newPage();
    await p4Page.goto('http://localhost:3000');
    await p4Page.click('button:has-text("Unirse con Código")');
    await p4Page.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
    await p4Page.fill('input[placeholder="Ej. Jugador Invitado"]', 'Diana (Player 4)');
    await p4Page.click('button:has-text("Entrar a la Mesa")');
    await expect(p4Page.locator('button[title="Copiar código de la mesa"]')).toBeVisible({
      timeout: 10000,
    });

    // 5. Verify all 4 players are visible in the board for Host
    await expect(hostPage.locator('text=Bob (Player 2)')).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator('text=Charlie (Player 3)')).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator('text=Diana (Player 4)')).toBeVisible({ timeout: 5000 });

    // 6. Action Sync: Alice takes 2 damage (-1 button clicked twice)
    const minusOneButton = hostPage.locator('button[title="Restar 1 vida"]').first();
    await minusOneButton.click();
    await minusOneButton.click();

    // Verify life dropped to 38 on host
    await expect(hostPage.locator('text=38').first()).toBeVisible();

    // Verify Bob (p2) also sees Alice's life at 38 via WebSocket broadcast
    await expect(p2Page.locator('text=38').first()).toBeVisible({ timeout: 5000 });

    // 7. Drag & Drop Card Interaction (No Buttons)
    // Alice loads her deck to get commander and initial 7 cards in hand
    await hostPage.click('button:has-text("Cargar Mazo")');
    await hostPage.click('button:has-text("Validar y Cargar Mazo")');

    // Confirm board is displayed and hand has loaded cards
    await expect(hostPage.locator('text=Tu Mano Privada')).toBeVisible({ timeout: 10000 });
    const firstHandCard = hostPage.locator('[data-from-zone="hand"]').first();
    await expect(firstHandCard).toBeVisible({ timeout: 10000 });

    // Drag card from Hand to Battlefield drop zone
    const battlefieldDropZone = hostPage.locator('[data-drop-zone="battlefield"]');
    await firstHandCard.dragTo(battlefieldDropZone);

    // Verify card is now on Battlefield
    const battlefieldCard = hostPage.locator('[data-from-zone="battlefield"]').first();
    await expect(battlefieldCard).toBeVisible({ timeout: 5000 });

    // Drag card from Battlefield to Graveyard drop zone
    const graveyardDropZone = hostPage.locator('[data-drop-zone="graveyard"]');
    await battlefieldCard.dragTo(graveyardDropZone);

    // Verify Graveyard count updated to 1
    await expect(hostPage.locator('[data-drop-zone="graveyard"]').locator('text=1')).toBeVisible({
      timeout: 5000,
    });

    // 8. Drag Commander from Command Zone to Battlefield
    const commanderCard = hostPage.locator('[data-from-zone="command"]').first();
    await expect(commanderCard).toBeVisible({ timeout: 5000 });
    await commanderCard.dragTo(battlefieldDropZone);

    // Verify commander is on Battlefield
    const cmdOnBf = hostPage.locator('[data-from-zone="battlefield"]').first();
    await expect(cmdOnBf).toBeVisible({ timeout: 5000 });

    // Drag commander back to Command Zone drop dock
    const commandDropZone = hostPage.locator('[data-drop-zone="command"]');
    await cmdOnBf.dragTo(commandDropZone);

    // Verify commander returned to Command Zone
    await expect(hostPage.locator('[data-from-zone="command"]').first()).toBeVisible({
      timeout: 5000,
    });

    // Clean up
    await hostContext.close();
    await p2Context.close();
    await p3Context.close();
    await p4Context.close();
  });
});
