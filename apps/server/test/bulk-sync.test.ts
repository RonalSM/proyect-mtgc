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
