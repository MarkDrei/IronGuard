/**
 * Exploring the nullable context approach:
 * Type is `null | LockContext<THeld>` depending on whether lock can be acquired
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

console.log('=== Testing Nullable Context Approach ===\n');

// ============================================================================
// APPROACH 1: Conditional type with null
// ============================================================================

type NullableIfInvalid<THeld extends readonly LockLevel[]> =
  CanAcquireLock3<THeld> extends true
    ? LockContext<THeld>
    : null;

function approach1<THeld extends readonly LockLevel[]>(
  ctx: NullableIfInvalid<THeld>
): void {
  // Question: What is the type of ctx here?
  // Answer: LockContext<THeld> | null (union type - conditional not collapsed)
  
  console.log('Approach 1 - Type of ctx:', typeof ctx);
  
  // Try to narrow with null check
  if (ctx === null) {
    console.log('  Context is null');
    return;
  }
  
  // After null check, is ctx usable?
  // Let's try...
  try {
    const locks = ctx.getHeldLocks();
    console.log(`  ✅ Context is usable! Locks: [${locks}]`);
  } catch (e) {
    console.log('  ❌ Context not usable:', e);
  }
}

// ============================================================================
// APPROACH 2: Constraint at call-site with assertion
// ============================================================================

type MaybeContext<THeld extends readonly LockLevel[]> =
  CanAcquireLock3<THeld> extends true
    ? LockContext<THeld>
    : null;

function approach2<THeld extends readonly LockLevel[]>(
  ctx: MaybeContext<THeld>
): void {
  console.log('Approach 2 - Simple null check');
  
  // TypeScript sees ctx as: LockContext<THeld> | null
  // Even though the type says it depends on THeld
  
  if (ctx !== null) {
    // After null check, TypeScript should narrow to LockContext<THeld>
    try {
      const locks = ctx.getHeldLocks();
      console.log(`  ✅ Context is usable! Locks: [${locks}]`);
    } catch (e) {
      console.log('  ❌ Context not usable:', e);
    }
  } else {
    console.log('  Context is null');
  }
}

// ============================================================================
// APPROACH 3: Non-generic version (to test if generics are the issue)
// ============================================================================

type ValidLock3OrNull =
  | LockContext<readonly []>
  | LockContext<readonly [1]>
  | LockContext<readonly [2]>
  | LockContext<readonly [1, 2]>
  | LockContext<readonly [3]>
  | LockContext<readonly [1, 3]>
  | LockContext<readonly [2, 3]>
  | LockContext<readonly [1, 2, 3]>
  | null;

function approach3(ctx: ValidLock3OrNull): void {
  console.log('Approach 3 - Non-generic with null');
  
  if (ctx === null) {
    console.log('  Context is null');
    return;
  }
  
  // After null check, ctx should be the union of valid contexts
  const locks = ctx.getHeldLocks();
  console.log(`  ✅ Context is usable! Locks: [${locks}]`);
}

// ============================================================================
// TEST ALL APPROACHES
// ============================================================================

async function testNullableApproaches() {
  console.log('--- Testing with empty context (valid) ---\n');
  const emptyCtx = createLockContext();
  
  approach1(emptyCtx as any);  // Need to cast because generic THeld is unknown
  approach2(emptyCtx as any);
  approach3(emptyCtx);

  console.log('\n--- Testing with lock 1 context (valid) ---\n');
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  
  approach1(ctx1 as any);
  approach2(ctx1 as any);
  approach3(ctx1);

  console.log('\n--- Testing with lock 3 context (valid) ---\n');
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  
  approach1(ctx3 as any);
  approach2(ctx3 as any);
  approach3(ctx3);

  console.log('\n--- Testing with lock 5 context (INVALID) ---\n');
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  
  // For approach 1 & 2: If we could pass ctx5, would it be null?
  // We can't actually test this because TypeScript prevents the call
  // But let's manually pass null to simulate
  approach1(null as any);
  approach2(null as any);
  approach3(null);

  console.log('\n=== ANALYSIS ===');
  console.log('Approach 1 (simple null check):');
  console.log('  ✅ Works if we can narrow the type');
  console.log('  ❌ Generic THeld prevents proper type checking at call site');
  
  console.log('\nApproach 2 (type guard):');
  console.log('  ✅ Type guard helps narrow the type');
  console.log('  ❌ Still has generic THeld issue');
  
  console.log('\nApproach 3 (non-generic):');
  console.log('  ✅ Works perfectly!');
  console.log('  ❌ Same verbosity as manual overloads');
  console.log('  ❌ Not better than LocksAtMost3 (which doesn\'t need null)');

  console.log('\n=== KEY INSIGHT ===');
  console.log('The nullable approach has the SAME fundamental problem:');
  console.log('Generic conditionals (CanAcquireLock3<THeld>) don\'t collapse');
  console.log('until you know the concrete value of THeld.');
  console.log('\nAt the call site, TypeScript sees:');
  console.log('  ctx: LockContext<THeld> | null');
  console.log('And it can\'t determine which branch to take!');
  
  console.log('\n💡 LocksAtMost3 is still the winner because:');
  console.log('  - No generics (concrete union type)');
  console.log('  - No null checks needed');
  console.log('  - Context is always valid and usable');

  // Cleanup
  ctx1.dispose();
  ctx3.dispose();
  ctx5.dispose();
}

testNullableApproaches().catch(console.error);
