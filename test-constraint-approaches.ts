/**
 * Exploring different approaches to constrain function parameters
 * while still allowing the context to be usable inside the function.
 * 
 * THE CORE PROBLEM:
 * We want to express: "This function requires lock 3 (can acquire or already has it)"
 * But we also want to USE the context inside the function (call methods on it).
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
  type CanAcquireLock3,
  type LocksAtMost3
} from './src/core';

console.log('=== Comparing Constraint Approaches ===\n');

// ============================================================================
// ❌ APPROACH 1: ValidLockXContext pattern (Current - DOESN'T WORK)
// ============================================================================

type ValidLock3ContextOld<THeld extends readonly LockLevel[]> =
  CanAcquireLock3<THeld> extends true
    ? LockContext<THeld>
    : 'Error: Cannot acquire lock 3';

function approach1<THeld extends readonly LockLevel[]>(
  ctx: ValidLock3ContextOld<THeld>
): void {
  // ❌ Problem: ctx has type (LockContext<THeld> | string)
  // Can't call methods without type narrowing!
  
  // @ts-expect-error - Cannot call methods on union type
  // ctx.getHeldLocks();
  
  console.log('Approach 1: Cannot use context (union type)');
}

// ============================================================================
// ❌ APPROACH 2: Return type constraint (DOESN'T WORK)
// ============================================================================

function approach2<THeld extends readonly LockLevel[]>(
  ctx: LockContext<THeld>
): CanAcquireLock3<THeld> extends true ? void : never {
  // ✅ ctx is LockContext<THeld> - can call methods!
  ctx.getHeldLocks();
  
  // ❌ But return type is conditional, so we can't return
  // @ts-expect-error - Type 'undefined' is not assignable to conditional type
  // return;
  
  console.log('Approach 2: Can use context, but return type issues');
}

// ============================================================================
// ⚠️ APPROACH 3: Manual overloads (VERBOSE but works)
// ============================================================================

// List every valid combination explicitly
function approach3(ctx: LockContext<readonly []>): void;
function approach3(ctx: LockContext<readonly [1]>): void;
function approach3(ctx: LockContext<readonly [2]>): void;
function approach3(ctx: LockContext<readonly [1, 2]>): void;
function approach3(ctx: LockContext<readonly [3]>): void;
function approach3(ctx: LockContext<readonly [1, 3]>): void;
function approach3(ctx: LockContext<readonly [2, 3]>): void;
function approach3(ctx: LockContext<readonly [1, 2, 3]>): void;
// More combinations if locks 3+ are included...

function approach3<THeld extends readonly LockLevel[]>(
  ctx: LockContext<THeld>
): void {
  // ✅ ctx is fully usable!
  const locks = ctx.getHeldLocks();
  console.log(`Approach 3 (overloads): Works! Locks: [${locks}]`);
}

// ============================================================================
// ✅ APPROACH 4: LocksAtMostX (BEST - Works perfectly!)
// ============================================================================

function approach4(ctx: LockContext<LocksAtMost3>): void {
  // ✅ ctx is fully usable!
  // ✅ Accepts any valid combination: [], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]
  // ✅ Rejects invalid: [4], [5], [3,4], etc.
  
  const locks = ctx.getHeldLocks();
  console.log(`Approach 4 (LocksAtMost3): Works! Locks: [${locks}]`);
  
  // Can check what's held
  if (ctx.hasLock(LOCK_3)) {
    console.log('  → Already has lock 3');
  } else {
    console.log('  → Can acquire lock 3');
  }
}

// ============================================================================
// ✅ APPROACH 5: Type guard pattern (Works but more verbose)
// ============================================================================

type Lock3Compatible = 
  | LockContext<readonly []>
  | LockContext<readonly [1]>
  | LockContext<readonly [2]>
  | LockContext<readonly [1, 2]>
  | LockContext<readonly [3]>
  | LockContext<readonly [1, 3]>
  | LockContext<readonly [2, 3]>
  | LockContext<readonly [1, 2, 3]>;

function approach5(ctx: Lock3Compatible): void {
  // ✅ ctx is usable (union of specific types, not union with string)
  const locks = ctx.getHeldLocks();
  console.log(`Approach 5 (type guard): Works! Locks: [${locks}]`);
}

// ============================================================================
// TEST ALL APPROACHES
// ============================================================================

async function testAll() {
  const emptyCtx = createLockContext();
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);

  console.log('Testing with valid contexts:\n');
  
  // approach1(emptyCtx);  // ❌ Type issues
  // approach2(emptyCtx);  // ❌ Return type issues
  approach3(emptyCtx);
  approach4(emptyCtx);
  approach5(emptyCtx);
  
  console.log();
  approach3(ctx1);
  approach4(ctx1);
  approach5(ctx1);
  
  console.log();
  approach3(ctx3);
  approach4(ctx3);
  approach5(ctx3);

  console.log('\n❌ Invalid context (should cause compile errors if uncommented):\n');
  // approach3(ctx5);  // ❌ No overload matches
  // approach4(ctx5);  // ❌ Type '[5]' is not assignable to 'LocksAtMost3'
  // approach5(ctx5);  // ❌ Type not assignable

  console.log('=== WINNER: Approach 4 (LocksAtMost3) ===');
  console.log('✅ Fully usable context');
  console.log('✅ Compile-time safety');
  console.log('✅ Clean syntax');
  console.log('✅ No manual overloads needed');
  console.log('✅ Same semantic meaning as ValidLock3Context but actually works!');

  // Cleanup
  ctx1.dispose();
  ctx2.dispose();
  ctx3.dispose();
  ctx5.dispose();
}

testAll().catch(console.error);
