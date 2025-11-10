/**
 * Minimal example: Acquiring locks after receiving a context as a function parameter
 * 
 * This demonstrates the pattern where a function accepts a lock context
 * and then acquires additional locks within that function.
 * 
 * Key insight: When a function receives a context parameter, it can immediately
 * call acquireWrite/acquireRead on that context to acquire additional locks,
 * as long as they follow the lock ordering rules (ascending order).
 */

import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4 } from '../core';
import type { LockContext, LockLevel, Contains, ValidLock3Context } from '../core';

/**
 * Example 1: Function that requires LOCK_1 and then acquires LOCK_2 within
 * 
 * Pattern: Function receives a context that must have LOCK_1,
 * then calls acquireWrite to acquire LOCK_2 (which is higher, so it's legal).
 */
async function processWithLock1AcquiresLock2(
  context: LockContext<readonly [1]>
): Promise<string> {
  console.log('  Received context with LOCK_1, acquiring LOCK_2...');
  
  // LOCK_2 is higher than LOCK_1, so this is legal
  const lock2Ctx = await context.acquireWrite(LOCK_2);
  
  // Now we're in critical section with LOCK_1 and LOCK_2
  const result = `✅ Acquired LOCK_2. Now holding: ${lock2Ctx.toString()}`;
  console.log(`  ${result}`);
  
  lock2Ctx.dispose();
  return result;
}

/**
 * Example 2: Function that requires LOCK_2 and then acquires LOCK_3
 * 
 * Receives a context holding LOCK_2, then acquires LOCK_3 within the function.
 * This shows chaining of lock acquisitions through function parameters.
 */
async function wantsToTakeLock3(
  context:  LockContext<readonly []> | LockContext<readonly [1]> | LockContext<readonly [1, 2]>
): Promise<string> {
  console.log('  Received context with LOCK_1 and LOCK_2, acquiring LOCK_3...');
  
  // LOCK_3 is higher than LOCK_2, so this is legal
  const lock3Ctx = await context.acquireWrite(LOCK_3);
  
  // Critical section with LOCK_1, LOCK_2, and LOCK_3
  const result = `✅ Acquired LOCK_3. Now holding: ${lock3Ctx.toString()}`;
  console.log(`  ${result}`);
  
  lock3Ctx.dispose();
  return result;
}

async function wantsToTakeLock3_2<THeld extends readonly LockLevel[]>(
  context: ValidLock3Context<THeld> extends string ? never : ValidLock3Context<THeld>
): Promise<string> {
  console.log('  Received context with LOCK_1 and LOCK_2, acquiring LOCK_3...');
  
  // LOCK_3 is higher than LOCK_2, so this is legal
  const lock3Ctx = await context.acquireWrite(LOCK_3);
  
  // Critical section with LOCK_1, LOCK_2, and LOCK_3
  const result = `✅ Acquired LOCK_3. Now holding: ${lock3Ctx.toString()}`;
  console.log(`  ${result}`);
  
  lock3Ctx.dispose();
  return result;
}

/**
 * Main demonstration
 */
export async function demonstrateContextParameter(): Promise<void> {
  console.log('\n🔗 Context Parameter - Acquiring Locks After Receiving Context');
  console.log('==============================================================\n');

  // Setup: Create initial context and acquire LOCK_1
  console.log('1️⃣ Creating context and acquiring LOCK_1...');
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  console.log(`   ✅ Holding: ${ctx1.toString()}\n`);

  // Example 1: Pass context to function that acquires LOCK_2
  console.log('2️⃣ Calling processWithLock1AcquiresLock2 with LOCK_1 context...');
  await wantsToTakeLock3(await createLockContext());
  const result1 = await processWithLock1AcquiresLock2(ctx1);
  await wantsToTakeLock3(ctx1);

  console.log(`   Result: ${result1}\n`);

  // Example 2: Now acquire up to LOCK_2 and pass to function that acquires LOCK_3
  console.log('3️⃣ Creating context with LOCK_1 and LOCK_2...');
  const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  console.log(`   ✅ Holding: ${ctx12.toString()}\n`);

  console.log('4️⃣ Calling wantsToTakeLock3 with LOCK_1,LOCK_2 context...');
  const result2 = await wantsToTakeLock3(ctx12);
  console.log(`   Result: ${result2}\n`);

  // Cleanup
  ctx12.dispose();
  console.log('✅ All contexts released.\n');
}

// Run if executed directly
if (require.main === module) {
  demonstrateContextParameter().catch(console.error);
}
