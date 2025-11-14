/**
 * IronGuard Core System Tests - Node.js Test Runner Format
 * 
 * Tests the fundamental locking system functionality including:
 * - Lock acquisition and ordering
 * - Mutual exclusion
 * - Compile-time validation examples
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_6, LOCK_7, LOCK_8, LOCK_9, LOCK_10, LOCK_11, LOCK_12, LOCK_13, LOCK_14, LOCK_15 } from '../src/core';

describe('IronGuard Core System', () => {
  describe('Basic Lock Operations', () => {
    test('should create empty lock context', async () => {
      const ctx = createLockContext();
      assert.deepStrictEqual(ctx.getHeldLocks(), []);
      
      // ✅ Compile-time valid: Empty context can acquire any lock
      // const ctx1 = await ctx.acquireWrite(LOCK_1);
      // const ctx3 = await ctx.acquireWrite(LOCK_3);
      // const ctx5 = await ctx.acquireWrite(LOCK_5);
    });

    test('should acquire single lock', async () => {
      const ctx = createLockContext();
      const withLock1 = await ctx.acquireWrite(LOCK_1);
      
      assert.deepStrictEqual(withLock1.getHeldLocks(), [1]);
      withLock1.dispose();
    });

    test('should acquire multiple locks in order', async () => {
      const ctx = createLockContext();
      const withLock1 = await ctx.acquireWrite(LOCK_1);
      const withLock1And3 = await withLock1.acquireWrite(LOCK_3);
      
      assert.deepStrictEqual(withLock1And3.getHeldLocks(), [1, 3]);
      withLock1And3.dispose();
      
      // ✅ Compile-time valid: Ascending order acquisition
      // const ctxA = await createLockContext().acquireWrite(LOCK_1);
      // const ctxA12 = await ctxA.acquireWrite(LOCK_2);
      // const ctxB = await createLockContext().acquireWrite(LOCK_2);
      // const ctxB24 = await ctxB.acquireWrite(LOCK_4);
    });

    test('should allow lock skipping', async () => {
      const ctx = createLockContext();
      const withLock1 = await ctx.acquireWrite(LOCK_1);
      const withLock1And5 = await withLock1.acquireWrite(LOCK_5);
      
      assert.deepStrictEqual(withLock1And5.getHeldLocks(), [1, 5]);
      withLock1And5.dispose();
      
      // ✅ Compile-time valid: Lock skipping patterns
      const ctxX = await createLockContext().acquireWrite(LOCK_1);
      const ctxX14 = await ctxX.acquireWrite(LOCK_4);
      const ctxY = await createLockContext().acquireWrite(LOCK_2);
      const ctxY25 = await ctxY.acquireWrite(LOCK_5);
      
      // Dispose all created contexts
      ctxX14.dispose();
      ctxY25.dispose();
    });

    test('should allow direct acquisition of any lock', async () => {
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      
      assert.deepStrictEqual(ctx3.getHeldLocks(), [3]);
      assert.deepStrictEqual(ctx5.getHeldLocks(), [5]);
      
      ctx3.dispose();
      ctx5.dispose();
    });
  });

  describe('Lock Ordering Validation', () => {
    test('should prevent acquiring lower level locks via compile-time', async () => {
      // This test demonstrates COMPILE-TIME prevention
      // The following would cause TypeScript compilation errors:
      // const ctxX = createLockContext();
      // const withLock3 = await ctxX.acquireWrite(LOCK_3);
      // const invalid = await withLock3.acquireWrite(LOCK_1);
      
      // ❌ Compile-time errors: Lock ordering violations
      // const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // const invalid1 = await ctx3.acquireWrite(LOCK_1);
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // const invalid2 = await ctx4.acquireWrite(LOCK_2);
      
      // Instead test that valid operations work
      const ctx = createLockContext();
      const withLock1 = await ctx.acquireWrite(LOCK_1);
      const withLock1And3 = await withLock1.acquireWrite(LOCK_3);
      assert.deepStrictEqual(withLock1And3.getHeldLocks(), [1, 3]);
      withLock1And3.dispose();
    });

    test('should prevent duplicate lock acquisition via compile-time', async () => {
      // This test demonstrates COMPILE-TIME prevention
      // The following would cause TypeScript compilation errors:
      // const ctxErr = createLockContext();
      // const withLock2Err = await ctxErr.acquireWrite(LOCK_2);
      // const duplicate = await withLock2Err.acquireWrite(LOCK_2);
      
      // ❌ Compile-time errors: Duplicate lock acquisition
      // const ctxDup1 = await createLockContext().acquireWrite(LOCK_1);
      // const duplicate1 = await ctxDup1.acquireWrite(LOCK_1);
      // const ctxDup3 = await createLockContext().acquireWrite(LOCK_3);
      // const duplicate3 = await ctxDup3.acquireWrite(LOCK_3);
      
      // Instead test that valid operations work
      const ctx = createLockContext();
      const withLock2 = await ctx.acquireWrite(LOCK_2);
      const withLock2And4 = await withLock2.acquireWrite(LOCK_4);
      assert.deepStrictEqual(withLock2And4.getHeldLocks(), [2, 4]);
      withLock2And4.dispose();
    });
  });

  describe('Mutual Exclusion', () => {
    test('should prevent concurrent access to same lock', async () => {
      const startTime = Date.now();
      
      // First context acquires lock 1
      const ctx1 = createLockContext();
      const lock1Promise1 = ctx1.acquireWrite(LOCK_1);
      
      // Second context tries to acquire lock 1 - should block
      const ctx2 = createLockContext();
      const lock1Promise2 = ctx2.acquireWrite(LOCK_1);
      
      const firstLock = await lock1Promise1;
      
      // Simulate some work with the lock
      setTimeout(() => {
        firstLock.dispose(); // Release lock after 50ms
      }, 50);
      
      const secondLock = await lock1Promise2;
      const endTime = Date.now();
      
      assert(endTime - startTime > 40, 'Should have waited for mutual exclusion');
      secondLock.dispose();
    });
  });

  describe('Lock Usage', () => {
    test('should allow using held locks', async () => {
      const ctx = createLockContext();
      const withLock2 = await ctx.acquireWrite(LOCK_2);
      
      let executed = false;
      withLock2.useLock(LOCK_2, () => {
        executed = true;
      });
      
      assert.strictEqual(executed, true);
      withLock2.dispose();
      
      // ✅ Compile-time valid: Using held locks
      // const ctxUse1 = await createLockContext().acquireWrite(LOCK_1);
      // ctxUse1.useLock(LOCK_1, () => console.log('Using lock 1'));
      // const ctxUse13 = await ctxUse1.acquireWrite(LOCK_3);
      // ctxUse13.useLock(LOCK_3, () => console.log('Using lock 3'));
    });

    test('should prevent using non-held locks via compile-time', async () => {
      // This test demonstrates COMPILE-TIME prevention
      // The following would cause TypeScript compilation errors:
      // const ctxBad = createLockContext();
      // const withLock1Bad = await ctxBad.acquireWrite(LOCK_1);
      // withLock1Bad.useLock(LOCK_3, () => {});
      
      // ❌ Compile-time errors: Using non-held locks
      // createLockContext().useLock(LOCK_1, () => {});
      // const ctxErr1 = await createLockContext().acquireWrite(LOCK_1);
      // ctxErr1.useLock(LOCK_2, () => {});
      // const ctxErr2 = await createLockContext().acquireWrite(LOCK_2);
      // ctxErr2.useLock(LOCK_4, () => {});
      
      // Instead test that valid operations work
      const ctx = createLockContext();
      const withLock1 = await ctx.acquireWrite(LOCK_1);
      let executed = false;
      withLock1.useLock(LOCK_1, () => { executed = true; });
      assert.strictEqual(executed, true);
      withLock1.dispose();
    });
  });

  describe('High Lock Levels (6-15) Core Operations', () => {
    test('should support basic operations with high locks', async () => {
      // Test basic acquire/dispose cycle with high locks
      const ctx9 = await createLockContext().acquireWrite(LOCK_9);
      assert.deepStrictEqual(ctx9.getHeldLocks(), [9]);
      assert.ok(ctx9.hasLock(LOCK_9));
      assert.ok(!ctx9.hasLock(LOCK_10));
      ctx9.dispose();

      const ctx14 = await createLockContext().acquireWrite(LOCK_14);
      assert.deepStrictEqual(ctx14.getHeldLocks(), [14]);
      ctx14.dispose();
    });

    test('should support lock usage with high locks', async () => {
      const ctx11 = await createLockContext().acquireWrite(LOCK_11);
      
      let executed = false;
      ctx11.useLock(LOCK_11, () => {
        executed = true;
      });
      
      assert.strictEqual(executed, true);
      ctx11.dispose();
    });

    test('should display high locks in toString', async () => {
      const ctx = await createLockContext().acquireWrite(LOCK_7);
      const ctxMulti = await ctx.acquireWrite(LOCK_13);
      
      const str = ctxMulti.toString();
      assert.ok(str.includes('7'), 'Should show LOCK_7 in string representation');
      assert.ok(str.includes('13'), 'Should show LOCK_13 in string representation');
      ctxMulti.dispose();
    });

    test('should support progressive acquisition to high locks', async () => {
      // Test a long chain: 1 → 3 → 6 → 9 → 12 → 15
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx13 = await ctx1.acquireWrite(LOCK_3);
      const ctx136 = await ctx13.acquireWrite(LOCK_6);
      const ctx1369 = await ctx136.acquireWrite(LOCK_9);
      const ctx136912 = await ctx1369.acquireWrite(LOCK_12);
      const ctx13691215 = await ctx136912.acquireWrite(LOCK_15);
      
      assert.deepStrictEqual(ctx13691215.getHeldLocks(), [1, 3, 6, 9, 12, 15]);
      
      // Test that all locks are properly held
      assert.ok(ctx13691215.hasLock(LOCK_1));
      assert.ok(ctx13691215.hasLock(LOCK_3));
      assert.ok(ctx13691215.hasLock(LOCK_6));
      assert.ok(ctx13691215.hasLock(LOCK_9));
      assert.ok(ctx13691215.hasLock(LOCK_12));
      assert.ok(ctx13691215.hasLock(LOCK_15));
      
      // Test that non-held locks return false
      assert.ok(!ctx13691215.hasLock(LOCK_2));
      assert.ok(!ctx13691215.hasLock(LOCK_7));
      assert.ok(!ctx13691215.hasLock(LOCK_11));
      
      ctx13691215.dispose();
    });
  });

  describe('Individual Lock Release', () => {
    test('should release a single lock from middle of chain', async () => {
      // Acquire locks 1, 2, 3
      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));
      
      assert.deepStrictEqual(ctx123.getHeldLocks(), [1, 2, 3]);
      
      // Release lock 2 (middle lock)
      const ctx13 = ctx123.releaseLock(LOCK_2);
      assert.deepStrictEqual(ctx13.getHeldLocks(), [1, 3]);
      assert.ok(ctx13.hasLock(LOCK_1));
      assert.ok(!ctx13.hasLock(LOCK_2));
      assert.ok(ctx13.hasLock(LOCK_3));
      
      ctx13.dispose();
    });

    test('should release last lock in chain', async () => {
      // Acquire locks 1, 2, 3
      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));
      
      // Release lock 3 (last lock)
      const ctx12 = ctx123.releaseLock(LOCK_3);
      assert.deepStrictEqual(ctx12.getHeldLocks(), [1, 2]);
      
      ctx12.dispose();
    });

    test('should release first lock in chain', async () => {
      // Acquire locks 1, 2, 3
      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));
      
      // Release lock 1 (first lock)
      const ctx23 = ctx123.releaseLock(LOCK_1);
      assert.deepStrictEqual(ctx23.getHeldLocks(), [2, 3]);
      
      ctx23.dispose();
    });

    test('should support temporary lock elevation pattern', async () => {
      // Start with locks 1, 2, 3
      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));
      
      assert.deepStrictEqual(ctx123.getHeldLocks(), [1, 2, 3]);
      
      // Temporarily acquire lock 4
      const ctx1234 = await ctx123.acquireWrite(LOCK_4);
      assert.deepStrictEqual(ctx1234.getHeldLocks(), [1, 2, 3, 4]);
      
      // Do something with lock 4
      ctx1234.useLock(LOCK_4, () => {
        // Work with elevated privileges
      });
      
      // Release lock 4, back to original state
      const ctxBack = ctx1234.releaseLock(LOCK_4);
      assert.deepStrictEqual(ctxBack.getHeldLocks(), [1, 2, 3]);
      
      // Can continue using locks 1, 2, 3
      ctxBack.useLock(LOCK_1, () => {});
      ctxBack.useLock(LOCK_2, () => {});
      ctxBack.useLock(LOCK_3, () => {});
      
      ctxBack.dispose();
    });

    test('should work with read locks', async () => {
      const ctx123R = await createLockContext()
        .acquireRead(LOCK_1)
        .then(c => c.acquireRead(LOCK_2))
        .then(c => c.acquireRead(LOCK_3));
      
      const ctx13R = ctx123R.releaseLock(LOCK_2);
      assert.deepStrictEqual(ctx13R.getHeldLocks(), [1, 3]);
      
      ctx13R.dispose();
    });

    test('should work with mixed read/write locks', async () => {
      const ctxMixed = await createLockContext()
        .acquireRead(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireRead(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4));
      
      // Release write lock 2
      const ctx134 = ctxMixed.releaseLock(LOCK_2);
      assert.deepStrictEqual(ctx134.getHeldLocks(), [1, 3, 4]);
      
      ctx134.dispose();
    });

    test('should allow multiple sequential releases', async () => {
      const ctx12345 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4))
        .then(c => c.acquireWrite(LOCK_5));
      
      // Release locks one by one
      const ctx1345 = ctx12345.releaseLock(LOCK_2);
      assert.deepStrictEqual(ctx1345.getHeldLocks(), [1, 3, 4, 5]);
      
      const ctx135 = ctx1345.releaseLock(LOCK_4);
      assert.deepStrictEqual(ctx135.getHeldLocks(), [1, 3, 5]);
      
      const ctx15 = ctx135.releaseLock(LOCK_3);
      assert.deepStrictEqual(ctx15.getHeldLocks(), [1, 5]);
      
      ctx15.dispose();
    });

    test('should work with high lock numbers', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_10)
        .then(c => c.acquireWrite(LOCK_12))
        .then(c => c.acquireWrite(LOCK_15));
      
      const ctx1015 = ctx.releaseLock(LOCK_12);
      assert.deepStrictEqual(ctx1015.getHeldLocks(), [10, 15]);
      
      ctx1015.dispose();
    });

    test('should prevent releasing non-held locks at compile time', async () => {
      const ctx12 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2));
      
      // ❌ Compile-time errors: Cannot release locks not held
      // const invalid1 = ctx12.releaseLock(LOCK_3);
      // const invalid2 = ctx12.releaseLock(LOCK_4);
      // const invalid3 = ctx12.releaseLock(LOCK_15);
      
      ctx12.dispose();
    });
  });

  describe('Context Inspection Methods', () => {
    test('should return 0 for empty context', () => {
      const ctx = createLockContext();
      assert.strictEqual(ctx.getMaxHeldLock(), 0);
    });

    test('should return max lock for single lock', async () => {
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      assert.strictEqual(ctx1.getMaxHeldLock(), 1);
      ctx1.dispose();

      const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      assert.strictEqual(ctx5.getMaxHeldLock(), 5);
      ctx5.dispose();

      const ctx15 = await createLockContext().acquireWrite(LOCK_15);
      assert.strictEqual(ctx15.getMaxHeldLock(), 15);
      ctx15.dispose();
    });

    test('should return max lock for multiple locks', async () => {
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      assert.strictEqual(ctx13.getMaxHeldLock(), 3);
      ctx13.dispose();

      const ctx136 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_6));
      assert.strictEqual(ctx136.getMaxHeldLock(), 6);
      ctx136.dispose();

      const ctx24 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_4));
      assert.strictEqual(ctx24.getMaxHeldLock(), 4);
      ctx24.dispose();
    });

    test('should return max lock with skipped locks', async () => {
      // Skip locks: 1 → 5 (skipping 2, 3, 4)
      const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
      assert.strictEqual(ctx15.getMaxHeldLock(), 5);
      ctx15.dispose();

      // Skip locks: 2 → 7 (skipping 3, 4, 5, 6)
      const ctx27 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_7));
      assert.strictEqual(ctx27.getMaxHeldLock(), 7);
      ctx27.dispose();

      // Long chain with skips: 1 → 3 → 6 → 9 → 12 → 15
      const ctxChain = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_6))
        .then(c => c.acquireWrite(LOCK_9))
        .then(c => c.acquireWrite(LOCK_12))
        .then(c => c.acquireWrite(LOCK_15));
      assert.strictEqual(ctxChain.getMaxHeldLock(), 15);
      ctxChain.dispose();
    });

    test('should work with read locks', async () => {
      const ctx1R = await createLockContext().acquireRead(LOCK_1);
      assert.strictEqual(ctx1R.getMaxHeldLock(), 1);
      ctx1R.dispose();

      const ctx25R = await createLockContext()
        .acquireRead(LOCK_2)
        .then(c => c.acquireRead(LOCK_5));
      assert.strictEqual(ctx25R.getMaxHeldLock(), 5);
      ctx25R.dispose();
    });

    test('should work with mixed read/write locks', async () => {
      const ctxMixed = await createLockContext()
        .acquireRead(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireRead(LOCK_5));
      assert.strictEqual(ctxMixed.getMaxHeldLock(), 5);
      ctxMixed.dispose();
    });
  });
});
