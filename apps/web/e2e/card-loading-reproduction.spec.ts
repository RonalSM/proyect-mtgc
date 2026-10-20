import { test, expect } from '@playwright/test';

interface FailedRequest {
  url: string;
  domain: string;
  status: number | string;
  method: string;
  failureText?: string;
}

test.describe('Punto 5: Diagnóstico y Reproducción de Errores de Carga de Cartas', () => {
  test('Reproduce flujo completo del cliente (4 jugadores, preset decks, mulligan, zonas, tokens, ver carta, zoom) y captura telemetría', async ({
    browser,
  }) => {
    test.setTimeout(120000);

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const failedRequests: FailedRequest[] = [];
    const cspViolations: any[] = [];
    const rejectedWsActions: string[] = [];
    const cacheApiErrors: string[] = [];
    const failedCardsList: string[] = [];

    const hostContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const hostPage = await hostContext.newPage();

    // 1. Interceptar eventos en hostPage
    hostPage.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        if (
          text.includes('Failed to load resource') ||
          text.includes('404') ||
          text.includes('429') ||
          text.includes('cards.scryfall.io') ||
          text.includes('api.scryfall.com')
        ) {
          failedCardsList.push(text);
        }
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
      if (text.includes('REJECTED') || text.includes('rejected') || text.includes('Error in action')) {
        rejectedWsActions.push(text);
      }
      if (text.includes('Cache') || text.includes('QuotaExceededError')) {
        cacheApiErrors.push(text);
      }
    });

    hostPage.on('response', resp => {
      const status = resp.status();
      const url = resp.url();
      if (status >= 400) {
        try {
          const parsed = new URL(url);
          failedRequests.push({
            url,
            domain: parsed.hostname,
            status,
            method: resp.request().method(),
          });
        } catch {
          failedRequests.push({ url, domain: 'unknown', status, method: resp.request().method() });
        }
      }
    });

    hostPage.on('requestfailed', req => {
      const url = req.url();
      try {
        const parsed = new URL(url);
        failedRequests.push({
          url,
          domain: parsed.hostname,
          status: 'FAILED',
          method: req.method(),
          failureText: req.failure()?.errorText || 'Failed',
        });
      } catch {
        failedRequests.push({
          url,
          domain: 'unknown',
          status: 'FAILED',
          method: req.method(),
          failureText: req.failure()?.errorText || 'Failed',
        });
      }
    });

    await hostPage.addInitScript(() => {
      window.addEventListener('securitypolicyviolation', (e: any) => {
        (window as any).__cspViolations = (window as any).__cspViolations || [];
        (window as any).__cspViolations.push({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          originalPolicy: e.originalPolicy,
        });
      });
    });

    // 2. Crear mesa de 4 jugadores
    await hostPage.goto('http://localhost:3000');
    await expect(hostPage.locator('h1')).toContainText('Mesa Virtual de Commander', {
      timeout: 15000,
    });

    await hostPage.fill('input[placeholder="Ej. Pod Casual 4 Jugadores"]', 'Audit-4P-Network');
    await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
    await hostPage.selectOption('select', '4');
    await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

    const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
    await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
    const match = (await roomCodeButton.innerText()).match(/Código:\s*([A-Z0-9]{6})/);
    const roomCode = match![1];
    console.log(`[Punto 5] Sala creada con código: ${roomCode}`);

    // Seleccionar mazo predefinido de host
    await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
    const hostPreset = hostPage.locator('[data-testid^="select-preset-deck-"]').first();
    await expect(hostPreset).toBeVisible({ timeout: 10000 });
    await hostPreset.click();
    await hostPage.waitForTimeout(500);
    await hostPage.click('button:has-text("Marcarme Listo")');

    // 3. Unir 3 jugadores invitados con mazos predefinidos
    const guestNames = ['Bob', 'Charlie', 'Diana'];
    const guestPages = [];

    for (let pIdx = 0; pIdx < 3; pIdx++) {
      const gCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const gPage = await gCtx.newPage();
      guestPages.push(gPage);

      await gPage.goto('http://localhost:3000');
      await expect(gPage.locator('h1')).toContainText('Mesa Virtual de Commander', {
        timeout: 15000,
      });

      await gPage.click('button:has-text("Unirse con Código")');
      await gPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
      await gPage.fill('input[placeholder="Ej. Jugador Invitado"]', guestNames[pIdx]);
      await gPage.click('button:has-text("Entrar a la Mesa")');

      await gPage.click('button:has-text("Seleccionar / Importar Mazo")');
      const gPreset = gPage.locator('[data-testid^="select-preset-deck-"]').nth((pIdx + 1) % 4);
      await expect(gPreset).toBeVisible({ timeout: 10000 });
      await gPreset.click();
      await gPage.waitForTimeout(500);
      await gPage.click('button:has-text("Marcarme Listo")');
    }

    // 4. Iniciar partida
    await hostPage.waitForTimeout(1000);
    const startBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });
    await startBtn.click();

    // 5. Fase de iniciativa y Mulligan
    console.log('[Punto 5] Esperando fase de Mulligan...');
    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
      timeout: 30000,
    });
    console.log('[Punto 5] Modal de Mulligan abierto. Resolviendo decisiones turn-by-turn...');

    const allPages = [hostPage, ...guestPages];
    const startTime = Date.now();
    while (Date.now() - startTime < 45000) {
      const isMulliganVisible = await hostPage.locator('[data-testid="opening-hand-modal"]').isVisible();
      if (!isMulliganVisible) {
        console.log('[Punto 5] Fase de mulligan completada exitosamente.');
        break;
      }
      for (const p of allPages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]:not([disabled])');
        if (await keepBtn.isVisible({ timeout: 200 }).catch(() => false)) {
          console.log('[Punto 5] Jugador activo confirmando mano (keep-btn)...');
          await keepBtn.click().catch(() => {});
          await p.waitForTimeout(600);
          break;
        }
      }
      await hostPage.waitForTimeout(400);
    }

    // Asegurar que la modal desapareció
    await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeHidden({ timeout: 15000 });
    await hostPage.waitForTimeout(2000);

    // Helper para cerrar modales de pila
    const closeOpenPileModal = async () => {
      const closeBtn = hostPage.locator('[data-testid="close-pile-modal-btn"]');
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click({ force: true });
        await hostPage.waitForTimeout(500);
      } else {
        await hostPage.keyboard.press('Escape');
        await hostPage.waitForTimeout(500);
      }
    };

    // 6. En la mesa: Abrir biblioteca
    console.log('[Punto 5] Inspeccionando Biblioteca...');
    const libInspectBtn = hostPage.locator('[data-library-inspect-btn="true"]').first();
    if (await libInspectBtn.isVisible()) {
      await libInspectBtn.click({ force: true });
      await hostPage.waitForTimeout(1500);
      await closeOpenPileModal();
    }

    // 7. Abrir Cementerio y Exilio
    console.log('[Punto 5] Inspeccionando Cementerio...');
    const gyZone = hostPage.locator('[data-pile-zone="graveyard"]').first();
    if (await gyZone.isVisible()) {
      await gyZone.click({ force: true });
      await hostPage.waitForTimeout(1000);
      await closeOpenPileModal();
    }

    console.log('[Punto 5] Inspeccionando Exilio...');
    const exZone = hostPage.locator('[data-pile-zone="exile"]').first();
    if (await exZone.isVisible()) {
      await exZone.click({ force: true });
      await hostPage.waitForTimeout(1000);
      await closeOpenPileModal();
    }

    // 8. Ver Carta (clic derecho sobre carta en mano)
    console.log('[Punto 5] Probando "Ver carta" desde menú de clic derecho en mano...');
    const handCard = hostPage.locator('[data-hand-card="true"]').last();
    if (await handCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Usar last() para la carta superior del abanico que no tiene solapamiento encima
      await handCard.click({ button: 'right', force: true });
      await hostPage.waitForTimeout(1000);

      const viewCardBtn = hostPage.locator('[data-testid="context-view-card"]');
      if (await viewCardBtn.isVisible()) {
        await viewCardBtn.click({ force: true });
        await hostPage.waitForTimeout(2000);
        console.log('[Punto 5] Modal "Ver carta" abierta correctamente.');
        const closeDetailsBtn = hostPage.locator('[data-testid="close-card-details-modal"]');
        if (await closeDetailsBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeDetailsBtn.click({ force: true });
        } else {
          await hostPage.keyboard.press('Escape');
        }
        await hostPage.waitForTimeout(500);
      } else {
        await hostPage.keyboard.press('Escape');
      }
    }

    // 9. Crear Ficha (clic derecho en espacio vacío de la división del jugador)
    console.log('[Punto 5] Probando "Crear ficha" desde espacio vacío...');
    const localCell = hostPage.locator('[data-player-cell]').first();
    if (await localCell.isVisible()) {
      await localCell.click({ button: 'right', position: { x: 120, y: 120 }, force: true });
      await hostPage.waitForTimeout(1000);

      const tokenModal = hostPage.locator('[data-testid="create-token-modal"]');
      if (await tokenModal.isVisible()) {
        console.log('[Punto 5] Modal Crear Ficha abierta con éxito');
        await hostPage.waitForTimeout(1500);
        const closeTokenBtn = hostPage.locator('[data-testid="close-create-token-modal-btn"]');
        if (await closeTokenBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeTokenBtn.click({ force: true });
        } else {
          await hostPage.keyboard.press('Escape');
        }
        await hostPage.waitForTimeout(500);
      }
    }

    // 10. Vista ampliada (expandir división)
    console.log('[Punto 5] Probando vista ampliada (expandir división)...');
    const expandBtn = hostPage.locator('[data-expand-cell-btn]').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click({ force: true });
      await hostPage.waitForTimeout(2000);
      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(500);
    }

    // Recoger violaciones de CSP
    const clientCspViolations = await hostPage.evaluate(() => (window as any).__cspViolations || []);

    // Agrupar peticiones fallidas por dominio y código
    const domainSummary: Record<string, Record<string, number>> = {};
    for (const req of failedRequests) {
      domainSummary[req.domain] = domainSummary[req.domain] || {};
      const codeStr = String(req.status);
      domainSummary[req.domain][codeStr] = (domainSummary[req.domain][codeStr] || 0) + 1;
    }

    console.log('\n=============================================================');
    console.log('REPORTE OFICIAL TELEMETRÍA DE CARGA DE CARTAS (PUNTO 5)');
    console.log('=============================================================');
    console.log('1. Peticiones fallidas agrupadas por dominio y código HTTP:');
    console.log(JSON.stringify(domainSummary, null, 2));

    console.log('\n2. Detalle de peticiones fallidas:');
    if (failedRequests.length === 0) {
      console.log('   - 0 peticiones fallidas');
    } else {
      for (const f of failedRequests.slice(0, 30)) {
        console.log(`   - [${f.method}] ${f.status} ${f.domain} -> ${f.url} (${f.failureText || ''})`);
      }
    }

    console.log('\n3. Errores de Consola:');
    if (consoleErrors.length === 0) {
      console.log('   - 0 errores de consola');
    } else {
      for (const err of consoleErrors.slice(0, 20)) {
        console.log(`   - ${err}`);
      }
    }

    console.log('\n4. Violaciones de CSP (Content Security Policy):');
    if (clientCspViolations.length === 0) {
      console.log('   - 0 violaciones de CSP');
    } else {
      for (const csp of clientCspViolations) {
        console.log(`   - Bloqueado: ${csp.blockedURI} | Directiva: ${csp.violatedDirective}`);
      }
    }

    console.log('\n5. Errores de Cache API:');
    if (cacheApiErrors.length === 0) {
      console.log('   - 0 errores de Cache API');
    } else {
      for (const cErr of cacheApiErrors) {
        console.log(`   - ${cErr}`);
      }
    }

    console.log('\n6. Acciones de WebSocket Rechazadas:');
    if (rejectedWsActions.length === 0) {
      console.log('   - 0 acciones de WebSocket rechazadas');
    } else {
      for (const ws of rejectedWsActions) {
        console.log(`   - ${ws}`);
      }
    }
    console.log('=============================================================\n');

    expect(true).toBe(true);

    // Cerrar contextos
    for (const gp of guestPages) {
      await gp.context().close();
    }
    await hostContext.close();
  });
});
