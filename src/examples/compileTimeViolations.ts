/**
 * Compile-Time Violations Demo
 * 
 * This example demonstrates how TypeScript catches lock ordering violations
 * and other invalid operations at compile time. All the violation examples
 * are commented out - uncomment them to see TypeScript compilation errors!
 */

import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_4, LOCK_5 } from '../index';

async function demonstrateCompileTimeViolations(): Promise<void> {
  console.log('\n❌ Compile-Time Violations Demo');
  console.log('=================================');
  console.log('💡 All violation examples are commented out to prevent compilation errors.');
  console.log('💡 Uncomment them one by one to see TypeScript catch the violations!\n');

  // ✅ Valid baseline operations
  console.log('✅ Valid operations (for comparison):');
  const ctx = createLockContext();
  const ctx1 = await ctx.acquireWrite(LOCK_1);
  const ctx3 = await ctx1.acquireWrite(LOCK_3);
  
  ctx3.useLock(LOCK_1, () => console.log('Using held LOCK_1'));
  ctx3.useLock(LOCK_3, () => console.log('Using held LOCK_3'));
  
  ctx3.dispose();
  console.log('');

  // =============================================================================
  // LOCK ORDERING VIOLATIONS
  // =============================================================================
  
  console.log('🔒 Lock Ordering Violations:');
  console.log('-----------------------------');
  
  const orderCtx = createLockContext();
  const orderCtx3 = await orderCtx.acquireWrite(LOCK_3);
  
  console.log('// ❌ Trying to acquire lower locks after higher ones:');
  console.log('// const bad1 = await orderCtx3.acquireWrite(LOCK_1);  // Lower after higher');
  console.log('// const bad2 = await orderCtx3.acquireWrite(LOCK_2);  // Lower after higher');
  
  // Uncomment these to see compile errors:
  // const bad1 = await orderCtx3.acquireWrite(LOCK_1);  // ❌ Compile error!
  // const bad2 = await orderCtx3.acquireWrite(LOCK_2);  // ❌ Compile error!
  
  console.log('');
  orderCtx3.dispose();

  // =============================================================================
  // DUPLICATE LOCK ACQUISITION
  // =============================================================================
  
  console.log('🔄 Duplicate Lock Acquisition:');
  console.log('-------------------------------');
  
  const dupCtx = createLockContext();
  const dupCtx2 = await dupCtx.acquireWrite(LOCK_2);
  
  console.log('// ❌ Trying to acquire the same lock twice:');
  console.log('// const duplicate = await dupCtx2.acquireWrite(LOCK_2);  // Already held');
  
  // Uncomment to see compile error:
//   const duplicate = await dupCtx2.acquireWrite(LOCK_2);  // ❌ Compile error!
  
  console.log('');
  dupCtx2.dispose();

  // =============================================================================
  // USING NON-HELD LOCKS
  // =============================================================================
  
  console.log('🚫 Using Non-Held Locks:');
  console.log('-------------------------');
  
  const useCtx = createLockContext();
  const useCtx1 = await useCtx.acquireWrite(LOCK_1);
  
  console.log('// ❌ Trying to use locks that are not held:');
  console.log('// useCtx1.useLock(LOCK_2, () => {});  // Not held');
  console.log('// useCtx1.useLock(LOCK_3, () => {});  // Not held');
  console.log('// useCtx1.useLock(LOCK_4, () => {});  // Not held');
  console.log('// useCtx1.useLock(LOCK_5, () => {});  // Not held');
  
  // Uncomment to see compile errors:
//   useCtx1.useLock(LOCK_2, () => {});  // ❌ Compile error!
//   useCtx1.useLock(LOCK_3, () => {});  // ❌ Compile error!
//   useCtx1.useLock(LOCK_4, () => {});  // ❌ Compile error!
//   useCtx1.useLock(LOCK_5, () => {});  // ❌ Compile error!
  
  console.log('');
  useCtx1.dispose();

  // =============================================================================
  // COMPLEX ORDERING VIOLATIONS
  // =============================================================================
  
  console.log('🔀 Complex Ordering Scenarios:');
  console.log('-------------------------------');
  
  const complexCtx = createLockContext();
  const complexCtx13 = await (await complexCtx.acquireWrite(LOCK_1)).acquireWrite(LOCK_3);
  
  console.log('// ❌ Complex violation: trying to go backwards in chain:');
  console.log('// const backwards = await complexCtx13.acquireWrite(LOCK_2);  // 1,3 → 2 invalid');
  
  // Uncomment to see compile error:
//   const backwards = await complexCtx13.acquireWrite(LOCK_2);  // ❌ Compile error!
  
  console.log('');
  complexCtx13.dispose();

  console.log('🎉 All violations successfully prevented by TypeScript!');
  console.log('💡 To test: uncomment any violation example and run `npm run build`');
}

// Export for use in other examples
export { demonstrateCompileTimeViolations };

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateCompileTimeViolations().catch(console.error);
}