/**
 * Feature Combinations Demo
 * 
 * Demonstrates combinations of IronGuard features working together:
 * - Rollback + Mutual Exclusion
 * - Rollback + High Lock Levels  
 * - Rollback + Lock Skipping
 * - Complex Multi-Feature Scenarios
 */

import { createLockContext, LOCK_1, LOCK_2, LOCK_3, LOCK_5, LOCK_8, LOCK_12, LOCK_15 } from '../core';

export async function demonstrateFeatureCombinations(): Promise<void> {
  console.log('\n🔧 Feature Combinations Demo');
  console.log('=============================\n');

  // 1. Rollback + Mutual Exclusion
  await demonstrateRollbackWithMutualExclusion();
  
  // 2. Rollback + High Lock Levels
  await demonstrateRollbackWithHighLocks();
  
  // 3. Rollback + Lock Skipping
  await demonstrateRollbackWithSkipping();
  
  // 4. Complex Multi-Feature Scenario
  await demonstrateComplexScenario();
}

async function demonstrateRollbackWithMutualExclusion(): Promise<void> {
  console.log('=== 1. Rollback + Mutual Exclusion ===');
  
  const timeline: string[] = [];
  
  // Thread 1: Acquire locks, rollback, release
  const thread1 = (async () => {
    const ctx = await createLockContext()
      .acquireWrite(LOCK_1)
      .then(c => c.acquireWrite(LOCK_3))
      .then(c => c.acquireWrite(LOCK_8));
    
    console.log(`Thread 1: Acquired ${ctx.toString()}`);
    timeline.push('T1-acquired');
    
    // Hold briefly
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Rollback to LOCK_3 (releases LOCK_8)
    const rolled = ctx.rollbackTo(LOCK_3);
    console.log(`Thread 1: Rolled back to ${rolled.toString()}`);
    timeline.push('T1-rollback');
    
    await new Promise(resolve => setTimeout(resolve, 30));
    rolled.dispose();
    timeline.push('T1-disposed');
  })();

  // Thread 2: Wait for LOCK_8 to become available
  const thread2 = (async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
    
    console.log(`Thread 2: Waiting for LOCK_8...`);
    const ctx = await createLockContext().acquireWrite(LOCK_8);
    console.log(`Thread 2: Acquired ${ctx.toString()}`);
    timeline.push('T2-acquired');
    
    ctx.dispose();
    timeline.push('T2-disposed');
  })();

  await Promise.all([thread1, thread2]);
  
  console.log(`✅ Timeline: ${timeline.join(' → ')}`);
  console.log('✅ Thread 2 acquired LOCK_8 after Thread 1 rolled back from it\n');
}

async function demonstrateRollbackWithHighLocks(): Promise<void> {
  console.log('=== 2. Rollback + High Lock Levels ===');
  
  // Build up to high lock levels
  const ctx = await createLockContext()
    .acquireWrite(LOCK_1)
    .then(c => c.acquireWrite(LOCK_5))
    .then(c => c.acquireWrite(LOCK_12))
    .then(c => c.acquireWrite(LOCK_15));
  
  console.log(`Initial high lock context: ${ctx.toString()}`);
  
  // Rollback to intermediate level
  const backTo12 = ctx.rollbackTo(LOCK_12);
  console.log(`Rolled back to LOCK_12: ${backTo12.toString()}`);
  
  // Rollback further
  const backTo5 = ctx.rollbackTo(LOCK_5);
  console.log(`Rolled back to LOCK_5: ${backTo5.toString()}`);
  
  // Take different high lock path
  const newPath = await backTo5.acquireWrite(LOCK_8);
  console.log(`New path with LOCK_8: ${newPath.toString()}`);
  
  newPath.dispose();
  console.log('✅ Successfully navigated high lock levels with rollback\n');
}

async function demonstrateRollbackWithSkipping(): Promise<void> {
  console.log('=== 3. Rollback + Lock Skipping ===');
  
  // Initial acquisition with skipping
  const ctx = await createLockContext()
    .acquireWrite(LOCK_1)    // Skip 2
    .then(c => c.acquireWrite(LOCK_5))    // Skip 3, 4
    .then(c => c.acquireWrite(LOCK_12));  // Skip 6-11
  
  console.log(`Initial skipped pattern: ${ctx.toString()}`);
  
  // Rollback to LOCK_5
  const backTo5 = ctx.rollbackTo(LOCK_5);
  console.log(`Rolled back to LOCK_5: ${backTo5.toString()}`);
  
  // Fill in some previously skipped locks
  const filled = await backTo5
    .acquireWrite(LOCK_8)    // Still skip 6, 7
    .then(c => c.acquireWrite(LOCK_15));  // Skip 9-14
  
  console.log(`Filled in different locks: ${filled.toString()}`);
  
  // Rollback and take completely different path
  const backTo1 = filled.rollbackTo(LOCK_1);
  const differentPath = await backTo1
    .acquireWrite(LOCK_2)
    .then(c => c.acquireWrite(LOCK_3));
  
  console.log(`Completely different path: ${differentPath.toString()}`);
  
  differentPath.dispose();
  console.log('✅ Successfully combined rollback with lock skipping patterns\n');
}

async function demonstrateComplexScenario(): Promise<void> {
  console.log('=== 4. Complex Multi-Feature Scenario ===');
  console.log('Three threads with rollback, high locks, and mutual exclusion\n');
  
  const timeline: string[] = [];
  
  // Thread 1: Complex rollback pattern
  const thread1 = (async () => {
    const ctx = await createLockContext()
      .acquireWrite(LOCK_2)
      .then(c => c.acquireWrite(LOCK_8))
      .then(c => c.acquireWrite(LOCK_15));
    
    console.log(`Thread 1: Complex pattern ${ctx.toString()}`);
    timeline.push('T1-complex');
    
    await new Promise(resolve => setTimeout(resolve, 40));
    
    const rolled = ctx.rollbackTo(LOCK_8);
    console.log(`Thread 1: Rolled back to ${rolled.toString()}`);
    timeline.push('T1-rollback');
    
    const extended = await rolled.acquireWrite(LOCK_12);
    console.log(`Thread 1: Extended to ${extended.toString()}`);
    timeline.push('T1-extended');
    
    extended.dispose();
  })();

  // Thread 2: Competing for high locks
  const thread2 = (async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    
    console.log(`Thread 2: Waiting for LOCK_15...`);
    const ctx = await createLockContext().acquireWrite(LOCK_15);
    console.log(`Thread 2: Got ${ctx.toString()}`);
    timeline.push('T2-acquired');
    
    ctx.dispose();
  })();

  // Thread 3: Working with lower locks independently
  const thread3 = (async () => {
    await new Promise(resolve => setTimeout(resolve, 60));
    
    const ctx = await createLockContext()
      .acquireWrite(LOCK_1)
      .then(c => c.acquireWrite(LOCK_3))
      .then(c => c.acquireWrite(LOCK_5));
    
    console.log(`Thread 3: Lower locks ${ctx.toString()}`);
    timeline.push('T3-lower');
    
    ctx.dispose();
  })();

  await Promise.all([thread1, thread2, thread3]);
  
  console.log(`\n✅ Complex scenario timeline: ${timeline.join(' → ')}`);
  console.log('✅ All threads completed without deadlock');
  console.log('✅ Rollback enabled Thread 2 to acquire LOCK_15');
  console.log('✅ Lower locks worked independently\n');
}

// Run if executed directly
if (require.main === module) {
  demonstrateFeatureCombinations().catch(console.error);
}