import test from 'node:test';
import assert from 'node:assert';
import { bulkSyncService } from '../src/services/bulk-sync.service.js';

test('BulkSyncService - manages nightly cron job scheduling and status (Paso 2A.5 / REQ-18)', () => {
  assert.strictEqual(bulkSyncService.isCronActive(), false);

  // Start cron
  bulkSyncService.startNightlyCron(3);
  assert.strictEqual(bulkSyncService.isCronActive(), true);

  const status = bulkSyncService.getStatus();
  assert.strictEqual(status.nightlyCronActive, true);
  assert.strictEqual(status.isSyncing, false);

  // Stop cron
  bulkSyncService.stopNightlyCron();
  assert.strictEqual(bulkSyncService.isCronActive(), false);

  const statusAfterStop = bulkSyncService.getStatus();
  assert.strictEqual(statusAfterStop.nightlyCronActive, false);
});

test('BulkSyncService - rulings query and local cache (Punto 5 / REQ-7.28)', async () => {
  const testOracleId = 'test-oracle-sol-ring-123';

  // 1. Sin dictámenes registrados: devuelve array vacío
  const emptyRulings = await bulkSyncService.getRulingsByOracleId(testOracleId);
  assert.deepStrictEqual(emptyRulings, []);

  // 2. Poblar dictámenes locales
  bulkSyncService.setRulingsForOracleId(testOracleId, [
    {
      publishedAt: '2023-09-01',
      source: 'wotc',
      comment: '{T}: Add {C}{C}. Mana abilities do not use the stack.',
    },
  ]);

  const retrieved = await bulkSyncService.getRulingsByOracleId(testOracleId);
  assert.strictEqual(retrieved.length, 1);
  assert.strictEqual(retrieved[0].publishedAt, '2023-09-01');
  assert.strictEqual(retrieved[0].source, 'wotc');
  assert.ok(retrieved[0].comment.includes('Add {C}{C}'));
});

test('BulkSyncService - date check skips redownload ONLY if local data exists (Punto 5 / 6 / REQ-7.28)', async () => {
  // Asegurar que hay datos locales
  bulkSyncService.setRulingsForOracleId('test-existing-oracle', [
    { publishedAt: '2023-01-01', source: 'wotc', comment: 'Existing test ruling' },
  ]);

  // Simular que ya se sincronizó con fecha ISO previa
  const mockUpdatedAt = '2026-10-19T09:00:00.000Z';
  bulkSyncService.setLastRulingsUpdatedAt(mockUpdatedAt);
  assert.strictEqual(bulkSyncService.getLastRulingsUpdatedAt(), mockUpdatedAt);

  // Interceptar o verificar skip de descarga si la fecha coincide y hay datos
  const originalFetch = globalThis.fetch;
  try {
    let downloadUriFetched = false;
    globalThis.fetch = async (url: any, _init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/bulk-data')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                type: 'rulings',
                updated_at: mockUpdatedAt, // Misma fecha -> debe omitir descarga si hay datos
                download_uri: 'https://data.scryfall.io/rulings-test.json',
              },
            ],
          }),
        } as any;
      }
      if (urlStr.includes('rulings-test.json')) {
        downloadUriFetched = true;
      }
      return { ok: true, json: async () => [] } as any;
    };

    const res = await bulkSyncService.syncRulings();
    assert.strictEqual(res.skipped, true);
    assert.strictEqual(res.reason, 'not_modified');
    assert.strictEqual(
      downloadUriFetched,
      false,
      'No debió descargar el archivo bulk porque la fecha no cambió y hay datos',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('BulkSyncService - does NOT skip if local data is empty even if date matches (Punto 6)', async () => {
  // Nueva instancia limpia de BulkSyncService sin datos
  const { BulkSyncService } = await import('../src/services/bulk-sync.service.js');
  const freshService = new BulkSyncService();
  const mockUpdatedAt = '2026-10-20T09:00:00.000Z';
  freshService.setLastRulingsUpdatedAt(mockUpdatedAt);

  const originalFetch = globalThis.fetch;
  try {
    let downloadUriFetched = false;
    globalThis.fetch = async (url: any, _init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/bulk-data')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                type: 'rulings',
                updated_at: mockUpdatedAt,
                download_uri: 'https://data.scryfall.io/rulings-test.json',
              },
            ],
          }),
        } as any;
      }
      if (urlStr.includes('rulings-test.json')) {
        downloadUriFetched = true;
        return {
          ok: true,
          arrayBuffer: async () =>
            Buffer.from(
              JSON.stringify([
                {
                  oracle_id: 'test-card-1',
                  published_at: '2024-01-01',
                  comment: 'Sample ruling',
                  source: 'wotc',
                },
              ]),
            ),
        } as any;
      }
      return { ok: true, json: async () => [] } as any;
    };

    const res = await freshService.syncRulings();
    assert.strictEqual(res.skipped, false);
    assert.strictEqual(
      downloadUriFetched,
      true,
      'Debe descargar el archivo porque la tabla/memoria estaba vacía',
    );
    assert.strictEqual(res.syncedCount, 1);

    // Verificar que Sol Ring tiene sus dictámenes oficiales asegurados
    const solRulings = await freshService.getRulingsByOracleId(
      '6ad8011d-3471-4369-9d68-b264cc027487',
    );
    assert.ok(solRulings.length >= 2, 'Sol Ring debe tener al menos 2 dictámenes oficiales');
    assert.ok(solRulings.some(r => r.comment.includes('Mana abilities do not use the stack')));

    // Verificar que carta sin dictámenes devuelve array vacío sin romper
    const emptyRulings = await freshService.getRulingsByOracleId('plains-no-rulings-id');
    assert.deepStrictEqual(emptyRulings, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
