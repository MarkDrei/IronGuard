/**
 * Testing assertion function approach for lock validation
 */

import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4,
  LOCK_5,
  LockContext,
  type LockLevel,
  type CanAcquireLock3
} from './src/core';

// Approach 1: Type assertion function (validates but doesn't help with usage)
function assertCanAcquireLock3<THeld extends readonly LockLevel[]>(
  ctx: LockContext<THeld>
): asserts ctx is CanAcquireLock3<THeld> extends true ? LockContext<THeld> : never {
  // This validates at runtime/compile-time but has same issue
}

// Approach 2: Overload signatures! (✅ This might work!)
function requiresLock3(ctx: LockContext<readonly []>): string;
function requiresLock3(ctx: LockContext<readonly [1]>): string;
function requiresLock3(ctx: LockContext<readonly [2]>): string;
function requiresLock3(ctx: LockContext<readonly [1, 2]>): string;
function requiresLock3(ctx: LockContext<readonly [3]>): string;
function requiresLock3(ctx: LockContext<readonly [1, 3]>): string;
function requiresLock3(ctx: LockContext<readonly [2, 3]>): string;
function requiresLock3(ctx: LockContext<readonly [1, 2, 3]>): string;
// Implementation
function requiresLock3<THeld extends readonly LockLevel[]>(
  ctx: LockContext<THeld>
): string {
  // Inside here, ctx is a normal LockContext<THeld> - fully usable!
  const locks = ctx.getHeldLocks();
  console.log(`Function called with locks: [${locks}]`);
  
  // Can check what's held
  if (ctx.hasLock(LOCK_3)) {
    return 'Already has lock 3';
  }
  
  return 'Can acquire lock 3';
}

// Approach 3: Just accept LocksAtMost3 (simplest!)
import { type LocksAtMost3 } from './src/core';

function requiresLock3Simple(ctx: LockContext<LocksAtMost3>): string {
  // ctx is fully usable!
  const locks = ctx.getHeldLocks();
  console.log(`Simple function called with locks: [${locks}]`);
  
  if (ctx.hasLock(LOCK_3)) {
    return 'Already has lock 3';
  }
  
  return 'Can acquire lock 3';
}

async function testApproaches() {
  console.log('=== Testing Different Constraint Approaches ===\n');

  console.log('--- Approach 2: Overloads ---');
  const result1 = requiresLock3(createLockContext());
  console.log('Empty context:', result1);

  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const result2 = requiresLock3(ctx1);
  console.log('With lock 1:', result2);
  ctx1.dispose();

  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  console.log('\n❌ Overload approach - should fail:');
  // const resultInvalid = requiresLock3(ctx5);  // ❌ No matching overload
  ctx5.dispose();

  console.log('\n--- Approach 3: LocksAtMost3 (Simplest!) ---');
  const result3 = requiresLock3Simple(createLockContext());
  console.log('Empty context:', result3);

  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const result4 = requiresLock3Simple(ctx2);
  console.log('With lock 2:', result4);
  ctx2.dispose();

  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  const result5 = requiresLock3Simple(ctx3);
  console.log('With lock 3:', result5);
  ctx3.dispose();

  console.log('\n✅ LocksAtMost approach is the cleanest and most usable!');
}

testApproaches().catch(console.error);
