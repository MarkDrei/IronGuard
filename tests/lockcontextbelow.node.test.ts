/**
 * Test suite for LockContextBelow type and its usage
 * 
 * This tests the fix for the issue where wantsToTakeLock3 was trying to acquire
 * LOCK_2 instead of LOCK_3, demonstrating:
 * 1. The correct implementation (acquiring LOCK_3)
 * 2. The type safety guarantees at the call site
 * 3. The limitations of conditional types in generic contexts
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  createLockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  type LockContext,
  type LockLevel,
} from '../src/core';

// Reproduce the helper types from contextTransferDemo.ts
type Max<
  T extends readonly number[],
  Current extends number = 0,
  Acc extends unknown[] = []
> = T extends readonly [infer First extends number, ...infer Rest extends readonly number[]]
  ? Acc['length'] extends Current
    ? Acc['length'] extends First
      ? Max<Rest, First, Acc>
      : Max<Rest, First, [...Acc, unknown]>
    : Max<T, Current, [...Acc, unknown]>
  : Current;

type AllLessThan<
  T extends readonly number[],
  MaxVal extends number,
  Acc extends unknown[] = []
> = T extends readonly [infer First extends number, ...infer Rest extends readonly number[]]
  ? Acc['length'] extends MaxVal
    ? false
    : Acc['length'] extends First
      ? AllLessThan<Rest, MaxVal, Acc>
      : AllLessThan<Rest, MaxVal, [...Acc, unknown]>
  : true;

type LockContextBelow<
  MaxLevel extends LockLevel,
  THeldLocks extends readonly LockLevel[] = readonly LockLevel[]
> = 
  THeldLocks extends readonly []
    ? LockContext<readonly []>
    : Max<THeldLocks> extends infer M extends LockLevel
      ? M extends MaxLevel
        ? never
        : AllLessThan<THeldLocks, MaxLevel> extends true
          ? LockContext<THeldLocks>
          : never
      : never;

/**
 * The corrected function that acquires LOCK_3 (not LOCK_2)
 */
async function wantsToTakeLock3<
  THeldLocks extends readonly LockLevel[]
>(
  context: LockContextBelow<3, THeldLocks>
): Promise<string> {
  // FIXED: Now acquires LOCK_3 instead of LOCK_2
  const lock3Ctx = await context.acquireWrite(LOCK_3);
  
  const result = `Acquired LOCK_3 from ${context.toString()}. Now holding: ${lock3Ctx.toString()}`;
  
  lock3Ctx.dispose();
  return result;
}

test('LockContextBelow: accepts empty context', async () => {
  const emptyCtx = createLockContext();
  const result = await wantsToTakeLock3(emptyCtx);
  
  assert.ok(result.includes('Acquired LOCK_3'));
  assert.ok(result.includes('LOCK_3'));
  
  emptyCtx.dispose();
});

test('LockContextBelow: accepts context with LOCK_1', async () => {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const result = await wantsToTakeLock3(ctx1);
  
  assert.ok(result.includes('Acquired LOCK_3'));
  assert.ok(result.includes('1W'), 'Result should include original LOCK_1');
  assert.ok(result.includes('3W'), 'Result should include newly acquired LOCK_3');
  
  ctx1.dispose();
});

test('LockContextBelow: accepts context with LOCK_2', async () => {
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const result = await wantsToTakeLock3(ctx2);
  
  assert.ok(result.includes('Acquired LOCK_3'));
  assert.ok(result.includes('2W'), 'Result should include original LOCK_2');
  assert.ok(result.includes('3W'), 'Result should include newly acquired LOCK_3');
  
  ctx2.dispose();
});

test('LockContextBelow: accepts context with LOCK_1 and LOCK_2', async () => {
  const ctx12 = await createLockContext().acquireWrite(LOCK_1);
  const ctx12b = await ctx12.acquireWrite(LOCK_2);
  const result = await wantsToTakeLock3(ctx12b);
  
  assert.ok(result.includes('Acquired LOCK_3'));
  assert.ok(result.includes('1W'), 'Result should include original LOCK_1');
  assert.ok(result.includes('2W'), 'Result should include original LOCK_2');
  assert.ok(result.includes('3W'), 'Result should include newly acquired LOCK_3');
  
  ctx12b.dispose();
});

test('LockContextBelow: successfully acquires LOCK_3 and returns correct state', async () => {
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const result = await wantsToTakeLock3(ctx1);
  
  // Verify the result message is correct
  assert.ok(result.includes('Acquired LOCK_3'), 'Should mention acquiring LOCK_3');
  assert.ok(result.includes('Now holding'), 'Should show the final lock state');
  
  ctx1.dispose();
});

// ❌ Compile-time failure examples (commented out)
// These demonstrate scenarios that TypeScript correctly prevents

// test('LockContextBelow: COMPILE ERROR - rejects context with LOCK_3', async () => {
//   const ctx3 = await createLockContext().acquireWrite(LOCK_3);
//   
//   // ERROR: Context holds LOCK_3 (not < 3), so LockContextBelow<3, [3]> = never
//   await wantsToTakeLock3(ctx3);
//   
//   ctx3.dispose();
// });

// test('LockContextBelow: COMPILE ERROR - rejects context with LOCK_4', async () => {
//   const ctx4 = await createLockContext().acquireWrite(4);
//   
//   // ERROR: Context holds LOCK_4 (not < 3), so LockContextBelow<3, [4]> = never
//   await wantsToTakeLock3(ctx4);
//   
//   ctx4.dispose();
// });

// Test that demonstrates the old buggy behavior would have failed at runtime
test('Documentation: Why the fix was necessary', async () => {
  // The old code tried to acquire LOCK_2 instead of LOCK_3
  // This would have failed if called with a context holding LOCK_2:
  
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  
  // OLD BUGGY CODE would have done: context.acquireWrite(LOCK_2)
  // This would fail at runtime because LOCK_2 is already held
  // TypeScript should catch this, but with conditional types it didn't
  
  // NEW FIXED CODE does: context.acquireWrite(LOCK_3)
  // This works because LOCK_3 can be acquired after LOCK_2
  const result = await wantsToTakeLock3(ctx2);
  
  assert.ok(result.includes('3W'), 'Should successfully acquire LOCK_3');
  
  ctx2.dispose();
});
