/**
 * IronGuard System Examples
 * 
 * This demonstrates a compile-time lock ordering system that allows:
 * 1. Skipping locks (1→3, 1→5, direct acquisition of any lock)
 * 2. Passing lock contexts between functions with validation
 * 3. Compile-time prevention of lock ordering violations
 * 4. Read/write lock semantics with writer preference
 */

import { 
  createLockContext, 
  LOCK_1, 
  LOCK_2, 
  LOCK_3, 
  LOCK_4, 
  LOCK_5 
} from '../core';

import {
  functionRequiringLock2,
  demonstrateLockSkipping
} from './examples';

import { demonstrateCompileTimeViolations } from './compileTimeViolations';
import { demonstrateMutualExclusion } from './mutualExclusionDemo';
import { demonstrateRollback } from './rollbackDemo';
import { demonstrateFeatureCombinations } from './featureCombinationsDemo';
import { runAllExamples as runReadWriteExamples } from './readWriteExamples';
import './nullableLocksAcquisition';
import { runContextTransferDemo } from './contextTransferDemo';
import { runFlexibleLockTypesDemo } from './flexibleLockTypesDemo';
import { runHasLockContextDemo } from './hasLockContextDemo';
import { runMarksExample } from './MarksExample';

async function main(): Promise<void> {
  console.log('�️ IronGuard System\n');
  console.log('This system demonstrates compile-time lock ordering validation');
  console.log('with unbreakable protection and flexible acquisition patterns.\n');
  
  // Basic lock operations - demonstrating sequential usage
  console.log('=== Basic Lock Operations (Sequential) ===');
  
  // Show valid acquisitions - use and release locks sequentially
  const ctx1 = createLockContext();
  const withLock1 = await ctx1.acquireWrite(LOCK_1);
  console.log(`✅ Empty → Lock 1: ${withLock1.toString()}`);
  
  const withLock1And4 = await withLock1.acquireWrite(LOCK_4);
  console.log(`✅ Lock 1 → Lock 4: ${withLock1And4.toString()}`);
  
  // Release locks before acquiring different ones
  withLock1And4.dispose();
  
  const directLock3 = await createLockContext().acquireWrite(LOCK_3);
  console.log(`✅ Direct Lock 3: ${directLock3.toString()}`);
  
  // Function parameter validation
  console.log('\n=== Function Parameter Validation ===');
  
  // Release lock 3 first
  directLock3.dispose();
  
  const ctxWithLock2 = await createLockContext().acquireWrite(LOCK_2);
  console.log('Calling function that requires lock 2:');
  functionRequiringLock2(ctxWithLock2);
  
  // Release lock 2
  ctxWithLock2.dispose();
  
  // More examples
  await demonstrateLockSkipping();
  
  // Compile-time violations demo
  await demonstrateCompileTimeViolations();
  
  // Mutual exclusion demo
  await demonstrateMutualExclusion();
  
  // Rollback functionality demo
  await demonstrateRollback();
  
  // Feature combinations demo
  await demonstrateFeatureCombinations();
  
  // Read/Write lock examples
  await runReadWriteExamples();
  
  // Context transfer and compile-time validation demo
  await runContextTransferDemo();
  
  // Flexible lock context types demo
  await runFlexibleLockTypesDemo();
  
  // HasLock context types demo
  await runHasLockContextDemo();
  
  // Mark's compact feature overview
  await runMarksExample();
  
  console.log('\n=== Key Benefits ===');
  console.log('✓ Runtime mutual exclusion (real thread safety)');
  console.log('✓ Compile-time lock ordering validation (deadlock prevention)');
  console.log('✓ Flexible lock acquisition patterns');
  console.log('✓ Advanced rollback functionality');
  console.log('✓ Type-safe function parameter constraints');
  console.log('✓ Context transfer between functions with compile-time validation');
  console.log('✓ Read/write lock semantics with concurrent readers');
  console.log('✓ Writer preference prevents writer starvation');
  
  console.log('\n💡 Try uncommenting invalid operations in the source files');
  console.log('   to see TypeScript prevent lock ordering violations!');
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

export { main };