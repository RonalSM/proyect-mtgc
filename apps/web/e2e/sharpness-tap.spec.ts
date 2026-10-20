import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = path.resolve(
  'C:/Users/Nero.PC-Neroz/.gemini/antigravity/brain/dec05a18-4c5a-4614-86d9-f6343dc854aa',
);

// Helper para crear sala, unir 2 jugadores, completar mulligan y colocar carta en mesa
async function setupGameWithBattlefieldCard(browser: any, deviceScaleFactor = 1) {
  const hostContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor,
  });
  const hostPage = await hostContext.newPage();

  const guestContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor,
  });
  const guestPage = await guestContext.newPage();

  const pages = [hostPage, guestPage];

  // 1. Host crea la mesa
  await hostPage.goto('http://localhost:3000');
  await expect(hostPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });

  await hostPage.fill(
    'input[placeholder="Ej. Pod Casual 4 Jugadores"]',
    `Sharpness Pod DPR${deviceScaleFactor}`,
  );
  await hostPage.fill('input[placeholder="Ej. Planeswalker 1"]', 'Alice (Host)');
  await hostPage.selectOption('select', '2');
  await hostPage.click('button:has-text("Crear Mesa y Obtener Código")');

  const roomCodeButton = hostPage.locator('button:has-text("Código:")').first();
  await expect(roomCodeButton).toBeVisible({ timeout: 15000 });
  const roomCodeText = await roomCodeButton.innerText();
  const match = roomCodeText.match(/Código:\s*([A-Z0-9]{6})/);
  const roomCode = match ? match[1] : '';

  // Host mazo
  await hostPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const importTab = hostPage.locator('button:has-text("Importar Lista de Texto")');
  if (await importTab.isVisible()) {
    await importTab.click();
  } else {
    await hostPage.click('button:has-text("Importar mi primer mazo")');
  }
  await hostPage.fill(
    'textarea',
    `// Comandante\n1 Sol Ring *CMDR*\n\n// Mazo\n1 Arcane Signet\n1 Command Tower\n10 Plains\n10 Island\n10 Swamp\n10 Forest\n10 Mountain`,
  );
  await hostPage.click('button:has-text("Validar lista")');
  await hostPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await hostPage.click('button:has-text("Marcarme Listo")');

  // Guest en segundo context
  await guestPage.goto('http://localhost:3000');
  await expect(guestPage.locator('text=Servidor en línea')).toBeVisible({ timeout: 15000 });
  await guestPage.click('button:has-text("Unirse con Código")');
  await guestPage.fill('input[placeholder="EJ: 5HQWNJ"]', roomCode);
  await guestPage.fill('input[placeholder="Ej. Jugador Invitado"]', 'Bob (Guest)');
  await guestPage.click('button:has-text("Entrar a la Mesa")');

  await guestPage.click('button:has-text("Seleccionar / Importar Mazo")');
  const guestImportTab = guestPage.locator('button:has-text("Importar Lista de Texto")');
  if (await guestImportTab.isVisible()) {
    await guestImportTab.click();
  } else {
    await guestPage.click('button:has-text("Importar mi primer mazo")');
  }
  await guestPage.fill(
    'textarea',
    `// Comandante\n1 Sol Ring *CMDR*\n\n// Mazo\n1 Arcane Signet\n1 Command Tower\n10 Plains\n10 Island\n10 Swamp\n10 Forest\n10 Mountain`,
  );
  await guestPage.click('button:has-text("Validar lista")');
  await guestPage.click('button:has-text("Usar este Mazo en la Mesa")');
  await guestPage.click('button:has-text("Marcarme Listo")');

  // Start game
  const startBtn = hostPage.locator('button:has-text("INICIAR PARTIDA")');
  await expect(startBtn).toBeEnabled({ timeout: 10000 });
  await startBtn.click();

  // Mulligan secuencial para ambos jugadores
  await expect(hostPage.locator('[data-testid="opening-hand-modal"]')).toBeVisible({
    timeout: 25000,
  });
  for (let step = 0; step < 2; step++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let clicked = false;
      for (const p of pages) {
        const keepBtn = p.locator('[data-testid="keep-btn"]');
        if (await keepBtn.isVisible().catch(() => false)) {
          if (await keepBtn.isEnabled().catch(() => false)) {
            await keepBtn.click();
            clicked = true;
            await p.waitForTimeout(500);
            break;
          }
        }
      }
      if (clicked) break;
      await hostPage.waitForTimeout(300);
    }
  }

  // Esperar a que la mesa esté activa
  await expect(hostPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await expect(guestPage.locator('#mesa-total')).toBeVisible({ timeout: 15000 });
  await hostPage.waitForTimeout(1000);

  // Enviar una carta de la mano al campo de batalla con clic derecho -> Enviar a Mesa
  const handCard = hostPage.locator('[data-from-zone="hand"]').first();
  await handCard.waitFor({ state: 'visible', timeout: 10000 });
  await handCard.click({ button: 'right', force: true });
  await hostPage
    .locator('[data-testid="context-to-battlefield"]')
    .waitFor({ state: 'visible', timeout: 5000 });
  await hostPage.locator('[data-testid="context-to-battlefield"]').click();
  await hostPage.waitForTimeout(1000);

  // Esperar a que la carta esté en el campo
  const bfCard = hostPage.locator('[data-battlefield-card="true"]').first();
  await expect(bfCard).toBeVisible({ timeout: 10000 });

  return { hostPage, guestPage, hostContext, guestContext, bfCard };
}

test.describe('Punto 1: Medición de Nitidez de Carta Girada vs Enderezada (Varianza del Laplaciano)', () => {
  test('Verificar nitidez con devicePixelRatio 1 y 2 (>= 90% de la enderezada)', async ({
    browser,
  }) => {
    test.setTimeout(240000);

    const results: {
      dpr: number;
      untappedVariance: number;
      tappedVariance: number;
      sharpnessRatio: number;
    }[] = [];

    for (const dpr of [1, 2]) {
      console.log(`\n--- Iniciando medición con devicePixelRatio = ${dpr} ---`);
      const { hostPage, hostContext, guestContext, bfCard } = await setupGameWithBattlefieldCard(
        browser,
        dpr,
      );

      try {
        // Asegurar que la imagen de la carta esté completamente cargada (naturalWidth > 0)
        const img = bfCard.locator('img');
        await expect(img).toBeVisible({ timeout: 10000 });
        await hostPage.waitForFunction(
          () => {
            const cardImg = document.querySelector(
              '[data-battlefield-card="true"] img',
            ) as HTMLImageElement;
            return cardImg && cardImg.complete && cardImg.naturalWidth > 0;
          },
          { timeout: 15000 },
        );

        // Esperar reposo
        await hostPage.waitForTimeout(600);

        // 1. Capturar screenshot del cuerpo rotador de la carta enderezada
        const rotator = bfCard.locator('[data-card-rotator="true"]').first();
        const untappedBuffer = await rotator.screenshot();

        // 2. Medir varianza del Laplaciano en el navegador
        const untappedVariance = await hostPage.evaluate(async base64 => {
          return new Promise<number>(resolve => {
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(image, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const { width, height, data } = imgData;

              // Convertir a escala de grises
              const gray = new Float32Array(width * height);
              for (let i = 0; i < width * height; i++) {
                const idx = i * 4;
                gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              }

              // Kernel Laplaciano 3x3:
              // [ 0,  1,  0 ]
              // [ 1, -4,  1 ]
              // [ 0,  1,  0 ]
              let sum = 0;
              let count = 0;
              const laplacian = new Float32Array((width - 2) * (height - 2));

              for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                  const val =
                    gray[(y - 1) * width + x] +
                    gray[(y + 1) * width + x] +
                    gray[y * width + (x - 1)] +
                    gray[y * width + (x + 1)] -
                    4 * gray[y * width + x];
                  laplacian[count] = val;
                  sum += val;
                  count++;
                }
              }

              const mean = sum / count;
              let varSum = 0;
              for (let i = 0; i < count; i++) {
                const diff = laplacian[i] - mean;
                varSum += diff * diff;
              }
              resolve(varSum / count);
            };
            image.src = 'data:image/png;base64,' + base64;
          });
        }, untappedBuffer.toString('base64'));

        // 3. Girar la carta mediante doble clic
        await bfCard.dblclick();

        // Esperar a que complete la transición de 180ms y se asiente
        await expect(bfCard).toHaveAttribute('data-tapped', 'true', { timeout: 5000 });
        await hostPage.waitForTimeout(600);

        // 4. Capturar screenshot de la carta girada
        const tappedBuffer = await rotator.screenshot();

        // 5. Medir varianza del Laplaciano de la carta girada
        const tappedVariance = await hostPage.evaluate(async base64 => {
          return new Promise<number>(resolve => {
            const image = new Image();
            image.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext('2d')!;
              ctx.drawImage(image, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const { width, height, data } = imgData;

              // Convertir a escala de grises
              const gray = new Float32Array(width * height);
              for (let i = 0; i < width * height; i++) {
                const idx = i * 4;
                gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              }

              // Kernel Laplaciano 3x3
              let sum = 0;
              let count = 0;
              const laplacian = new Float32Array((width - 2) * (height - 2));

              for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                  const val =
                    gray[(y - 1) * width + x] +
                    gray[(y + 1) * width + x] +
                    gray[y * width + (x - 1)] +
                    gray[y * width + (x + 1)] -
                    4 * gray[y * width + x];
                  laplacian[count] = val;
                  sum += val;
                  count++;
                }
              }

              const mean = sum / count;
              let varSum = 0;
              for (let i = 0; i < count; i++) {
                const diff = laplacian[i] - mean;
                varSum += diff * diff;
              }
              resolve(varSum / count);
            };
            image.src = 'data:image/png;base64,' + base64;
          });
        }, tappedBuffer.toString('base64'));

        const sharpnessRatio = tappedVariance / untappedVariance;
        console.log(`DPR ${dpr}:`);
        console.log(`  Varianza Laplaciano Enderezada = ${untappedVariance.toFixed(2)}`);
        console.log(`  Varianza Laplaciano Girada     = ${tappedVariance.toFixed(2)}`);
        console.log(
          `  Ratio de Nitidez (girada / enderezada) = ${(sharpnessRatio * 100).toFixed(2)}%`,
        );

        results.push({
          dpr,
          untappedVariance,
          tappedVariance,
          sharpnessRatio,
        });

        // 6. Generar capturas ampliadas al 200% (para DPR=1)
        if (dpr === 1) {
          const generateZoom200 = async (buffer: Buffer, outPath: string) => {
            const base64Zoom = await hostPage.evaluate(async base64 => {
              return new Promise<string>(resolve => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width * 2;
                  canvas.height = img.height * 2;
                  const ctx = canvas.getContext('2d')!;
                  ctx.imageSmoothingEnabled = false; // Nearest neighbor 200% zoom
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL('image/png').split(',')[1]);
                };
                img.src = 'data:image/png;base64,' + base64;
              });
            }, buffer.toString('base64'));

            fs.writeFileSync(outPath, Buffer.from(base64Zoom, 'base64'));
          };

          await generateZoom200(
            untappedBuffer,
            path.join(ARTIFACT_DIR, 'sharpness-untapped-200.png'),
          );
          await generateZoom200(tappedBuffer, path.join(ARTIFACT_DIR, 'sharpness-tapped-200.png'));
          console.log(`  Capturas 200% guardadas en ${ARTIFACT_DIR}`);
        }

        // Aserción requerida: la girada debe tener al menos el 90% de la nitidez de la enderezada
        expect(sharpnessRatio).toBeGreaterThanOrEqual(0.9);
      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    }

    console.log('\n=== Resumen de Medición de Nitidez ===');
    for (const r of results) {
      console.log(
        `DPR ${r.dpr}: Enderezada=${r.untappedVariance.toFixed(2)}, Girada=${r.tappedVariance.toFixed(2)}, Ratio=${(r.sharpnessRatio * 100).toFixed(2)}% (>= 90% SUPERADO)`,
      );
    }
  });
});
