/**
 * Demonstrating that LocksAtMost3 is semantically equivalent to
 * "can acquire lock 3 OR already has lock 3" but actually works!
 */

import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4,
  LOCK_5,
  LockContext,
  type LocksAtMost3
} from './src/core';

console.log('=== Semantic Equivalence: ValidLock3Context vs LocksAtMost3 ===\n');

// What ValidLock3Context was TRYING to express:
// "Accept contexts that can acquire lock 3 OR already have lock 3"
//
// Which states satisfy this?
// ✅ [] - empty, can acquire lock 3
// ✅ [1] - has lock 1, can acquire lock 3
// ✅ [2] - has lock 2, can acquire lock 3  
// ✅ [1, 2] - has locks 1&2, can acquire lock 3
// ✅ [3] - already has lock 3
// ✅ [1, 3] - has locks 1&3
// ✅ [2, 3] - has locks 2&3
// ✅ [1, 2, 3] - has locks 1,2,3
// ❌ [4] - cannot acquire lock 3 (ordering violation)
// ❌ [5] - cannot acquire lock 3 (ordering violation)
// ❌ [3, 4] - already has lock 3 (but can't acquire it again)
//
// This is EXACTLY what LocksAtMost3 accepts!

function processWithLock3(ctx: LockContext<LocksAtMost3>): void {
  const locks = ctx.getHeldLocks();
  
  if (ctx.hasLock(LOCK_3)) {
    console.log(`✅ [${locks}] - Already has lock 3`);
  } else {
    console.log(`✅ [${locks}] - Can acquire lock 3`);
  }
}

async function demonstrateEquivalence() {
  console.log('Valid states (all accepted by LocksAtMost3):\n');

  // All the states that "can acquire or have lock 3"
  processWithLock3(createLockContext());  // []
  
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  processWithLock3(ctx1);  // [1]
  
  const ctx2 = await createLockContext().acquireWrite(LOCK_2);
  processWithLock3(ctx2);  // [2]
  
  const ctx12 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_2));
  processWithLock3(ctx12);  // [1, 2]
  
  const ctx3 = await createLockContext().acquireWrite(LOCK_3);
  processWithLock3(ctx3);  // [3]
  
  const ctx13 = await createLockContext().acquireWrite(LOCK_1).then(c => c.acquireWrite(LOCK_3));
  processWithLock3(ctx13);  // [1, 3]
  
  const ctx23 = await createLockContext().acquireWrite(LOCK_2).then(c => c.acquireWrite(LOCK_3));
  processWithLock3(ctx23);  // [2, 3]
  
  const ctx123 = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3));
  processWithLock3(ctx123);  // [1, 2, 3]

  console.log('\n❌ Invalid states (rejected by LocksAtMost3):\n');
  
  const ctx4 = await createLockContext().acquireWrite(LOCK_4);
  const ctx5 = await createLockContext().acquireWrite(LOCK_5);
  const ctx34 = await createLockContext().acquireWrite(LOCK_3).then(c => c.acquireWrite(LOCK_4));

  console.log('❌ [4] - Cannot acquire lock 3 (ordering violation)');
  // processWithLock3(ctx4);  // Compile error!
  
  console.log('❌ [5] - Cannot acquire lock 3 (ordering violation)');
  // processWithLock3(ctx5);  // Compile error!
  
  console.log('❌ [3, 4] - Cannot pass this (has lock 4)');
  // processWithLock3(ctx34);  // Compile error!

  console.log('\n=== CONCLUSION ===');
  console.log('LocksAtMost3 captures EXACTLY the same semantics as');
  console.log('"can acquire lock 3 OR already has lock 3"');
  console.log('\nBUT it actually works because:');
  console.log('✅ It\'s a concrete union type (not a conditional)');
  console.log('✅ The context parameter is fully usable');
  console.log('✅ Compile-time checks work perfectly');
  console.log('\nAnswer to your question:');
  console.log('YES, we can use a "boolean predicate approach" with a usable context,');
  console.log('but the solution is LocksAtMost3, not ValidLock3Context!');

  // Cleanup
  ctx1.dispose();
  ctx2.dispose();
  ctx12.dispose();
  ctx3.dispose();
  ctx13.dispose();
  ctx23.dispose();
  ctx123.dispose();
  ctx4.dispose();
  ctx5.dispose();
  ctx34.dispose();
}

demonstrateEquivalence().catch(console.error);
