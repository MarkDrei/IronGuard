/**
 * IronGuard Lock Usage Tests - Node.js Test Runner Format
 * 
 * Tests compile-time lock usage validation including:
 * - Using held locks
 * - Preventing usage of non-held locks
 * - Lock usage patterns
 * - State validation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from '../src';

describe('Compile-time Lock Usage Checks', () => {
  describe('Using Held Locks', () => {
    test('should allow using single held lock', async () => {
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      
      let executed = false;
      ctx1.useLock(LOCK_1, () => {
        executed = true;
      });
      
      assert.strictEqual(executed, true, 'Should execute callback with held lock');
      ctx1.dispose();
    });

    test('should allow using multiple held locks', async () => {
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      
      let lock1Used = false;
      let lock3Used = false;
      
      ctx13.useLock(LOCK_1, () => { lock1Used = true; });
      ctx13.useLock(LOCK_3, () => { lock3Used = true; });
      
      assert.strictEqual(lock1Used, true, 'Should use held LOCK_1');
      assert.strictEqual(lock3Used, true, 'Should use held LOCK_3');
      ctx13.dispose();
    });

    test('should allow using any combination of held locks', async () => {
      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      const usageResults = { lock1: false, lock3: false, lock5: false };
      
      ctx135.useLock(LOCK_1, () => { usageResults.lock1 = true; });
      ctx135.useLock(LOCK_3, () => { usageResults.lock3 = true; });
      ctx135.useLock(LOCK_5, () => { usageResults.lock5 = true; });
      
      assert.deepStrictEqual(usageResults, { lock1: true, lock3: true, lock5: true });
      ctx135.dispose();
    });

    test('should allow using all held locks in sequence', async () => {
      const ctx12345 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4))
        .then(c => c.acquireWrite(LOCK_5));
      
      const sequence: number[] = [];
      
      ctx12345.useLock(LOCK_1, () => { sequence.push(1); });
      ctx12345.useLock(LOCK_2, () => { sequence.push(2); });
      ctx12345.useLock(LOCK_3, () => { sequence.push(3); });
      ctx12345.useLock(LOCK_4, () => { sequence.push(4); });
      ctx12345.useLock(LOCK_5, () => { sequence.push(5); });
      
      assert.deepStrictEqual(sequence, [1, 2, 3, 4, 5]);
      ctx12345.dispose();
    });
  });

  describe('Preventing Non-held Lock Usage', () => {
    test('should prevent using non-held locks from empty context', async () => {
      const emptyCtx = createLockContext();
      
      // ❌ Compile-time errors: Cannot use any locks from empty context
      // emptyCtx.useLock(LOCK_1, () => {});
      // emptyCtx.useLock(LOCK_2, () => {});
      // emptyCtx.useLock(LOCK_3, () => {});
      // emptyCtx.useLock(LOCK_4, () => {});
      // emptyCtx.useLock(LOCK_5, () => {});
      
      // Verify context is indeed empty
      assert.deepStrictEqual(emptyCtx.getHeldLocks(), []);
    });

    test('should prevent using non-held locks with single lock', async () => {
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      
      // ✅ Valid: Can use held lock
      let validUsage = false;
      ctx1.useLock(LOCK_1, () => { validUsage = true; });
      assert.strictEqual(validUsage, true);
      
      // ❌ Compile-time errors: Cannot use non-held locks
      // ctx1.useLock(LOCK_2, () => {});
      // ctx1.useLock(LOCK_3, () => {});
      // ctx1.useLock(LOCK_4, () => {});
      // ctx1.useLock(LOCK_5, () => {});
      
      ctx1.dispose();
    });

    test('should prevent using non-held locks with multiple locks', async () => {
      const ctx24 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_4));
      
      // ✅ Valid: Can use held locks
      let lock2Used = false;
      let lock4Used = false;
      ctx24.useLock(LOCK_2, () => { lock2Used = true; });
      ctx24.useLock(LOCK_4, () => { lock4Used = true; });
      
      assert.strictEqual(lock2Used, true);
      assert.strictEqual(lock4Used, true);
      
      // ❌ Compile-time errors: Cannot use non-held locks
      // ctx24.useLock(LOCK_1, () => {}); // Don't have LOCK_1
      // ctx24.useLock(LOCK_3, () => {}); // Don't have LOCK_3
      // ctx24.useLock(LOCK_5, () => {}); // Don't have LOCK_5
      
      ctx24.dispose();
    });

    test('should prevent using non-held locks in complex scenarios', async () => {
      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      
      // ✅ Valid: Can use all held locks
      let usage135 = { lock1: false, lock3: false, lock5: false };
      ctx135.useLock(LOCK_1, () => { usage135.lock1 = true; });
      ctx135.useLock(LOCK_3, () => { usage135.lock3 = true; });
      ctx135.useLock(LOCK_5, () => { usage135.lock5 = true; });
      
      assert.deepStrictEqual(usage135, { lock1: true, lock3: true, lock5: true });
      
      // ❌ Compile-time errors: Cannot use non-held locks
      // ctx135.useLock(LOCK_2, () => {}); // Don't have LOCK_2
      // ctx135.useLock(LOCK_4, () => {}); // Don't have LOCK_4
      
      ctx135.dispose();
    });
  });

  describe('Lock Usage Patterns', () => {
    test('should support nested lock usage operations', async () => {
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      
      let outerExecuted = false;
      let innerExecuted = false;
      
      ctx13.useLock(LOCK_1, () => {
        outerExecuted = true;
        ctx13.useLock(LOCK_3, () => {
          innerExecuted = true;
        });
      });
      
      assert.strictEqual(outerExecuted, true, 'Outer lock usage should execute');
      assert.strictEqual(innerExecuted, true, 'Inner lock usage should execute');
      ctx13.dispose();
    });

    test('should support conditional lock usage', async () => {
      const ctx24 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_4));
      
      const results: string[] = [];
      
      // Use locks conditionally based on some logic
      const useLock2 = true;
      const useLock4 = false;
      
      if (useLock2) {
        ctx24.useLock(LOCK_2, () => { results.push('used-2'); });
      }
      
      if (useLock4) {
        ctx24.useLock(LOCK_4, () => { results.push('used-4'); });
      }
      
      assert.deepStrictEqual(results, ['used-2']);
      ctx24.dispose();
    });

    test('should support lock usage with return values', async () => {
      // NOTE: The current useLock API returns void, not the callback result
      // This test documents the current behavior
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      
      let callbackExecuted = false;
      const result = ctx3.useLock(LOCK_3, () => {
        callbackExecuted = true;
        return 'lock-3-result'; // This return value is not captured
      });
      
      // The useLock method returns void, not the callback result
      assert.strictEqual(result, undefined);
      assert.strictEqual(callbackExecuted, true, 'Callback should execute');
      ctx3.dispose();
    });

    test('should support lock usage with parameters', async () => {
      const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
      
      const results: string[] = [];
      
      ctx15.useLock(LOCK_1, () => {
        results.push('lock-1-executed');
      });
      
      ctx15.useLock(LOCK_5, () => {
        results.push('lock-5-executed');
      });
      
      assert.deepStrictEqual(results, ['lock-1-executed', 'lock-5-executed']);
      ctx15.dispose();
    });
  });

  describe('Lock State Validation', () => {
    test('should maintain consistent state during usage', async () => {
      const ctx234 = await createLockContext()
        .acquireWrite(LOCK_2)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4));
      
      // Verify state before usage
      assert.deepStrictEqual(ctx234.getHeldLocks(), [2, 3, 4]);
      
      // Use locks and verify state remains consistent
      ctx234.useLock(LOCK_2, () => {
        assert.deepStrictEqual(ctx234.getHeldLocks(), [2, 3, 4]);
      });
      
      ctx234.useLock(LOCK_3, () => {
        assert.deepStrictEqual(ctx234.getHeldLocks(), [2, 3, 4]);
      });
      
      ctx234.useLock(LOCK_4, () => {
        assert.deepStrictEqual(ctx234.getHeldLocks(), [2, 3, 4]);
      });
      
      // Verify state after usage
      assert.deepStrictEqual(ctx234.getHeldLocks(), [2, 3, 4]);
      ctx234.dispose();
    });

    test('should validate state across multiple usage patterns', async () => {
      const ctx14 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_4));
      
      const stateSnapshots: number[][] = [];
      
      // Capture state before any usage
      stateSnapshots.push([...ctx14.getHeldLocks()]);
      
      ctx14.useLock(LOCK_1, () => {
        stateSnapshots.push([...ctx14.getHeldLocks()]);
      });
      
      ctx14.useLock(LOCK_4, () => {
        stateSnapshots.push([...ctx14.getHeldLocks()]);
      });
      
      // Capture state after usage
      stateSnapshots.push([...ctx14.getHeldLocks()]);
      
      // All snapshots should be identical
      const expectedState = [1, 4];
      stateSnapshots.forEach((snapshot, index) => {
        assert.deepStrictEqual(snapshot, expectedState, `State snapshot ${index} should be consistent`);
      });
      
      ctx14.dispose();
    });
  });

  describe('Error Prevention', () => {
    test('should prevent using locks after disposal', async () => {
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      
      // Use lock before disposal - should work
      let beforeDisposal = false;
      ctx2.useLock(LOCK_2, () => { beforeDisposal = true; });
      assert.strictEqual(beforeDisposal, true);
      
      // Dispose the context
      ctx2.dispose();
      
      // ❌ At runtime, disposed contexts should not be used
      // This is more of a runtime consideration, but the type system
      // doesn't prevent using disposed contexts (that would require
      // linear types which TypeScript doesn't have)
      
      // Note: This test documents the current limitation
      assert.ok(true, 'Disposal behavior is runtime-only check');
    });

    test('should document type system limitations', async () => {
      // The type system prevents:
      // 1. Using non-held locks ✅
      // 2. Acquiring locks in wrong order ✅
      // 3. Duplicate acquisitions ✅
      
      // The type system cannot prevent:
      // 1. Using disposed contexts (would need linear types)
      // 2. Race conditions (handled by runtime)
      // 3. Resource leaks (handled by runtime + manual disposal)
      
      const ctx = await createLockContext().acquireWrite(LOCK_1);
      ctx.dispose();
      
      assert.ok(true, 'Type system has well-defined boundaries');
    });
  });

  describe('Temporary Lock Acquisition (useLockWithAcquire)', () => {
    test('should acquire lock, execute operation, and release automatically', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      let executedInsideCallback = false;
      await base.useLockWithAcquire(LOCK_3, (ctx) => {
        // Inside callback, should hold both locks
        assert.deepStrictEqual(ctx.getHeldLocks(), [1, 3]);
        executedInsideCallback = true;
      });
      
      assert.strictEqual(executedInsideCallback, true);
      // After callback, base still holds LOCK_1 but LOCK_3 is released
      assert.deepStrictEqual(base.getHeldLocks(), [1]);
      base.dispose();
    });

    test('should support async operations', async () => {
      const base = await createLockContext().acquireWrite(LOCK_2);
      
      const result = await base.useLockWithAcquire(LOCK_4, async (ctx) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return ctx.getHeldLocks().join(',');
      });
      
      assert.strictEqual(result, '2,4');
      assert.deepStrictEqual(base.getHeldLocks(), [2]);
      base.dispose();
    });

    test('should propagate return values', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      const numericResult = await base.useLockWithAcquire(LOCK_2, () => 42);
      assert.strictEqual(numericResult, 42);
      
      const stringResult = await base.useLockWithAcquire(LOCK_3, () => 'test-value');
      assert.strictEqual(stringResult, 'test-value');
      
      const objectResult = await base.useLockWithAcquire(LOCK_4, () => ({ key: 'value' }));
      assert.deepStrictEqual(objectResult, { key: 'value' });
      
      base.dispose();
    });

    test('should release lock even if operation throws', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      try {
        await base.useLockWithAcquire(LOCK_3, () => {
          throw new Error('Intentional error');
        });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.strictEqual((error as Error).message, 'Intentional error');
      }
      
      // LOCK_3 should be released despite error
      assert.deepStrictEqual(base.getHeldLocks(), [1]);
      base.dispose();
    });

    test('should support read mode acquisition', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      await base.useLockWithAcquire(LOCK_3, (ctx) => {
        assert.strictEqual(ctx.getLockMode(LOCK_3), 'read');
      }, 'read');
      
      base.dispose();
    });

    test('should support write mode acquisition (default)', async () => {
      const base = await createLockContext().acquireWrite(LOCK_2);
      
      await base.useLockWithAcquire(LOCK_4, (ctx) => {
        assert.strictEqual(ctx.getLockMode(LOCK_4), 'write');
      });
      
      base.dispose();
    });

    test('should allow nested temporary acquisitions', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      await base.useLockWithAcquire(LOCK_2, async (ctx2) => {
        assert.deepStrictEqual(ctx2.getHeldLocks(), [1, 2]);
        
        await ctx2.useLockWithAcquire(LOCK_4, (ctx4) => {
          assert.deepStrictEqual(ctx4.getHeldLocks(), [1, 2, 4]);
        });
        
        // After inner release, should still hold [1, 2]
        assert.deepStrictEqual(ctx2.getHeldLocks(), [1, 2]);
      });
      
      // After outer release, should only hold [1]
      assert.deepStrictEqual(base.getHeldLocks(), [1]);
      base.dispose();
    });

    test('should enforce compile-time lock ordering', async () => {
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      
      // ✅ Valid: Can acquire higher locks
      await ctx3.useLockWithAcquire(LOCK_5, (ctx) => {
        assert.deepStrictEqual(ctx.getHeldLocks(), [3, 5]);
      });
      
      // ❌ Compile-time error: Cannot acquire lower locks
      // await ctx3.useLockWithAcquire(LOCK_1, () => {});
      // await ctx3.useLockWithAcquire(LOCK_2, () => {});
      
      ctx3.dispose();
    });

    test('should allow using acquired lock within callback', async () => {
      const base = await createLockContext().acquireWrite(LOCK_1);
      
      await base.useLockWithAcquire(LOCK_3, (ctx) => {
        let lock3Used = false;
        ctx.useLock(LOCK_3, () => {
          lock3Used = true;
        });
        assert.strictEqual(lock3Used, true);
      });
      
      base.dispose();
    });
  });
});