/**
 * Core examples demonstrating the IronGuard lock system
 */

import { 
  LockContext, 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4, 
  LOCK_5,
  LOCK_6,
  LOCK_8,
  LOCK_10,
  LOCK_12,
  LOCK_15,
  type Contains,
  type LockLevel
} from '../core';

// Example 1: Function that requires a specific lock
function functionRequiringLock2<THeld extends readonly LockLevel[]>(
  context: Contains<THeld, 2> extends true ? LockContext<THeld> : 'Function requires lock 2'
): void {
  // This function demonstrates compile-time constraint validation
  // It can only be called with contexts that have lock 2
  console.log(`Function requiring lock 2: ${context.toString()}`);
  
  // Note: Due to TypeScript limitations with generic constraints,
  // we cannot directly call useLock here with the generic type.
  // In real usage, this would be called with concrete lock contexts.
}

// Example 2: Demonstrating lock skipping patterns
async function demonstrateLockSkipping(): Promise<void> {
  console.log('\n=== Lock Skipping Patterns ===');
  
  // Direct acquisition of any lock (sequential to avoid conflicts)
  const direct1 = await createLockContext().acquireWrite(LOCK_1);
  console.log(`  Direct lock 1: ${direct1.toString()}`);
  direct1.dispose();
  
  const direct3 = await createLockContext().acquireWrite(LOCK_3);
  console.log(`  Direct lock 3: ${direct3.toString()}`);
  direct3.dispose();
  
  const direct5 = await createLockContext().acquireWrite(LOCK_5);
  console.log(`  Direct lock 5: ${direct5.toString()}`);
  direct5.dispose();
  
  // Skipping intermediate locks (sequential)
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const skip1to4 = await ctx1.acquireWrite(LOCK_4);
  console.log(`  Lock 1 → 4: ${skip1to4.toString()}`);
  skip1to4.dispose();
  
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  const skip2to5 = await ctx2.acquireWrite(LOCK_5);
  console.log(`  Lock 2 → 5: ${skip2to5.toString()}`);
  skip2to5.dispose();

  // High lock examples (new!)
  const ctx6 = await createLockContext().acquireWrite(LOCK_6);
  console.log(`  Direct lock 6: ${ctx6.toString()}`);
  const skip6to12 = await ctx6.acquireWrite(LOCK_12);
  console.log(`  Lock 6 → 12: ${skip6to12.toString()}`);
  skip6to12.dispose();

  // Large skip example
  const ctx8 = await createLockContext().acquireWrite(LOCK_8);
  const skip8to15 = await ctx8.acquireWrite(LOCK_15);
  console.log(`  Lock 8 → 15: ${skip8to15.toString()}`);
  skip8to15.dispose();
}

export {
  functionRequiringLock2,
  demonstrateLockSkipping
};