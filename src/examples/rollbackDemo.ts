/**
 * Rollback Functionality Demo
 * 
 * This demonstrates the new rollback capability that allows
 * going back to previous lock levels instead of full disposal.
 */

import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5, LOCK_8, LOCK_12 } from '../core';

async function demonstrateRollback(): Promise<void> {
  console.log('\n🔄 Rollback Functionality Demo');
  console.log('===============================\n');

  // Basic rollback example
  console.log('=== Basic Rollback Example ===');
  const ctx1 = await createLockContext().acquireWrite(LOCK_1);
  const ctx13 = await ctx1.acquireWrite(LOCK_3);
  const ctx135 = await ctx13.acquireWrite(LOCK_5);
  
  console.log(`1. Started with: ${ctx135.toString()}`);
  
  // Rollback to lock 3
  const backTo3 = ctx135.rollbackTo(LOCK_3);
  console.log(`2. Rolled back to LOCK_3: ${backTo3.toString()}`);
  
  // Now we can acquire LOCK_4 (which wasn't possible before rollback)
  const ctx134 = await backTo3.acquireWrite(LOCK_4);
  console.log(`3. Acquired LOCK_4: ${ctx134.toString()}`);
  
  // Continue building up
  const ctx1345 = await ctx134.acquireWrite(LOCK_5);
  console.log(`4. Re-acquired LOCK_5: ${ctx1345.toString()}`);
  
  ctx1345.dispose();

  // Advanced rollback patterns
  console.log('\n=== Advanced Rollback Patterns ===');
  
  // Build a complex lock chain
  const complexCtx = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_2))
    .then(c => c.acquireWrite(LOCK_3))
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_8))
    .then(c => c.acquireWrite(LOCK_12));
  
  console.log(`1. Complex chain: ${complexCtx.toString()}`);
  
  // Multiple rollback levels
  const backTo5 = complexCtx.rollbackTo(LOCK_5);
  console.log(`2. Rolled back to LOCK_5: ${backTo5.toString()}`);
  
  const backTo2 = complexCtx.rollbackTo(LOCK_2);
  console.log(`3. Rolled back to LOCK_2: ${backTo2.toString()}`);
  
  const backTo1 = complexCtx.rollbackTo(LOCK_1);
  console.log(`4. Rolled back to LOCK_1: ${backTo1.toString()}`);
  
  backTo1.dispose();

  // Demonstrate compile-time safety
  console.log('\n=== Compile-Time Safety ===');
  const safetyCtx = await createLockContext().acquireWrite(LOCK_3);
  console.log(`Context: ${safetyCtx.toString()}`);
  
  console.log('✅ Valid rollback operations:');
  console.log('// const valid = safetyCtx.rollbackTo(LOCK_3);  // ✅ Can rollback to held lock');
  
  console.log('\n❌ Invalid rollback operations (would cause compile errors):');
  console.log('// const invalid1 = safetyCtx.rollbackTo(LOCK_1);  // ❌ LOCK_1 not held');
  console.log('// const invalid2 = safetyCtx.rollbackTo(LOCK_5);  // ❌ LOCK_5 not held');
  console.log('// const invalid3 = safetyCtx.rollbackTo(LOCK_2);  // ❌ LOCK_2 not held');
  
  // Uncomment these to see compile errors:
//   const invalid1 = safetyCtx.rollbackTo(LOCK_1);  // ❌ TypeScript error!
//   const invalid2 = safetyCtx.rollbackTo(LOCK_5);  // ❌ TypeScript error!
//   const invalid3 = safetyCtx.rollbackTo(LOCK_2);  // ❌ TypeScript error!
  
  safetyCtx.dispose();

  console.log('\n🎉 Rollback functionality working perfectly!');
  console.log('💡 Benefits:');
  console.log('   ✓ More flexible lock management');
  console.log('   ✓ Compile-time safety preserved');
  console.log('   ✓ Advanced lock acquisition patterns enabled');
  console.log('   ✓ Better resource management');
}

// Export for use in other examples
export { demonstrateRollback };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateRollback().catch(console.error);
}