/**
 * IronGuard Function Parameter Validation Tests - Node.js Test Runner Format
 * 
 * Tests compile-time function parameter validation including:
 * - Lock requirement constraints
 * - Flexible lock contexts
 * - Generic function compatibility
 * - Cross-function lock validation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from '../src/core';
import type { Contains, LockContext, LockLevel } from '../src/core';

describe('Compile-time Function Parameter Validation', () => {
  describe('Specific Lock Requirements', () => {
    test('should enforce specific lock requirements', async () => {
      // Function that requires exactly LOCK_2
      function requiresLock2<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
      ): string {
        return `Function executed with locks: ${context.getHeldLocks().join(',')}`;
      }

      // ✅ Valid: Context has LOCK_2
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      const result1 = requiresLock2(ctx2);
      assert.ok(result1.includes('2'), 'Should work with LOCK_2');
      ctx2.dispose();

      // ✅ Valid: Context has LOCK_2 among others
      const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
      const result2 = requiresLock2(ctx12);
      assert.ok(result2.includes('1') && result2.includes('2'), 'Should work with LOCK_1,LOCK_2');
      ctx12.dispose();

      const ctx234 = await createLockContext()
        .acquireWrite(LOCK_2)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4));
      const result3 = requiresLock2(ctx234);
      assert.ok(result3.includes('2') && result3.includes('3') && result3.includes('4'), 'Should work with LOCK_2,LOCK_3,LOCK_4');
      ctx234.dispose();

      // ❌ Compile-time errors: Missing LOCK_2
      // requiresLock2(createLockContext()); // Empty context
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // requiresLock2(ctx1); // Only LOCK_1
      // const ctx34 = await createLockContext().acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_4));
      // requiresLock2(ctx34); // LOCK_3,LOCK_4 but no LOCK_2
    });

    test('should enforce multiple specific lock requirements', async () => {
      // Function that requires both LOCK_1 and LOCK_3
      function requiresLock1And3<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 1> extends true 
          ? Contains<THeld, 3> extends true 
            ? LockContext<THeld> 
            : never 
          : never
      ): string {
        return `Has both locks: ${context.getHeldLocks().join(',')}`;
      }

      // ✅ Valid: Has both LOCK_1 and LOCK_3
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      const result1 = requiresLock1And3(ctx13);
      assert.ok(result1.includes('1') && result1.includes('3'), 'Should work with LOCK_1,LOCK_3');
      ctx13.dispose();

      const ctx135 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_5));
      const result2 = requiresLock1And3(ctx135);
      assert.ok(result2.includes('1') && result2.includes('3') && result2.includes('5'), 'Should work with LOCK_1,LOCK_3,LOCK_5');
      ctx135.dispose();

      // ❌ Compile-time errors: Missing required locks
      // requiresLock1And3(createLockContext()); // Empty
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // requiresLock1And3(ctx1); // Only LOCK_1, missing LOCK_3
      // const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      // requiresLock1And3(ctx3); // Only LOCK_3, missing LOCK_1
      // const ctx24 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_4));
      // requiresLock1And3(ctx24); // Neither LOCK_1 nor LOCK_3
    });

    test('should enforce high-level lock requirements', async () => {
      // Function that requires LOCK_5 (highest level)
      function requiresLock5<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 5> extends true ? LockContext<THeld> : never
      ): boolean {
        return context.getHeldLocks().includes(5);
      }

      // ✅ Valid: Has LOCK_5
      const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      const result1 = requiresLock5(ctx5);
      assert.strictEqual(result1, true);
      ctx5.dispose();

      const ctx25 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_5));
      const result2 = requiresLock5(ctx25);
      assert.strictEqual(result2, true);
      ctx25.dispose();

      // ❌ Compile-time errors: Missing LOCK_5
      // requiresLock5(createLockContext()); // Empty
      // const ctx1234 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2)).then(c => c.acquireWrite(LOCK_3)).then(c => c.acquireWrite(LOCK_4));
      // requiresLock5(ctx1234); // All except LOCK_5
    });
  });

  describe('Flexible Lock Context Validation', () => {
    test('should work with Contains constraints for lock validation', async () => {
      // Function that accepts contexts that contain LOCK_3
      async function requiresLock3<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
      ): Promise<boolean> {
        // This function can only work with contexts that have LOCK_3
        return Promise.resolve(true);
      }

      // ✅ Valid: Already has LOCK_3
      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      const ctx3Result = await requiresLock3(ctx3);
      assert.strictEqual(ctx3Result, true);
      ctx3.dispose();

      // ✅ Valid: Already has LOCK_3 with higher locks
      const ctx34 = await createLockContext().acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_4));
      const ctx34Result = await requiresLock3(ctx34);
      assert.strictEqual(ctx34Result, true);
      ctx34.dispose();

      const ctx345 = await createLockContext()
        .acquireWrite(LOCK_3)
        .then(c => c.acquireWrite(LOCK_4))
        .then(c => c.acquireWrite(LOCK_5));
      const ctx345Result = await requiresLock3(ctx345);
      assert.strictEqual(ctx345Result, true);
      ctx345.dispose();

      // ❌ Compile-time errors: Does not have LOCK_3
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // flexibleLock3Function(ctx4); // LOCK_4 cannot acquire LOCK_3 (ordering violation)
      // const ctx5 = await createLockContext().acquireWrite(LOCK_5);
      // flexibleLock3Function(ctx5); // LOCK_5 cannot acquire LOCK_3 (ordering violation)
      // const ctx45 = await createLockContext().acquireWrite(LOCK_4).then(c => c.acquireWrite(LOCK_5));
      // flexibleLock3Function(ctx45); // LOCK_4,LOCK_5 cannot acquire LOCK_3
      // const ctx34 = await createLockContext().acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_4));
      // flexibleLock3Function(ctx34); // Already has LOCK_3, cannot acquire again
      // const ctx35 = await createLockContext().acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_5));
      // flexibleLock3Function(ctx35); // Already has LOCK_3, cannot acquire again
    });

    test('should work with different lock context patterns', async () => {
      // Function accepting contexts that can acquire LOCK_1 (any context)
      function flexibleLock1Function<THeld extends readonly LockLevel[]>(
        context: LockContext<THeld> // Any context can acquire LOCK_1
      ): string {
        return `Can acquire LOCK_1 from: [${context.getHeldLocks().join(',')}]`;
      }

      // ✅ Valid: All contexts can acquire LOCK_1
      const results: string[] = [];
      
      results.push(flexibleLock1Function(createLockContext()));
      
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      results.push(flexibleLock1Function(ctx2));
      ctx2.dispose();

      const ctx3 = await createLockContext().acquireWrite(LOCK_3);
      results.push(flexibleLock1Function(ctx3));
      ctx3.dispose();

      const ctx45 = await createLockContext().acquireWrite(LOCK_4).then(c => c.acquireWrite(LOCK_5));
      results.push(flexibleLock1Function(ctx45));
      ctx45.dispose();

      assert.strictEqual(results.length, 4, 'All contexts should be valid for LOCK_1');
    });
  });

  describe('Generic Function Compatibility', () => {
    test('should work with generic constraint functions', async () => {
      // Generic function with lock constraints
      function processWithMinimumLock<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 2> extends true ? LockContext<THeld> : never,
        processor: (locks: readonly LockLevel[]) => string
      ): string {
        return processor(context.getHeldLocks());
      }

      const processor = (locks: readonly LockLevel[]) => `Processed: ${locks.join(',')}`;

      // ✅ Valid: Various contexts with LOCK_2
      const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      const result1 = processWithMinimumLock(ctx2, processor);
      assert.strictEqual(result1, 'Processed: 2');
      ctx2.dispose();

      const ctx234 = await createLockContext()
        .acquireWrite(LOCK_2)
        .then(c => c.acquireWrite(LOCK_3))
        .then(c => c.acquireWrite(LOCK_4));
      const result2 = processWithMinimumLock(ctx234, processor);
      assert.strictEqual(result2, 'Processed: 2,3,4');
      ctx234.dispose();

      // ❌ Compile-time errors: Missing LOCK_2
      // processWithMinimumLock(createLockContext(), processor); // Empty
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // processWithMinimumLock(ctx1, processor); // Only LOCK_1
    });

    test('should support function composition with lock requirements', async () => {
      // Chain of functions with different lock requirements
      function stepOne<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
      ): string {
        return `Step 1 with: ${context.getHeldLocks().join(',')}`;
      }

      function stepTwo<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 2> extends true ? LockContext<THeld> : never,
        previousResult: string
      ): string {
        return `${previousResult} -> Step 2 with: ${context.getHeldLocks().join(',')}`;
      }

      // ✅ Valid: Context satisfies both requirements
      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));

      const step1Result = stepOne(ctx123); // Needs LOCK_3
      const step2Result = stepTwo(ctx123, step1Result); // Needs LOCK_2

      assert.ok(step1Result.includes('1,2,3'), 'Step 1 should work');
      assert.ok(step2Result.includes('Step 2'), 'Step 2 should work');
      ctx123.dispose();

      // ❌ Compile-time errors: Context doesn't satisfy both
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // const step1Only = stepOne(ctx1); // Fails - missing LOCK_3
      // stepTwo(ctx1, step1Only); // Fails - missing LOCK_2
      
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // stepOne(ctx4); // Fails - cannot acquire LOCK_3 from LOCK_4
    });

    test('should handle complex generic scenarios', async () => {
      // Function that requires specific pattern: must have LOCK_1 and be able to acquire LOCK_4
      function complexRequirement<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 1> extends true
          ? Contains<THeld, 4> extends true
            ? never // Already has LOCK_4, cannot acquire again
            : Contains<THeld, 5> extends true
              ? never // Has LOCK_5, cannot acquire LOCK_4 (would be backwards)
              : LockContext<THeld>
          : never
      ): string {
        return `Complex pattern satisfied: ${context.getHeldLocks().join(',')}`;
      }

      // ✅ Valid: Has LOCK_1, can acquire LOCK_4
      const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      const result1 = complexRequirement(ctx1);
      assert.ok(result1.includes('1'), 'Should work with LOCK_1 only');
      ctx1.dispose();

      const ctx123 = await createLockContext()
        .acquireWrite(LOCK_1)
        .then(c => c.acquireWrite(LOCK_2))
        .then(c => c.acquireWrite(LOCK_3));
      const result2 = complexRequirement(ctx123);
      assert.ok(result2.includes('1,2,3'), 'Should work with LOCK_1,LOCK_2,LOCK_3');
      ctx123.dispose();

      // ❌ Compile-time errors: Various violations
      // complexRequirement(createLockContext()); // Missing LOCK_1
      // const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      // complexRequirement(ctx2); // Missing LOCK_1
      // const ctx14 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_4));
      // complexRequirement(ctx14); // Already has LOCK_4
      // const ctx15 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_5));
      // complexRequirement(ctx15); // Has LOCK_5, cannot acquire LOCK_4
    });
  });

  describe('Cross-Function Lock Validation', () => {
    test('should validate locks across function boundaries', async () => {
      // Function A requires LOCK_1
      function functionA<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 1> extends true ? LockContext<THeld> : never
      ): string {
        return `A executed with: ${context.getHeldLocks().join(',')}`;
      }

      // Function B requires LOCK_2
      function functionB<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
      ): string {
        return `B executed with: ${context.getHeldLocks().join(',')}`;
      }

      // Function C calls both A and B
      function functionC<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 1> extends true 
          ? Contains<THeld, 2> extends true 
            ? LockContext<THeld> 
            : never 
          : never
      ): string {
        const resultA = functionA(context);
        const resultB = functionB(context);
        return `C: ${resultA} | ${resultB}`;
      }

      // ✅ Valid: Context has both LOCK_1 and LOCK_2
      const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
      const resultC = functionC(ctx12);
      
      assert.ok(resultC.includes('A executed'), 'Function A should execute');
      assert.ok(resultC.includes('B executed'), 'Function B should execute');
      assert.ok(resultC.includes('1,2'), 'Should show both locks');
      ctx12.dispose();

      // ❌ Compile-time errors: Missing required locks
      // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
      // functionC(ctx1); // Missing LOCK_2
      // const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      // functionC(ctx2); // Missing LOCK_1
    });

    test('should handle intermediate function lock passing', async () => {
      // Low-level function needing LOCK_3
      function lowLevel<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
      ): number {
        return context.getHeldLocks().length;
      }

      // Mid-level function that passes through to low-level
      function midLevel<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
      ): string {
        const count = lowLevel(context);
        return `Mid-level processed ${count} locks`;
      }

      // High-level function that orchestrates
      function highLevel<THeld extends readonly LockLevel[]>(
        context: Contains<THeld, 3> extends true ? LockContext<THeld> : never
      ): string {
        const midResult = midLevel(context);
        return `High-level: ${midResult}`;
      }

      // ✅ Valid: Lock requirement propagates through all levels
      const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
      const result = highLevel(ctx13);
      
      assert.ok(result.includes('High-level'), 'High-level should execute');
      assert.ok(result.includes('Mid-level processed 2'), 'Should count 2 locks');
      ctx13.dispose();

      // ❌ Compile-time errors: Missing LOCK_3 at any level
      // const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
      // highLevel(ctx12); // Fails at high level
      // midLevel(ctx12); // Fails at mid level  
      // lowLevel(ctx12); // Fails at low level
    });

    test('should support lock requirement inheritance', async () => {
      // Base interface requiring LOCK_2
      interface BaseLockInterface {
        process<THeld extends readonly LockLevel[]>(
          context: Contains<THeld, 2> extends true ? LockContext<THeld> : never
        ): string;
      }

      // Implementation that also requires LOCK_4
      class ExtendedLockProcessor implements BaseLockInterface {
        process<THeld extends readonly LockLevel[]>(
          context: Contains<THeld, 2> extends true 
            ? Contains<THeld, 4> extends true 
              ? LockContext<THeld> 
              : never 
            : never
        ): string {
          return `Extended processing: ${context.getHeldLocks().join(',')}`;
        }
      }

      const processor = new ExtendedLockProcessor();

      // ✅ Valid: Has both LOCK_2 and LOCK_4
      const ctx24 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_4));
      const result = processor.process(ctx24);
      assert.ok(result.includes('2,4'), 'Should work with both required locks');
      ctx24.dispose();

      // ❌ Compile-time errors: Missing either lock
      // const ctx2 = await createLockContext().acquireWrite(LOCK_2);
      // processor.process(ctx2); // Missing LOCK_4
      // const ctx4 = await createLockContext().acquireWrite(LOCK_4);
      // processor.process(ctx4); // Missing LOCK_2
    });
  });
});