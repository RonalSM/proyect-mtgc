// scripts/audit-accessibility-axe.js
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:4173';

function summarizeAxeResults(axeResult) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const violations = [];

  for (const v of axeResult.violations) {
    counts[v.impact] = (counts[v.impact] || 0) + 1;
    violations.push({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary
      }))
    });
  }

  return {
    ...counts,
    violations
  };
}

async function runA11yAudit() {
  console.log(`[A11Y] Starting axe-core accessibility audit against ${TARGET_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const auditResults = {
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    screens: {}
  };

  try {
    // 1. Landing page
    console.log('[A11Y] Auditing Screen 1: Landing / Home Page...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const landingAxe = await new AxeBuilder({ page }).analyze();
    auditResults.screens.landing = summarizeAxeResults(landingAxe);
    console.log(`[A11Y] Screen 1 (Landing): Critical=${auditResults.screens.landing.critical}, Serious=${auditResults.screens.landing.serious}`);

    // 2. Open Create Room Modal
    console.log('[A11Y] Auditing Screen 2: Create Room Modal...');
    const createBtn = page.getByRole('button', { name: /Crear Nueva Mesa|Crear Mesa/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);
      const modalAxe = await new AxeBuilder({ page }).analyze();
      auditResults.screens.createRoomModal = summarizeAxeResults(modalAxe);
      console.log(`[A11Y] Screen 2 (Create Modal): Critical=${auditResults.screens.createRoomModal.critical}, Serious=${auditResults.screens.createRoomModal.serious}`);

      const cancelBtn = page.getByRole('button', { name: /Cancelar|Cerrar/i }).first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(300);
    }

    // 3. Open Join Room Modal
    console.log('[A11Y] Auditing Screen 3: Join Room Modal...');
    const joinBtn = page.getByRole('button', { name: /Unirse con Código/i }).first();
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      await page.waitForTimeout(500);
      const joinModalAxe = await new AxeBuilder({ page }).analyze();
      auditResults.screens.joinRoomModal = summarizeAxeResults(joinModalAxe);
      console.log(`[A11Y] Screen 3 (Join Modal): Critical=${auditResults.screens.joinRoomModal.critical}, Serious=${auditResults.screens.joinRoomModal.serious}`);

      const cancelBtn = page.getByRole('button', { name: /Cancelar|Cerrar/i }).first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(300);
    }

    // 4. Open Deck Importer / Validator Modal
    console.log('[A11Y] Auditing Screen 4: Deck Importer / Validator Modal...');
    const importerBtn = page.getByRole('button', { name: /Validador de Mazos/i }).first();
    if (await importerBtn.isVisible()) {
      await importerBtn.click();
      await page.waitForTimeout(500);
      const importerAxe = await new AxeBuilder({ page }).analyze();
      auditResults.screens.deckImporterModal = summarizeAxeResults(importerAxe);
      console.log(`[A11Y] Screen 4 (Deck Importer): Critical=${auditResults.screens.deckImporterModal.critical}, Serious=${auditResults.screens.deckImporterModal.serious}`);

      const closeImporter = page.getByRole('button', { name: /Cerrar/i }).first();
      if (await closeImporter.isVisible()) await closeImporter.click();
      await page.waitForTimeout(300);
    }

    // 5. Preset Deck Details view
    console.log('[A11Y] Auditing Screen 5: Preset Deck Details...');
    const presetCard = page.locator('button, div').filter({ hasText: /Krenko, Mob Boss/i }).first();
    if (await presetCard.isVisible()) {
      await presetCard.click();
      await page.waitForTimeout(500);
      const presetDetailsAxe = await new AxeBuilder({ page }).analyze();
      auditResults.screens.presetDetails = summarizeAxeResults(presetDetailsAxe);
      console.log(`[A11Y] Screen 5 (Preset Details): Critical=${auditResults.screens.presetDetails.critical}, Serious=${auditResults.screens.presetDetails.serious}`);
    }

  } catch (err) {
    console.error('[A11Y] Error during audit flow:', err);
    auditResults.error = err.message;
  } finally {
    await browser.close();
  }

  // Summarize overall violations
  const summary = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    totalViolations: 0,
    violationDetails: []
  };

  for (const [screen, res] of Object.entries(auditResults.screens)) {
    summary.critical += res.critical;
    summary.serious += res.serious;
    summary.moderate += res.moderate;
    summary.minor += res.minor;
    summary.totalViolations += res.violations.length;

    for (const v of res.violations) {
      summary.violationDetails.push({
        screen,
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map(n => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary
        }))
      });
    }
  }

  auditResults.summary = summary;

  const outputPath = path.resolve(__dirname, '../auditoria-accesibilidad-axe.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n========================================`);
  console.log(`[A11Y] Axe-core Accessibility Audit Complete!`);
  console.log(`Saved report to: ${outputPath}`);
  console.log(`Overall Summary across all screens:`);
  console.log(`  CRITICAL: ${summary.critical} (TARGET: 0)`);
  console.log(`  SERIOUS:  ${summary.serious}`);
  console.log(`  MODERATE: ${summary.moderate}`);
  console.log(`  MINOR:    ${summary.minor}`);
  console.log(`  TOTAL:    ${summary.totalViolations}`);
  console.log(`========================================\n`);

  return auditResults;
}

runA11yAudit();
