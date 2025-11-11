#!/usr/bin/env npx tsx

/**
 * IronGuard Type System Building Blocks Demo
 * 
 * This example demonstrates the six composable building blocks of the type system:
 * 
 * 1. HasLock<THeld, Level> - Checks if a lock is already held in the context
 * 2. CanAcquire<THeld, TLock> - Generic type checking if lock TLock can be acquired
 * 3. ValidLockXContext<THeld> - Combines both checks with proper error messages
 * 4. AllPrefixes<T> - Generates all valid ordered prefixes for maximum flexibility
 * 5. OrderedSubsequences<T> - Generates all ordered subsequences (powerset) allowing lock skipping
 * 6. LockContextBelow<MaxLevel> + AllLessThan - Generic boundary validation approach
 * 
 * The demo shows:
 * - How to use each building block type in function signatures
 * - Chaining function calls with lock acquisition between steps
 * - Clear, descriptive function names that explain lock requirements
 * - Progressive complexity: simple checks → combinations → real workflows
 * 
 * Note: Using CanAcquire<T, LockNumber> uniformly eliminates casting needs!
 * The lock parameter requires casting as: `LOCK_X as CanAcquire<T, X> extends true ? X : never`
 * because TypeScript can't automatically prove the constraint from the context parameter.
 */

import {
  createLockContext,
  createFreshContextWithReadLock,
  createFreshContextWithWriteLock,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  type LockContext,
  type LockLevel,
  type HasLock,
  type ValidLock2Context,
  type CanAcquire,
  type AllPrefixes,
  type OrderedSubsequences,
  LOCK_4,
  LOCK_5,
  LOCK_8,
  LOCK_11,
  LOCK_10,
  LOCK_12
} from '../core';// =============================================================================
// BUILDING BLOCK 1: HasLock<THeld, Level>
// Checks if a specific lock is already held in the context
// =============================================================================

/**
 * Example function that requires LOCK_2 to already be held
 * Uses HasLock<T, 2> to ensure the lock is present
 */
async function requireLock2ToBeAlreadyHeld<T extends readonly LockLevel[]>(
  context: HasLock<T, 2> extends true ? LockContext<T> : never
): Promise<void> {
  console.log(`   ✅ requireLock2ToBeAlreadyHeld: LOCK_2 confirmed present`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Example function that requires LOCK_3 to already be held
 * Uses HasLock<T, 3> to ensure the lock is present
 */
async function requireLock3ToBeAlreadyHeld<T extends readonly LockLevel[]>(
  context: HasLock<T, 3> extends true ? LockContext<T> : never
): Promise<void> {
  console.log(`   ✅ requireLock3ToBeAlreadyHeld: LOCK_3 confirmed present`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// =============================================================================
// BUILDING BLOCK 2: CanAcquire<THeld, TLock>
// Generic type that checks if lock TLock can be acquired following ordering rules
// =============================================================================

/**
 * Example function that ensures LOCK_2 CAN be acquired
 * Creates a fresh context with LOCK_2 and chains to LOCK_3
 */
async function ensureLock2CanBeAcquired<T extends readonly LockLevel[]>(
  context: CanAcquire<T, 2> extends true ? LockContext<T> : never
): Promise<void> {
  console.log(`   ✅ ensureLock2CanBeAcquired: Creating fresh context with LOCK_2`);

  const freshContext = await createFreshContextWithWriteLock<T, 2>(
    context,
    LOCK_2 as CanAcquire<T, 2> extends true ? 2 : never
  );
  console.log(`      Acquired: ${freshContext.toString()}`);

  await ensureLock3CanBeAcquired(freshContext);

  console.log(`      Releasing LOCK_2...`);
  freshContext.dispose();
}/**
 * Example function that ensures LOCK_3 CAN be acquired
 * Creates a fresh context with LOCK_3 and chains to LOCK_4
 */
async function ensureLock3CanBeAcquired<T extends readonly LockLevel[]>(
  context: CanAcquire<T, 3> extends true ? LockContext<T> : never
): Promise<void> {
  console.log(`   ✅ ensureLock3CanBeAcquired: Creating fresh context with LOCK_3`);

  const freshContext = await createFreshContextWithReadLock<T, 3>(
    context,
    LOCK_3 as CanAcquire<T, 3> extends true ? 3 : never
  );
  console.log(`      Acquired: ${freshContext.toString()}`);

  await ensureLock4CanBeAcquired(freshContext);

  await new Promise(resolve => setTimeout(resolve, 50));

  console.log(`      Releasing LOCK_3...`);
  freshContext.dispose();
}

/**
 * Example function that ensures LOCK_4 CAN be acquired.
 * Terminal function - just demonstrates lock availability
 */
async function ensureLock4CanBeAcquired<T extends readonly LockLevel[]>(
  _context: CanAcquire<T, 4> extends true ? LockContext<T> : never
): Promise<void> {
  console.log(`   ✅ ensureLock4CanBeAcquired: LOCK_4 could be acquired if needed`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// =============================================================================
// BUILDING BLOCK 3: ValidLockXContext<THeld>
// Combines HasLock + CanAcquireLock with helpful error messages
// =============================================================================

/**
 * Example function using ValidLock2Context (the most flexible option)
 * Accepts contexts where LOCK_2 is held OR can be acquired
 */
async function workWithLock2Context<T extends readonly LockLevel[]>(
  _context: ValidLock2Context<T> extends string ? never : ValidLock2Context<T>
): Promise<void> {
  console.log(`   ✅ workWithLock2Context: LOCK_2 is held or can be acquired`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// =============================================================================
// BUILDING BLOCK 4: AllPrefixes<T>
// Generates all valid ordered prefixes of a tuple for flexible function signatures
// =============================================================================

// Define a type alias for all valid lock contexts (up to LOCK_3 for this demo)
type ValidLockContextsUpTo3 = AllPrefixes<readonly [1, 2, 3]>;
// This produces: readonly [] | readonly [1] | readonly [1, 2] | readonly [1, 2, 3]
type ValidLockContextsUpTo10 = AllPrefixes<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;

/**
 * Example function that accepts ANY valid ordered lock state up to LOCK_3
 * Uses AllPrefixes to automatically generate all valid combinations
 * This is the most flexible approach for functions that can adapt to any lock state
 */
async function flexibleFunctionUpToLock3(
  context: LockContext<ValidLockContextsUpTo3>
): Promise<void> {
  console.log(`   ✅ flexibleFunctionUpToLock3: Accepted context ${context.toString()}`);
  console.log(`      This function works with ANY ordered lock state: [], [1], [1,2], or [1,2,3]`);
  const lock4Ctx = await context.acquireRead(LOCK_4);
  await new Promise(resolve => setTimeout(resolve, 50));
  lock4Ctx.dispose();
}

/**
 * More advanced: Flexible function that works with locks up to LOCK_5
 */
type ValidLockContextsUpTo5 = AllPrefixes<readonly [1, 2, 3, 4, 5]>;

async function flexibleFunctionUpToLock5(
  context: LockContext<ValidLockContextsUpTo5>
): Promise<void> {
  console.log(`   ✅ flexibleFunctionUpToLock5: Accepted context ${context.toString()}`);
  await new Promise(resolve => setTimeout(resolve, 50));
}

// =============================================================================
// BUILDING BLOCK 5: OrderedSubsequences<T>
// Generates all ordered subsequences (powerset) allowing non-contiguous acquisition
// =============================================================================

// Define a type alias for all ordered subsequences up to LOCK_3
type ValidLockSubsequencesUpTo3 = OrderedSubsequences<readonly [1, 2, 3]>;
// This produces: readonly [] | readonly [1] | readonly [2] | readonly [3] | 
//                readonly [1, 2] | readonly [1, 3] | readonly [2, 3] | readonly [1, 2, 3]

/**
 * Example function that accepts ANY ordered subsequence up to LOCK_3
 * More permissive than AllPrefixes - allows skipping locks while maintaining order
 */
async function veryFlexibleFunctionUpTo3(
  context: LockContext<ValidLockSubsequencesUpTo3>
): Promise<void> {
  console.log(`   ✅ veryFlexibleFunctionUpTo3: Accepted context ${context.toString()}`);
  console.log(`      This function works with ANY ordered combination: [], [1], [2], [3], [1,2], [1,3], [2,3], or [1,2,3]`);
  const lock4Ctx = await context.acquireRead(LOCK_4);
  await veryFlexibleFunctionUpTo4(lock4Ctx);
  await new Promise(resolve => setTimeout(resolve, 50));
  lock4Ctx.dispose();
}

/**
 * More permissive: Accepts any ordered subsequence up to LOCK_4
 */
type ValidLockSubsequencesUpTo4 = OrderedSubsequences<readonly [1, 2, 3, 4]>;
type ValidLockSubsequencesUpTo10 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]>;
// type ValidLockSubsequencesUpTo15 = OrderedSubsequences<readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]>;

async function veryFlexibleFunctionUpTo4(
  context: LockContext<ValidLockSubsequencesUpTo4>
): Promise<void> {
  console.log(`   ✅ veryFlexibleFunctionUpTo4: Accepted context ${context.toString()}`);
  const lock5Ctx = await context.acquireRead(LOCK_5);
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  lock5Ctx.dispose();
}

async function veryFlexibleFunctionUpTo15(
  context: LockContext<ValidLockSubsequencesUpTo10>
): Promise<void> {
  console.log(`   ✅ veryFlexibleFunctionUpTo15: Accepted context ${context.toString()}`);
  const lock11Ctx = await context.acquireRead(LOCK_11);
  await new Promise(resolve => setTimeout(resolve, 50));
  lock11Ctx.dispose();
}

// =============================================================================
// BUILDING BLOCK 6: LockContextBelow<MaxLevel> + AllLessThan
// Alternative approach: Generic boundary validation using arithmetic comparison
// =============================================================================

/**
 * Helper type: Gets the maximum value from a readonly number array
 * Uses accumulator-based comparison to find the largest number
 */
type Max<
  T extends readonly number[],
  Current extends number = 0,
  Acc extends unknown[] = []
> = T extends readonly [infer First extends number, ...infer Rest extends readonly number[]]
  ? Acc['length'] extends Current
    ? Acc['length'] extends First
      ? Max<Rest, First, Acc>  // Current == First, keep current max
      : Max<Rest, First, [...Acc, unknown]>  // Start building up to First
    : Max<T, Current, [...Acc, unknown]>  // Continue building to Current
  : Current;

/**
 * Helper type: Checks if all elements in tuple T are less than Max
 * Uses accumulator-based length comparison (TypeScript arithmetic trick)
 */
type AllLessThan<
  T extends readonly number[],
  MaxVal extends number,
  Acc extends unknown[] = []
> = T extends readonly [infer First extends number, ...infer Rest extends readonly number[]]
  ? Acc['length'] extends MaxVal
    ? false  // MaxVal reached before checking First - First >= MaxVal
    : Acc['length'] extends First
      ? AllLessThan<Rest, MaxVal, Acc>  // First < MaxVal (stopped before MaxVal), continue
      : AllLessThan<Rest, MaxVal, [...Acc, unknown]>  // Increment accumulator toward First
  : true;  // All elements checked successfully - all were < MaxVal

/**
 * A LockContext where the maximum held lock is strictly less than MaxLevel
 * This is a more generic alternative to CanAcquire<T, X> for boundary validation
 * 
 * The idea is to accept any lock context and validate at the type boundary that
 * the context is compatible with acquiring a specific lock. The actual acquisition
 * and ordering validation still happens via acquireRead/acquireWrite.
 * 
 * Note: This complements but doesn't replace CanAcquire. Use this when you want
 * a generic constraint, and CanAcquire will still validate the detailed ordering.
 * 
 * LIMITATION: Due to how TypeScript handles conditional types in generic contexts,
 * using this type alone as a parameter constraint doesn't guarantee that acquireWrite/Read
 * will work for all possible THeldLocks values. For complete type safety, use the
 * CanAcquire<T, X> pattern directly (see ensureLock3CanBeAcquired example).
 */
type LockContextBelow<
  MaxLevel extends LockLevel,
  THeldLocks extends readonly LockLevel[] = readonly LockLevel[]
> = 
  THeldLocks extends readonly []
    ? LockContext<readonly []>  // Empty context is always valid
    : Max<THeldLocks> extends infer M extends LockLevel
      ? M extends MaxLevel
        ? never  // Max equals MaxLevel, not strictly below
        : AllLessThan<THeldLocks, MaxLevel> extends true
          ? LockContext<THeldLocks>
          : never
      : never;

/**
 * Example function using LockContextBelow approach
 * Accepts any lock context where all held locks are < 3
 * 
 * BEST PRACTICE: For complete type safety, use CanAcquire<T, X> pattern directly:
 *   context: CanAcquire<T, 3> extends true ? LockContext<T> : never
 * 
 * This example demonstrates the simpler LockContextBelow syntax for documentation,
 * but note that it relies on mathematical properties (all locks < 3 → can acquire 3)
 * rather than explicit TypeScript validation within the generic function body.
 */
async function wantsToTakeLock3<
  THeldLocks extends readonly LockLevel[]
>(
  context: LockContextBelow<3, THeldLocks>
): Promise<string> {
  // Acquire LOCK_3 - mathematically guaranteed to work because all held locks < 3
  // TypeScript may not fully validate this inside the generic function,
  // but the LockContextBelow constraint at the call site prevents invalid inputs
  const lock3Ctx = await context.acquireWrite(LOCK_3);
  
  const result = `✅ Acquired LOCK_3 from ${context.toString()}. Now holding: ${lock3Ctx.toString()}`;
  console.log(`   ${result}`);
  
  lock3Ctx.dispose();
  return result;
}

// =============================================================================
// CHAINED WORKFLOWS
// Demonstrate manual lock acquisition with function calls at each step
// =============================================================================

/**
 * Workflow that progressively acquires locks and calls functions
 * Demonstrates practical usage of the type system building blocks
 */
async function demonstrateChainedWorkflow(): Promise<void> {
  // Step 1: Start with LOCK_1
  console.log(`   Creating initial context with LOCK_1...`);
  const step1 = await createLockContext().acquireWrite(LOCK_1);
  console.log(`   Step 1: ${step1.toString()}`);
  
  // Step 2: Acquire LOCK_2, call function requiring it
  console.log(`   Acquiring LOCK_2...`);
  const step2 = await step1.acquireWrite(LOCK_2);
  console.log(`   Step 2: ${step2.toString()}`);
  await requireLock2ToBeAlreadyHeld(step2);
  
  // Step 3: Acquire LOCK_3, call function requiring it
  console.log(`   Acquiring LOCK_3...`);
  const step3 = await step2.acquireRead(LOCK_3);
  console.log(`   Step 3: ${step3.toString()}`);
  await requireLock3ToBeAlreadyHeld(step3);
  
  console.log(`   ✅ Chained workflow complete - disposing context`);
  step3.dispose();
}

// =============================================================================
// DEMONSTRATION SCENARIOS
// =============================================================================

/**
 * Main demonstration function showcasing the type system building blocks
 */
export async function runContextTransferDemo(): Promise<void> {
  console.log('🔒 IronGuard Type System Building Blocks Demo');
  console.log('==============================================\n');

  // =============================================================================
  // PART 1: HasLock<THeld, Level> - Checking if lock is already held
  // =============================================================================
  
  console.log('📌 PART 1: HasLock<THeld, Level>');
  console.log('Ensures a specific lock is already held in the context\n');
  
  console.log('Example 1a: Context with LOCK_2 → requireLock2ToBeAlreadyHeld()');
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  await requireLock2ToBeAlreadyHeld(ctx2);
  ctx2.dispose();
  console.log('');
  
  console.log('Example 1b: Context with LOCK_1 + LOCK_3 → requireLock3ToBeAlreadyHeld()');
  const ctx13 = await createLockContext().acquireRead(LOCK_1);
  const ctx13b = await ctx13.acquireWrite(LOCK_3);
  await requireLock3ToBeAlreadyHeld(ctx13b);
  ctx13b.dispose();
  console.log('');
  
  // =============================================================================
  // PART 2: CanAcquireLockX<THeld> - Checking if lock can be acquired
  // =============================================================================
  
  console.log('📌 PART 2: CanAcquire<THeld, TLock>');
  console.log('Generic validation for lock ordering rules (lock might not be held yet)\n');
  
  console.log('Example 2a: Empty context → ensureLock2CanBeAcquired()');
  const emptyCtx = createLockContext();
  await ensureLock2CanBeAcquired(emptyCtx);
  emptyCtx.dispose();
  console.log('');
  
  console.log('Example 2b: Context with LOCK_1 → ensureLock2CanBeAcquired()');
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  await ensureLock2CanBeAcquired(ctx1);
  ctx1.dispose();
  console.log('');
  
  console.log('Example 2c: Context with LOCK_2 → ensureLock3CanBeAcquired()');
  const ctx2forStep3 = await createLockContext().acquireRead(LOCK_2);
  await ensureLock3CanBeAcquired(ctx2forStep3);
  ctx2forStep3.dispose();
  console.log('');
  
  // =============================================================================
  // PART 3: ValidLockXContext<THeld> - Combining HasLock + CanAcquire
  // =============================================================================
  
  console.log('📌 PART 3: ValidLock2Context<THeld> and ValidLock3Context<THeld>');
  console.log('Most flexible: accepts contexts where lock is held OR can be acquired\n');
  
  console.log('Example 3a: Empty context → workWithLock2Context()');
  const empty2 = createLockContext();
  await workWithLock2Context(empty2);
  empty2.dispose();
  console.log('');
  
  console.log('Example 3b: Context with LOCK_1 → workWithLock2Context()');
  const ctx1b = await createLockContext().acquireWrite(LOCK_1);
  await workWithLock2Context(ctx1b);
  ctx1b.dispose();
  console.log('');
  
  console.log('Example 3c: Context with LOCK_2 (already held) → workWithLock2Context()');
  const ctx2b = await createLockContext().acquireRead(LOCK_2);
  await workWithLock2Context(ctx2b);
  ctx2b.dispose();
  console.log('');
  
  // =============================================================================
  // PART 4: AllPrefixes<T> - Flexible function signatures
  // =============================================================================
  
  console.log('📌 PART 4: AllPrefixes<T>');
  console.log('Generates all valid ordered prefixes automatically for maximum flexibility\n');
  
  console.log('Example 4a: Empty context → flexibleFunctionUpToLock3()');
  const flexEmpty = createLockContext();
  await flexibleFunctionUpToLock3(flexEmpty);
  flexEmpty.dispose();
  console.log('');
  
  console.log('Example 4b: Context with LOCK_1 → flexibleFunctionUpToLock3()');
  const flex1 = await createLockContext().acquireWrite(LOCK_1);
  await flexibleFunctionUpToLock3(flex1);
  flex1.dispose();
  console.log('');
  
  console.log('Example 4c: Context with LOCK_1 + LOCK_2 → flexibleFunctionUpToLock3()');
  const flex12 = await createLockContext().acquireRead(LOCK_1);
  const flex12b = await flex12.acquireWrite(LOCK_2);
  await flexibleFunctionUpToLock3(flex12b);
  flex12b.dispose();
  console.log('');
  
  console.log('Example 4d: Context with LOCK_1 + LOCK_2 + LOCK_3 → flexibleFunctionUpToLock3()');
  const flex123 = await createLockContext().acquireWrite(LOCK_1);
  const flex123b = await flex123.acquireRead(LOCK_2);
  const flex123c = await flex123b.acquireWrite(LOCK_3);
  await flexibleFunctionUpToLock3(flex123c);
  flex123c.dispose();
  console.log('');
  
  console.log('Example 4e: Context with LOCK_1 + LOCK_2 + LOCK_3 + LOCK_4 → flexibleFunctionUpToLock5()');
  const flex1234 = await createLockContext().acquireWrite(LOCK_1);
  const flex1234b = await flex1234.acquireRead(LOCK_2);
  const flex1234c = await flex1234b.acquireWrite(LOCK_3);
  const flex1234d = await flex1234c.acquireRead(4);
  await flexibleFunctionUpToLock5(flex1234d);
  flex1234d.dispose();
  console.log('');
  
  // =============================================================================
  // PART 5: OrderedSubsequences<T> - Most permissive ordered combinations
  // =============================================================================
  
  console.log('📌 PART 5: OrderedSubsequences<T>');
  console.log('Generates all ordered subsequences (powerset) - allows lock skipping\n');
  
  console.log('Example 5a: Empty context → veryFlexibleFunctionUpTo3()');
  const veryFlexEmpty = createLockContext();
  await veryFlexibleFunctionUpTo3(veryFlexEmpty);
  veryFlexEmpty.dispose();
  console.log('');
  
  console.log('Example 5b: Context with LOCK_1 → veryFlexibleFunctionUpTo3()');
  const veryFlex1 = await createLockContext().acquireWrite(LOCK_1);
  await veryFlexibleFunctionUpTo3(veryFlex1);
  veryFlex1.dispose();
  console.log('');
  
  console.log('Example 5c: Context with LOCK_2 (skipped LOCK_1) → veryFlexibleFunctionUpTo3()');
  const veryFlex2 = await createLockContext().acquireRead(LOCK_2);
  await veryFlexibleFunctionUpTo3(veryFlex2);
  veryFlex2.dispose();
  console.log('');
  
  console.log('Example 5d: Context with LOCK_1 + LOCK_3 (skipped LOCK_2) → veryFlexibleFunctionUpTo3()');
  const veryFlex13 = await createLockContext().acquireWrite(LOCK_1);
  const veryFlex13b = await veryFlex13.acquireRead(LOCK_3);
  await veryFlexibleFunctionUpTo3(veryFlex13b);
  veryFlex13b.dispose();
  console.log('');
  
  console.log('Example 5e: Context with LOCK_2 + LOCK_3 (skipped LOCK_1) → veryFlexibleFunctionUpTo3()');
  const veryFlex23 = await createLockContext().acquireWrite(LOCK_2);
  const veryFlex23b = await veryFlex23.acquireRead(LOCK_3);
  await veryFlexibleFunctionUpTo3(veryFlex23b);
  veryFlex23b.dispose();
  console.log('');
  
  console.log('Example 5f: Context with LOCK_1 + LOCK_3 + LOCK_4 (skipped LOCK_2) → veryFlexibleFunctionUpTo4()');
  const veryFlex134 = await createLockContext().acquireWrite(LOCK_1);
  const veryFlex134b = await veryFlex134.acquireRead(LOCK_3);
  const veryFlex134c = await veryFlex134b.acquireWrite(4);
  await veryFlexibleFunctionUpTo4(veryFlex134c);
  veryFlex134c.dispose();
  console.log('');
  
  // =============================================================================
  // PART 6: CHAINED WORKFLOW - Progressive lock acquisition
  // =============================================================================
  
  console.log('📌 PART 6: CHAINED WORKFLOW');
  console.log('Demonstrating progressive lock acquisition with function calls\n');
  
  await demonstrateChainedWorkflow();
  console.log('');
  
  // =============================================================================
  // PART 7: LockContextBelow<MaxLevel> - Alternative approach using AllLessThan
  // =============================================================================
  
  console.log('📌 PART 7: LockContextBelow<MaxLevel> - AllLessThan helper approach');
  console.log('Alternative boundary validation: ensures all held locks are strictly below MaxLevel\n');
  
  console.log('Example 7a: Empty context → wantsToTakeLock3()');
  const emptyFor3 = createLockContext();
  await wantsToTakeLock3(emptyFor3);
  emptyFor3.dispose();
  console.log('');
  
  console.log('Example 7b: Context with LOCK_1 → wantsToTakeLock3()');
  const ctx1For3 = await createLockContext().acquireWrite(LOCK_1);
  await wantsToTakeLock3(ctx1For3);
  ctx1For3.dispose();
  console.log('');
  
  console.log('Example 7c: Context with LOCK_1 + LOCK_2 → wantsToTakeLock3()');
  const ctx12For3 = await createLockContext().acquireRead(LOCK_1);
  const ctx12For3b = await ctx12For3.acquireWrite(LOCK_2);
  await wantsToTakeLock3(ctx12For3b);
  ctx12For3b.dispose();
  console.log('');

  // =============================================================================
  // SUMMARY
  // =============================================================================
  
  console.log('🎉 TYPE SYSTEM BUILDING BLOCKS SUMMARY:');
  console.log('');
  console.log('1. HasLock<THeld, Level>');
  console.log('   → Strictest: Lock MUST already be held');
  console.log('   → Use when: Function needs guaranteed access to locked resource');
  console.log('');
  console.log('2. CanAcquire<THeld, TLock>');
  console.log('   → Generic: Checks if lock TLock can be acquired (but not necessarily held)');
  console.log('   → Use when: Working with createFreshContextWithReadLock/WriteLock');
  console.log('   → No casting needed when used uniformly!');
  console.log('');
  console.log('3. ValidLockXContext<THeld>');
  console.log('   → Most flexible: Combines HasLock + CanAcquire');
  console.log('   → Use when: Function accepts contexts where lock is held OR acquirable');
  console.log('   → Provides best error messages (includes MaxHeldLock details)');
  console.log('');
  console.log('4. AllPrefixes<T>');
  console.log('   → Generates all valid ordered prefixes: [] | [1] | [1,2] | [1,2,3] | ...');
  console.log('   → Use when: Function should accept ANY valid ordered lock state');
  console.log('   → Perfect for truly flexible functions that adapt to any context');
  console.log('');
  console.log('5. OrderedSubsequences<T>');
  console.log('   → Generates all ordered subsequences (powerset): [] | [1] | [2] | [1,2] | [1,3] | ...');
  console.log('   → Most permissive: Allows lock skipping while maintaining order');
  console.log('   → Use when: Need maximum flexibility with non-contiguous lock patterns');
  console.log('   → Critical: Order is preserved for deadlock prevention');
  console.log('');
  console.log('6. LockContextBelow<MaxLevel> + AllLessThan');
  console.log('   → Boundary validation: All held locks must be strictly < MaxLevel');
  console.log('   → Use when: Need readable constraint for boundary checking');
  console.log('   → Limitation: TypeScript may not fully validate acquisitions in generic context');
  console.log('   → For complete type safety, prefer CanAcquire<T, X> pattern directly');
  console.log('   → Complements CanAcquire - validates at call site, not inside function body');
  console.log('');
  console.log('💡 Best Practice: Use ValidLockXContext for most function parameters!');
  console.log('💡 Use CanAcquire<T, X> for fresh context pattern (no casts required)!');
  console.log('💡 Use AllPrefixes<T> for maximum flexibility with multiple lock states!');
  console.log('💡 Use OrderedSubsequences<T> when lock skipping patterns are needed!');
  console.log('💡 Use LockContextBelow<X> for boundary validation before acquiring lock X!');
}

// =============================================================================
// COMPILE-TIME VALIDATION TESTS
// =============================================================================
// The following commented code demonstrates compile-time errors.
// Uncomment any line to verify TypeScript prevents invalid operations.

// ❌ INVALID: HasLock requires the lock to already be held
// async function testHasLockViolation() {
//   const ctx1 = await createLockContext().acquireWrite(LOCK_1);
//   await requireLock2ToBeAlreadyHeld(ctx1); // ERROR: LOCK_2 not held
//   ctx1.dispose();
// }

// ❌ INVALID: CanAcquireLock2 fails when holding higher lock
// async function testCanAcquireViolation() {
//   const ctx3 = await createLockContext().acquireWrite(LOCK_3);
//   await ensureLock2CanBeAcquired(ctx3); // ERROR: Can't acquire LOCK_2 after LOCK_3
//   ctx3.dispose();
// }

// ❌ INVALID: ValidLock2Context rejects contexts with lock ordering violations
// async function testValidContextViolation() {
//   const ctx4 = await createLockContext().acquireWrite(LOCK_4);
//   await workWithLock2Context(ctx4); // ERROR: Can't acquire LOCK_2 after LOCK_4
//   ctx4.dispose();
// }

// ❌ INVALID: LockContextBelow<3> rejects contexts with lock >= 3
// async function testLockContextBelowViolation() {
//   const ctx3 = await createLockContext().acquireWrite(LOCK_3);
//   await wantsToTakeLock3(ctx3); // ERROR: Context holds LOCK_3, not strictly below 3
//   ctx3.dispose();
//
//   const ctx4 = await createLockContext().acquireWrite(LOCK_4);
//   await wantsToTakeLock3(ctx4); // ERROR: Context holds LOCK_4, not strictly below 3
//   ctx4.dispose();
// }

// ✅ VALID: Demonstrating the differences between the three building blocks
// async function testValidUsage() {
//   // HasLock: Only accepts context with lock already held
//   const has2 = await createLockContext().acquireWrite(LOCK_2);
//   await requireLock2ToBeAlreadyHeld(has2);
//   has2.dispose();
//
//   // CanAcquire: Accepts empty or contexts with lower locks
//   const empty = createLockContext();
//   await ensureLock2CanBeAcquired(empty);
//   empty.dispose();
//
//   const with1 = await createLockContext().acquireWrite(LOCK_1);
//   await ensureLock2CanBeAcquired(with1);
//   with1.dispose();
//
//   // ValidContext: Most flexible - accepts both scenarios above
//   const valid1 = createLockContext();
//   await workWithLock2Context(valid1);
//   valid1.dispose();
//
//   const valid2 = await createLockContext().acquireWrite(LOCK_2);
//   await workWithLock2Context(valid2);
//   valid2.dispose();
// }

// Allow direct execution
if (require.main === module) {
  runContextTransferDemo().catch(console.error);
}