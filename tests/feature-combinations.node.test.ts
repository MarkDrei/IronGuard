/**
 * IronGuard Feature Combination Tests
 * 
 * Tests combinations of different IronGuard features to ensure they work together correctly:
 * - Rollback + Mutual Exclusion
 * - Rollback + High Lock Levels
 * - Rollback + Lock Skipping
 * - Rollback + Function Parameters
 * - Multiple Complex Scenarios
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  createLockContext, 
  LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_8, LOCK_12, LOCK_15,
  type LockContext, type LockLevel, type Contains
} from '../src/core';

describe('Feature Combinations', () => {
  describe('Rollback + Mutual Exclusion', () => {
    test('should handle rollback while other thread waits', async () => {
      const timeline: string[] = [];
      
      // Thread 1: Acquire locks, rollback, then release
      const thread1 = (async () => {
        const startTime = Date.now();
        timeline.push(`T1-start:${startTime}`);
        
        // Acquire 1 → 3 → 5
        const ctx135 = await createLockContext()
          .acquireWrite(LOCK_1)
          .then(c => c.acquireWrite(LOCK_3))
          .then(c => c.acquireWrite(LOCK_5));
        
        timeline.push(`T1-acquired-135:${Date.now()}`);
        
        // Hold for a bit
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Rollback to LOCK_3 (releases LOCK_5)
        const ctx13 = ctx135.rollbackTo(LOCK_3);
        timeline.push(`T1-rollback-to-3:${Date.now()}`);
        
        // Hold a bit more
        await new Promise(resolve => setTimeout(resolve, 50));
        
        ctx13.dispose();
        timeline.push(`T1-disposed:${Date.now()}`);
      })();

      // Thread 2: Try to acquire LOCK_5 (should wait until T1 rollback)
      const thread2 = (async () => {
        // Start after T1 has acquired locks
        await new Promise(resolve => setTimeout(resolve, 25));
        
        const startTime = Date.now();
        timeline.push(`T2-start:${startTime}`);
        
        const ctx5 = await createLockContext().acquireWrite(LOCK_5);
        timeline.push(`T2-acquired-5:${Date.now()}`);
        
        ctx5.dispose();
        timeline.push(`T2-disposed:${Date.now()}`);
      })();

      await Promise.all([thread1, thread2]);
      
      // Verify that T2 could acquire LOCK_5 only after T1 rolled back
      const t1Rollback = timeline.find(e => e.includes('T1-rollback'))!;
      const t2Acquired = timeline.find(e => e.includes('T2-acquired'))!;
      
      const rollbackTime = parseInt(t1Rollback.split(':')[1]!);
      const t2AcquiredTime = parseInt(t2Acquired.split(':')[1]!);
      
      // T2 should acquire LOCK_5 after T1 rolled back from it
      assert.ok(t2AcquiredTime >= rollbackTime, 'Thread 2 should acquire LOCK_5 after rollback');
    });

    test('should handle multiple threads with rollback chains', async () => {
      const results: number[] = [];
      
      // Thread 1: Complex rollback chain
      const thread1 = (async () => {
        const ctx = await createLockContext()
          .acquireWrite(LOCK_1)
          .then(c => c.acquireWrite(LOCK_3))
          .then(c => c.acquireWrite(LOCK_8));
        
        await new Promise(resolve => setTimeout(resolve, 30));
        
        const rolled = ctx.rollbackTo(LOCK_3);
        results.push(1);
        
        const extended = await rolled.acquireWrite(LOCK_5);
        results.push(2);
        
        extended.dispose();
      })();

      // Thread 2: Competing for same locks
      const thread2 = (async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const ctx = await createLockContext().acquireWrite(LOCK_8);
        results.push(3);
        
        ctx.dispose();
      })();

      await Promise.all([thread1, thread2]);
      
      // Should complete without deadlock
      assert.strictEqual(results.length, 3);
      assert.ok(results.includes(1) && results.includes(2) && results.includes(3));
    });
  });

  describe('Rollback + High Lock Levels', () => {
    test('should rollback correctly with high lock levels', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_8))
        .then(c => c.acquireWrite(LOCK_12))
        .then(c => c.acquireWrite(LOCK_15));
      
      // Rollback to various high levels
      const backTo12 = ctx.rollbackTo(LOCK_12);
      assert.deepStrictEqual(backTo12.getHeldLocks(), [1, 8, 12]);
      
      const backTo8 = ctx.rollbackTo(LOCK_8);
      assert.deepStrictEqual(backTo8.getHeldLocks(), [1, 8]);
      
      const backTo1 = ctx.rollbackTo(LOCK_1);
      assert.deepStrictEqual(backTo1.getHeldLocks(), [1]);
      
      // Can acquire high locks after rollback
      const newPath = await backTo8.acquireWrite(LOCK_15);
      assert.deepStrictEqual(newPath.getHeldLocks(), [1, 8, 15]);
      
      newPath.dispose();
    });

    test('should handle complex high lock rollback patterns', async () => {
      // Test rollback with non-sequential high locks
      const ctx = await createLockContext()
        .acquireWrite(LOCK_2)
        .then(c => c.acquireWrite(LOCK_5))
        .then(c => c.acquireWrite(LOCK_12))
        .then(c => c.acquireWrite(LOCK_15));
      
      const backTo5 = ctx.rollbackTo(LOCK_5);
      
      // Should be able to take different high lock path
      const altPath = await backTo5
        .acquireWrite(LOCK_8)
        .then(c => c.acquireWrite(LOCK_12));
      
      assert.deepStrictEqual(altPath.getHeldLocks(), [2, 5, 8, 12]);
      altPath.dispose();
    });
  });

  describe('Rollback + Lock Skipping', () => {
    test('should work with lock skipping patterns', async () => {
      // Skip locks in initial acquisition
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)  // Skip 2
        .then(c => c.acquireWrite(LOCK_5))  // Skip 3, 4
        .then(c => c.acquireWrite(LOCK_12)); // Skip 6-11
      
      // Rollback to LOCK_5
      const backTo5 = ctx.rollbackTo(LOCK_5);
      assert.deepStrictEqual(backTo5.getHeldLocks(), [1, 5]);
      
      // Now fill in some skipped locks
      const filled = await backTo5
        .acquireWrite(LOCK_8)  // Still skipping 6, 7
        .then(c => c.acquireWrite(LOCK_15)); // Skip 9-14
      
      assert.deepStrictEqual(filled.getHeldLocks(), [1, 5, 8, 15]);
      
      // Rollback to LOCK_1 and take completely different path
      const backTo1 = filled.rollbackTo(LOCK_1);
      const newPath = await backTo1
        .acquireWrite(LOCK_3)
        .then(c => c.acquireWrite(LOCK_4));
      
      assert.deepStrictEqual(newPath.getHeldLocks(), [1, 3, 4]);
      newPath.dispose();
    });
  });

  describe('Rollback + Function Parameters', () => {
    // Helper function that requires LOCK_3
    function requiresLock3<THeld extends readonly LockLevel[]>(
      context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
    ): string {
      // Simply check that we have a valid context with LOCK_3
      const hasLock3 = context.hasLock(LOCK_3);
      if (!hasLock3) {
        throw new Error('LOCK_3 not held');
      }
      return 'success';
    }

    test('should work with function parameter validation after rollback', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5))
        .then(c => c.acquireWrite(LOCK_8));
      
      // Should work before rollback
      const result1 = requiresLock3(ctx);
      assert.strictEqual(result1, 'success');
      
      // Rollback to LOCK_5 (still has LOCK_3)
      const backTo5 = ctx.rollbackTo(LOCK_5);
      const result2 = requiresLock3(backTo5);
      assert.strictEqual(result2, 'success');
      
      // Rollback to LOCK_3 (still has LOCK_3)
      const backTo3 = ctx.rollbackTo(LOCK_3);
      const result3 = requiresLock3(backTo3);
      assert.strictEqual(result3, 'success');
      
      backTo3.dispose();
    });
  });

  describe('Rollback + Lock Usage', () => {
    test('should maintain lock usage after rollback', async () => {
      const ctx = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      let used1 = false;
      let used3 = false;
      let used5 = false;
      
      // Use all locks before rollback
      ctx.useLock(LOCK_1, () => { used1 = true; });
      ctx.useLock(LOCK_3, () => { used3 = true; });
      ctx.useLock(LOCK_5, () => { used5 = true; });
      
      assert.ok(used1 && used3 && used5);
      
      // Rollback to LOCK_3
      const rolledBack = ctx.rollbackTo(LOCK_3);
      
      let afterRollback1 = false;
      let afterRollback3 = false;
      
      // Should still be able to use remaining locks
      rolledBack.useLock(LOCK_1, () => { afterRollback1 = true; });
      rolledBack.useLock(LOCK_3, () => { afterRollback3 = true; });
      
      assert.ok(afterRollback1 && afterRollback3);
      
      rolledBack.dispose();
    });
  });

  describe('Complex Multi-Feature Scenarios', () => {
    test('should handle rollback + mutual exclusion + high locks + skipping', async () => {
      const timeline: string[] = [];
      
      // Thread 1: Complex pattern with rollback
      const thread1 = (async () => {
        const ctx = await createLockContext()
          .acquireWrite(LOCK_2)     // Skip 1
          .then(c => c.acquireWrite(LOCK_8))   // Skip 3-7
          .then(c => c.acquireWrite(LOCK_15)); // Skip 9-14
        
        timeline.push('T1-acquired-2-8-15');
        
        await new Promise(resolve => setTimeout(resolve, 30));
        
        // Rollback to LOCK_8
        const rolled = ctx.rollbackTo(LOCK_8);
        timeline.push('T1-rollback-to-8');
        
        // Take different path
        const newPath = await rolled.acquireWrite(LOCK_12);
        timeline.push('T1-acquired-12');
        
        newPath.dispose();
        timeline.push('T1-disposed');
      })();

      // Thread 2: Competing for LOCK_15
      const thread2 = (async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        
        timeline.push('T2-start');
        const ctx = await createLockContext().acquireWrite(LOCK_15);
        timeline.push('T2-acquired-15');
        
        ctx.dispose();
        timeline.push('T2-disposed');
      })();

      // Thread 3: Working with lower locks
      const thread3 = (async () => {
        await new Promise(resolve => setTimeout(resolve, 45));
        
        const ctx = await createLockContext()
          .acquireWrite(LOCK_1)
          .then(c => c.acquireWrite(LOCK_3));
        
        timeline.push('T3-acquired-1-3');
        
        ctx.dispose();
        timeline.push('T3-disposed');
      })();

      await Promise.all([thread1, thread2, thread3]);
      
      // Verify no deadlocks and proper execution order
      assert.ok(timeline.includes('T1-rollback-to-8'));
      assert.ok(timeline.includes('T2-acquired-15'));
      assert.ok(timeline.includes('T3-acquired-1-3'));
      
      // T2 should acquire LOCK_15 after T1 rolls back from it
      const rollbackIdx = timeline.indexOf('T1-rollback-to-8');
      const t2AcquireIdx = timeline.indexOf('T2-acquired-15');
      assert.ok(t2AcquireIdx > rollbackIdx, 'T2 should acquire after T1 rollback');
    });

    test('should handle concurrent rollbacks with mutual exclusion', async () => {
      const results: string[] = [];
      
      // Multiple threads doing rollback operations concurrently
      const createThread = (id: number) => async () => {
        const ctx = await createLockContext()
          .acquireWrite(LOCK_1)
          .then(c => c.acquireWrite(LOCK_3))
          .then(c => c.acquireWrite(LOCK_5))
          .then(c => c.acquireWrite(LOCK_8));
        
        results.push(`T${id}-acquired`);
        
        // Random rollback pattern
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
        
        const rolled = ctx.rollbackTo(Math.random() > 0.5 ? LOCK_5 : LOCK_3);
        results.push(`T${id}-rolled`);
        
        // Try to acquire higher lock
        const extended = await rolled.acquireWrite(LOCK_12);
        results.push(`T${id}-extended`);
        
        extended.dispose();
        results.push(`T${id}-disposed`);
      };

      // Run 3 threads concurrently
      await Promise.all([
        createThread(1)(),
        createThread(2)(),
        createThread(3)()
      ]);
      
      // All threads should complete successfully
      assert.strictEqual(results.length, 12); // 4 operations × 3 threads
      
      for (let i = 1; i <= 3; i++) {
        assert.ok(results.includes(`T${i}-acquired`));
        assert.ok(results.includes(`T${i}-rolled`));
        assert.ok(results.includes(`T${i}-extended`));
        assert.ok(results.includes(`T${i}-disposed`));
      }
    });
  });
});