import test from 'node:test';
import assert from 'node:assert';
import { PasswordService } from '../src/services/password.service.js';

test('B2 Benchmark: 10 concurrent logins with scrypt and concurrency limiting', async () => {
  console.log('\n--- B2 Benchmark: 10 Concurrent Logins with scrypt ---');
  
  // 1. Prepare 10 test passwords and pre-hashed credentials
  const passwords = Array.from({ length: 10 }, (_, i) => `SecurePassword_Commander_${i}_!@#$`);
  const hashes = await Promise.all(passwords.map(p => PasswordService.hash(p)));

  // Verify format
  for (const h of hashes) {
    assert.ok(h.startsWith('$scrypt$N=16384,r=8,p=1$'), `Invalid hash format: ${h}`);
  }

  // Measure initial memory
  if (global.gc) global.gc();
  const initialMemory = process.memoryUsage();
  let peakRss = initialMemory.rss;
  let peakHeap = initialMemory.heapUsed;

  const memInterval = setInterval(() => {
    const current = process.memoryUsage();
    if (current.rss > peakRss) peakRss = current.rss;
    if (current.heapUsed > peakHeap) peakHeap = current.heapUsed;
  }, 10);

  const startTime = performance.now();

  // 2. Launch 10 simultaneous login verifications
  const verificationResults = await Promise.all(
    passwords.map((p, i) => PasswordService.verify(p, hashes[i]!))
  );

  const endTime = performance.now();
  clearInterval(memInterval);

  const finalMemory = process.memoryUsage();
  const totalDurationMs = endTime - startTime;
  const avgDurationPerLogin = totalDurationMs / 10;
  const memoryRssDeltaMb = (peakRss - initialMemory.rss) / (1024 * 1024);
  const memoryHeapDeltaMb = (peakHeap - initialMemory.heapUsed) / (1024 * 1024);

  // Assert all 10 verified successfully
  assert.strictEqual(verificationResults.length, 10);
  assert.ok(verificationResults.every(r => r === true), 'All 10 passwords must verify successfully');

  console.log(`[B2 Benchmark Results]:`);
  console.log(`  Total time for 10 concurrent logins: ${totalDurationMs.toFixed(2)} ms`);
  console.log(`  Average time per login:              ${avgDurationPerLogin.toFixed(2)} ms`);
  console.log(`  Initial RSS:                         ${(initialMemory.rss / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Peak RSS during 10 concurrent ops:   ${(peakRss / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  RSS Delta (Memory Peak Overhead):    ${memoryRssDeltaMb.toFixed(2)} MB`);
  console.log(`  Initial Heap Used:                   ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Peak Heap Used:                      ${(peakHeap / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Heap Delta:                          ${memoryHeapDeltaMb.toFixed(2)} MB`);
  console.log(`------------------------------------------------------\n`);

  // Safety checks:
  // RSS delta should be strictly under 100 MB (with 3 concurrent max * 16 MB = ~48 MB expected)
  assert.ok(memoryRssDeltaMb < 100, `Memory spike too high: ${memoryRssDeltaMb} MB`);
});
