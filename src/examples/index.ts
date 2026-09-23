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
} from '../index';

import {
  functionRequiringLock2,
  demonstrateLockSkipping
} from './examples';

import { demonstrateCompileTimeViolations } from './compileTimeViolations';
import { demonstrateMutualExclusion } from './mutualExclusionDemo';
import { demonstrateFeatureCombinations } from './featureCombinationsDemo';
import { runAllExamples as runReadWriteExamples } from './readWriteExamples';
import './nullableLocksAcquisition';
import { runContextTransferDemo } from './contextTransferDemo';
import { runFlexibleLockTypesDemo } from './flexibleLockTypesDemo';
import { runHasLockContextDemo } from './hasLockContextDemo';
import { runMarksExample } from './MarksExample';
import { runUseLockRuntimeDemo } from './useLockRuntimeDemo';
import { demonstrateDebugInfo } from './debug-demo';
import { runWorkflowCoordinationDemo } from './workflowCoordinationDemo';

async function main(): Promise<void> {

  console.log('=== IronGuard System Examples ===');
  console.log('This library demonstrates async resource coordination with compile-time');
  console.log('lock ordering validation and runtime mutual exclusion.\n');
  
  // Lock skipping demo
  await demonstrateLockSkipping();
  
  // Compile-time violations demo
  await demonstrateCompileTimeViolations();
  
  // Mutual exclusion demo
  await demonstrateMutualExclusion();
  
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

  // useLock() runtime safety demo
  await runUseLockRuntimeDemo();

  // Debug mode and stack trace capture demo
  await demonstrateDebugInfo();

  // Realistic async workflow coordination demo
  await runWorkflowCoordinationDemo();
  
  console.log('\n=== Key Benefits ===');
  console.log('✓ Runtime mutual exclusion (real thread safety)');
  console.log('✓ Compile-time lock ordering validation (deadlock prevention)');
  console.log('✓ Flexible lock acquisition patterns');
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