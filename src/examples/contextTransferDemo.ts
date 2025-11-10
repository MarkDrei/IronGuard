#!/usr/bin/env npx tsx

/**
 * IronGuard Type System Building Blocks Demo
 * 
 * This example demonstrates the three composable building blocks of ironGuardTypes.ts:
 * 
 * 1. HasLock<THeld, Level> - Checks if a lock is already held in the context
 * 2. CanAcquire<THeld, TLock> - Generic type checking if lock TLock can be acquired
 * 3. ValidLockXContext<THeld> - Combines both checks with proper error messages
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
  type CanAcquire
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
  // PART 4: CHAINED WORKFLOW - Progressive lock acquisition
  // =============================================================================
  
  console.log('📌 PART 4: CHAINED WORKFLOW');
  console.log('Demonstrating progressive lock acquisition with function calls\n');
  
  await demonstrateChainedWorkflow();
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
  console.log('💡 Best Practice: Use ValidLockXContext for most function parameters!');
  console.log('💡 Use CanAcquire<T, X> for fresh context pattern (no casts required)!');
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