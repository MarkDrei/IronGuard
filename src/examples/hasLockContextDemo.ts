/**
 * HasLockXContext Pattern Demo
 * 
 * Demonstrates the HasLockXContext pattern where a function requires
 * a specific lock to already be held by the caller.
 * 
 * Key Concepts:
 * - HasLockXContext<THeld> - Only accepts contexts that ALREADY hold lock X
 * - Enforces caller responsibility for lock acquisition
 * - Function can use the lock immediately without checking
 * - Provides compile-time safety guarantees
 * 
 * Comparison with NullableValidLockX:
 * - HasLockXContext: Lock MUST be held (caller acquired it)
 * - NullableValidLockX: Lock CAN be acquired (function might acquire it)
 */

import { 
  createLockContext, 
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_4,
  LOCK_5,
  type LockLevel,
  type HasLock3Context,
  type HasLock5Context,
  HasLock,
  LockContext
} from '../index';

console.log('=== HasLockXContext Pattern Demo ===\n');

type LockArray = readonly LockLevel[];
type TMP<THeld extends LockArray> = HasLock<THeld, 3> extends true ? LockContext<THeld> : never;

function processWithLock3Required_tmp<THeld extends readonly LockLevel[]>(
  ctx: TMP<THeld>
): string {
  const locks = ctx.getHeldLocks();
  return `Processing with lock 3 held. All locks: [${locks}]`;
}

function processWithLock3Required_tmp2<THeld extends readonly LockLevel[]>(
  ctx: HasLock<THeld, 3> extends true ? LockContext<THeld> : never
): string {
  const locks = ctx.getHeldLocks();
  ctx.getHeldLocks();
  ctx.dispose();

  return `Processing with lock 3 held. All locks: [${locks}]`;
}

// ============================================================================
// Example 1: Function that REQUIRES lock 3 to already be held
// ============================================================================

function processWithLock3Required<THeld extends readonly LockLevel[]>(
  ctx: HasLock3Context<THeld>
): string {
  // ✅ At this point, TypeScript GUARANTEES lock 3 is held
  // No runtime checks needed - type system enforces it
  const locks = ctx.getHeldLocks();
  
  // We can directly use lock 3 here without checking
  // because the type system guarantees it's held
  return `Processing with lock 3 held. All locks: [${locks}]`;
}

// ============================================================================
// Example 2: Function that REQUIRES lock 5 to already be held
// ============================================================================

function advancedProcessingWithLock5<THeld extends readonly LockLevel[]>(
  ctx: HasLock5Context<THeld>
): string {
  // ✅ Lock 5 is guaranteed to be held
  const locks = ctx.getHeldLocks();
  return `Advanced processing with lock 5. All locks: [${locks}]`;
}

// ============================================================================
// Demo: Valid contexts (compile and run successfully)
// ============================================================================

async function demonstrateValidUsage() {
  console.log('--- Valid Usage: Contexts that HAVE the required lock ---\n');

  // ✅ Context with just lock 3
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  console.log('✅ Lock 3 only:', processWithLock3Required(ctx3));
  ctx3.dispose();
  
  // ✅ Context with locks 1 and 3
  const ctx13 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_3));
  console.log('✅ Locks 1,3:', processWithLock3Required(ctx13));
  ctx13.dispose();
  
  // ✅ Context with locks 3, 4, 5
  const ctx345 = await createLockContext()
    .acquireWrite(LOCK_3)
    .then(c => c.acquireWrite(LOCK_4))
    .then(c => c.acquireWrite(LOCK_5));
  console.log('✅ Locks 3,4,5:', processWithLock3Required(ctx345));
  
  // ✅ Can also use lock 5 function with this context
  console.log('✅ Same context with lock 5 function:', advancedProcessingWithLock5(ctx345));
  ctx345.dispose();

  console.log();
}

// ============================================================================
// Demo: Invalid contexts (compile-time errors - commented out)
// ============================================================================

async function demonstrateInvalidUsage() {
  console.log('--- Invalid Usage: Contexts WITHOUT the required lock ---\n');
  console.log('The following would cause compile-time errors:\n');

  // ❌ Empty context (doesn't have lock 3)
  // const emptyCtx = createLockContext();
  // processWithLock3Required(emptyCtx);
  // Error: Argument of type 'LockContext<readonly []>' is not assignable to 
  //        parameter of type '"IronGuard: Context must hold LOCK_3"'
  console.log('❌ Empty context: COMPILE ERROR - Lock 3 not held');

  // ❌ Context with lock 1 (doesn't have lock 3)
  // const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  // processWithLock3Required(ctx1);
  console.log('❌ Context with lock 1: COMPILE ERROR - Lock 3 not held');

  // ❌ Context with lock 5 (doesn't have lock 3)
  // const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  // processWithLock3Required(ctx5);
  console.log('❌ Context with lock 5: COMPILE ERROR - Lock 3 not held');

  // ❌ Context with locks 1 and 2 (doesn't have lock 3)
  // const ctx12 = await createLockContext()
  //   .acquireWrite(LOCK_1)
  //   .then(c => c.acquireWrite(LOCK_2));
  // processWithLock3Required(ctx12);
  console.log('❌ Context with locks 1,2: COMPILE ERROR - Lock 3 not held');

  console.log();
}

// ============================================================================
// Comparison with other patterns
// ============================================================================

function explainPatternComparison() {
  console.log('=== Pattern Comparison ===\n');

  console.log('HasLockXContext (this pattern):');
  console.log('  ✅ Only accepts contexts that ALREADY hold lock X');
  console.log('  ✅ Function can use lock X immediately');
  console.log('  ✅ No acquisition needed inside function');
  console.log('  ✅ Clear responsibility: caller MUST acquire the lock');
  console.log('  ⚠️  Less flexible - caller must always acquire lock X first');
  
  console.log('\nNullableValidLockX (can acquire pattern):');
  console.log('  ✅ Accepts contexts that CAN acquire lock X OR already have it');
  console.log('  ✅ More flexible for caller');
  console.log('  ⚠️  Function might need to acquire lock X');
  console.log('  ⚠️  Or function must check if already held');
  console.log('  ⚠️  Less clear responsibility');

  console.log('\n=== Use Cases ===\n');

  console.log('Use HasLockXContext when:');
  console.log('  • Function needs lock X and wants to use it directly');
  console.log('  • You want to enforce that caller acquired the lock');
  console.log('  • No lock acquisition should happen inside function');
  console.log('  • Clear separation of concerns: caller acquires, function uses');
  console.log('  • Example: Functions that modify data protected by lock X');

  console.log('\nUse NullableValidLockX when:');
  console.log('  • Function will acquire lock X if needed');
  console.log('  • More flexible - caller doesn\'t need lock X yet');
  console.log('  • Function handles acquisition internally');
  console.log('  • Example: High-level API functions that manage their own locks');

  console.log('\n=== Key Benefits ===\n');
  console.log('✅ Compile-time safety: TypeScript prevents invalid calls');
  console.log('✅ No type explosion: Scales to any lock level');
  console.log('✅ Clear semantics: MUST have vs CAN acquire');
  console.log('✅ Zero runtime overhead: All checks at compile time');
  console.log('✅ Self-documenting: Type signature shows lock requirements');
}

// ============================================================================
// Main demo
// ============================================================================

export async function runHasLockContextDemo() {
  await demonstrateValidUsage();
  await demonstrateInvalidUsage();
  explainPatternComparison();
  console.log('\n✅ Demo complete!\n');
}

// Run if executed directly
if (require.main === module) {
  runHasLockContextDemo().catch(console.error);
}
