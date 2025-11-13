/**
 * FINAL ANSWER: Yes, the nullable approach DOES work!
 * 
 * This demonstrates that we CAN use a type that is either null or context,
 * depending on whether the lock can be taken, AND use it in a function.
 */

import { 
  createLockContext, 
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_5,
  LockContext,
  type LockLevel,
  type CanAcquireLock3,
  type HasLock,
  type LocksAtMost3
} from './src/core';

console.log('=== NULLABLE APPROACH: Complete Working Example ===\n');

// ============================================================================
// Define the nullable type (fixed to include "already has lock 3")
// ============================================================================

type NullableValidLock3<THeld extends readonly LockLevel[]> =
  HasLock<THeld, 3> extends true
    ? LockContext<THeld>  // Already has lock 3
    : CanAcquireLock3<THeld> extends true
      ? LockContext<THeld>  // Can acquire lock 3
      : null;  // Invalid

// ============================================================================
// Function using nullable approach
// ============================================================================

function processWithNullableCheck<THeld extends readonly LockLevel[]>(
  ctx: NullableValidLock3<THeld>
): string {
  // Must check for null first
  if (ctx === null) {
    return 'ERROR: Invalid lock state - cannot acquire lock 3';
  }
  
  // After null check, ctx is fully usable!
  const locks = ctx.getHeldLocks();
  
  if (ctx.hasLock(LOCK_3)) {
    return `Already has lock 3. Held locks: [${locks}]`;
  } else {
    return `Can acquire lock 3. Held locks: [${locks}]`;
  }
}

// ============================================================================
// Equivalent function using LocksAtMost3
// ============================================================================

function processWithLocksAtMost(ctx: LockContext<LocksAtMost3>): string {
  // No null check needed - ctx is always valid!
  const locks = ctx.getHeldLocks();
  
  if (ctx.hasLock(LOCK_3)) {
    return `Already has lock 3. Held locks: [${locks}]`;
  } else {
    return `Can acquire lock 3. Held locks: [${locks}]`;
  }
}

// ============================================================================
// Side-by-side comparison
// ============================================================================

async function compareApproaches() {
  console.log('--- Valid Contexts ---\n');
  
  // Empty context
  const emptyCtx = createLockContext();
  console.log('Empty context:');
  console.log('  Nullable:', processWithNullableCheck(emptyCtx));
  console.log('  LocksAtMost3:', processWithLocksAtMost(emptyCtx));
  
  // Context with lock 1
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  console.log('\nContext with lock 1:');
  console.log('  Nullable:', processWithNullableCheck(ctx1));
  console.log('  LocksAtMost3:', processWithLocksAtMost(ctx1));
  
  // Context with lock 3
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  console.log('\nContext with lock 3:');
  console.log('  Nullable:', processWithNullableCheck(ctx3));
  console.log('  LocksAtMost3:', processWithLocksAtMost(ctx3));
  
  console.log('\n--- Invalid Context ---\n');
  
  // Context with lock 5 (invalid)
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  console.log('Context with lock 5 (INVALID):');
  
  // For nullable approach, must explicitly pass null
  console.log('  Nullable: Must pass null explicitly');
  const nullResult = processWithNullableCheck(null as NullableValidLock3<readonly [5]>);
  console.log('    Result:', nullResult);
  
  // For LocksAtMost3, TypeScript prevents the call entirely
  console.log('  LocksAtMost3: TypeScript prevents call (compile error)');
  // processWithLocksAtMost(ctx5);  // ❌ Compile error!
  
  console.log('\n=== FINAL VERDICT ===\n');
  
  console.log('✅ NULLABLE APPROACH WORKS!');
  console.log('  - Compile-time safety: ✅');
  console.log('  - Context is usable: ✅ (after null check)');
  console.log('  - Requires null check: ⚠️ Yes');
  console.log('  - Boilerplate code: ⚠️ More (null handling)');
  console.log('  - Must pass null explicitly: ⚠️ Yes');
  
  console.log('\n✅ LOCKSATMOST3 APPROACH (SIMPLER)');
  console.log('  - Compile-time safety: ✅');
  console.log('  - Context is usable: ✅ (always)');
  console.log('  - Requires null check: ✅ No');
  console.log('  - Boilerplate code: ✅ Less');
  console.log('  - Cleaner semantics: ✅ Yes');
  
  console.log('\n📝 RECOMMENDATION:');
  console.log('Both approaches work technically, but LocksAtMost3 is cleaner.');
  console.log('Use nullable if you specifically need to distinguish between');
  console.log('"valid but can acquire" vs "invalid" cases at the call site.');
  console.log('Otherwise, LocksAtMost3 is the better choice.');
  
  // Cleanup
  ctx1.dispose();
  ctx3.dispose();
  ctx5.dispose();
}

compareApproaches().catch(console.error);
