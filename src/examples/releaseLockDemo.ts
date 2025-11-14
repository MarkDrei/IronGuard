/**
 * Example: Individual Lock Release Pattern
 * 
 * Demonstrates how to release individual locks for temporary lock elevation.
 * This is useful when you need to:
 * - Acquire a lock temporarily
 * - Do some work with elevated privileges
 * - Release just that lock and continue with the original lock set
 */

import {
  createLockContext,
  LOCK_1,
  LOCK_2,
  LOCK_3,
  LOCK_4,
  LOCK_5
} from '../core';

async function main() {
  console.log('🔓 Individual Lock Release Demo\n');

  // Example 1: Temporary Lock Elevation
  console.log('=== Example 1: Temporary Lock Elevation ===');
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  
  console.log(`Initial state: [${ctx123.getHeldLocks()}]`);
  
  // Temporarily acquire lock 4 for special operation
  const ctx1234 = await ctx123.acquireWrite(LOCK_4);
  console.log(`With elevated lock: [${ctx1234.getHeldLocks()}]`);
  
  // Do work with lock 4
  ctx1234.useLock(LOCK_4, () => {
    console.log('  Performing privileged operation with LOCK_4');
  });
  
  // Release lock 4, back to original state
  const ctxBack = ctx1234.releaseLock(LOCK_4);
  console.log(`After release: [${ctxBack.getHeldLocks()}]`);
  
  // Continue with original locks
  ctxBack.useLock(LOCK_2, () => {
    console.log('  Continuing with original lock set');
  });
  
  ctxBack.dispose();

  console.log('\n=== Example 2: Release Middle Lock ===');
  // Sometimes you need to release a lock in the middle of the chain
  const ctx = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_4));
  
  console.log(`Start: [${ctx.getHeldLocks()}]`);
  
  // Release lock 2 (in the middle)
  const ctxWithout2 = ctx.releaseLock(LOCK_2);
  console.log(`After releasing LOCK_2: [${ctxWithout2.getHeldLocks()}]`);
  
  // We still have locks 1, 3, 4 and can use them
  ctxWithout2.useLock(LOCK_1, () => console.log('  Using LOCK_1'));
  ctxWithout2.useLock(LOCK_3, () => console.log('  Using LOCK_3'));
  ctxWithout2.useLock(LOCK_4, () => console.log('  Using LOCK_4'));
  
  ctxWithout2.dispose();

  console.log('\n=== Example 3: Sequential Releases ===');
  const ctx12345 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_4))
    .then(c => c.acquireWrite(LOCK_5));
  
  console.log(`Start: [${ctx12345.getHeldLocks()}]`);
  
  // Release locks one by one in any order
  const step1 = ctx12345.releaseLock(LOCK_3);
  console.log(`Release LOCK_3: [${step1.getHeldLocks()}]`);
  
  const step2 = step1.releaseLock(LOCK_5);
  console.log(`Release LOCK_5: [${step2.getHeldLocks()}]`);
  
  const step3 = step2.releaseLock(LOCK_2);
  console.log(`Release LOCK_2: [${step3.getHeldLocks()}]`);
  
  step3.dispose();

  console.log('\n=== Example 4: Practical Use Case ===');
  console.log('Processing data with different privilege levels...\n');
  
  // Normal processing with basic locks
  const normalCtx = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2));
  
  console.log(`Normal processing: [${normalCtx.getHeldLocks()}]`);
  normalCtx.useLock(LOCK_1, () => console.log('  Reading data...'));
  normalCtx.useLock(LOCK_2, () => console.log('  Validating data...'));
  
  // Need admin lock temporarily for special operation
  const adminCtx = await normalCtx.acquireWrite(LOCK_5);
  console.log(`Admin operation: [${adminCtx.getHeldLocks()}]`);
  adminCtx.useLock(LOCK_5, () => console.log('  Performing admin action...'));
  
  // Drop admin privileges, continue with normal locks
  const backToNormal = adminCtx.releaseLock(LOCK_5);
  console.log(`Back to normal: [${backToNormal.getHeldLocks()}]`);
  backToNormal.useLock(LOCK_2, () => console.log('  Continuing normal processing...'));
  
  backToNormal.dispose();

  console.log('\n✅ Demo Complete');
  console.log('\n💡 Key Benefits:');
  console.log('  • Temporarily elevate privileges');
  console.log('  • Release locks in any order');
  console.log('  • Compile-time safety enforced');
  console.log('  • Flexible lock management');
}

main().catch(console.error);
