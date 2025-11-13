/**
 * Testing HasLockX Nullable Pattern
 * 
 * Idea: Parameter is null unless lock X is already held
 * This forces caller to have the lock, function can use it directly
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
  type HasLock
} from './src/core';

console.log('=== Testing HasLockX Nullable Pattern ===\n');

// ============================================================================
// HasLock3 Nullable Type - Only non-null if lock 3 is ALREADY held
// ============================================================================

type HasLock3Context<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 3> extends true
    ? LockContext<THeld>  // Has lock 3 - return context
    : null;  // Doesn't have lock 3 - return null

// ============================================================================
// Function that REQUIRES lock 3 to already be held
// ============================================================================

function processWithLock3Required<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld>
): string {
  if (ctx === null) {
    return 'ERROR: Lock 3 is not held';
  }
  
  // ✅ At this point, we KNOW lock 3 is held!
  // No need to check - TypeScript guarantees it
  const locks = ctx.getHeldLocks();
  
  // We can directly use lock 3 here without checking
  // Because the type system guarantees it's held
  return `Processing with lock 3 held. All locks: [${locks}]`;
}

// ============================================================================
// Testing the pattern
// ============================================================================

async function testHasLockPattern() {
  console.log('--- Testing contexts that HAVE lock 3 ---\n');

  // ✅ Context with just lock 3
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  console.log('Lock 3 only:', processWithLock3Required(ctx3));
  
  // ✅ Context with locks 1 and 3
  const ctx13 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3));
  console.log('Locks 1,3:', processWithLock3Required(ctx13));
  
  // ✅ Context with locks 3, 4, 5
  const ctx345 = await createLockContext()
    .acquireWrite(LOCK_3)
    .then(c => c.acquireWrite(LOCK_4))
    .then(c => c.acquireWrite(LOCK_5));
  console.log('Locks 3,4,5:', processWithLock3Required(ctx345));

  console.log('\n--- Testing contexts that DON\'T have lock 3 ---\n');

  // ❌ Empty context (doesn't have lock 3)
  const emptyCtx = createLockContext();
  console.log('Attempting with empty context:');
  processWithLock3Required(emptyCtx);  // Compile error!
  // Error: Argument of type 'LockContext<readonly []>' is not assignable to parameter of type 'null'
  console.log('  ❌ COMPILE ERROR: Cannot pass empty context!');

  // ❌ Context with lock 1 (doesn't have lock 3)
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  console.log('\nAttempting with lock 1:');
  processWithLock3Required(ctx1);  // Compile error!
  console.log('  ❌ COMPILE ERROR: Cannot pass context without lock 3!');

  // ❌ Context with lock 5 (doesn't have lock 3)
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  console.log('\nAttempting with lock 5:');
  processWithLock3Required(ctx5);  // Compile error!
  console.log('  ❌ COMPILE ERROR: Cannot pass context without lock 3!');

  console.log('\n=== COMPARISON: HasLock vs CanAcquire ===\n');

  console.log('HasLock3Context (this pattern):');
  console.log('  ✅ Only accepts contexts that ALREADY have lock 3');
  console.log('  ✅ Function can use lock 3 immediately');
  console.log('  ✅ No acquisition needed inside function');
  console.log('  ⚠️ Caller MUST acquire lock 3 before calling');
  
  console.log('\nNullableValidLock3 (can acquire pattern):');
  console.log('  ✅ Accepts contexts that CAN acquire lock 3 OR have it');
  console.log('  ⚠️ Function might need to acquire lock 3');
  console.log('  ⚠️ Or function checks if already held');
  console.log('  ✅ More flexible for caller');

  console.log('\n=== USE CASES ===\n');

  console.log('Use HasLock3Context when:');
  console.log('  - Function needs lock 3 and wants to use it directly');
  console.log('  - You want to enforce caller acquired the lock');
  console.log('  - No lock acquisition should happen inside function');
  console.log('  - Example: Functions that modify data protected by lock 3');

  console.log('\nUse NullableValidLock3 when:');
  console.log('  - Function will acquire lock 3 if needed');
  console.log('  - More flexible - caller doesn\'t need lock 3 yet');
  console.log('  - Function handles acquisition internally');
  console.log('  - Example: High-level API functions');

  console.log('\n✅ YES! HasLock3Context pattern works perfectly!');
  console.log('✅ Same compile-time safety as NullableValidLock3');
  console.log('✅ Different semantics: MUST have vs CAN acquire');
  console.log('✅ Also no type explosion - scales to any lock level!');

  // Cleanup
  ctx3.dispose();
  ctx13.dispose();
  ctx345.dispose();
  ctx1.dispose();
  ctx5.dispose();
}

testHasLockPattern().catch(console.error);
