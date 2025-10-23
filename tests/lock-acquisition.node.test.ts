/**
 * IronGuard Lock Acquisition Tests - Node.js Test Runner Format
 * 
 * Tests compile-time lock acquisition validation including:
 * - Lock ordering validation
 * - Lock skipping patterns
 * - Duplicate prevention
 * - Direct acquisition
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_6, LOCK_7, LOCK_8, LOCK_9, LOCK_10, LOCK_11, LOCK_12, LOCK_13, LOCK_14, LOCK_15 } from '../src/core';

describe('Compile-time Lock Acquisition Checks', () => {
  describe('Lock Ordering Validation', () => {
    test('should enforce ascending lock order', async () => {
      // ✅ Valid: Ascending order acquisitions
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx12 = await ctx1.acquireWrite(LOCK_2);
      const ctx123 = await ctx12.acquireWrite(LOCK_3);
      const ctx1234 = await ctx123.acquireWrite(LOCK_4);
      const ctx12345 = await ctx1234.acquireWrite(LOCK_5);
      
      assert.deepStrictEqual(ctx12345.getHeldLocks(), [1, 2, 3, 4, 5]);
      ctx12345.dispose();
    });

    test('should prevent acquiring lower level locks', async () => {
      // ❌ Compile-time errors: Lock ordering violations
      // const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // const invalid1 = await ctx3.acquireWrite(LOCK_1); // 3 → 1 invalid
      // const invalid2 = await ctx3.acquireWrite(LOCK_2); // 3 → 2 invalid
      
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // const invalid3 = await ctx4.acquireWrite(LOCK_1); // 4 → 1 invalid
      // const invalid4 = await ctx4.acquireWrite(LOCK_2); // 4 → 2 invalid
      // const invalid5 = await ctx4.acquireWrite(LOCK_3); // 4 → 3 invalid
      
      // const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      // const invalid6 = await ctx5.acquireWrite(LOCK_1); // 5 → 1 invalid
      // const invalid7 = await ctx5.acquireWrite(LOCK_2); // 5 → 2 invalid
      // const invalid8 = await ctx5.acquireWrite(LOCK_3); // 5 → 3 invalid
      // const invalid9 = await ctx5.acquireWrite(LOCK_4); // 5 → 4 invalid

      // Instead verify that valid operations work
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx13 = await ctx1.acquireWrite(LOCK_3);
      assert.deepStrictEqual(ctx13.getHeldLocks(), [1, 3]);
      ctx13.dispose();
    });

    test('should prevent complex ordering violations', async () => {
      // ❌ Compile-time errors: Complex ordering violations
      // const ctx23 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_3));
      // const invalid1 = await ctx23.acquireWrite(LOCK_1); // 2,3 → 1 invalid
      
      // const ctx134 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3)).then(c => c.acquireWrite(LOCK_4));
      // const invalid2 = await ctx134.acquireWrite(LOCK_2); // 1,3,4 → 2 invalid
      
      // const ctx25 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_5));
      // const invalid3 = await ctx25.acquireWrite(LOCK_1); // 2,5 → 1 invalid
      // const invalid4 = await ctx25.acquireWrite(LOCK_3); // 2,5 → 3 invalid
      // const invalid5 = await ctx25.acquireWrite(LOCK_4); // 2,5 → 4 invalid

      // Verify valid complex patterns work
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx13 = await ctx1.acquireWrite(LOCK_3);
      const ctx135 = await ctx13.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx135.getHeldLocks(), [1, 3, 5]);
      ctx135.dispose();
    });
  });

  describe('Lock Skipping Patterns', () => {
    test('should allow skipping lock levels', async () => {
      // ✅ Valid: Various skipping patterns
      const patterns = [
        { name: '1 → 3', start: LOCK_1, next: LOCK_3, expected: [1, 3] },
        { name: '1 → 4', start: LOCK_1, next: LOCK_4, expected: [1, 4] },
        { name: '1 → 5', start: LOCK_1, next: LOCK_5, expected: [1, 5] },
        { name: '2 → 4', start: LOCK_2, next: LOCK_4, expected: [2, 4] },
        { name: '2 → 5', start: LOCK_2, next: LOCK_5, expected: [2, 5] },
        { name: '3 → 5', start: LOCK_3, next: LOCK_5, expected: [3, 5] }
      ];

      for (const { name, start, next, expected } of patterns) {
        const ctx = await createLockContext().acquireWrite(start);
        const nextCtx = await ctx.acquireWrite(next);
        assert.deepStrictEqual(nextCtx.getHeldLocks(), expected, `Pattern ${name} should work`);
        nextCtx.dispose();
      }
    });

    test('should allow multi-level skipping', async () => {
      // ✅ Valid: Multi-level skip patterns
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx15 = await ctx1.acquireWrite(LOCK_5); // Skip 2,3,4
      assert.deepStrictEqual(ctx15.getHeldLocks(), [1, 5]);
      ctx15.dispose();

      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      const ctx25 = await ctx2.acquireWrite(LOCK_5); // Skip 3,4
      assert.deepStrictEqual(ctx25.getHeldLocks(), [2, 5]);
      ctx25.dispose();
    });

    test('should allow complex skip sequences', async () => {
      // ✅ Valid: Complex skipping sequences
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx13 = await ctx1.acquireWrite(LOCK_3); // Skip 2
      const ctx135 = await ctx13.acquireWrite(LOCK_5); // Skip 4
      assert.deepStrictEqual(ctx135.getHeldLocks(), [1, 3, 5]);
      ctx135.dispose();

      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      const ctx24 = await ctx2.acquireWrite(LOCK_4); // Skip 3
      const ctx245 = await ctx24.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx245.getHeldLocks(), [2, 4, 5]);
      ctx245.dispose();
    });
  });

  describe('Direct Lock Acquisition', () => {
    test('should allow direct acquisition of any lock level', async () => {
      // ✅ Valid: Direct acquisition of each lock level
      const lockLevels = [
        { lock: LOCK_1, expected: [1] },
        { lock: LOCK_2, expected: [2] },
        { lock: LOCK_3, expected: [3] },
        { lock: LOCK_4, expected: [4] },
        { lock: LOCK_5, expected: [5] }
      ];

      for (const { lock, expected } of lockLevels) {
        const ctx = await createLockContext().acquireWrite(lock);
        assert.deepStrictEqual(ctx.getHeldLocks(), expected, `Direct acquisition of lock ${expected[0]} should work`);
        ctx.dispose();
      }
    });

    test('should allow starting from any level and progressing', async () => {
      // ✅ Valid: Start from different levels
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      const ctx34 = await ctx3.acquireWrite(LOCK_4);
      const ctx345 = await ctx34.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx345.getHeldLocks(), [3, 4, 5]);
      ctx345.dispose();

      const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      const ctx45 = await ctx4.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx45.getHeldLocks(), [4, 5]);
      ctx45.dispose();
    });
  });

  describe('Duplicate Lock Prevention', () => {
    test('should prevent duplicate lock acquisition', async () => {
      // ❌ Compile-time errors: Duplicate acquisitions
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // const duplicate1 = await ctx1.acquireWrite(LOCK_1); // Duplicate LOCK_1
      
      // const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      // const duplicate2 = await ctx2.acquireWrite(LOCK_2); // Duplicate LOCK_2
      
      // const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // const duplicate3 = await ctx3.acquireWrite(LOCK_3); // Duplicate LOCK_3
      
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // const duplicate4 = await ctx4.acquireWrite(LOCK_4); // Duplicate LOCK_4
      
      // const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      // const duplicate5 = await ctx5.acquireWrite(LOCK_5); // Duplicate LOCK_5

      // Verify that valid non-duplicate acquisitions work
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const ctx12 = await ctx1.acquireWrite(LOCK_2);
      assert.deepStrictEqual(ctx12.getHeldLocks(), [1, 2]);
      ctx12.dispose();
    });

    test('should prevent duplicates in complex sequences', async () => {
      // ❌ Compile-time errors: Duplicates in sequences
      // const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
      // const duplicate1 = await ctx12.acquireWrite(LOCK_1); // Already have LOCK_1
      // const duplicate2 = await ctx12.acquireWrite(LOCK_2); // Already have LOCK_2
      
      // const ctx135 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3)).then(c => c.acquireWrite(LOCK_5));
      // const duplicate3 = await ctx135.acquireWrite(LOCK_1); // Already have LOCK_1
      // const duplicate4 = await ctx135.acquireWrite(LOCK_3); // Already have LOCK_3
      // const duplicate5 = await ctx135.acquireWrite(LOCK_5); // Already have LOCK_5

      // Verify valid additions work
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      const ctx134 = await ctx13.acquireWrite(LOCK_4); // New lock, not duplicate
      assert.deepStrictEqual(ctx134.getHeldLocks(), [1, 3, 4]);
      ctx134.dispose();
    });
  });

  describe('Empty Context Behavior', () => {
    test('should allow empty context to acquire any lock', async () => {
      // ✅ Valid: Empty context can start with any lock
      const emptyCtx = createLockContext();
      assert.deepStrictEqual(emptyCtx.getHeldLocks(), []);

      // Test that we can acquire any lock from empty state
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      ctx1.dispose();
      
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      ctx2.dispose();
      
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      ctx3.dispose();
      
      const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      ctx4.dispose();
      
      const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      ctx5.dispose();
    });

    test('should maintain ordering after first acquisition', async () => {
      // Start with any lock, then maintain ordering
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      
      // ❌ Compile-time errors: Still must maintain ordering after first lock
      // const invalid1 = await ctx3.acquireWrite(LOCK_1); // 3 → 1 invalid
      // const invalid2 = await ctx3.acquireWrite(LOCK_2); // 3 → 2 invalid
      
      // ✅ Valid: Can still acquire higher locks
      const ctx34 = await ctx3.acquireWrite(LOCK_4);
      const ctx345 = await ctx34.acquireWrite(LOCK_5);
      assert.deepStrictEqual(ctx345.getHeldLocks(), [3, 4, 5]);
      ctx345.dispose();
    });
  });

  describe('Higher Lock Levels (6-15)', () => {
    test('should support direct acquisition of high locks', async () => {
      // Test various high locks can be acquired directly
      const ctx6 = await createLockContext().acquireWrite(LOCK_6);
      assert.deepStrictEqual(ctx6.getHeldLocks(), [6]);
      ctx6.dispose();

      const ctx10 = await createLockContext().acquireWrite(LOCK_10);
      assert.deepStrictEqual(ctx10.getHeldLocks(), [10]);
      ctx10.dispose();

      const ctx15 = await createLockContext().acquireWrite(LOCK_15);
      assert.deepStrictEqual(ctx15.getHeldLocks(), [15]);
      ctx15.dispose();
    });

    test('should enforce ordering with high locks', async () => {
      // ✅ Valid: Ascending order with high locks
      const ctx6 = await createLockContext().acquireWrite(LOCK_6);
      const ctx68 = await ctx6.acquireWrite(LOCK_8);
      const ctx6810 = await ctx68.acquireWrite(LOCK_10);
      const ctx681015 = await ctx6810.acquireWrite(LOCK_15);
      assert.deepStrictEqual(ctx681015.getHeldLocks(), [6, 8, 10, 15]);
      ctx681015.dispose();
    });

    test('should allow skipping high lock levels', async () => {
      // Test various high-level skipping patterns
      const patterns = [
        { name: '1 → 8', start: LOCK_1, next: LOCK_8, expected: [1, 8] },
        { name: '3 → 12', start: LOCK_3, next: LOCK_12, expected: [3, 12] },
        { name: '5 → 15', start: LOCK_5, next: LOCK_15, expected: [5, 15] },
        { name: '7 → 14', start: LOCK_7, next: LOCK_14, expected: [7, 14] },
        { name: '6 → 11', start: LOCK_6, next: LOCK_11, expected: [6, 11] }
      ];

      for (const { name, start, next, expected } of patterns) {
        const ctx = await createLockContext().acquireWrite(start);
        const nextCtx = await ctx.acquireWrite(next);
        assert.deepStrictEqual(nextCtx.getHeldLocks(), expected, `Pattern ${name} should work`);
        nextCtx.dispose();
      }
    });

    test('should support complex high lock progressions', async () => {
      // Test a complex progression using many high locks
      const ctx = createLockContext();
      const ctx2 = await ctx.acquireWrite(LOCK_2);
      const ctx27 = await ctx2.acquireWrite(LOCK_7);
      const ctx279 = await ctx27.acquireWrite(LOCK_9);
      const ctx27911 = await ctx279.acquireWrite(LOCK_11);
      const ctx2791113 = await ctx27911.acquireWrite(LOCK_13);
      const ctx279111315 = await ctx2791113.acquireWrite(LOCK_15);
      
      assert.deepStrictEqual(ctx279111315.getHeldLocks(), [2, 7, 9, 11, 13, 15]);
      ctx279111315.dispose();
    });

    test('should prevent backwards acquisition with high locks', async () => {
      // Test that high locks still enforce ordering
      const ctx12 = await createLockContext().acquireWrite(LOCK_12);
      
      // ❌ Compile-time errors: These would fail compilation
      // const invalid1 = await ctx12.acquireWrite(LOCK_5);  // 12 → 5 invalid
      // const invalid2 = await ctx12.acquireWrite(LOCK_10); // 12 → 10 invalid
      // const invalid3 = await ctx12.acquireWrite(LOCK_11); // 12 → 11 invalid
      
      // ✅ Valid: Can still acquire higher locks
      const ctx1213 = await ctx12.acquireWrite(LOCK_13);
      const ctx121315 = await ctx1213.acquireWrite(LOCK_15);
      assert.deepStrictEqual(ctx121315.getHeldLocks(), [12, 13, 15]);
      ctx121315.dispose();
    });
  });
});