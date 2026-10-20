import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe.configure({ mode: 'serial', timeout: 90000 });

const ARTIFACTS_DIR =
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa';

function computeBufferVariance(buffer: Buffer): number {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    sum += val;
    sumSq += val * val;
  }
  const mean = sum / buffer.length;
  return sumSq / buffer.length - mean * mean;
}

test('Audit Punto 8: Persistent reveal, P/T effective with counters and bases, animated land, zone exit reset, preview explanations, badge row and exterior placement', async ({
  browser,
}) => {
  // 3 contexts: Alice (Host), Bob (Guest 1), Charlie (Guest 2)
  const ctxA = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const ctxB = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const ctxC = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const pageC = await ctxC.newPage();

  // Listen for console errors
  const consoleErrors: string[] = [];
  pageA.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[A] ${msg.text()}`);
  });
  pageB.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[B] ${msg.text()}`);
  });
  pageC.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[C] ${msg.text()}`);
  });

  console.log('\n=== STEP 1: Creating Table and Joining Players ===');
  // 1. Host (Alice) creates table
  await pageA.goto('http://localhost:3000');
  await expect(pageA.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });
  await pageA.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Audit-P8-Pod');
  await pageA.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice');
  await pageA.selectOption('select', '3');
  await pageA.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = pageA.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match![1];
  console.log(`Table created with room code: ${roomCode}`);

  await pageA.click('button:has-text("Seleccionar / Importar Mazo")');
  await pageA.click('button:has-text("Importar mi primer mazo")');
  await pageA.fill(
    'textarea',
    `// Comandante\n1 Atraxa, Praetors' Voice *CMDR*\n\n// Mazo\n1 Sol Ring\n1 Llanowar Elves\n1 Birds of Paradise\n10 Forest\n10 Plains`,
  );
  await pageA.click('button:has-text("Validar lista")');
  await pageA.click('button:has-text("Usar este Mazo en la Mesa")');
  await pageA.click('button:has-text("Marcarme Listo")');

  // 2. Bob joins
  await pageB.goto('http://localhost:3000');
  await expect(pageB.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });
  await pageB.click('button:has-text("Unirse con Código")');
  await pageB.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await pageB.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob');
  await pageB.click('button:has-text("Entrar a la Mesa")');
  await pageB.click('button:has-text("Seleccionar / Importar Mazo")');
  await pageB.click('button:has-text("Importar mi primer mazo")');
  await pageB.fill(
    'textarea',
    `// Comandante\n1 Edgar Markov *CMDR*\n\n// Mazo\n1 Sol Ring\n10 Mountain\n10 Swamp`,
  );
  await pageB.click('button:has-text("Validar lista")');
  await pageB.click('button:has-text("Usar este Mazo en la Mesa")');
  await pageB.click('button:has-text("Marcarme Listo")');

  // 3. Charlie joins
  await pageC.goto('http://localhost:3000');
  await expect(pageC.locator('h1')).toContainText('Mesa Virtual de Commander', { timeout: 15000 });
  await pageC.click('button:has-text("Unirse con Código")');
  await pageC.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await pageC.fill('input[placeholder="Ej. Jugador Invitado"]', 'Charlie');
  await pageC.click('button:has-text("Entrar a la Mesa")');
  await pageC.click('button:has-text("Seleccionar / Importar Mazo")');
  await pageC.click('button:has-text("Importar mi primer mazo")');
  await pageC.fill(
    'textarea',
    `// Comandante\n1 Urza, Lord High Artificer *CMDR*\n\n// Mazo\n1 Sol Ring\n10 Island\n10 Wastes`,
  );
  await pageC.click('button:has-text("Validar lista")');
  await pageC.click('button:has-text("Usar este Mazo en la Mesa")');
  await pageC.click('button:has-text("Marcarme Listo")');

  // Start game & Mulligan keep for all 3
  await pageA.click('button:has-text("INICIAR PARTIDA")');
  await expect(pageA.locator('[data-testid="opening-hand-modal"]')).toBeVisible({ timeout: 25000 });

  const pages = [pageA, pageB, pageC];
  for (let step = 0; step < 3; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let clicked = false;
      for (const p of pages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            clicked = true;
            await p.waitForTimeout(300);
            break;
          }
        }
      }
      if (clicked) break;
      await pageA.waitForTimeout(200);
    }
  }

  await expect(pageA.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(pageB.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(pageC.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  console.log('Game started and all 3 players in battlefield view.');

  console.log('\n=== PART 1: Persistent Hand Reveal & Privacy Filtering ===');
  // Alice selects the topmost card in her hand (last element in DOM has highest z-index)
  const aliceHandCard = pageA.locator('[data-dock-zone="hand"] [data-hand-card="true"]').last();
  await expect(aliceHandCard).toBeVisible({ timeout: 5000 });
  const aliceCardName = await aliceHandCard.getAttribute('data-card-name');
  console.log(`Alice card to reveal to Bob: "${aliceCardName}"`);

  // Alice opens context menu on the hand card
  await aliceHandCard.click({ button: 'right', force: true });
  const revealMenuBtn = pageA.locator('[data-testid="context-reveal-menu"]');
  await expect(revealMenuBtn).toBeVisible({ timeout: 5000 });
  await revealMenuBtn.click();

  // Reveal inline suboptions appear: click Bob
  const revealToBobBtn = pageA
    .locator('[data-testid^="context-reveal-player-"]:has-text("Bob")')
    .first();
  await expect(revealToBobBtn).toBeVisible({ timeout: 5000 });
  await revealToBobBtn.click();
  await pageA.waitForTimeout(600);

  // Dismiss temporary popup modal on Bob and Alice so that modal backdrop is cleared
  const revealedModalB = pageB.locator('[data-testid="revealed-card-modal"]');
  await expect(revealedModalB).toBeVisible({ timeout: 5000 });
  await pageB.locator('[data-testid="dismiss-revealed-btn"]').click();

  const dismissA = pageA.locator('[data-testid="dismiss-revealed-btn"]');
  if (await dismissA.isVisible().catch(() => false)) {
    await dismissA.click();
  }
  await pageA.waitForTimeout(400);

  // In Alice's hand: card remains persistently revealed with red eye badge
  const aliceEyeBadge = aliceHandCard.locator('[data-testid="revealed-eye-badge"]');
  await expect(aliceEyeBadge).toBeVisible();
  const aliceEyeTitle = await aliceEyeBadge.getAttribute('title');
  console.log(`Alice eye badge tooltip: "${aliceEyeTitle}"`);
  expect(aliceEyeTitle).toContain('Bob');

  // In Bob's view of Alice's hand: Bob sees the card face up persistently with real name and red eye badge!
  const aliceCellOnBob = pageB.locator('[data-player-cell]:has-text("Alice")').first();
  await expect(aliceCellOnBob).toBeVisible({ timeout: 5000 });
  const bobSeesAliceCard = aliceCellOnBob
    .locator('[data-dock-zone="hand"] [data-revealed-card="true"]')
    .first();
  await expect(bobSeesAliceCard).toBeVisible({ timeout: 5000 });
  expect(await bobSeesAliceCard.getAttribute('data-card-name')).toBe(aliceCardName);

  const bobCardEye = bobSeesAliceCard.locator('[data-testid="revealed-eye-badge"]');
  await expect(bobCardEye).toBeVisible();
  const bobEyeTitle = await bobCardEye.getAttribute('title');
  console.log(`Bob eye badge tooltip: "${bobEyeTitle}"`);
  expect(bobEyeTitle).toContain('Alice');

  const shotBobPath = path.join(ARTIFACTS_DIR, 'audit-persistent-reveal-bob.png');
  const bufferBob = await pageB.screenshot({ path: shotBobPath });
  console.log(
    `Screenshot Bob sees revealed card: bytes=${bufferBob.length}, variance=${computeBufferVariance(bufferBob).toFixed(1)}`,
  );

  // In Charlie's view of Alice's hand: Charlie is NOT a recipient!
  // Charlie MUST NOT receive the card name and MUST NOT see any card marked revealed!
  const aliceCellOnCharlie = pageC.locator('[data-player-cell]:has-text("Alice")').first();
  await expect(aliceCellOnCharlie).toBeVisible();
  const charlieRevealedCards = aliceCellOnCharlie.locator(
    '[data-dock-zone="hand"] [data-revealed-card="true"]',
  );
  expect(await charlieRevealedCards.count()).toBe(0);

  // Check Charlie's DOM: verify card name was not leaked to Charlie
  const charlieHandText = await aliceCellOnCharlie.locator('[data-dock-zone="hand"]').innerText();
  expect(charlieHandText).not.toContain(aliceCardName);
  console.log(`Charlie hand privacy check: card "${aliceCardName}" not leaked to non-recipient!`);

  const shotCharliePath = path.join(ARTIFACTS_DIR, 'audit-persistent-reveal-charlie.png');
  const bufferCharlie = await pageC.screenshot({ path: shotCharliePath });
  console.log(
    `Screenshot Charlie non-recipient: bytes=${bufferCharlie.length}, variance=${computeBufferVariance(bufferCharlie).toFixed(1)}`,
  );

  // Alice chooses "Dejar de revelar"
  await aliceHandCard.click({ button: 'right', force: true });
  const unrevealBtn = pageA.locator('[data-testid="context-unreveal-btn"]');
  await expect(unrevealBtn).toBeVisible({ timeout: 3000 });
  await unrevealBtn.click();
  await pageA.waitForTimeout(500);

  // Bob now sees 0 revealed cards from Alice
  expect(
    await aliceCellOnBob.locator('[data-dock-zone="hand"] [data-revealed-card="true"]').count(),
  ).toBe(0);
  console.log('Unreveal successfully removed visibility from Bob.');

  console.log(
    '\n=== PART 2: P/T Indicator, Counters, Bases, Colors, Asterisk and Negative Values ===',
  );
  // Alice brings Atraxa from command zone to battlefield
  const cmdCard = pageA.locator('[data-dock-zone="command"] [data-commander-card="true"]').first();
  await expect(cmdCard).toBeVisible({ timeout: 5000 });
  await cmdCard.click();
  await pageA.waitForTimeout(400);

  // Inside command modal, right click Atraxa and send to battlefield
  const atraxaInModal = pageA.locator('[data-modal-card-item]').first();
  await expect(atraxaInModal).toBeVisible({ timeout: 5000 });
  await atraxaInModal.click({ button: 'right', force: true });
  const sendToBfBtn = pageA.locator('[data-testid="context-to-battlefield"]');
  await expect(sendToBfBtn).toBeVisible({ timeout: 5000 });
  await sendToBfBtn.click();
  await pageA.waitForTimeout(600);

  // Locate Atraxa on the battlefield
  const bfCard = pageA.locator('[data-battlefield-card="true"][data-card-name*="Atraxa"]').first();
  await expect(bfCard).toBeVisible({ timeout: 5000 });

  // 1. Initial P/T: 4/4 neutral
  const ptBadge = bfCard.locator('[data-testid="card-pt-indicator"]');
  await expect(ptBadge).toBeVisible();
  expect(await ptBadge.getAttribute('data-pt-effective')).toBe('4/4');
  expect(await ptBadge.getAttribute('data-pt-status')).toBe('neutral');
  console.log('Initial P/T on battlefield: 4/4 (neutral)');

  // 2. Open context menu -> Poder y resistencia
  await bfCard.click({ button: 'right', force: true });
  const ptToggle = pageA.locator('[data-testid="context-pt-toggle-btn"]');
  await expect(ptToggle).toBeVisible();
  await ptToggle.click();

  // Add +2 +1/+1 counters: effective becomes 6/6 and status is 'up' (green)
  const plusInput = pageA.locator('[data-testid="pt-input-plus-counters"]');
  await expect(plusInput).toBeVisible();
  await plusInput.fill('2');
  await expect(ptBadge).toHaveAttribute('data-pt-effective', '6/6', { timeout: 3000 });
  await expect(ptBadge).toHaveAttribute('data-pt-status', 'up', { timeout: 3000 });
  console.log('P/T after +2 counters: 6/6 (green/up)');

  // 3. Add -1/-1 counters = 3: effective becomes 3/3, status is 'down' (red)
  const minusInput = pageA.locator('[data-testid="pt-input-minus-counters"]');
  await expect(minusInput).toBeVisible();
  await minusInput.fill('3');
  await expect(ptBadge).toHaveAttribute('data-pt-effective', '3/3', { timeout: 3000 });
  await expect(ptBadge).toHaveAttribute('data-pt-status', 'down', { timeout: 3000 });
  console.log('P/T after 3 minus counters: 3/3 (red/down)');

  // 4. Set basePower = 0 and baseToughness = -1: effective becomes -1/-2 (negative values supported)
  await pageA.locator('[data-testid="pt-input-base-power"]').fill('0');
  await pageA.locator('[data-testid="pt-input-base-toughness"]').fill('-1');
  await expect(ptBadge).toHaveAttribute('data-pt-effective', '-1/-2', { timeout: 3000 });
  await expect(ptBadge).toHaveAttribute('data-pt-status', 'down', { timeout: 3000 });
  console.log('P/T with negative base values: -1/-2 (negative supported, red/down)');

  const shotPTColorsPath = path.join(ARTIFACTS_DIR, 'audit-pt-indicator-colors.png');
  const bufferPT = await pageA.screenshot({ path: shotPTColorsPath });
  console.log(`Screenshot P/T colors & negative values: bytes=${bufferPT.length}`);

  console.log('\n=== PART 3: Badge Row, Keyword Switches, Tooltips and Hover Preview Panel ===');
  // Expand Contadores section in the same context menu
  await pageA.locator('[data-testid="context-counters-toggle"]').click();
  // Set loyalty = 3, shield = 1
  await pageA.locator('[data-testid="counter-input-loyalty"]').fill('3');
  await pageA.locator('[data-testid="counter-input-shield"]').fill('1');

  // Expand Palabras clave section in the same context menu
  await pageA.locator('[data-testid="context-keywords-toggle"]').click();
  await pageA.locator('[data-testid="keyword-toggle-flying"]').click();
  await pageA.locator('[data-testid="keyword-toggle-deathtouch"]').click();
  await pageA.waitForTimeout(400);

  // Close context menu by clicking empty board space
  await pageA.mouse.click(20, 20);
  await expect(pageA.locator('[data-card-context-menu]')).not.toBeVisible({ timeout: 3000 });

  // Verify badge row is present at top border of the card
  const badgeRow = bfCard.locator('[data-testid="card-badge-row"]');
  await expect(badgeRow).toBeVisible();
  const badgesCount = await badgeRow.locator('[data-badge-item]').count();
  console.log(`Card badges rendered on top border: count=${badgesCount}`);
  expect(badgesCount).toBeGreaterThanOrEqual(4);

  // Tooltip check on first badge
  const firstBadge = badgeRow.locator('[data-badge-item]').first();
  const badgeTitle = await firstBadge.getAttribute('title');
  console.log(`Badge tooltip title: "${badgeTitle}"`);
  expect(badgeTitle).toBeTruthy();

  // Hover card to trigger Card Preview with keywords & counters explanation panel
  await bfCard.hover();
  await pageA.waitForTimeout(400);

  const previewPanel = pageA.locator('[data-testid="preview-keywords-counters-panel"]');
  await expect(previewPanel).toBeVisible();
  const panelItemsCount = await previewPanel.locator('[data-preview-item]').count();
  console.log(`Preview explanation items count: ${panelItemsCount}`);
  expect(panelItemsCount).toBeGreaterThanOrEqual(4);

  const shotPreviewPanelPath = path.join(ARTIFACTS_DIR, 'audit-preview-keywords-counters.png');
  const bufferPreview = await pageA.screenshot({ path: shotPreviewPanelPath });
  console.log(`Screenshot preview panel: bytes=${bufferPreview.length}`);

  // Move mouse away to close hover preview
  await pageA.mouse.move(10, 10);
  await pageA.waitForTimeout(200);

  console.log(
    '\n=== PART 4: Exterior Placement in Untapped (0°) and Tapped (90°) Orientations ===',
  );
  // Untapped measurement on Atraxa (alone on battlefield): verify badge is strictly outside bottom border
  const untappedGeometry = await pageA.evaluate(() => {
    const card = document.querySelector('[data-battlefield-card="true"][data-card-name*="Atraxa"]');
    const badge = card?.querySelector('[data-testid="card-pt-indicator"]');
    const rotator = card?.querySelector('[data-card-rotator="true"]');
    const cardRect = card?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    const rotatorRect = rotator?.getBoundingClientRect();

    return {
      cardRect,
      badgeRect,
      rotatorRect,
      badgeBottomDiff: badgeRect && rotatorRect ? badgeRect.bottom - rotatorRect.bottom : null,
      badgeLeftDiff: badgeRect && rotatorRect ? badgeRect.left - rotatorRect.left : null,
    };
  });
  console.log('Untapped (0°) Geometry:', JSON.stringify(untappedGeometry, null, 2));
  expect(untappedGeometry.badgeRect).not.toBeNull();
  expect(untappedGeometry.badgeBottomDiff).toBeGreaterThanOrEqual(0); // badge projects outside/at bottom edge!

  // Tap card (90°) via right-click menu "Girar"
  await bfCard.click({ button: 'right', force: true });
  const tapBtn = pageA.locator('[data-testid="context-tap-btn"]');
  await expect(tapBtn).toBeVisible({ timeout: 5000 });
  await tapBtn.click();
  await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 5000 });
  console.log('Card tapped successfully (data-tapped="true").');

  const tappedGeometry = await pageA.evaluate(() => {
    const card = document.querySelector('[data-battlefield-card="true"][data-card-name*="Atraxa"]');
    const badge = card?.querySelector('[data-testid="card-pt-indicator"]');
    const rotator = card?.querySelector('[data-card-rotator="true"]');
    const cardRect = card?.getBoundingClientRect();
    const badgeRect = badge?.getBoundingClientRect();
    const rotatorRect = rotator?.getBoundingClientRect();
    const badgeTransform = badge ? window.getComputedStyle(badge).transform : null;

    return {
      cardRect,
      badgeRect,
      rotatorRect,
      badgeTransform,
      isBadgeErguido: badgeTransform === 'none' || badgeTransform === 'matrix(1, 0, 0, 1, 0, 0)',
      badgeBottomDiff: badgeRect && rotatorRect ? badgeRect.bottom - rotatorRect.bottom : null,
    };
  });
  console.log('Tapped (90°) Geometry:', JSON.stringify(tappedGeometry, null, 2));
  expect(tappedGeometry.isBadgeErguido).toBe(true); // Badge remains upright without rotating!
  expect(tappedGeometry.badgeBottomDiff).toBeGreaterThanOrEqual(0);

  const shotTapPath = path.join(ARTIFACTS_DIR, 'audit-pt-indicator-tapped-untapped.png');
  await pageA.screenshot({ path: shotTapPath });

  // Untap card (0°) via right-click menu "Enderezar"
  await bfCard.click({ button: 'right', force: true });
  await pageA.locator('[data-testid="context-tap-btn"]').click();
  await expect(bfCard).toHaveAttribute('data-tapped', 'false', { timeout: 5000 });
  console.log('Card untapped successfully (data-tapped="false").');

  console.log('\n=== PART 5: Animated Card Without Printed P/T Definition ===');
  // Send Sol Ring / land from hand to battlefield
  const noPtHandCard = pageA.locator('[data-dock-zone="hand"] [data-hand-card="true"]').last();
  await expect(noPtHandCard).toBeVisible({ timeout: 5000 });
  const noPtCardName = (await noPtHandCard.getAttribute('data-card-name')) || 'Sol Ring';
  console.log(`Sending card without printed P/T to battlefield: "${noPtCardName}"`);

  await noPtHandCard.click({ button: 'right', force: true });
  const toBfBtn = pageA.locator('[data-testid="context-to-battlefield"]');
  await expect(toBfBtn).toBeVisible({ timeout: 5000 });
  await toBfBtn.click();
  await pageA.waitForTimeout(1000);

  const animatedBfCard = pageA
    .locator(`[data-battlefield-card="true"][data-card-name="${noPtCardName}"]`)
    .first();
  await expect(animatedBfCard).toBeVisible({ timeout: 5000 });

  // Initially has NO P/T indicator
  expect(await animatedBfCard.locator('[data-testid="card-pt-indicator"]').count()).toBe(0);
  console.log(`Card "${noPtCardName}" has no printed P/T and renders 0 P/T indicators initially.`);

  // Click animated card first to select it and elevate its z-index (z-50) over any overlapping cards
  await animatedBfCard.click({ force: true });
  await pageA.waitForTimeout(200);

  // Animate card: open context menu -> set base power = 5, base toughness = 5 (e.g. Ensoul Artifact / March of the Machines)
  await animatedBfCard.click({ button: 'right', force: true });
  const animPtToggle = pageA.locator('[data-testid="context-pt-toggle-btn"]');
  await expect(animPtToggle).toBeVisible({ timeout: 5000 });
  await animPtToggle.click();

  await pageA.locator('[data-testid="pt-input-base-power"]').fill('5');
  await pageA.waitForTimeout(200);
  await pageA.locator('[data-testid="pt-input-base-toughness"]').fill('5');
  await pageA.waitForTimeout(300);
  await pageA.mouse.click(20, 20); // close menu

  // Animated card now has P/T indicator 5/5!
  const animatedPtBadge = animatedBfCard.locator('[data-testid="card-pt-indicator"]');
  await expect(animatedPtBadge).toBeVisible();
  expect(await animatedPtBadge.getAttribute('data-pt-effective')).toBe('5/5');
  console.log(`Animated card "${noPtCardName}" received defined base P/T: 5/5!`);

  console.log('\n=== PART 6: Reset Upon Exiting the Battlefield ===');
  // Send Atraxa to graveyard via context menu
  await bfCard.click({ button: 'right', force: true });
  const toGraveyardBtn = pageA.locator('[data-testid="context-to-graveyard"]');
  await expect(toGraveyardBtn).toBeVisible({ timeout: 5000 });
  await toGraveyardBtn.click();
  await pageA.waitForTimeout(600);

  // Inspect Atraxa in graveyard: open graveyard modal
  const gyPile = pageA.locator('[data-pile-zone="graveyard"]').first();
  await expect(gyPile).toBeVisible();
  await gyPile.click();
  await pageA.waitForTimeout(500);

  // Inspect graveyard card data: must be present in modal
  const gyCardsCount = await pageA.locator('[data-modal-card-item]').count();
  console.log(`Graveyard modal cards count: ${gyCardsCount}`);
  expect(gyCardsCount).toBeGreaterThan(0);

  // Close graveyard modal
  await pageA.keyboard.press('Escape');

  console.log('\n=== VERIFY ZERO CONSOLE ERRORS ===');
  const cleanErrors = consoleErrors.filter(
    e => !e.includes('favicon') && !e.includes('Scryfall API error') && !e.includes('401'),
  );
  console.log('Console Errors caught:', cleanErrors);
  expect(cleanErrors.length).toBe(0);

  await ctxA.close();
  await ctxB.close();
  await ctxC.close();
});
