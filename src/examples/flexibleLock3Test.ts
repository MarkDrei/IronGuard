/**
 * Advanced example: Type-safe function composition with lock constraints
 * 
 * This demonstrates how lock constraints can be composed through multiple
 * function calls while maintaining compile-time safety.
 */

import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LockContext, type ValidLock3Context } from '../core';
import { flexibleLock3Function } from './examples';

// Intermediate function that passes lock context through with same constraints
async function intermediateFunction<THeld extends readonly any[]>(
  context: ValidLock3Context<THeld>
): Promise<LockContext<any>> {
  console.log(`Intermediate function: ${(context as any).toString()}`);
  return await flexibleLock3Function(context);
}

async function runDemo(): Promise<void> {
  console.log('=== Type-Safe Function Composition Demo ===\n');

  console.log('Valid cases - all compile and work (sequential):');

  // Test 1: Empty context - acquires lock 3
  const empty = createLockContext();
  const result1 = await intermediateFunction(empty);
  result1.dispose();

  // Test 2: With lock 1 - acquires lock 3  
  const withLock1 = await createLockContext().acquireWrite(LOCK_1);
  const result2 = await intermediateFunction(withLock1);
  result2.dispose();

  // Test 3: With lock 2 - acquires lock 3
  const withLock2 = await createLockContext().acquireWrite(LOCK_2);
  const result3 = await intermediateFunction(withLock2);
  result3.dispose();

  // Test 4: With lock 3 - uses existing lock 3
  const withLock3 = await createLockContext().acquireWrite(LOCK_3);
  const result4 = await intermediateFunction(withLock3);
  result4.dispose();

  // ❌ Invalid cases - these cause compile errors
  const withLock4Only = await createLockContext().acquireWrite(LOCK_4);
  const withLock5Only = await createLockContext().acquireWrite(LOCK_5);

  console.log('\nInvalid cases (uncomment to see compile errors):');
  console.log('// intermediateFunction(withLock4Only);   // ❌ Compile error!');
  console.log('// intermediateFunction(withLock5Only);   // ❌ Compile error!');
  // await intermediateFunction(withLock4Only);
  // await intermediateFunction(withLock5Only);

  console.log('\n✅ All function composition maintains compile-time safety!');

  // Clean up remaining contexts
  withLock4Only.dispose();
  withLock5Only.dispose();
}

// Run the demo
runDemo().catch(console.error);