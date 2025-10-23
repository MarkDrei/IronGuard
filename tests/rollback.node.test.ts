/**
 * IronGuard Rollback Tests - Node.js Test Runner Format
 * 
 * Tests the new rollback functionality including:
 * - Basic rollback operations
 * - Type safety validation
 * - Runtime behavior
 * - Advanced rollback patterns
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_8, LOCK_12, LOCK_15 } from '../src/core';

describe('Rollback Functionality', () => {
  describe('Basic Rollback Operations', () => {
    test('should rollback to a held lock', async () => {
      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      // Rollback to LOCK_3
      const ctx13 = ctx135.rollbackTo(LOCK_3);
      assert.deepStrictEqual(ctx13.getHeldLocks(), [1, 3]);
      
      // Rollback to LOCK_1
      const ctx1 = ctx135.rollbackTo(LOCK_1);
      assert.deepStrictEqual(ctx1.getHeldLocks(), [1]);
      
      ctx1.dispose();
    });

    test('should allow acquisition after rollback', async () => {
      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      // Rollback to LOCK_3, then acquire LOCK_4
      const ctx13 = ctx135.rollbackTo(LOCK_3);
      const ctx134 = await ctx13.acquireWrite(LOCK_4);
      assert.deepStrictEqual(ctx134.getHeldLocks(), [1, 3, 4]);
      
      // Can continue with LOCK_5
      const ctx1345 = await ctx134.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx1345.getHeldLocks(), [1, 3, 4, 5]);
      
      ctx1345.dispose();
    });

    test('should properly release locks during rollback', async () => {
      const ctx12345 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4))
        .then(c => c.acquireWrite(LOCK_5));
      
      // Check initial state
      assert.ok(ctx12345.hasLock(LOCK_5));
      assert.ok(ctx12345.hasLock(LOCK_4));
      assert.ok(ctx12345.hasLock(LOCK_3));
      
      // Rollback to LOCK_2
      const ctx12 = ctx12345.rollbackTo(LOCK_2);
      assert.deepStrictEqual(ctx12.getHeldLocks(), [1, 2]);
      
      // Verify locks 3, 4, 5 are no longer held
      assert.ok(!ctx12.hasLock(LOCK_3));
      assert.ok(!ctx12.hasLock(LOCK_4));
      assert.ok(!ctx12.hasLock(LOCK_5));
      
      ctx12.dispose();
    });
  });

  describe('Advanced Rollback Patterns', () => {
    test('should support multiple rollback operations', async () => {
      const complexCtx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5))
        .then(c => c.acquireWrite(LOCK_8))
        .then(c => c.acquireWrite(LOCK_12));
      
      // Multiple rollbacks from the same original context
      const backTo8 = complexCtx.rollbackTo(LOCK_8);
      const backTo5 = complexCtx.rollbackTo(LOCK_5);
      const backTo3 = complexCtx.rollbackTo(LOCK_3);
      const backTo1 = complexCtx.rollbackTo(LOCK_1);
      
      assert.deepStrictEqual(backTo8.getHeldLocks(), [1, 3, 5, 8]);
      assert.deepStrictEqual(backTo5.getHeldLocks(), [1, 3, 5]);
      assert.deepStrictEqual(backTo3.getHeldLocks(), [1, 3]);
      assert.deepStrictEqual(backTo1.getHeldLocks(), [1]);
      
      backTo1.dispose();
    });

    test('should support chained rollbacks', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4))
        .then(c => c.acquireWrite(LOCK_5));
      
      // Chain rollbacks
      const step1 = ctx.rollbackTo(LOCK_3);  // [1, 2, 3]
      const step2 = step1.rollbackTo(LOCK_2); // [1, 2]
      const step3 = step2.rollbackTo(LOCK_1); // [1]
      
      assert.deepStrictEqual(step1.getHeldLocks(), [1, 2, 3]);
      assert.deepStrictEqual(step2.getHeldLocks(), [1, 2]);
      assert.deepStrictEqual(step3.getHeldLocks(), [1]);
      
      step3.dispose();
    });

    test('should enable complex acquisition patterns', async () => {
      // Pattern: 1→3→5, rollback to 3, then 4→8→15
      const initial = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      const afterRollback = initial.rollbackTo(LOCK_3);
      const final = await afterRollback
        .acquireWrite(LOCK_4)
        .then(c => c.acquireWrite(LOCK_8))
        .then(c => c.acquireWrite(LOCK_15));
      
      assert.deepStrictEqual(final.getHeldLocks(), [1, 3, 4, 8, 15]);
      final.dispose();
    });
  });

  describe('Runtime Error Handling', () => {
    test('should throw error when rolling back to non-held lock', async () => {
      const ctx = await createLockContext().acquireWrite(LOCK_3);
      
      // These should throw runtime errors
      assert.throws(() => {
        ctx.rollbackTo(LOCK_1 as any); // LOCK_1 not held
      }, /Cannot rollback to lock 1: not held/);
      
      assert.throws(() => {
        ctx.rollbackTo(LOCK_5 as any); // LOCK_5 not held
      }, /Cannot rollback to lock 5: not held/);
      
      ctx.dispose();
    });
  });

  describe('Rollback with Lock Usage', () => {
    test('should maintain lock usage capabilities after rollback', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      const rolledBack = ctx.rollbackTo(LOCK_3);
      
      let executed1 = false;
      let executed3 = false;
      
      rolledBack.useLock(LOCK_1, () => { executed1 = true; });
      rolledBack.useLock(LOCK_3, () => { executed3 = true; });
      
      assert.strictEqual(executed1, true);
      assert.strictEqual(executed3, true);
      
      rolledBack.dispose();
    });
  });

  describe('Rollback String Representation', () => {
    test('should show correct locks in toString after rollback', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      const rolledBack = ctx.rollbackTo(LOCK_3);
      const str = rolledBack.toString();
      
      assert.ok(str.includes('1'));
      assert.ok(str.includes('3'));
      assert.ok(!str.includes('5')); // LOCK_5 should not appear after rollback
      
      rolledBack.dispose();
    });
  });
});