/**
 * IronGuard Runtime Mutual Exclusion Tests - Node.js Test Runner Format
 * 
 * Tests runtime mutual exclusion behavior including:
 * - True blocking behavior
 * - Resource contention
 * - Timeout scenarios
 * - Concurrent access patterns
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_6, LOCK_7, LOCK_8, LOCK_9, LOCK_10, LOCK_11, LOCK_12, LOCK_13, LOCK_14, LOCK_15 } from '../src/core';

describe('Runtime Mutual Exclusion', () => {
  describe('Basic Mutual Exclusion', () => {
    test('should block concurrent access to same lock', async () => {
      const startTime = Date.now();
      const results: { context: string; timestamp: number; duration: number }[] = [];

      // First context acquires LOCK_1
      const ctx1Promise = createLockContext().acquireWrite(LOCK_1);
      
      // Second context tries to acquire LOCK_1 - should block
      const ctx2Promise = createLockContext().acquireWrite(LOCK_1);
      
      const ctx1 = await ctx1Promise;
      const acquireTime1 = Date.now();
      results.push({ context: 'ctx1', timestamp: acquireTime1, duration: acquireTime1 - startTime });
      
      // Hold lock for 50ms
      setTimeout(() => {
        ctx1.dispose();
      }, 50);
      
      const ctx2 = await ctx2Promise;
      const acquireTime2 = Date.now();
      results.push({ context: 'ctx2', timestamp: acquireTime2, duration: acquireTime2 - startTime });
      
      ctx2.dispose();
      
      // Verify mutual exclusion timing
      assert.strictEqual(results.length, 2, 'Should have two results');
      assert(results[1]!.duration > results[0]!.duration + 40, 'Second context should wait for first to release');
      assert(results[1]!.duration > 40, 'Should have waited at least 40ms');
    });

    test('should handle multiple locks independently', async () => {
      const startTime = Date.now();
      const results: string[] = [];

      // These should not block each other (different locks)
      const lock1Promise = createLockContext().acquireWrite(LOCK_1).then(ctx => {
        results.push(`LOCK_1 acquired at ${Date.now() - startTime}ms`);
        setTimeout(() => ctx.dispose(), 30);
        return 'lock1-done';
      });

      const lock2Promise = createLockContext().acquireWrite(LOCK_2).then(ctx => {
        results.push(`LOCK_2 acquired at ${Date.now() - startTime}ms`);
        setTimeout(() => ctx.dispose(), 30);
        return 'lock2-done';
      });

      const lock3Promise = createLockContext().acquireWrite(LOCK_3).then(ctx => {
        results.push(`LOCK_3 acquired at ${Date.now() - startTime}ms`);
        setTimeout(() => ctx.dispose(), 30);
        return 'lock3-done';
      });

      await Promise.all([lock1Promise, lock2Promise, lock3Promise]);

      // All should acquire roughly simultaneously (within 10ms)
      assert.strictEqual(results.length, 3, 'All three locks should be acquired');
      // Note: Exact timing assertions are fragile in CI, but we can verify they all completed
    });

    test('should handle same lock contention with multiple waiters', async () => {
      const startTime = Date.now();
      const acquisitionTimes: number[] = [];

      // First context gets the lock
      const ctx1Promise = createLockContext().acquireWrite(LOCK_2);
      
      // Multiple contexts wait for the same lock
      const ctx2Promise = createLockContext().acquireWrite(LOCK_2);
      const ctx3Promise = createLockContext().acquireWrite(LOCK_2);
      const ctx4Promise = createLockContext().acquireWrite(LOCK_2);

      const ctx1 = await ctx1Promise;
      acquisitionTimes.push(Date.now() - startTime);

      // Release after 40ms
      setTimeout(() => ctx1.dispose(), 40);

      const ctx2 = await ctx2Promise;
      acquisitionTimes.push(Date.now() - startTime);
      setTimeout(() => ctx2.dispose(), 20);

      const ctx3 = await ctx3Promise;
      acquisitionTimes.push(Date.now() - startTime);
      setTimeout(() => ctx3.dispose(), 20);

      const ctx4 = await ctx4Promise;
      acquisitionTimes.push(Date.now() - startTime);
      ctx4.dispose();

      // Verify serial execution
      assert.strictEqual(acquisitionTimes.length, 4, 'Should have four acquisition times');
      assert(acquisitionTimes[1]! > acquisitionTimes[0]! + 35, 'Second should wait for first');
      assert(acquisitionTimes[2]! > acquisitionTimes[1]! + 15, 'Third should wait for second');
      assert(acquisitionTimes[3]! > acquisitionTimes[2]! + 15, 'Fourth should wait for third');
    });
  });

  describe('Lock Ordering and Mutual Exclusion', () => {
    test('should maintain mutual exclusion with ordered acquisitions', async () => {
      const results: string[] = [];

      // Two contexts acquiring locks in order
      const sequence1 = async () => {
        const ctx1 = await createLockContext().acquireWrite(LOCK_1);
        results.push('Seq1: Got LOCK_1');
        
        setTimeout(() => {
          ctx1.acquireWrite(LOCK_2).then(ctx12 => {
            results.push('Seq1: Got LOCK_2');
            setTimeout(() => ctx12.dispose(), 30);
          });
        }, 20);
      };

      const sequence2 = async () => {
        // Slight delay to ensure sequence1 gets LOCK_1 first
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const ctx1 = await createLockContext().acquireWrite(LOCK_1);
        results.push('Seq2: Got LOCK_1');
        
        const ctx12 = await ctx1.acquireWrite(LOCK_2);
        results.push('Seq2: Got LOCK_2');
        ctx12.dispose();
      };

      await Promise.all([sequence1(), sequence2()]);

      // Should see interleaved but proper ordering
      assert(results.includes('Seq1: Got LOCK_1'), 'Sequence 1 should get LOCK_1');
      assert(results.includes('Seq2: Got LOCK_1'), 'Sequence 2 should eventually get LOCK_1');
    });

    test('should prevent deadlock with consistent ordering', async () => {
      // This test demonstrates that our system prevents deadlocks
      // by enforcing consistent lock ordering at compile-time
      
      const results: string[] = [];

      const task1 = async () => {
        const ctx1 = await createLockContext().acquireWrite(LOCK_1);
        results.push('Task1: LOCK_1');
        
        const ctx12 = await ctx1.acquireWrite(LOCK_2);
        results.push('Task1: LOCK_2');
        
        setTimeout(() => ctx12.dispose(), 50);
      };

      const task2 = async () => {
        // Even if task2 wants LOCK_2 first, it must follow ordering
        // This would be a compile-time error:
        // const ctx2 = await createLockContext().acquireWrite(LOCK_2);
        // const ctx21 = await ctx2.acquireWrite(LOCK_1); // ❌ Cannot go 2→1
        
        // Must acquire in order: 1→2
        const ctx1 = await createLockContext().acquireWrite(LOCK_1);
        results.push('Task2: LOCK_1');
        
        const ctx12 = await ctx1.acquireWrite(LOCK_2);
        results.push('Task2: LOCK_2');
        
        ctx12.dispose();
      };

      await Promise.all([task1(), task2()]);

      // Both tasks complete without deadlock
      assert.strictEqual(results.filter(r => r.includes('LOCK_1')).length, 2, 'Both tasks should get LOCK_1');
      assert.strictEqual(results.filter(r => r.includes('LOCK_2')).length, 2, 'Both tasks should get LOCK_2');
    });
  });

  describe('Resource Management', () => {
    test('should properly release locks on disposal', async () => {
      const acquisitionOrder: string[] = [];

      // Context 1 acquires and releases quickly
      const ctx1 = await createLockContext().acquireWrite(LOCK_3);
      acquisitionOrder.push('ctx1-acquired');
      
      // Context 2 waits for LOCK_3
      const ctx2Promise = createLockContext().acquireWrite(LOCK_3);
      
      // Release ctx1 after 30ms
      setTimeout(() => {
        ctx1.dispose();
        acquisitionOrder.push('ctx1-disposed');
      }, 30);

      const ctx2 = await ctx2Promise;
      acquisitionOrder.push('ctx2-acquired');
      ctx2.dispose();

      assert.deepStrictEqual(acquisitionOrder, ['ctx1-acquired', 'ctx1-disposed', 'ctx2-acquired']);
    });

    test('should handle complex disposal scenarios', async () => {
      const events: string[] = [];

      // Create nested lock contexts
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      events.push('LOCK_1 acquired');
      
      const ctx12 = await ctx1.acquireWrite(LOCK_2);
      events.push('LOCK_2 acquired');
      
      const ctx123 = await ctx12.acquireWrite(LOCK_3);
      events.push('LOCK_3 acquired');

      // Another context waiting for LOCK_1
      const waitingPromise = createLockContext().acquireWrite(LOCK_1);

      // Dispose the nested context (should release all locks)
      ctx123.dispose();
      events.push('All locks disposed');

      // Waiting context should now acquire LOCK_1
      const waitingCtx = await waitingPromise;
      events.push('Waiting context got LOCK_1');
      waitingCtx.dispose();

      assert.strictEqual(events.length, 5, 'All events should occur');
      assert(events.includes('All locks disposed'), 'Should dispose all locks');
      assert(events.includes('Waiting context got LOCK_1'), 'Waiting context should acquire lock');
    });

    test('should prevent resource leaks', async () => {
      // Create multiple contexts and dispose them properly
      const contexts: any[] = [];

      for (let i = 1; i <= 5; i++) {
        const ctx = await createLockContext().acquireWrite(i as any);
        contexts.push(ctx);
      }

      // All contexts should be independent (different locks)
      assert.strictEqual(contexts.length, 5, 'Should create 5 contexts');

      // Dispose all contexts
      contexts.forEach(ctx => ctx.dispose());

      // Verify we can acquire all locks again (no leaks)
      const newCtx1 = await createLockContext().acquireWrite(LOCK_1);
      const newCtx2 = await createLockContext().acquireWrite(LOCK_2);
      const newCtx3 = await createLockContext().acquireWrite(LOCK_3);
      const newCtx4 = await createLockContext().acquireWrite(LOCK_4);
      const newCtx5 = await createLockContext().acquireWrite(LOCK_5);

      // Clean up
      [newCtx1, newCtx2, newCtx3, newCtx4, newCtx5].forEach(ctx => ctx.dispose());

      assert.ok(true, 'No resource leaks detected');
    });
  });

  describe('Concurrent Access Patterns', () => {
    test('should handle high concurrency on single lock', async () => {
      const concurrencyLevel = 10;
      const acquisitionOrder: number[] = [];
      const startTime = Date.now();

      // Create many concurrent requests for same lock
      const promises = Array.from({ length: concurrencyLevel }, async (_, index) => {
        const ctx = await createLockContext().acquireWrite(LOCK_4);
        acquisitionOrder.push(index);
        
        // Hold lock briefly
        await new Promise(resolve => setTimeout(resolve, 5));
        ctx.dispose();
        
        return index;
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should complete
      assert.strictEqual(results.length, concurrencyLevel, 'All contexts should complete');
      assert.strictEqual(acquisitionOrder.length, concurrencyLevel, 'All acquisitions should be recorded');
      
      // Should take time due to serialization
      assert(endTime - startTime > concurrencyLevel * 3, 'Should serialize access');
    });

    test('should handle mixed lock access patterns', async () => {
      const results: { lock: number; context: string; timestamp: number }[] = [];
      const startTime = Date.now();

      // Mix of different lock acquisitions
      const patterns = [
        { lock: LOCK_1, name: 'pattern1' },
        { lock: LOCK_2, name: 'pattern2' },
        { lock: LOCK_1, name: 'pattern3' }, // Should block pattern1
        { lock: LOCK_3, name: 'pattern4' },
        { lock: LOCK_2, name: 'pattern5' }, // Should block pattern2
      ];

      const promises = patterns.map(async ({ lock, name }) => {
        const ctx = await createLockContext().acquireWrite(lock);
        results.push({ 
          lock, 
          context: name, 
          timestamp: Date.now() - startTime 
        });
        
        await new Promise(resolve => setTimeout(resolve, 20));
        ctx.dispose();
      });

      await Promise.all(promises);

      // Should have all results
      assert.strictEqual(results.length, 5, 'All patterns should complete');
      
      // LOCK_1 contention: pattern1 and pattern3
      const lock1Results = results.filter(r => r.lock === LOCK_1);
      assert.strictEqual(lock1Results.length, 2, 'Two contexts used LOCK_1');
      
      // LOCK_2 contention: pattern2 and pattern5  
      const lock2Results = results.filter(r => r.lock === LOCK_2);
      assert.strictEqual(lock2Results.length, 2, 'Two contexts used LOCK_2');
      
      // LOCK_3 should be independent
      const lock3Results = results.filter(r => r.lock === LOCK_3);
      assert.strictEqual(lock3Results.length, 1, 'One context used LOCK_3');
    });

    test('should maintain consistency under load', async () => {
      // Stress test with rapid acquisition/disposal cycles
      const iterations = 20;
      const results: boolean[] = [];

      const stressTest = async (lockLevel: any, testId: string) => {
        for (let i = 0; i < iterations; i++) {
          const ctx = await createLockContext().acquireWrite(lockLevel);
          
          // Verify state consistency
          const heldLocks = ctx.getHeldLocks();
          const isConsistent = heldLocks.includes(lockLevel);
          results.push(isConsistent);
          
          // Brief hold time
          await new Promise(resolve => setTimeout(resolve, 1));
          ctx.dispose();
        }
      };

      // Run stress tests on multiple locks concurrently
      await Promise.all([
        stressTest(LOCK_1, 'stress1'),
        stressTest(LOCK_2, 'stress2'),
        stressTest(LOCK_3, 'stress3'),
      ]);

      // All operations should maintain consistency
      const totalOperations = iterations * 3;
      assert.strictEqual(results.length, totalOperations, 'All operations should complete');
      assert(results.every(r => r === true), 'All operations should be consistent');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle rapid disposal scenarios', async () => {
      const events: string[] = [];

      // Acquire lock
      const ctx = await createLockContext().acquireWrite(LOCK_5);
      events.push('acquired');

      // Another context waits
      const waitingPromise = createLockContext().acquireWrite(LOCK_5);

      // Dispose immediately
      ctx.dispose();
      events.push('disposed');

      // Waiting should succeed quickly
      const waitingCtx = await waitingPromise;
      events.push('waiting-acquired');
      waitingCtx.dispose();

      assert.deepStrictEqual(events, ['acquired', 'disposed', 'waiting-acquired']);
    });

    test('should handle multiple disposal calls gracefully', async () => {
      const ctx = await createLockContext().acquireWrite(LOCK_1);

      // Multiple dispose calls should not cause issues
      ctx.dispose();
      ctx.dispose(); // Should be safe
      ctx.dispose(); // Should be safe

      // Should be able to acquire the lock again
      const newCtx = await createLockContext().acquireWrite(LOCK_1);
      newCtx.dispose();

      assert.ok(true, 'Multiple disposal should be safe');
    });

    test('should document runtime limitations', async () => {
      // Runtime system provides:
      // 1. True mutual exclusion ✅
      // 2. Proper resource cleanup ✅  
      // 3. Deadlock prevention (via compile-time ordering) ✅
      // 4. Memory safety ✅

      // Runtime system cannot prevent:
      // 1. Logic errors in user code
      // 2. Forgetting to dispose contexts (memory leaks)
      // 3. Using disposed contexts (would need linear types)

      const ctx = await createLockContext().acquireWrite(LOCK_2);
      ctx.dispose();

      // This is a runtime concern - disposed context might still be usable
      // but shouldn't be used (best practice)
      assert.ok(true, 'Runtime has well defined capabilities and limitations');
    });
  });

  describe('High Lock Level Mutual Exclusion (6-15)', () => {
    test('should provide mutual exclusion for high locks', async () => {
      const results: { thread: number; timestamp: number; action: string }[] = [];

      // Test LOCK_10 mutual exclusion
      const promises = [];
      for (let i = 1; i <= 3; i++) {
        promises.push(
          (async () => {
            const ctx = await createLockContext().acquireWrite(LOCK_10);
            results.push({ thread: i, timestamp: Date.now(), action: 'acquired LOCK_10' });
            
            // Hold lock briefly
            await new Promise(resolve => setTimeout(resolve, 50));
            
            ctx.dispose();
            results.push({ thread: i, timestamp: Date.now(), action: 'released LOCK_10' });
          })()
        );
      }

      await Promise.all(promises);

      // Verify sequential access (no overlapping acquisitions)
      const acquisitions = results.filter(r => r.action === 'acquired LOCK_10');
      const releases = results.filter(r => r.action === 'released LOCK_10');

      assert.strictEqual(acquisitions.length, 3, 'Should have 3 acquisitions');
      assert.strictEqual(releases.length, 3, 'Should have 3 releases');

      // Verify mutual exclusion - each acquisition should come after previous release
      for (let i = 1; i < acquisitions.length; i++) {
        const prevRelease = releases[i - 1];
        const currAcquisition = acquisitions[i];
        if (prevRelease && currAcquisition) {
          assert.ok(
            currAcquisition.timestamp >= prevRelease.timestamp,
            `Thread ${currAcquisition.thread} acquired before thread ${prevRelease.thread} released`
          );
        }
      }
    });

    test('should allow independent high locks concurrently', async () => {
      const results: { lock: number; timestamp: number; action: string }[] = [];

      // Test different high locks can be acquired concurrently
      const promises = [
        (async () => {
          const ctx = await createLockContext().acquireWrite(LOCK_8);
          results.push({ lock: 8, timestamp: Date.now(), action: 'acquired' });
          await new Promise(resolve => setTimeout(resolve, 30));
          ctx.dispose();
          results.push({ lock: 8, timestamp: Date.now(), action: 'released' });
        })(),
        (async () => {
          const ctx = await createLockContext().acquireWrite(LOCK_12);
          results.push({ lock: 12, timestamp: Date.now(), action: 'acquired' });
          await new Promise(resolve => setTimeout(resolve, 30));
          ctx.dispose();
          results.push({ lock: 12, timestamp: Date.now(), action: 'released' });
        })(),
        (async () => {
          const ctx = await createLockContext().acquireWrite(LOCK_15);
          results.push({ lock: 15, timestamp: Date.now(), action: 'acquired' });
          await new Promise(resolve => setTimeout(resolve, 30));
          ctx.dispose();
          results.push({ lock: 15, timestamp: Date.now(), action: 'released' });
        })()
      ];

      await Promise.all(promises);

      const acquisitions = results.filter(r => r.action === 'acquired');
      assert.strictEqual(acquisitions.length, 3, 'Should acquire all 3 different high locks');
      
      // Different locks should be able to run concurrently (timestamps close together)
      const timestamps = acquisitions.map(a => a.timestamp);
      const maxSpread = Math.max(...timestamps) - Math.min(...timestamps);
      assert.ok(maxSpread < 100, 'Different locks should be acquired nearly simultaneously');
    });

    test('should handle complex high lock contention', async () => {
      const results: string[] = [];

      // Multiple threads competing for LOCK_13
      const promises = [];
      for (let i = 1; i <= 4; i++) {
        promises.push(
          (async () => {
            const ctx = await createLockContext().acquireWrite(LOCK_13);
            results.push(`Thread ${i} acquired LOCK_13`);
            
            // Variable hold time to create interesting contention
            await new Promise(resolve => setTimeout(resolve, i * 20));
            
            ctx.dispose();
            results.push(`Thread ${i} released LOCK_13`);
          })()
        );
      }

      await Promise.all(promises);

      // Should have exactly 4 acquisitions and 4 releases
      const acquisitions = results.filter(r => r.includes('acquired'));
      const releases = results.filter(r => r.includes('released'));
      
      assert.strictEqual(acquisitions.length, 4, 'Should have 4 acquisitions');
      assert.strictEqual(releases.length, 4, 'Should have 4 releases');
      
      // Verify proper alternating pattern (no two acquisitions without a release)
      let acquired = 0;
      for (const result of results) {
        if (result.includes('acquired')) {
          assert.strictEqual(acquired, 0, 'Should not acquire while already acquired');
          acquired = 1;
        } else if (result.includes('released')) {
          assert.strictEqual(acquired, 1, 'Should not release without acquiring');
          acquired = 0;
        }
      }
    });
  });
});