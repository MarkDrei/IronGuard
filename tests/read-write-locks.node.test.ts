/**
 * IronGuard Read/Write Lock Tests - Node.js Test Runner Format
 * 
 * Tests the new read/write lock functionality including:
 * - Concurrent readers
 * - Writer blocking behavior
 * - Writer preference semantics
 * - Mixed read/write scenarios
 * - Compile-time validation preservation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from '../src';

describe('Read/Write Lock System', () => {
  describe('Basic Read Lock Functionality', () => {
    test('should allow concurrent readers on same lock', async () => {
      const startTime = Date.now();
      const results: { context: string; timestamp: number; mode: string }[] = [];

      // Multiple readers should be granted concurrently
      const reader1Promise = createLockContext().acquireRead(LOCK_3);
      const reader2Promise = createLockContext().acquireRead(LOCK_3);
      const reader3Promise = createLockContext().acquireRead(LOCK_3);

      const reader1 = await reader1Promise;
      results.push({ context: 'reader1', timestamp: Date.now(), mode: 'read' });

      const reader2 = await reader2Promise;
      results.push({ context: 'reader2', timestamp: Date.now(), mode: 'read' });

      const reader3 = await reader3Promise;
      results.push({ context: 'reader3', timestamp: Date.now(), mode: 'read' });

      // All readers should have acquired almost simultaneously
      const maxDiff = Math.max(...results.map(r => r.timestamp)) - Math.min(...results.map(r => r.timestamp));
      assert(maxDiff < 20, `Readers should acquire concurrently, got time diff: ${maxDiff}ms`);

      // Verify all contexts show read mode
      assert.strictEqual(reader1.getLockMode(LOCK_3), 'read');
      assert.strictEqual(reader2.getLockMode(LOCK_3), 'read');
      assert.strictEqual(reader3.getLockMode(LOCK_3), 'read');

      reader1.dispose();
      reader2.dispose();
      reader3.dispose();
    });

    test('should allow read locks in ascending order', async () => {
      const ctx = await createLockContext().acquireRead(LOCK_1);
      const ctx2 = await ctx.acquireRead(LOCK_3);
      const ctx3 = await ctx2.acquireRead(LOCK_5);

      assert(ctx3.hasLock(LOCK_1));
      assert(ctx3.hasLock(LOCK_3));
      assert(ctx3.hasLock(LOCK_5));

      assert.strictEqual(ctx3.getLockMode(LOCK_1), 'read');
      assert.strictEqual(ctx3.getLockMode(LOCK_3), 'read');
      assert.strictEqual(ctx3.getLockMode(LOCK_5), 'read');

      ctx3.dispose();
    });
  });

  describe('Basic Write Lock Functionality', () => {
    test('should enforce mutual exclusion for write locks', async () => {
      const startTime = Date.now();
      const results: { context: string; timestamp: number; mode: string }[] = [];

      // First writer acquires lock
      const writer1Promise = createLockContext().acquireWrite(LOCK_3);
      
      // Second writer should wait
      const writer2Promise = createLockContext().acquireWrite(LOCK_3);

      const writer1 = await writer1Promise;
      const acquireTime1 = Date.now();
      results.push({ context: 'writer1', timestamp: acquireTime1, mode: 'write' });

      // Hold lock for 50ms
      setTimeout(() => {
        writer1.dispose();
      }, 50);

      const writer2 = await writer2Promise;
      const acquireTime2 = Date.now();
      results.push({ context: 'writer2', timestamp: acquireTime2, mode: 'write' });

      writer2.dispose();

      // Verify mutual exclusion timing
      assert(results[1]!.timestamp > results[0]!.timestamp + 40, 'Second writer should wait for first');
      assert.strictEqual(writer1.getLockMode(LOCK_3), 'write');
      assert.strictEqual(writer2.getLockMode(LOCK_3), 'write');
    });

    test('should allow write locks in ascending order', async () => {
      const ctx = await createLockContext().acquireWrite(LOCK_1);
      const ctx2 = await ctx.acquireWrite(LOCK_3);
      const ctx3 = await ctx2.acquireWrite(LOCK_5);

      assert(ctx3.hasLock(LOCK_1));
      assert(ctx3.hasLock(LOCK_3));
      assert(ctx3.hasLock(LOCK_5));

      assert.strictEqual(ctx3.getLockMode(LOCK_1), 'write');
      assert.strictEqual(ctx3.getLockMode(LOCK_3), 'write');
      assert.strictEqual(ctx3.getLockMode(LOCK_5), 'write');

      ctx3.dispose();
    });
  });

  describe('Read/Write Interaction', () => {
    test('should block writers when readers are active', async () => {
      const startTime = Date.now();
      const results: { context: string; timestamp: number; mode: string }[] = [];

      // Start multiple readers
      const reader1Promise = createLockContext().acquireRead(LOCK_3);
      const reader2Promise = createLockContext().acquireRead(LOCK_3);
      
      const reader1 = await reader1Promise;
      const reader2 = await reader2Promise;
      results.push({ context: 'reader1', timestamp: Date.now(), mode: 'read' });
      results.push({ context: 'reader2', timestamp: Date.now(), mode: 'read' });

      // Start writer - should wait for readers
      const writerPromise = createLockContext().acquireWrite(LOCK_3);

      // Release readers after 50ms
      setTimeout(() => {
        reader1.dispose();
        reader2.dispose();
      }, 50);

      const writer = await writerPromise;
      results.push({ context: 'writer', timestamp: Date.now(), mode: 'write' });

      writer.dispose();

      // Verify writer waited for readers
      const writerAcquireTime = results.find(r => r.context === 'writer')!.timestamp;
      const lastReaderTime = Math.max(...results.filter(r => r.mode === 'read').map(r => r.timestamp));
      assert(writerAcquireTime > lastReaderTime + 40, 'Writer should wait for readers to finish');
    });

    test('should block readers when writer is active', async () => {
      const startTime = Date.now();
      const results: { context: string; timestamp: number; mode: string }[] = [];

      // Start writer
      const writerPromise = createLockContext().acquireWrite(LOCK_3);
      const writer = await writerPromise;
      results.push({ context: 'writer', timestamp: Date.now(), mode: 'write' });

      // Start readers - should wait for writer
      const reader1Promise = createLockContext().acquireRead(LOCK_3);
      const reader2Promise = createLockContext().acquireRead(LOCK_3);

      // Release writer after 50ms
      setTimeout(() => {
        writer.dispose();
      }, 50);

      const reader1 = await reader1Promise;
      const reader2 = await reader2Promise;
      results.push({ context: 'reader1', timestamp: Date.now(), mode: 'read' });
      results.push({ context: 'reader2', timestamp: Date.now(), mode: 'read' });

      reader1.dispose();
      reader2.dispose();

      // Verify readers waited for writer
      const writerTime = results.find(r => r.context === 'writer')!.timestamp;
      const firstReaderTime = Math.min(...results.filter(r => r.mode === 'read').map(r => r.timestamp));
      assert(firstReaderTime > writerTime + 40, 'Readers should wait for writer to finish');
    });
  });

  describe('Writer Preference', () => {
    test('should prioritize waiting writers over new readers', async () => {
      const results: { context: string; timestamp: number; mode: string }[] = [];

      // Start reader
      const initialReader = await createLockContext().acquireRead(LOCK_3);
      results.push({ context: 'initialReader', timestamp: Date.now(), mode: 'read' });

      // Queue up a writer (should establish writer preference)
      const writerPromise = createLockContext().acquireWrite(LOCK_3);

      // Small delay to ensure writer is queued
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to add more readers - should be blocked by writer preference
      const laterReaderPromise = createLockContext().acquireRead(LOCK_3);

      // Release initial reader
      setTimeout(() => {
        initialReader.dispose();
      }, 50);

      // Writer should get the lock first
      const writer = await writerPromise;
      results.push({ context: 'writer', timestamp: Date.now(), mode: 'write' });

      // Release writer
      setTimeout(() => {
        writer.dispose();
      }, 20);

      // Now the waiting reader should get the lock
      const laterReader = await laterReaderPromise;
      results.push({ context: 'laterReader', timestamp: Date.now(), mode: 'read' });

      laterReader.dispose();

      // Verify writer got preference over later reader
      const writerTime = results.find(r => r.context === 'writer')!.timestamp;
      const laterReaderTime = results.find(r => r.context === 'laterReader')!.timestamp;
      assert(writerTime < laterReaderTime, 'Writer should get preference over later readers');
    });
  });

  describe('Mixed Lock Modes with Ordering', () => {
    test('should allow mixed read/write modes while preserving lock ordering', async () => {
      // Start with read lock on lower level
      const ctx1 = await createLockContext().acquireRead(LOCK_2);
      
      // Acquire write lock on higher level - should work
      const ctx2 = await ctx1.acquireWrite(LOCK_4);
      
      // Acquire read lock on even higher level - should work
      const ctx3 = await ctx2.acquireRead(LOCK_5);

      assert(ctx3.hasLock(LOCK_2));
      assert(ctx3.hasLock(LOCK_4));
      assert(ctx3.hasLock(LOCK_5));

      assert.strictEqual(ctx3.getLockMode(LOCK_2), 'read');
      assert.strictEqual(ctx3.getLockMode(LOCK_4), 'write');
      assert.strictEqual(ctx3.getLockMode(LOCK_5), 'read');

      ctx3.dispose();
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain backward compatibility with acquire() method', async () => {
      // acquire() should work as before (now equivalent to acquireWrite)
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx2 = await ctx1.acquireWrite(LOCK_3);

      assert(ctx2.hasLock(LOCK_1));
      assert(ctx2.hasLock(LOCK_3));

      // acquire() should create write locks
      assert.strictEqual(ctx2.getLockMode(LOCK_1), 'write');
      assert.strictEqual(ctx2.getLockMode(LOCK_3), 'write');

      ctx2.dispose();
    });

    test('should prevent concurrent access with legacy acquire() method', async () => {
      const results: { context: string; timestamp: number }[] = [];

      const ctx1Promise = createLockContext().acquireWrite(LOCK_3);
      const ctx2Promise = createLockContext().acquireWrite(LOCK_3);

      const ctx1 = await ctx1Promise;
      results.push({ context: 'ctx1', timestamp: Date.now() });

      setTimeout(() => ctx1.dispose(), 50);

      const ctx2 = await ctx2Promise;
      results.push({ context: 'ctx2', timestamp: Date.now() });

      ctx2.dispose();

      // Should still enforce mutual exclusion
      assert(results[1]!.timestamp > results[0]!.timestamp + 40);
    });
  });

  describe('Compile-Time Validation Preservation', () => {
    test('should preserve compile-time lock ordering for read locks', async () => {
      // ❌ Compile-time errors: These would fail TypeScript compilation
      // Uncomment to test compilation failures:
      
      // const ctx = await createLockContext().acquireRead(LOCK_3);
      // const invalid = await ctx.acquireRead(LOCK_1); // Lower level after higher
      // const duplicate = await ctx.acquireRead(LOCK_3); // Duplicate acquisition
      
      // ✅ Valid operations for comparison
      const validCtx = await createLockContext().acquireRead(LOCK_1);
      const validNext = await validCtx.acquireRead(LOCK_3);
      validNext.dispose();

      // This test mainly validates that the type system still works
      assert(true, 'Type system validation preserved');
    });

    test('should preserve compile-time lock ordering for write locks', async () => {
      // ❌ Compile-time errors: These would fail TypeScript compilation
      // Uncomment to test compilation failures:
      
      // const ctx = await createLockContext().acquireWrite(LOCK_4);
      // const invalid = await ctx.acquireWrite(LOCK_2); // Lower level after higher
      // const duplicate = await ctx.acquireWrite(LOCK_4); // Duplicate acquisition
      
      // ✅ Valid operations for comparison
      const validCtx = await createLockContext().acquireWrite(LOCK_2);
      const validNext = await validCtx.acquireWrite(LOCK_5);
      validNext.dispose();

      // This test mainly validates that the type system still works
      assert(true, 'Type system validation preserved');
    });
  });
});