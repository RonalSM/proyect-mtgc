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

test('BulkSyncService - date check skips redownload if rulings file has not changed (Punto 5 / REQ-7.28)', async () => {
  // Simular que ya se sincronizó con fecha ISO previa
  const mockUpdatedAt = '2026-10-19T09:00:00.000Z';
  bulkSyncService.setLastRulingsUpdatedAt(mockUpdatedAt);
  assert.strictEqual(bulkSyncService.getLastRulingsUpdatedAt(), mockUpdatedAt);

  // Interceptar o verificar skip de descarga si la fecha coincide
  // Mock global fetch para simular respuesta del catálogo bulk-data
  const originalFetch = globalThis.fetch;
  try {
    let downloadUriFetched = false;
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/bulk-data')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                type: 'rulings',
                updated_at: mockUpdatedAt, // Misma fecha -> debe omitir descarga
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
    assert.strictEqual(downloadUriFetched, false, 'No debió descargar el archivo bulk porque la fecha no cambió');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

