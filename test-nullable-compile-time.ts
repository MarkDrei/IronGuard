/**
 * Deep dive: Does the nullable approach actually provide compile-time safety?
 */

import { 
  createLockContext, 
  LOCK_1,
  LOCK_3,
  LOCK_5,
  LockContext,
  type LockLevel,
  type CanAcquireLock3
} from './src/core';

// ============================================================================
// Nullable approach with generics
// ============================================================================

type NullableValidLock3<THeld extends readonly LockLevel[]> =
  CanAcquireLock3<THeld> extends true
    ? LockContext<THeld>
    : null;

function processWithNullable<THeld extends readonly LockLevel[]>(
  ctx: NullableValidLock3<THeld>
): void {
  // Inside the function: what type does TypeScript see?
  // Let's use type assertions to find out
  
  type CtxType = typeof ctx;
  // Hover over this to see: LockContext<THeld> | null
  
  if (ctx !== null) {
    // After narrowing, TypeScript should know ctx is LockContext<THeld>
    const locks = ctx.getHeldLocks();  // ✅ This works!
    console.log(`Locks: [${locks}]`);
  } else {
    console.log('Context is null');
  }
}

// ============================================================================
// The critical question: What happens at the CALL SITE?
// ============================================================================

async function testCallSiteChecking() {
  console.log('=== Call Site Type Checking ===\n');

  // Test 1: Empty context (should work)
  const emptyCtx = createLockContext();
  type EmptyType = typeof emptyCtx;  // LockContext<readonly []>
  type EmptyNullable = NullableValidLock3<readonly []>;  // Should be LockContext<readonly []>
  
  console.log('Test 1: Empty context');
  processWithNullable(emptyCtx);  // Does this compile?
  
  // Test 2: Context with lock 1 (should work)
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  type Ctx1Type = typeof ctx1;  // LockContext<readonly [1]>
  type Ctx1Nullable = NullableValidLock3<readonly [1]>;  // Should be LockContext<readonly [1]>
  
  console.log('\nTest 2: Context with lock 1');
  processWithNullable(ctx1);  // Does this compile?
  
  // Test 3: Context with lock 5 (should NOT work - needs null)
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  type Ctx5Type = typeof ctx5;  // LockContext<readonly [5]>
  type Ctx5Nullable = NullableValidLock3<readonly [5]>;  // Should be null
  
  console.log('\nTest 3: Context with lock 5 (INVALID)');
  
  // Question: Does TypeScript prevent this call?
  // Answer: YES! It gives a compile error! 🎉
  
  // Uncomment to see the error:
  // processWithNullable(ctx5);  
  // Error: Argument of type 'LockContext<readonly [5]>' is not assignable to parameter of type 'null'.
  
  // For invalid contexts, we must pass null
  processWithNullable(null as NullableValidLock3<readonly [5]>);
  
  // But wait - can we even pass null at all?
  processWithNullable(null as any);  // We can force it with 'as any'
  
  console.log('\n=== AMAZING! IT WORKS! ===');
  console.log('✅ TypeScript DOES prevent passing ctx5 to the function!');
  console.log('✅ The error: "Argument of type \'LockContext<readonly [5]>\' is not assignable to parameter of type \'null\'"');
  console.log('\nHow does it work?');
  console.log('1. ctx5 has type: LockContext<readonly [5]>');
  console.log('2. NullableValidLock3<readonly [5]> = null (because CanAcquireLock3<[5]> = false)');
  console.log('3. TypeScript sees: trying to pass LockContext<[5]> where null is expected');
  console.log('4. Compile error! ✅');
  
  console.log('\n=== INSIDE THE FUNCTION ===');
  console.log('After the null check, ctx has type: LockContext<THeld>');
  console.log('So the context IS usable!');
  
  console.log('\n=== COMPARISON ===');
  console.log('Nullable approach:');
  console.log('  ✅ Provides compile-time safety');
  console.log('  ✅ Context is usable after null check');
  console.log('  ⚠️ Requires null check (extra code)');
  console.log('  ⚠️ Must pass null explicitly for invalid cases');
  
  console.log('\nLocksAtMost3 approach:');
  console.log('  ✅ Provides compile-time safety');
  console.log('  ✅ Context is always usable (no null check)');
  console.log('  ✅ Cleaner code (no null handling)');
  console.log('  ✅ More semantically clear');
  
  console.log('\n🏆 Winner: Still LocksAtMost3, but nullable approach DOES work!');

  // Cleanup
  ctx1.dispose();
  ctx5.dispose();
}

testCallSiteChecking().catch(console.error);
